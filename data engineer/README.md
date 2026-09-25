# Data Engineer — Knowledge Base Regulasi Hukum Tanah

Bagian dari [KOMPRES 16](../README.md). Tugas: menyiapkan "otak referensi" chatbot, yaitu isi regulasi yang bisa dicari.

**Alur:** `data/raw/*.pdf` → `01_extract.py` (teks; OCR untuk PDF scan) → `02_chunk.py` (potong per Pasal) → `03_embed.py` (embedding) → `search()` / `Retriever` dipakai chatbot.

## Isi folder

| Path | Isi |
|---|---|
| `data/raw/` | 9 PDF regulasi sumber (semua dipakai) |
| `data/extracted/` | Teks hasil ekstraksi per halaman (turunan, dibangun ulang oleh `01_extract.py`) |
| `data/manual/` | Pasal yang gagal terbaca OCR, diketik manual dari PDF asli |
| `data/panduan/` | Panduan prosedur: balik nama, cek keaslian sertifikat |
| `data/chunks/` | `chunks.jsonl` (1.452 chunk), `report.txt`; `embeddings.npy` dibangun otomatis (tidak masuk git) |
| `data/eval/` | `testset_qa.json` (45 pertanyaan), `ABLASI.md`, `hasil_retrieval.json` |
| `scripts/` | Pipeline `01`–`06`, plus `search.py`, `retriever.py`, `glossary.py`, `embed_util.py` |
| `docs/FIRESTORE_SETUP.md` | Opsional; hanya bila vektor disimpan di Firestore (belum diputuskan) |

## Sumber regulasi
UUPA (UU 5/1960), PP 24/1997, PP 18/2021, UU 21/1997 (BPHTB), Permen ATR/BPN 3/2023, KUHPerdata Buku II (hal. 90–189 dari PDF 4 Buku), UU 2/2012, UU 27/2022, UU 28/2009 (hanya BPHTB, Pasal 85–93).
- Kolom `status` per chunk: UU 21/1997 = `dicabut` (digantikan UU 28/2009; disembunyikan default), PP 24/1997 = `diubah sebagian` (PP 18/2021), sisanya `berlaku`. Status ini per dokumen, bukan per Pasal.
- Tidak ada Pasal yang hilang. Yang gagal terbaca OCR ditambal manual di `data/manual/`: PP 18/2021 Ps 66 & 85 · UU 21/1997 Ps 4, 9, 13, 24 · KUHPerdata Ps 1162 (sumber tertulis tanpa kata "Pasal").

