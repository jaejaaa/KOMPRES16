# JagaTanah — Data Pipeline (Data Engineer)
KOMPRES 16 · AI Legal Assistant Hukum Tanah

Pipeline: `data/raw/*.pdf` → `01_extract.py` (PyMuPDF / OCR Tesseract untuk PDF scan) → `02_chunk.py` (per Pasal) → `03_embed.py` (bge-m3) → pgvector (`sql/01_schema.sql`).

## Status
- [x] Hari 1 — 8 PDF terkumpul, teks terekstrak (6 dokumen di-OCR ulang)
- [x] Hari 2 — chunking per Pasal (1.452 chunk, termasuk 14 chunk panduan); lihat `data/chunks/report.txt`
- [x] Hari 2–3 — embedding bge-m3 (1024 dim) + upload ke Postgres/pgvector lokal (1.452 chunk, termasuk 14 chunk panduan)
- [x] Hari 3 — fungsi pencarian `scripts/04_search.py` (vektor; hybrid opsional)
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
| `score` | kemiripan kosinus **0–1** pertanyaan↔chunk. Ambang tolak: lihat bagian *Evaluasi* — pakai **≈ 0,6**, bukan 0,5 (pertanyaan hukum-tapi-tak-tercakup bersekor 0,55–0,67) |
| `rank_score` | skor untuk urutan (bukan 0–1); pada mode default urutan = kosinus menurun |

- Backend memanggil `search.set_firestore_client(fb())` sekali agar memakai kredensial yang sama.
- Backend otomatis: **Firestore** bila klien disuntikkan/kredensial ada, selain itu **local** (dari `chunks.jsonl` + `embeddings.npy`, ikut di repo). Paksa dengan `SEARCH_BACKEND=firestore|local`.
- Mode local sudah bisa dipakai **sekarang** tanpa Firestore. Catatan: pertanyaan tetap di-embed dengan `bge-m3` (unduh ±2,3 GB sekali; `pip install sentence-transformers numpy`). `embeddings.npy` terikat ke model itu — jika model diganti, jalankan ulang `03_embed.py`.
- Default **vektor saja** (terbaik pada test set, lihat `data/eval/ABLASI.md`); `hybrid=True` menambah kata kunci (tidak dianjurkan). `data/chunks/chunks.jsonl` tetap perlu ada di deployment (metadata & penyaring status).
- Default: batang tubuh + panduan; `dicabut` disembunyikan. Opsi: `doc_slug=`, `include_penjelasan=`, `include_dicabut=`, `include_panduan=False` (hanya regulasi), `hybrid=False`.
- Kolom `status` (`berlaku` / `diubah sebagian` / `dicabut` / `panduan`) sebaiknya dimunculkan di jawaban chatbot; untuk `asal="panduan"` beri catatan "bukan nasihat hukum, verifikasi ke Kantor Pertanahan".
- Pertanyaan awam ("balik nama") kini tertangani panduan; untuk pertanyaan regulasi lain tetap disarankan *query rewriting* LLM ke istilah UU.

### Adapter `retriever.py` (untuk `jawab_chat(retriever=...)`)
`Retriever().search(query, top_k) -> list[(Chunk, skor 0-1)]`; `Chunk` = `id, sumber, pasal, teks, asal, status, page_start, page_end, sitasi`.
Skor = kosinus murni; gunakan `Retriever.skor_terbaik(hasil)` untuk ambang "di luar cakupan".
`scripts/glossary.py` memperluas singkatan (SHM, HGB, AJB, BPHTB, "balik nama", ...) ke istilah regulasi sebelum pencarian.
Pertanyaan perbandingan/multi-hop ("bedanya SHM dan HGB") sebaiknya dipecah LLM jadi sub-query.

## Panduan prosedur (`data/panduan/`)
`balik-nama.json` (7 bagian) dan `cek-keaslian.json` (6 bagian). Kutipan Pasal diverifikasi ke korpus; butir bertanda
"praktik umum" berasal dari informasi publik sekunder dan **perlu diverifikasi** ke Kantor Pertanahan/PPAT sebelum masuk proposal.

## Hasil uji awal retrieval (9 pertanyaan, Pasal benar di top-5)
Uji kecil; angka evaluasi resmi memakai test set Q&A (Hari 4).
# KOMPRES16

## Test set & evaluasi retrieval
`data/eval/testset_qa.json`: 45 item (29 regulasi, 4 awam, 4 panduan, 1 jebakan aturan dicabut, 2 multi-Pasal, 5 di luar cakupan).
Tiap item: pertanyaan, jawaban acuan, Pasal rujukan, `bukti_kunci` (diverifikasi otomatis ke teks Pasal: `python scripts/06_eval_retrieval.py --validate`).
Jalankan evaluasi: `python scripts/06_eval_retrieval.py` → tabel Hit@k/MRR, sapuan ambang tolak, daftar pertanyaan yang meleset (`data/eval/hasil_retrieval.json`).

Hasil (vektor saja, top-5, 40 pertanyaan yang bisa dijawab): **Hit@1 0,68 · Hit@3 0,88 · Hit@5 0,93 · MRR 0,79**. Ablasi lengkap: `data/eval/ABLASI.md`.
Catatan: parameter dituning pada set yang sama → angka optimistis; untuk proposal gunakan set penguji terpisah.

Ambang tolak (kosinus terbaik): 0,50 → 3% valid ditolak, **60%** di luar cakupan lolos; 0,60 → 3% ditolak, 20% lolos. Pertanyaan yang *dekat topik tapi tak tercakup*
(mis. tarif PPh penjualan tanah = 0,67) tidak bisa dipisahkan oleh skor → chatbot harus diinstruksikan menjawab hanya dari konteks dan menyatakan "tidak ada di basis pengetahuan" bila konteks tidak memuat jawabannya.
