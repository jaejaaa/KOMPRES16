"""Langkah 3: embed semua chunk dengan bge-m3 -> data/chunks/embeddings.npy, lalu (--upload) masukkan ke Postgres/pgvector.
DATABASE_URL dibaca dari .env (mis. postgresql://jagatanah@localhost:5433/jagatanah)."""
import json, os, sys
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
import numpy as np

CH = Path("data/chunks")
MODEL = "BAAI/bge-m3"  # 1024 dimensi
chunks = [json.loads(l) for l in open(CH / "chunks.jsonl")]
# prefix konteks agar embedding tahu asal Pasal-nya; dipakai juga saat membuat embedding query
from embed_util import doc_text  # satu definisi, dipakai juga oleh search.py

def load_env():
    if Path(".env").exists():
        for l in Path(".env").read_text().splitlines():
            if "=" in l and not l.startswith("#"):
                k, v = l.split("=", 1); os.environ.setdefault(k.strip(), v.strip())

if __name__ == "__main__":
    import torch
    from sentence_transformers import SentenceTransformer
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = SentenceTransformer(MODEL, device=device)
    model.max_seq_length = 1024
    emb = model.encode([doc_text(c) for c in chunks], batch_size=8, normalize_embeddings=True, show_progress_bar=True)
    np.save(CH / "embeddings.npy", emb.astype("float32"))
    print("embeddings:", emb.shape, "device:", device)

    if "--upload" in sys.argv:
        import psycopg
        from pgvector.psycopg import register_vector
        load_env()
        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            register_vector(conn)
            with conn.cursor() as cur:
                cur.execute("truncate regulation_chunks")
                cur.executemany("""insert into regulation_chunks
                  (id,doc_slug,doc,doc_title,section,bab,pasal,pasal_inferred,status,page_start,page_end,content,embedding)
                  values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                  [(c["id"], c["doc_slug"], c["doc"], c["doc_title"], c["section"], c["bab"], c["pasal"],
                    c["pasal_inferred"], c["status"], c["page_start"], c["page_end"], c["text"], e)
                   for c, e in zip(chunks, emb)])
        print("upload selesai:", len(chunks), "chunk")