## Menjalankan
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install pymupdf sentence-transformers numpy      # OCR PDF scan butuh: brew install tesseract tesseract-lang
python scripts/01_extract.py && python scripts/02_chunk.py && python scripts/03_embed.py   # membangun ulang semuanya (dari folder ini)
python scripts/04_search.py                          # uji cepat retrieval
python scripts/06_eval_retrieval.py                  # evaluasi terhadap test set (--validate: cek grounding test set saja)
```
`embeddings.npy` tidak ikut git (`*.npy` di-ignore). `search()` membangunnya otomatis saat pertama dipanggil (±2 menit) bila tidak ada atau tidak cocok dengan `chunks.jsonl`.
Model saat ini `BAAI/bge-m3` (1024 dimensi, unduhan ±2,3 GB). Bila model diganti, hapus `embeddings.npy` dan **setel ulang ambang skor** (skala kosinus tiap model berbeda).

## Kontrak pencarian
```python
import sys; sys.path.insert(0, "data engineer/scripts")
from search import search
search("peralihan hak karena jual beli", top_k=5)
```
Tiap hasil: `id, sumber, pasal, teks, asal, score` (+ `doc, section, bab, status, page_start, page_end, rank_score`).

| kolom | isi |
|---|---|
| `id` | id chunk unik, mis. `pp-24-1997:bata:ps37` |
| `sumber` | `PP 24/1997`, atau `Panduan: Balik Nama Sertifikat Tanah` |
| `pasal` | nomor Pasal; untuk panduan berisi judul bagian |
| `teks` | isi chunk |
| `asal` | `regulasi` · `penjelasan` · `panduan` (**panduan = ringkasan prosedur, bukan teks hukum resmi**) |
| `score` | kemiripan kosinus 0–1 (pertanyaan ↔ chunk); dasar ambang "di luar cakupan" |
| `status` | `berlaku` · `diubah sebagian (...)` · `dicabut (...)` · `panduan` |

- **Default:** vektor saja (terbaik pada test set, lihat `data/eval/ABLASI.md`), batang tubuh + panduan, aturan `dicabut` disembunyikan.
  Opsi: `doc_slug=`, `include_penjelasan=`, `include_dicabut=`, `include_panduan=False` (hanya regulasi), `hybrid=True` (tidak dianjurkan).
- **Backend penyimpanan:** `SEARCH_BACKEND=local` (dari `chunks.jsonl` + `embeddings.npy`; otomatis bila Firestore tidak dikonfigurasi) atau `firestore` (`search.set_firestore_client(fb())`, butuh `scripts/05_upload_firestore.py`).
- **Adapter chatbot:** `from retriever import Retriever` → `Retriever().search(q, top_k) -> [(Chunk, skor)]`; `Chunk` punya `sitasi`, `status`, `page_start`. Pakai `Retriever.skor_terbaik(hasil)` untuk ambang.
- **Glosarium** (`glossary.py`) memperluas singkatan dan istilah awam (SHM, HGB, AJB, BPHTB, "balik nama") ke istilah regulasi sebelum pencarian.
- `data/chunks/chunks.jsonl` harus ikut ke deployment (metadata dan penyaring status).

## Panduan prosedur
`data/panduan/balik-nama.json` (7 bagian) dan `cek-keaslian.json` (6 bagian). Kutipan Pasal diverifikasi ke korpus; butir bertanda
"praktik umum" berasal dari informasi publik sekunder dan **perlu diverifikasi** ke Kantor Pertanahan/PPAT sebelum masuk proposal.

## Evaluasi
`data/eval/testset_qa.json`: 45 item (29 regulasi, 4 awam, 4 panduan, 1 jebakan aturan dicabut, 2 multi-Pasal, 5 di luar cakupan).
Tiap item: pertanyaan, jawaban acuan, Pasal rujukan, dan `bukti_kunci` yang diverifikasi otomatis ke teks Pasal.

Hasil (bge-m3, vektor saja, top-5, 40 pertanyaan yang bisa dijawab): **Hit@1 0,68 · Hit@3 0,88 · Hit@5 0,93 · MRR 0,79**.
Parameter dituning pada set yang sama, jadi angka ini **optimistis**; untuk proposal perlu set penguji terpisah.

Ambang tolak (kosinus terbaik, bge-m3): 0,50 → 3% valid ditolak tetapi 60% di luar cakupan lolos; 0,60 → 3% ditolak, 20% lolos.
Pertanyaan yang dekat topik tapi tak tercakup (mis. tarif PPh penjualan tanah, skor 0,67) tidak bisa dipisahkan oleh skor, jadi chatbot harus
menjawab hanya dari konteks dan menyatakan "tidak ada di basis pengetahuan" bila konteks tidak memuat jawabannya.
Kelemahan yang diketahui: pertanyaan perbandingan/multi-Pasal ("bedanya hak milik dan HGB") dan definisi pendek seperti "pengertian hipotek".

## Status dan yang belum
- [x] Regulasi terkumpul, teks diekstrak (6 dari 9 PDF di-OCR), chunk per Pasal, embedding, `search()`
- [x] Panduan prosedur (2), test set Q&A (45), evaluasi + ablasi
- [ ] Dokumen sintetis (5–10 PDF perjanjian jual-beli/sewa tanah) untuk uji deteksi risiko, menunggu taksonomi risiko dari AI Engineer
- [ ] Set penguji terpisah untuk angka final proposal
- [ ] Bagian dataset & metode + daftar pustaka untuk proposal
- ❓ Keputusan tim: model embedding produksi (bge-m3 vs Gemini embedding), penyimpanan vektor (file vs Firestore)
