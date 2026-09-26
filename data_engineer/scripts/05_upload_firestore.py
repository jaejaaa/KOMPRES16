"""Langkah 5: upload chunk + embedding ke Firestore (koleksi regulation_chunks). Idempotent (id dokumen = id chunk).

  python scripts/05_upload_firestore.py --dry-run   # validasi saja, tanpa koneksi
  python scripts/05_upload_firestore.py             # upload
  python scripts/05_upload_firestore.py --prune     # + hapus dokumen lama yang tidak ada lagi di chunks.jsonl
Kredensial: GOOGLE_APPLICATION_CREDENTIALS (path file service account) di .env. Jangan di-commit."""
import json, os, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from embed_util import load_env, load_or_build_embeddings

CH = Path(__file__).resolve().parent.parent / "data/chunks"
COLLECTION = os.getenv("FIRESTORE_COLLECTION", "regulation_chunks")

def build_docs():
    chunks = [json.loads(l) for l in open(CH / "chunks.jsonl")]
    emb = load_or_build_embeddings(chunks)  # penyedia dari EMBED_PROVIDER; dibangun bila belum ada
    assert len(chunks) == len(emb), f"jumlah chunk ({len(chunks)}) != embedding ({len(emb)})"
    norms = np.linalg.norm(emb, axis=1); assert np.allclose(norms, 1, atol=1e-3), "embedding belum ternormalisasi"
    assert len({c["id"] for c in chunks}) == len(chunks), "id chunk tidak unik"
    for c, e in zip(chunks, emb):
        yield c["id"], {k: c[k] for k in ("doc_slug", "doc", "doc_title", "section", "bab", "konteks", "pasal", "pasal_inferred",
                                          "status", "page_start", "page_end")} | {
            "content": c["text"], "is_active": not c["status"].startswith("dicabut"), "embedding": e}

if __name__ == "__main__":
    docs = list(build_docs())
    size = max(len(json.dumps({k: v for k, v in d.items() if k != "embedding"})) + len(d["embedding"]) * 8 for _, d in docs)
    print(f"{len(docs)} dokumen valid | dokumen terbesar ≈ {size/1024:.0f} KiB (batas Firestore 1 MiB)")
    if "--dry-run" in sys.argv: sys.exit(0)

    load_env()
    from google.cloud import firestore
    from google.cloud.firestore_v1.vector import Vector
    db = firestore.Client(project=os.getenv("FIREBASE_PROJECT_ID") or None, database=os.getenv("FIRESTORE_DATABASE", "(default)"))
    col = db.collection(COLLECTION)
    for i in range(0, len(docs), 400):  # batas 500 operasi per batch
        batch = db.batch()
        for doc_id, d in docs[i:i + 400]:
            batch.set(col.document(doc_id), {**d, "embedding": Vector([float(x) for x in d["embedding"]])})
        batch.commit(); print(f"  {min(i + 400, len(docs))}/{len(docs)}")
    if "--prune" in sys.argv:
        keep = {i for i, _ in docs}
        stale = [d.reference for d in col.select([]).stream() if d.id not in keep]
        for j in range(0, len(stale), 400):
            b = db.batch(); [b.delete(r) for r in stale[j:j + 400]]; b.commit()
        print("dokumen usang dihapus:", len(stale))
    print("upload selesai. Pastikan indeks vektor sudah dibuat (docs/FIRESTORE_SETUP.md)")
