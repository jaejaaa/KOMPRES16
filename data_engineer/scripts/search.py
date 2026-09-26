"""Pencarian regulasi untuk RAG (dipakai AI Engineer / Backend).

    from search import search
    search("peralihan hak karena jual beli", top_k=5)
    # -> [{id, sumber, pasal, teks, asal, score, ...}, ...]   (urut paling relevan dulu)
      id     : id chunk unik, mis. 'pp-24-1997:bata:ps37'
      sumber : nama dokumen, mis. 'PP 24/1997' atau 'Panduan: Balik Nama Sertifikat Tanah'
      pasal  : nomor Pasal ('37'); untuk panduan berisi judul bagian
      teks   : isi chunk
      asal   : 'regulasi' | 'penjelasan' | 'panduan'  (panduan = ringkasan prosedur, BUKAN teks hukum resmi)
      score  : kemiripan kosinus 0-1 antara pertanyaan dan chunk (bisa dipakai sebagai ambang tolak jawaban)
      rank_score : skor gabungan hybrid (hanya untuk urutan; skala kecil, bukan 0-1)
      + doc, section, bab, status, page_start, page_end
Opsi: doc_slug=, include_penjelasan=, include_dicabut=, include_panduan= (False -> hanya regulasi), hybrid=

Backend ranking vektor (env SEARCH_BACKEND):
  firestore           : Firestore vector search (find_nearest, koleksi regulation_chunks)
  local (auto bila Firestore belum dikonfigurasi) : numpy atas data/chunks/embeddings_<penyedia>.npy (dibangun otomatis bila belum ada)
Default: pencarian vektor saja (terbaik pada test set, lihat data/eval/ABLASI.md). hybrid=True menambah kata kunci (RRF) - opsional, tidak dianjurkan.
Metadata/penyaring status memakai data/chunks/chunks.jsonl (sertakan file ini di deployment).
Aturan berstatus 'dicabut' dan Penjelasan disembunyikan secara default; panduan prosedur ikut dicari.
"""
from __future__ import annotations
import collections, json, math, os, re
from pathlib import Path
from embed_util import load_env, get_encoder, load_or_build_embeddings, provider_name
from glossary import expand_query

ROOT = Path(__file__).resolve().parent.parent
COLLECTION = os.getenv("FIRESTORE_COLLECTION", "regulation_chunks")
STOP = set("apa yang dan atau di ke dari untuk dengan pada adalah itu ini oleh akan dapat harus bagaimana berapa siapa apakah mana saya kita tidak sebagai dalam para suatu setiap jika maka agar bila serta juga lebih sudah telah ada cara syarat".split())
RRF_K = 60

_db = None
def set_firestore_client(db):
    """Backend memanggil ini sekali: search.set_firestore_client(fb()), agar memakai kredensial yang sama (mis. FIREBASE_CREDENTIALS)."""
    global _db; _db = db

def firestore_client():
    global _db
    if _db is None:
        from google.cloud import firestore
        load_env()
        _db = firestore.Client(project=os.getenv("FIREBASE_PROJECT_ID") or None, database=os.getenv("FIRESTORE_DATABASE", "(default)"))
    return _db

_corpus = None
def corpus():
    """chunks.jsonl + indeks kata (dimuat sekali)."""
    global _corpus
    if _corpus is None:
        rows = [json.loads(l) for l in open(ROOT / "data/chunks/chunks.jsonl", encoding="utf-8")]
        toks = [set(re.findall(r"[a-z0-9]+", r["text"].lower())) for r in rows]
        df = collections.Counter(w for t in toks for w in t)
        n = len(rows)
        _corpus = {"rows": rows, "byid": {r["id"]: r for r in rows}, "toks": toks,
                   "idf": {w: math.log(1 + n / c) for w, c in df.items()},
                   "common": {w for w, c in df.items() if c / n > 0.10}}  # 'hak', 'tanah', ... tidak informatif
    return _corpus

def query_terms(q: str):
    c = corpus()
    return [t for t in dict.fromkeys(re.findall(r"[a-z0-9]+", q.lower()))
            if len(t) > 2 and t not in STOP and t not in c["common"]]

def keyword_ranking(query: str, allowed) -> list:
    c = corpus(); terms = query_terms(query); scored = []
    for r, toks in zip(c["rows"], c["toks"]):
        if r["id"] in allowed:
            s = sum(c["idf"].get(t, 0) for t in terms if t in toks)
            if s > 0: scored.append((s, r["id"]))
    return [i for _, i in sorted(scored, reverse=True)]

