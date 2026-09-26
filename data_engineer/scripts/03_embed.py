"""Langkah 3: bangun embedding semua chunk untuk satu penyedia -> data/chunks/embeddings_<penyedia>.npy

  python scripts/03_embed.py                       # penyedia dari EMBED_PROVIDER (default gemini)
  python scripts/03_embed.py --provider bge-m3     # model lokal
  python scripts/03_embed.py --force               # bangun ulang walau cache masih valid
Butuh GEMINI_API_KEY di data_engineer/.env untuk 'gemini'."""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from embed_util import CHUNKS_DIR, cache_paths, get_encoder, load_or_build_embeddings, provider_name

ap = argparse.ArgumentParser()
ap.add_argument("--provider"); ap.add_argument("--force", action="store_true")
a = ap.parse_args()
p = provider_name(a.provider)
rows = [json.loads(l) for l in open(CHUNKS_DIR / "chunks.jsonl")]
if a.force:
    for f in cache_paths(p): f.unlink(missing_ok=True)
emb = load_or_build_embeddings(rows, p)
print(f"embeddings '{p}' ({get_encoder(p).tag}): {emb.shape}")
