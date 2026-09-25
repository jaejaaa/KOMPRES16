"""Langkah 3: embed semua chunk (bge-m3) -> data/chunks/embeddings.npy.
Upload ke Supabase: set SUPABASE_DB_URL lalu jalankan dengan --upload."""
import json, os, sys
from pathlib import Path
import numpy as np

CH = Path("data/chunks")
chunks = [json.loads(l) for l in open(CH / "chunks.jsonl")]
# prefix konteks agar embedding tahu asal Pasal-nya
texts = [f"{c['doc']} Pasal {c['pasal']} ({c['doc_title']}): {c['text']}" for c in chunks]

from sentence_transformers import SentenceTransformer
model = SentenceTransformer("BAAI/bge-m3")
emb = model.encode(texts, batch_size=16, normalize_embeddings=True, show_progress_bar=True)
np.save(CH / "embeddings.npy", emb.astype("float32"))
print("embeddings:", emb.shape)

if "--upload" in sys.argv:
    import psycopg
    from pgvector.psycopg import register_vector
    with psycopg.connect(os.environ["SUPABASE_DB_URL"]) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            for c, e in zip(chunks, emb):
                cur.execute("""insert into regulation_chunks
                  (id,doc_slug,doc,doc_title,section,bab,pasal,pasal_inferred,status,page_start,page_end,content,embedding)
                  values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                  on conflict (id) do update set content=excluded.content, embedding=excluded.embedding""",
                  (c["id"], c["doc_slug"], c["doc"], c["doc_title"], c["section"], c["bab"], c["pasal"],
                   c["pasal_inferred"], c["status"], c["page_start"], c["page_end"], c["text"], e))
    print("upload selesai")