def load_embeddings(provider: str | None = None):
    """Vektor chunk untuk penyedia embedding (env EMBED_PROVIDER: gemini | bge-m3). Cache di embeddings_<penyedia>.npy (tidak ikut git)."""
    return load_or_build_embeddings(corpus()["rows"], provider)

def vector_ranking(qvec, allowed, pool: int, backend: str, provider: str | None = None):
    """Kembalikan (daftar id terurut, dict id->dokumen dari backend jika ada)."""
    if backend == "local":
        import numpy as np
        order = np.argsort(-(load_embeddings(provider) @ qvec))
        rows = corpus()["rows"]
        return [rows[i]["id"] for i in order if rows[i]["id"] in allowed][:pool], {}
    from google.cloud.firestore_v1.vector import Vector
    from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
    docs = firestore_client().collection(COLLECTION).find_nearest(
        vector_field="embedding", query_vector=Vector([float(x) for x in qvec]),
        distance_measure=DistanceMeasure.COSINE, limit=min(pool * 4, 1000),
        distance_result_field="_dist").stream()  # ambil lebih, saring status/section di sini
    got = {d.id: d.to_dict() for d in docs}
    return [i for i in got if i in allowed][:pool], got

def cosine_scores(qvec, ids, backend: str, remote: dict, provider: str | None = None):
    """Kemiripan kosinus 0-1 untuk hasil akhir. Firestore: jarak dari find_nearest; sisanya dihitung dari vektor dokumen."""
    import numpy as np
    out, missing = {}, []
    for i in ids:
        if i in remote and "_dist" in remote[i]: out[i] = 1.0 - float(remote[i]["_dist"])
        else: missing.append(i)
    if missing:
        if backend == "local":
            emb = load_embeddings(provider)
            pos = {r["id"]: n for n, r in enumerate(corpus()["rows"])}
            for i in missing: out[i] = float(emb[pos[i]] @ qvec)
        else:  # hasil dari jalur kata kunci saja: ambil vektornya dari Firestore
            db = firestore_client()
            for d in db.get_all([db.collection(COLLECTION).document(i) for i in missing], field_paths=["embedding"]):
                out[d.id] = float(np.array(list(d.get("embedding"))) @ qvec) if d.exists else 0.0
    return {i: max(0.0, min(1.0, v)) for i, v in out.items()}

def search(query: str, top_k: int = 5, doc_slug: str | None = None, include_penjelasan: bool = False,
           include_dicabut: bool = False, hybrid: bool = False, pool: int = 40, backend: str | None = None,
           include_panduan: bool = True, k: int | None = None, provider: str | None = None):
    top_k = k or top_k  # 'k' = alias lama
    load_env()
    provider = provider_name(provider)  # 'gemini' (default) atau 'bge-m3'
    # 'auto': Firestore bila klien disuntikkan/kredensial ada, selain itu lokal (dari chunks.jsonl + embeddings_<penyedia>.npy)
    backend = backend or os.getenv("SEARCH_BACKEND") or ("firestore" if (_db is not None or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")) else "local")
    c = corpus()
    allowed = {r["id"] for r in c["rows"]
               if (doc_slug is None or r["doc_slug"] == doc_slug)
               and (include_penjelasan or r["section"] in ("batang_tubuh", "panduan"))
               and (include_panduan or r["section"] != "panduan")
               and (include_dicabut or not r["status"].startswith("dicabut"))}
    query = expand_query(query)  # SHM/HGB/balik nama -> istilah regulasi
    qvec = get_encoder(provider).encode_query(query)
    vec_ids, remote = vector_ranking(qvec, allowed, pool, backend, provider)
    lists = [vec_ids] + ([keyword_ranking(query, allowed)[:pool]] if hybrid else [])
    score = collections.defaultdict(float)
    for lst in lists:
        for rank, i in enumerate(lst, 1): score[i] += 1 / (RRF_K + rank)
    top = sorted(score.items(), key=lambda x: -x[1])[:top_k]
    cos = cosine_scores(qvec, [i for i, _ in top], backend, remote, provider)
    out = []
    for i, s in sorted(score.items(), key=lambda x: -x[1])[:top_k]:
        r = remote.get(i) or {}
        loc = c["byid"][i]
        teks = r.get("content", loc["text"])
        out.append({"id": i, "sumber": loc["doc"], "pasal": loc["pasal"], "teks": teks,
                    "asal": {"batang_tubuh": "regulasi"}.get(loc["section"], loc["section"]),
                    "score": round(cos[i], 4), "rank_score": round(s, 5),
                    "doc": loc["doc"], "section": loc["section"], "bab": loc["bab"], "status": loc["status"],
                    "page_start": loc["page_start"], "page_end": loc["page_end"], "content": teks})
    return out
