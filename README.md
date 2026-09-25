# JagaTanah — Data Pipeline (Data Engineer)
KOMPRES 16 · AI Legal Assistant Hukum Tanah

Pipeline: `data/raw/*.pdf` → `01_extract.py` (PyMuPDF / OCR Tesseract untuk PDF scan) → `02_chunk.py` (per Pasal) → `03_embed.py` (bge-m3) → pgvector (`sql/01_schema.sql`).

## Status
- [x] Hari 1 — 8 PDF terkumpul, teks terekstrak (6 dokumen di-OCR ulang)
- [x] Hari 2 — chunking per Pasal (1.442 chunk); lihat `data/chunks/report.txt`
- [ ] Hari 2–3 — install sentence-transformers, embed, upload ke Supabase
- [ ] Hari 3 — 5–10 dokumen sintetis · Hari 4 — test set Q&A + panduan prosedur

## Catatan sumber
- UU 28/2009 (PDRD) hanya di-chunk untuk BPHTB (Pasal 85–93); UU 21/1997 ditandai `dicabut` dan PP 24/1997 `diubah sebagian` lewat kolom `status`.

## Gap OCR yang diketahui
Tidak ada Pasal yang hilang. Pasal yang gagal terbaca ditambal manual di `data/manual/`:
PP 18/2021 Ps 66 & 85 · UU 21/1997 Ps 4, 9, 13, 24 · KUHPerdata Ps 1162 (typo sumber: tanpa kata "Pasal").

## Sumber file (9 PDF, semua dipakai)
KUHPerdata memakai `Kitab-Undang-undang-Hukum-Perdata.pdf` (4 Buku; hanya Buku II, hal. 90–189, yang di-chunk).
