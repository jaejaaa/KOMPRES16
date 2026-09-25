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
