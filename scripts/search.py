"""Pencarian regulasi untuk RAG (dipakai AI Engineer / Backend).

    from search import search
    search("peralihan hak karena jual beli", k=5)
    # -> [{id, doc, pasal, section, bab, status, page_start, page_end, content, score}, ...]

Backend ranking vektor (env SEARCH_BACKEND):
  firestore (default) : Firestore vector search (find_nearest, koleksi regulation_chunks)
  local               : numpy atas data/chunks/embeddings.npy (offline, untuk uji/dev)
Sisi kata kunci memakai data/chunks/chunks.jsonl (sertakan file ini di deployment); hasil digabung dengan RRF.
Aturan berstatus 'dicabut' dan Penjelasan disembunyikan secara default.
"""
from __future__ import annotations
import collections, json, math, os, re
from pathlib import Path
from embed_util import load_env, get_model

ROOT = Path(__file__).resolve().parent.parent
COLLECTION = os.getenv("FIRESTORE_COLLECTION", "regulation_chunks")
STOP = set("apa yang dan atau di ke dari untuk dengan pada adalah itu ini oleh akan dapat harus bagaimana berapa siapa apakah mana saya kita tidak sebagai dalam para suatu setiap jika maka agar bila serta juga lebih sudah telah ada cara syarat".split())
RRF_K = 60

_corpus = None
def corpus():
    """chunks.jsonl + indeks kata (dimuat sekali)."""
    global _corpus
    if _corpus is None:
        rows = [json.loads(l) for l in open(ROOT / "data/chunks/chunks.jsonl")]
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

_emb = None
def vector_ranking(qvec, allowed, pool: int, backend: str):
    """Kembalikan (daftar id terurut, dict id->dokumen dari backend jika ada)."""
    global _emb
    if backend == "local":
        import numpy as np
        if _emb is None: _emb = np.load(ROOT / "data/chunks/embeddings.npy")
        order = np.argsort(-(_emb @ qvec))
        rows = corpus()["rows"]
        return [rows[i]["id"] for i in order if rows[i]["id"] in allowed][:pool], {}
    from google.cloud import firestore
    from google.cloud.firestore_v1.vector import Vector
    from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
    load_env()
    db = firestore.Client(project=os.getenv("FIREBASE_PROJECT_ID") or None, database=os.getenv("FIRESTORE_DATABASE", "(default)"))
    docs = db.collection(COLLECTION).find_nearest(
        vector_field="embedding", query_vector=Vector([float(x) for x in qvec]),
        distance_measure=DistanceMeasure.COSINE, limit=min(pool * 4, 1000)).stream()  # ambil lebih, saring status/section di sini
    got = {d.id: d.to_dict() for d in docs}
    return [i for i in got if i in allowed][:pool], got

def search(query: str, k: int = 5, doc_slug: str | None = None, include_penjelasan: bool = False,
           include_dicabut: bool = False, hybrid: bool = True, pool: int = 40, backend: str | None = None):
    backend = backend or os.getenv("SEARCH_BACKEND", "firestore")
    c = corpus()
    allowed = {r["id"] for r in c["rows"]
               if (doc_slug is None or r["doc_slug"] == doc_slug)
               and (include_penjelasan or r["section"] == "batang_tubuh")
               and (include_dicabut or not r["status"].startswith("dicabut"))}
    qvec = get_model().encode([query], normalize_embeddings=True)[0]
    vec_ids, remote = vector_ranking(qvec, allowed, pool, backend)
    lists = [vec_ids] + ([keyword_ranking(query, allowed)[:pool]] if hybrid else [])
    score = collections.defaultdict(float)
    for lst in lists:
        for rank, i in enumerate(lst, 1): score[i] += 1 / (RRF_K + rank)
    out = []
    for i, s in sorted(score.items(), key=lambda x: -x[1])[:k]:
        r = remote.get(i) or {}
        loc = c["byid"][i]
        out.append({"id": i, "doc": loc["doc"], "pasal": loc["pasal"], "section": loc["section"], "bab": loc["bab"],
                    "status": loc["status"], "page_start": loc["page_start"], "page_end": loc["page_end"],
                    "content": r.get("content", loc["text"]), "score": round(s, 5)})
    return out
