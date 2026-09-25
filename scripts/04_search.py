"""Langkah 4: fungsi similarity search + uji cepat. Dipakai AI Engineer:
    from search import search  # jalankan dari folder scripts/, atau tambahkan ke sys.path   ->  search("syarat balik nama sertifikat", k=5)
Output tiap hasil: doc, pasal, status, page, similarity, content."""
from __future__ import annotations
import os, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from embed_util import load_env, get_model

STOP = set("apa yang dan atau di ke dari untuk dengan pada adalah itu ini oleh akan dapat harus bagaimana berapa siapa apakah mana saya kita tidak sebagai dalam para suatu setiap jika maka agar bila serta juga lebih sudah telah ada cara syarat".split())

_common = None
def common_terms(max_df: float = 0.10):
    """Kata yang muncul di >10% chunk (mis. 'hak', 'tanah') tidak informatif untuk pencarian kata kunci."""
    global _common
    if _common is None:
        import json, collections
        f = Path(__file__).resolve().parent.parent / "data/chunks/chunks.jsonl"
        rows = [set(re.findall(r"[a-z0-9]+", json.loads(l)["text"].lower())) for l in open(f)]
        df = collections.Counter(w for r in rows for w in r)
        _common = {w for w, n in df.items() if n / len(rows) > max_df}
    return _common

def to_tsquery(q: str) -> str:
    toks = [t for t in re.findall(r"[a-z0-9]+", q.lower()) if len(t) > 2 and t not in STOP and t not in common_terms()]
    return " | ".join(dict.fromkeys(toks)) or "kosong"

def search(query: str, k: int = 5, doc_slug: str | None = None, include_penjelasan: bool = False,
           include_dicabut: bool = False, hybrid: bool = True):
    import psycopg
    from pgvector.psycopg import register_vector
    load_env()
    q = get_model().encode([query], normalize_embeddings=True)[0]
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        register_vector(conn)
        if hybrid:
            cur = conn.execute("select * from match_regulation_hybrid(%s::vector, %s, %s, %s, %s, %s)",
                               (q, to_tsquery(query), k, doc_slug, include_penjelasan, include_dicabut))
        else:
            cur = conn.execute("select * from match_regulation_chunks(%s::vector, %s, %s, %s, %s)",
                               (q, k, doc_slug, include_penjelasan, include_dicabut))
        cols = [d.name for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]

if __name__ == "__main__":
    qs = sys.argv[1:] or [
        "Apa syarat dan tata cara balik nama sertifikat tanah?",
        "Berapa tarif BPHTB yang harus dibayar pembeli?",
        "Apakah sertifikat elektronik sah sebagai alat bukti?",
        "Apa itu tanah musnah dan apakah haknya hapus?",
        "Siapa yang boleh memiliki hak milik atas tanah?",
        "Data pribadi pemilik tanah harus dilindungi bagaimana?",
        "Berapa lama jangka waktu hak guna bangunan?",
    ]
    for q in qs:
        print(f"\n### {q}")
        for r in search(q, 3):
            print(f"  {r.get('similarity', r.get('score')):.3f}  {r['doc']} Pasal {r['pasal']} [{r['status']}] hal.{r['page_start']}: {r['content'][:90]!r}")
