"""Langkah 3: embed semua chunk dengan bge-m3 -> data/chunks/embeddings.npy (dibaca oleh search.py)."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import numpy as np

CH = Path("data/chunks")
MODEL = "BAAI/bge-m3"  # 1024 dimensi
chunks = [json.loads(l) for l in open(CH / "chunks.jsonl")]
# prefix konteks agar embedding tahu asal Pasal-nya; dipakai juga saat membuat embedding query
from embed_util import doc_text  # satu definisi, dipakai juga oleh search.py

if __name__ == "__main__":
    import torch
    from sentence_transformers import SentenceTransformer
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = SentenceTransformer(MODEL, device=device)
    model.max_seq_length = 1024
    emb = model.encode([doc_text(c) for c in chunks], batch_size=8, normalize_embeddings=True, show_progress_bar=True)
    np.save(CH / "embeddings.npy", emb.astype("float32"))
    print("embeddings:", emb.shape, "device:", device)
