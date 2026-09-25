# JagaTanah — Data Pipeline (Data Engineer)
KOMPRES 16 · AI Legal Assistant Hukum Tanah

Pipeline: `data/raw/*.pdf` → `01_extract.py` (PyMuPDF / OCR Tesseract untuk PDF scan) → `02_chunk.py` (per Pasal) → `03_embed.py` (bge-m3) → pgvector (`sql/01_schema.sql`).

## Status
- [x] Hari 1 — 8 PDF terkumpul, teks terekstrak (6 dokumen di-OCR ulang)
- [x] Hari 2 — chunking per Pasal (1.453 chunk, termasuk 14 chunk panduan); lihat `data/chunks/report.txt`
- [x] Hari 2–3 — embedding bge-m3 (1024 dim) + upload ke Postgres/pgvector lokal (1.453 chunk, termasuk 14 chunk panduan)
- [x] Hari 3 — fungsi pencarian `scripts/04_search.py` (hybrid vektor + kata kunci)
- [ ] Firestore: menunggu project + service account + indeks vektor dari tim Backend
- [x] Hari 4 (sebagian) — panduan prosedur balik nama & cek keaslian
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
search("peralihan hak karena jual beli", top_k=5)
```
Tiap hasil: `id, sumber, pasal, teks, asal, score` (+ `doc, section, bab, status, page_start, page_end, rank_score`).

| kolom | isi |
|---|---|
| `id` | id chunk unik, mis. `pp-24-1997:bata:ps37` |
| `sumber` | nama dokumen, mis. `PP 24/1997`, atau `Panduan: Balik Nama Sertifikat Tanah` |
| `pasal` | nomor Pasal; untuk panduan berisi judul bagian |
| `teks` | isi chunk |
| `asal` | `regulasi` · `penjelasan` · `panduan` (**panduan = ringkasan prosedur, bukan teks hukum resmi**) |
| `score` | kemiripan kosinus **0–1** pertanyaan↔chunk. Uji awal: di luar topik ≤ 0,41; relevan ≥ 0,60 → ambang tolak awal **0,5** (tuning dengan test set) |
| `rank_score` | skor gabungan hybrid, hanya untuk urutan (bukan 0–1) |

- Backend memanggil `search.set_firestore_client(fb())` sekali agar memakai kredensial yang sama.
- Backend otomatis: **Firestore** bila klien disuntikkan/kredensial ada, selain itu **local** (dari `chunks.jsonl` + `embeddings.npy`, ikut di repo). Paksa dengan `SEARCH_BACKEND=firestore|local`.
- Mode local sudah bisa dipakai **sekarang** tanpa Firestore. Catatan: pertanyaan tetap di-embed dengan `bge-m3` (unduh ±2,3 GB sekali; `pip install sentence-transformers numpy`). `embeddings.npy` terikat ke model itu — jika model diganti, jalankan ulang `03_embed.py`.
- Hybrid: ranking vektor + kata kunci (dari `data/chunks/chunks.jsonl`, sertakan file ini di deployment) digabung RRF.
- Default: batang tubuh + panduan; `dicabut` disembunyikan. Opsi: `doc_slug=`, `include_penjelasan=`, `include_dicabut=`, `include_panduan=False` (hanya regulasi), `hybrid=False`.
- Kolom `status` (`berlaku` / `diubah sebagian` / `dicabut` / `panduan`) sebaiknya dimunculkan di jawaban chatbot; untuk `asal="panduan"` beri catatan "bukan nasihat hukum, verifikasi ke Kantor Pertanahan".
- Pertanyaan awam ("balik nama") kini tertangani panduan; untuk pertanyaan regulasi lain tetap disarankan *query rewriting* LLM ke istilah UU.

### Adapter `retriever.py` (untuk `jawab_chat(retriever=...)`)
`Retriever().search(query, top_k) -> list[(Chunk, skor 0-1)]`; `Chunk` = `id, sumber, pasal, teks, asal, status, page_start, page_end, sitasi`.
Skor = kosinus murni; urutan = hybrid → gunakan `Retriever.skor_terbaik(hasil)` untuk ambang "di luar cakupan".
`scripts/glossary.py` memperluas singkatan (SHM, HGB, AJB, BPHTB, "balik nama", ...) ke istilah regulasi sebelum pencarian.
Pertanyaan perbandingan/multi-hop ("bedanya SHM dan HGB") sebaiknya dipecah LLM jadi sub-query.

## Panduan prosedur (`data/panduan/`)
`balik-nama.json` (7 bagian) dan `cek-keaslian.json` (6 bagian). Kutipan Pasal diverifikasi ke korpus; butir bertanda
"praktik umum" berasal dari informasi publik sekunder dan **perlu diverifikasi** ke Kantor Pertanahan/PPAT sebelum masuk proposal.

## Hasil uji awal retrieval (9 pertanyaan, Pasal benar di top-5)
regulasi saja: vektor 7/9 · hybrid 8/9; panduan: 4/4 (`SEARCH_BACKEND=local python scripts/04_search.py`).
Uji kecil; angka evaluasi resmi memakai test set Q&A (Hari 4).
# KOMPRES16
