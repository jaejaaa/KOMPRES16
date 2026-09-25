# JagaTanah — Data Pipeline (Data Engineer)
KOMPRES 16 · AI Legal Assistant Hukum Tanah

Pipeline: `data/raw/*.pdf` → `01_extract.py` (PyMuPDF / OCR Tesseract untuk PDF scan) → `02_chunk.py` (per Pasal) → `03_embed.py` (bge-m3) → pgvector (`sql/01_schema.sql`).

## Status
- [x] Hari 1 — 8 PDF terkumpul, teks terekstrak (6 dokumen di-OCR ulang)
- [x] Hari 2 — chunking per Pasal (1.439 chunk); lihat `data/chunks/report.txt`
- [ ] Hari 2–3 — install sentence-transformers, embed, upload ke Supabase
- [ ] Hari 3 — 5–10 dokumen sintetis · Hari 4 — test set Q&A + panduan prosedur

## Catatan sumber
- UU 28/2009 (PDRD) hanya di-chunk untuk BPHTB (Pasal 85–93); UU 21/1997 ditandai `dicabut` dan PP 24/1997 `diubah sebagian` lewat kolom `status`.

## Gap OCR yang diketahui (Pasal tidak terbaca di scan)
PP 18/2021 Ps 66 & 85 sudah ditambal manual (`data/manual/`).
UU 21/1997 Ps 4, 9, 13, 24 juga sudah ditambal manual.
Masih hilang: KUHPerdata Ps 1122 (cek dulu apakah memang ada di teks asli).
