"""Utilitas bersama: muat .env dan model bge-m3 (dipakai untuk embedding query)."""
import os
from pathlib import Path
_model = None
def load_env():
    env = Path(__file__).resolve().parent.parent / ".env"  # root project, bukan cwd
    if env.exists():
        for l in env.read_text().splitlines():
            if "=" in l and not l.startswith("#"):
                k, v = l.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
def get_model():
    global _model
    if _model is None:
        import torch
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("BAAI/bge-m3", device="mps" if torch.backends.mps.is_available() else "cpu")
    return _model

def doc_text(c) -> str:
    """Teks yang di-embed untuk sebuah chunk (harus sama di 03_embed.py dan saat membangun ulang embeddings otomatis)."""
    if c["section"] == "panduan": return f"{c['doc']} - {c['pasal']}: {c['text']}"
    ctx = c.get("konteks") or c["doc_title"]  # judul Bab/Bagian memberi konteks (mis. 'Hipotek') pada Pasal yang pendek
    return f"{c['doc']} - {ctx} - Pasal {c['pasal']}: {c['text']}"
