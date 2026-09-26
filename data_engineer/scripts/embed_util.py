"""Utilitas bersama: .env, penyedia embedding, teks chunk, dan cache vektor per penyedia.

Penyedia (env EMBED_PROVIDER, default 'gemini'):
  gemini  : (atau 'gemini:<nama-model>', mis. gemini:gemini-embedding-001) Google gemini-embedding-2 (default) lewat API (butuh GEMINI_API_KEY). Dimensi default 768 (GEMINI_EMBED_DIM), dinormalisasi manual.
  bge-m3  : BAAI/bge-m3 dijalankan lokal (sentence-transformers, ±2,3 GB). Dipertahankan untuk perbandingan.
Vektor di-cache di data/chunks/embeddings_<penyedia>.npy + .meta.json (sidik jari teks+model), dibangun ulang otomatis bila usang.
"""
from __future__ import annotations
import hashlib, json, os, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHUNKS_DIR = ROOT / "data/chunks"
DEFAULT_PROVIDER = "gemini"


def load_env():
    env = ROOT / ".env"  # data_engineer/.env, bukan cwd
    if env.exists():
        for l in env.read_text(encoding="utf-8").splitlines():
            if "=" in l and not l.lstrip().startswith("#"):
                k, v = l.split("=", 1); os.environ.setdefault(k.strip(), v.strip())


def provider_name(p: str | None = None) -> str:
    load_env()
    return (p or os.getenv("EMBED_PROVIDER") or DEFAULT_PROVIDER).lower()


def doc_text(c) -> str:
    """Teks yang di-embed untuk sebuah chunk (satu definisi untuk 03_embed.py, search.py, dan pembangunan ulang otomatis)."""
    if c["section"] == "panduan": return f"{c['doc']} - {c['pasal']}: {c['text']}"
    ctx = c.get("konteks") or c["doc_title"]  # judul Bab/Bagian memberi konteks (mis. 'Hipotek') pada Pasal yang pendek
    return f"{c['doc']} - {ctx} - Pasal {c['pasal']}: {c['text']}"


def _normalize(m):
    import numpy as np
    m = np.asarray(m, dtype="float32")
    n = np.linalg.norm(m, axis=1, keepdims=True)
    return (m / np.clip(n, 1e-12, None)).astype("float32")


class BgeM3:
    name = "bge-m3"
    def __init__(self):
        self.tag, self._model = "BAAI/bge-m3", None
    def _get(self):
        if self._model is None:
            import torch
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.tag, device="mps" if torch.backends.mps.is_available() else "cpu")
            self._model.max_seq_length = 1024
        return self._model
    def encode_docs(self, texts):
        return self._get().encode(texts, batch_size=8, normalize_embeddings=True, show_progress_bar=True).astype("float32")
    def encode_query(self, text):
        return self._get().encode([text], normalize_embeddings=True)[0].astype("float32")


class KuotaHarianHabis(RuntimeError):
    """Kuota harian API habis; progres sudah tersimpan, jalankan lagi setelah kuota di-reset."""


