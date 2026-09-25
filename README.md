# JagaTanah — Data Pipeline (Data Engineer)
KOMPRES 16 · AI Legal Assistant Hukum Tanah

Pipeline: `data/raw/*.pdf` → `01_extract.py` (PyMuPDF / OCR Tesseract untuk PDF scan) → `02_chunk.py` (per Pasal) → `03_embed.py` (bge-m3) → pgvector (`sql/01_schema.sql`).

## Status
- [x] Hari 1 — 8 PDF terkumpul, teks terekstrak (6 dokumen di-OCR ulang)
- [x] Hari 2 — chunking per Pasal (1.439 chunk); lihat `data/chunks/report.txt`
- [x] Hari 2–3 — embedding bge-m3 (1024 dim) + upload ke Postgres/pgvector lokal (1.439 chunk)
- [x] Hari 3 — fungsi pencarian `scripts/04_search.py` (hybrid vektor + kata kunci)
- [ ] Hari 3 — 5–10 dokumen sintetis · Hari 4 — test set Q&A + panduan prosedur

## Catatan sumber
- UU 28/2009 (PDRD) hanya di-chunk untuk BPHTB (Pasal 85–93); UU 21/1997 ditandai `dicabut` dan PP 24/1997 `diubah sebagian` lewat kolom `status`.

## Gap OCR yang diketahui
Tidak ada Pasal yang hilang. Pasal yang gagal terbaca ditambal manual di `data/manual/`:
PP 18/2021 Ps 66 & 85 · UU 21/1997 Ps 4, 9, 13, 24 · KUHPerdata Ps 1162 (typo sumber: tanpa kata "Pasal").

## Sumber file (9 PDF, semua dipakai)
KUHPerdata memakai `Kitab-Undang-undang-Hukum-Perdata.pdf` (4 Buku; hanya Buku II, hal. 90–189, yang di-chunk).

## Menjalankan database lokal (Postgres 17 + pgvector, port 5433)
```bash
export LC_ALL=en_US.UTF-8
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .pgdata -o "-p 5433 -k /tmp" -l .pgdata/server.log start   # stop: ... stop
```
`.env` berisi `DATABASE_URL=postgresql://jagatanah@localhost:5433/jagatanah` (lihat `.env.example`).
Bangun ulang: `python scripts/01_extract.py` → `02_chunk.py` → `03_embed.py --upload`.

## Kontrak pencarian untuk AI Engineer
```python
from search import search   # scripts/04_search.py
search("peralihan hak karena jual beli", k=5)
# -> [{id, doc, pasal, section, bab, status, page_start, page_end, content, score}, ...]
```
- Default: hybrid (vektor + kata kunci, RRF), hanya batang tubuh, aturan berstatus `dicabut` disembunyikan.
- Opsi: `doc_slug=`, `include_penjelasan=`, `include_dicabut=`, `hybrid=False`.
- Kolom `status` (`berlaku` / `diubah sebagian` / `dicabut`) sebaiknya dimunculkan di jawaban chatbot.

## Hasil uji awal retrieval (9 pertanyaan, Pasal benar di top-5)
vektor saja 7/9 · hybrid 8/9. Masih gagal: bahasa awam "balik nama" tidak cocok dengan istilah UU
("peralihan hak"/"pendaftaran peralihan hak") → perlu *query rewriting* oleh LLM di sisi AI Engineer.
Ini uji kecil; evaluasi sebenarnya memakai test set Q&A (Hari 4).
