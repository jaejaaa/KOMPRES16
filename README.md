# JagaTanah — Data Pipeline (Data Engineer)
KOMPRES 16 · AI Legal Assistant Hukum Tanah

Pipeline: `data/raw/*.pdf` → `01_extract.py` (PyMuPDF / OCR Tesseract untuk PDF scan) → `02_chunk.py` (per Pasal) → `03_embed.py` (bge-m3) → pgvector (`sql/01_schema.sql`).

## Status
- [x] Hari 1 — 8 PDF terkumpul, teks terekstrak (6 dokumen di-OCR ulang)
- [x] Hari 2 — chunking per Pasal (1.439 chunk); lihat `data/chunks/report.txt`
- [x] Hari 2–3 — embedding bge-m3 (1024 dim) + upload ke Postgres/pgvector lokal (1.439 chunk)
- [x] Hari 3 — fungsi pencarian `scripts/04_search.py` (hybrid vektor + kata kunci)
- [ ] Firestore: menunggu project + service account + indeks vektor dari tim Backend
- [ ] Hari 3 — 5–10 dokumen sintetis · Hari 4 — test set Q&A + panduan prosedur

## Catatan sumber
- UU 28/2009 (PDRD) hanya di-chunk untuk BPHTB (Pasal 85–93); UU 21/1997 ditandai `dicabut` dan PP 24/1997 `diubah sebagian` lewat kolom `status`.

## Gap OCR yang diketahui
Tidak ada Pasal yang hilang. Pasal yang gagal terbaca ditambal manual di `data/manual/`:
PP 18/2021 Ps 66 & 85 · UU 21/1997 Ps 4, 9, 13, 24 · KUHPerdata Ps 1162 (typo sumber: tanpa kata "Pasal").

## Sumber file (9 PDF, semua dipakai)
KUHPerdata memakai `Kitab-Undang-undang-Hukum-Perdata.pdf` (4 Buku; hanya Buku II, hal. 90–189, yang di-chunk).

## Penyimpanan bersama: Firestore (keputusan tim)
Knowledge base disimpan di **Firestore vector search** (koleksi `regulation_chunks`, vektor 1024 dimensi).
- Setup oleh pemilik project: [docs/FIRESTORE_SETUP.md](docs/FIRESTORE_SETUP.md) (Firestore Native, service account, rules, indeks vektor).
- Upload: `python scripts/05_upload_firestore.py` (`--dry-run` untuk validasi tanpa koneksi).
- Postgres+pgvector lokal (`sql/`, `.pgdata/`) hanya untuk uji awal; tidak lagi dipakai (legacy).

Pipeline lengkap: `01_extract.py` → `02_chunk.py` → `03_embed.py` → `05_upload_firestore.py`.
(`03_embed.py --upload` hanya untuk Postgres lokal legacy; untuk Firestore cukup tanpa `--upload`.)

## Kontrak pencarian untuk AI Engineer
```python
from search import search   # scripts/search.py  (tambahkan scripts/ ke sys.path)
search("peralihan hak karena jual beli", k=5)
# -> [{id, doc, pasal, section, bab, status, page_start, page_end, content, score}, ...]
```
- `SEARCH_BACKEND=firestore` (default) atau `local` (offline dari `embeddings.npy`, untuk uji).
- Hybrid: ranking vektor (Firestore) + kata kunci (dari `data/chunks/chunks.jsonl`, sertakan file ini di deployment) digabung RRF.
- Default: hanya batang tubuh; aturan berstatus `dicabut` disembunyikan. Opsi: `doc_slug=`, `include_penjelasan=`, `include_dicabut=`, `hybrid=False`.
- Kolom `status` (`berlaku` / `diubah sebagian` / `dicabut`) sebaiknya dimunculkan di jawaban chatbot.
- Pertanyaan awam ("balik nama") perlu di-*rewrite* LLM ke istilah UU ("peralihan hak") sebelum `search`.

## Hasil uji awal retrieval (9 pertanyaan, Pasal benar di top-5)
vektor saja 7/9 · hybrid 8/9 (`SEARCH_BACKEND=local python scripts/04_search.py`).
Uji kecil; angka evaluasi resmi memakai test set Q&A (Hari 4).