class Gemini:
    name = "gemini"
    BATCH = int(os.getenv("GEMINI_EMBED_BATCH", "20"))  # teks per permintaan; batch besar mudah kena 429 di tier gratis
    def __init__(self, model: str | None = None):
        load_env()
        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY belum diisi. Buat key di aistudio.google.com lalu simpan di data_engineer/.env "
                               "(GEMINI_API_KEY=...). Jangan di-commit.")
        from google import genai
        self.client = genai.Client(api_key=key)
        self.model = model or os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-2")
        self.dim = int(os.getenv("GEMINI_EMBED_DIM", "768"))
        self.tag = f"{self.model}@{self.dim}"
        self.n_calls = 0

    def _embed(self, texts, task):
        from google.genai import types
        cfg = types.EmbedContentConfig(task_type=task, output_dimensionality=self.dim)
        for attempt in range(7):
            try:
                r = self.client.models.embed_content(model=self.model, contents=texts, config=cfg)
                self.n_calls += 1
                return _normalize([e.values for e in r.embeddings])  # dimensi < 3072 tidak dinormalisasi oleh API
            except Exception as e:  # hanya ulangi galat sementara (kuota/beban); galat lain (key salah, dll.) langsung naik
                s = str(e)
                if "PerDay" in s:  # kuota harian: menunggu beberapa detik tidak menolong
                    raise KuotaHarianHabis("Kuota harian embedding Gemini (tier gratis) habis.") from e
                if attempt == 6 or not any(k in s for k in ("429", "503", "500", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "overloaded")):
                    raise
                wait = min(2 ** attempt, 60)
                print(f"  [gemini] kuota/beban ({s[:60].strip()}...) -> tunggu {wait}s, percobaan {attempt + 1}/7", flush=True)
                time.sleep(wait)

    def _partial_path(self):
        return CHUNKS_DIR / f"embeddings_gemini.partial.{self.tag.replace('/', '_')}.npz"

    def encode_docs(self, texts):
        """Progres disimpan tiap batch (embeddings_gemini.partial.*.npz) sehingga bisa dilanjutkan bila kuota habis / proses berhenti."""
        import numpy as np
        keys = [hashlib.sha1(t.encode()).hexdigest() for t in texts]
        done, pf = {}, self._partial_path()
        if pf.exists():
            z = np.load(pf, allow_pickle=False)
            done = dict(zip(z["keys"].tolist(), z["vecs"]))
        todo = [i for i, k in enumerate(keys) if k not in done]
        print(f"  [gemini] {len(texts) - len(todo)}/{len(texts)} sudah ada di cache progres; sisa {len(todo)}", flush=True)
        def simpan():
            if done: np.savez(pf, keys=np.array(list(done.keys())), vecs=np.vstack(list(done.values())))
        try:
            for s in range(0, len(todo), self.BATCH):
                idx = todo[s:s + self.BATCH]
                vecs = self._embed([texts[i] for i in idx], "RETRIEVAL_DOCUMENT")
                for i, v in zip(idx, vecs): done[keys[i]] = v
                simpan()
                print(f"  [gemini] {len(texts) - len(todo) + s + len(idx)}/{len(texts)}", flush=True)
        except KuotaHarianHabis as e:
            simpan()
            raise KuotaHarianHabis(f"{e} Progres tersimpan: {len(done)}/{len(texts)} chunk. Jalankan lagi setelah kuota harian "
                                   f"di-reset (umumnya tengah malam waktu Pasifik) untuk melanjutkan; yang sudah selesai tidak diulang.") from e
        out = np.vstack([done[k] for k in keys])
        pf.unlink(missing_ok=True)
        return out

    def encode_query(self, text):
        return self._embed([text], "RETRIEVAL_QUERY")[0]


_encoders: dict = {}
def get_encoder(provider: str | None = None):
    p = provider_name(provider)
    if p not in _encoders:
        if p == "gemini" or p.startswith("gemini:"): _encoders[p] = Gemini(p.split(":", 1)[1] if ":" in p else None)  # mis. gemini:gemini-embedding-2
        elif p in ("bge-m3", "bge", "bgem3"): _encoders[p] = BgeM3()
        else: raise ValueError(f"EMBED_PROVIDER tidak dikenal: {p!r} (pilih 'gemini' atau 'bge-m3')")
    return _encoders[p]


def cache_paths(provider: str):
    safe = provider.replace(":", "_").replace("/", "_")
    return CHUNKS_DIR / f"embeddings_{safe}.npy", CHUNKS_DIR / f"embeddings_{safe}.meta.json"


def fingerprint(tag: str, texts) -> str:
    h = hashlib.sha1(tag.encode())
    for t in texts: h.update(b"\0" + t.encode())
    return h.hexdigest()


_cache: dict = {}
def load_or_build_embeddings(rows, provider: str | None = None):
    """Vektor semua chunk untuk penyedia ini. Dibangun ulang bila file tidak ada atau teks/model berubah."""
    import numpy as np
    p = provider_name(provider)
    texts = [doc_text(r) for r in rows]
    if p in _cache and _cache[p][0] == len(texts): return _cache[p][1]
    enc = get_encoder(p)
    npy, meta = cache_paths(p)
    fp = fingerprint(enc.tag, texts)
    if npy.exists() and meta.exists() and json.loads(meta.read_text(encoding="utf-8")).get("fingerprint") == fp:
        emb = np.load(npy)
    else:
        print(f"[embed] vektor '{p}' belum ada/usang -> membangun {len(texts)} embedding...", flush=True)
        emb = enc.encode_docs(texts)
        np.save(npy, emb)
        meta.write_text(json.dumps({"provider": p, "model": enc.tag, "n": len(texts), "dim": int(emb.shape[1]),
                                    "fingerprint": fp, "dibuat": time.strftime("%Y-%m-%d %H:%M")}, indent=1), encoding="utf-8")
    _cache[p] = (len(texts), emb)
    return emb
