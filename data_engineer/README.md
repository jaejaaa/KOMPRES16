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
| `data/chunks/` | `chunks.jsonl` (1.452 chunk), `report.txt`; vektor `embeddings_<penyedia>.npy` + `.meta.json` dibangun otomatis (tidak masuk git) |
| `data/eval/` | `testset_qa.json` (dev, 45), `testset_heldout.json` (terpisah, 25), `ABLASI.md`, `PERBANDINGAN_EMBEDDING.md`, `hasil_*.json` |
| `data/synthetic/` | Set dev risiko: 12 PDF perjanjian sintetis D01–D12, `ground_truth.json`, `taksonomi_risiko.json` (10 kategori K1–K10, sama dengan `backend/analisis/taksonomi.py`) |
| `data/synthetic_heldout/` | Set risiko terpisah (held-out): 6 PDF H1–H6 dengan kalimat berbeda dan pasal jebakan. **Kunci jawabannya tidak ada di repo** (`private/`, di-gitignore) |
| `scripts/` | Pipeline `01`–`09` (`07` perbandingan embedding, `08` buat dokumen sintetis, `09` evaluasi deteksi risiko), plus `search.py`, `retriever.py`, `glossary.py`, `embed_util.py` |
| `docs/` | `PROPOSAL_DATASET_METODE.md` (draf proposal + daftar pustaka), `DATASET_PELENGKAP.md`, `FIRESTORE_SETUP.md` (opsional) |

## Sumber regulasi
UUPA (UU 5/1960), PP 24/1997, PP 18/2021, UU 21/1997 (BPHTB), Permen ATR/BPN 3/2023, KUHPerdata Buku II (hal. 90–189 dari PDF 4 Buku), UU 2/2012, UU 27/2022, UU 28/2009 (hanya BPHTB, Pasal 85–93).
- Kolom `status` per chunk: UU 21/1997 = `dicabut` (digantikan UU 28/2009; disembunyikan default), PP 24/1997 = `diubah sebagian` (PP 18/2021), sisanya `berlaku`. Status ini per dokumen, bukan per Pasal.
- Tidak ada Pasal yang hilang. Yang gagal terbaca OCR ditambal manual di `data/manual/`: PP 18/2021 Ps 66 & 85 · UU 21/1997 Ps 4, 9, 13, 24 · KUHPerdata Ps 1162 (sumber tertulis tanpa kata "Pasal").

## Menjalankan
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install pymupdf numpy google-genai        # bge-m3 (opsional): pip install sentence-transformers ; OCR PDF scan: brew install tesseract tesseract-lang
cp .env.example .env                          # lalu isi GEMINI_API_KEY (key sendiri, jangan di-commit)
python scripts/01_extract.py && python scripts/02_chunk.py     # dari folder data_engineer/: PDF -> teks -> chunk
python scripts/03_embed.py                    # vektor semua chunk untuk penyedia aktif (default gemini)
python scripts/04_search.py                   # uji cepat retrieval
python scripts/06_eval_retrieval.py           # evaluasi terhadap test set (--validate: cek grounding test set saja)
python scripts/07_compare_providers.py        # laporan perbandingan bge-m3 vs gemini -> data/eval/PERBANDINGAN_EMBEDDING.md
python scripts/08_make_synthetic.py           # membuat 12 PDF sintetis dev + kunci jawaban + taksonomi (data/synthetic/)
python scripts/09_eval_risk.py --selftest     # uji metrik deteksi risiko; --analyzer modul:fungsi untuk mengukur analyze()
```
**Penyedia embedding** (env `EMBED_PROVIDER`): `gemini` (default; `gemini-embedding-2`, 768 dimensi, lewat API) atau `bge-m3` (model lokal, ±2,3 GB; hanya untuk perbandingan).
Vektor disimpan per penyedia di `data/chunks/embeddings_<penyedia>.npy` (tidak ikut git). `search()` membangunnya otomatis bila belum ada, atau bila teks chunk/model berubah (dicek lewat sidik jari di `.meta.json`).
Bila model diganti, **setel ulang ambang skor** (skala kosinus tiap model berbeda); lihat `PERBANDINGAN_EMBEDDING.md`.

## Kontrak pencarian
```python
import sys; sys.path.insert(0, "data_engineer/scripts")
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
- **Backend penyimpanan:** `SEARCH_BACKEND=local` (dari `chunks.jsonl` + `embeddings_<penyedia>.npy`; otomatis bila Firestore tidak dikonfigurasi) atau `firestore` (`search.set_firestore_client(fb())`, butuh `scripts/05_upload_firestore.py`).
- **Adapter chatbot:** `from retriever import Retriever` → `Retriever().search(q, top_k) -> [(Chunk, skor)]`; `Chunk` punya `sitasi`, `status`, `page_start`. Pakai `Retriever.skor_terbaik(hasil)` untuk ambang.
- **Glosarium** (`glossary.py`) memperluas singkatan dan istilah awam (SHM, HGB, AJB, BPHTB, "balik nama") ke istilah regulasi sebelum pencarian.
- `data/chunks/chunks.jsonl` harus ikut ke deployment (metadata dan penyaring status).

## Panduan prosedur
`data/panduan/balik-nama.json` (7 bagian) dan `cek-keaslian.json` (6 bagian). Kutipan Pasal diverifikasi ke korpus; butir bertanda
"praktik umum" berasal dari informasi publik sekunder dan **perlu diverifikasi** ke Kantor Pertanahan/PPAT sebelum masuk proposal.

## Evaluasi
`data/eval/testset_qa.json`: 45 item (29 regulasi, 4 awam, 4 panduan, 1 jebakan aturan dicabut, 2 multi-Pasal, 5 di luar cakupan).
Tiap item: pertanyaan, jawaban acuan, Pasal rujukan, dan `bukti_kunci` yang diverifikasi otomatis ke teks Pasal.

Hasil dev (model final Gemini `gemini-embedding-2`, vektor saja, top-5, 40 pertanyaan yang bisa dijawab): **Hit@1 0.78 · Hit@3 0.95 · Hit@5 0.95 · MRR 0.86** (pembanding bge-m3: 0,68 / 0,88 / 0,93 / 0,79).
**Hasil held-out (dijalankan SEKALI pada 2026-09-27, 21 pertanyaan): Hit@1 0.76 · Hit@3 0.90 · Hit@5 0.95 · MRR 0.83 · Recall@5 0.98**, konsisten dengan dev. Set ini sudah "terpakai": jangan dijalankan ulang untuk menyetel apa pun; jika konfigurasi berubah, buat set penguji baru.
Parameter dituning pada set yang sama, jadi angka ini **optimistis**; untuk proposal perlu set penguji terpisah.

Ambang tolak (kosinus terbaik, bge-m3): 0,50 → 3% valid ditolak tetapi 60% di luar cakupan lolos; 0,60 → 3% ditolak, 20% lolos.
Pertanyaan yang dekat topik tapi tak tercakup (mis. tarif PPh penjualan tanah, skor 0,67) tidak bisa dipisahkan oleh skor, jadi chatbot harus
menjawab hanya dari konteks dan menyatakan "tidak ada di basis pengetahuan" bila konteks tidak memuat jawabannya.
Kelemahan yang diketahui: pertanyaan perbandingan/multi-Pasal ("bedanya hak milik dan HGB") dan definisi pendek seperti "pengertian hipotek".

## Evaluasi tambahan
- **Set penguji terpisah** `data/eval/testset_heldout.json` (25 item, Pasal rujukan berbeda): **jangan dipakai menyetel apa pun**; jalankan `python scripts/06_eval_retrieval.py --set heldout` hanya untuk angka final.
- **Metrik retrieval** kini juga Precision@k dan Recall@k (Precision@5 dibatasi jumlah Pasal rujukan per pertanyaan, jadi maksimumnya ±0,2–0,4).
- **Deteksi risiko:** `scripts/09_eval_risk.py` mengukur `analyze()`: precision/recall/F1 per pasal, kecocokan kategori dan level, alarm palsu pada dokumen bersih, dan temuan tanpa nomor pasal (mis. "klausul tidak ditemukan") yang dihitung terpisah.
  Set **dev** (12 dokumen, 25 pasal berisiko, 80 aman) boleh dipakai menyetel prompt; set **held-out** (6 dokumen, 17 berisiko, 31 aman) hanya untuk angka final, jangan dipakai menyetel. Baseline `analyze()` dummy: F1 0,20 (dev) dan 0,21 (held-out).
  Contoh: `PYTHONIOENCODING=utf-8 python data_engineer/scripts/09_eval_risk.py --analyzer analisis:analyze --path backend --set dev`.
  Held-out: AI Engineer menjalankan `... 09_eval_risk.py --analyzer analisis:analyze --path backend --set heldout --predict-only` lalu mengirim `data/eval/prediksi_*_heldout.json` ke Data Engineer, yang menilainya dengan kunci privat (`--predictions FILE --set heldout`).
  **Hasil final held-out** (6 dokumen, dijalankan 2026-09-28): level medium/high saja (metrik relevan produk) — precision 0,89, recall 1,00, F1 0,94. Skrip kini melaporkan dua metrik sekaligus: semua level, dan medium/high saja (level *low* = "sudah diperiksa, aman", bukan alarm).
  Catatan bias: dokumen dev dibuat dari definisi kategori yang sama dengan prompt `analyze()`, jadi angka dev optimistis; itu alasan set held-out dibuat dengan kalimat berbeda.
- **Status hukum per Pasal:** PP 24/1997 Ps 26 dan 45 ditandai khusus (jangka waktu pengumuman dicabut PP 18/2021 Ps 103 huruf c); UU 21/1997 = masa peralihan 1 tahun (UU 28/2009 Ps 180 angka 6).

## Portabilitas (Windows / macOS / Linux)
Semua baca/tulis file memakai UTF-8 eksplisit. Ini penting: `chunks.jsonl` berisi karakter non-ASCII; dibaca dengan encoding bawaan Windows (cp1252) kode lama **crash**,
dan dengan latin-1 sidik jari vektor **berbeda** sehingga `search()` mencoba membangun ulang 1.452 embedding (menabrak kuota harian). Keluaran konsol juga dipaksa UTF-8 agar
karakter seperti "≤" tidak membuat skrip crash di Windows. `.gitattributes` menjaga akhir baris file data (LF) dan menandai `*.npy`/`*.pdf` sebagai biner.
Hasil evaluasi risiko yang dihasilkan otomatis (`prediksi_*.json`, `hasil_risiko_*.json`) di-gitignore; `hasil_retrieval_*.json` sengaja tetap di-commit sebagai bukti angka proposal.

## Fitur Konsultasi Profesional (business idea baru, masih dummy)
Ide tambahan: arahkan pengguna ke profesional yang tepat untuk kasus balik nama, waris, sengketa tanah, mafia tanah, dll.
`data/konsultan/{kategori_kasus,notaris_ppat_dummy,advokat_dummy}.json` (41 Notaris/PPAT + 41 Advokat, 34 provinsi) dan `scripts/konsultan.py` (`cari_konsultan(kategori_id, provinsi=)`).

**Kenapa dua profesi:** Notaris/PPAT hanya menangani hal administratif (akta, balik nama, cek dokumen) dan **tidak beracara di pengadilan atau menegakkan hukum**.
Untuk sengketa tanah dan dugaan mafia tanah, yang tepat adalah **advokat** (dan untuk mafia tanah, juga pelaporan ke Satgas Anti Mafia Tanah/ATR-BPN & Polri).
`cari_konsultan()` menegakkan ini secara otomatis lewat pemetaan `kategori_kasus -> profesi` — untuk kategori `sengketa-tanah` dan `mafia-tanah`, `notaris_ppat` SELALU kosong; jangan diubah supaya app tidak salah mengarahkan pengguna.

| Kategori | Notaris/PPAT | Advokat |
|---|---|---|
| balik-nama, cek-sertifikat, hak-tanggungan | ✅ | — |
| waris, sertifikat-ganda | ✅ (jalur damai / cek awal) | ✅ (bila bersengketa) |
| sengketa-tanah, mafia-tanah | — | ✅ |

Tiap entri konsultan juga punya `telepon`, `peta` (tautan Google Maps), `jadwal`, dan `tarif` (harga per orang, bukan per kategori).

**PENTING - ini data DUMMY, bukan hasil scraping:**
- Nama, kantor, telepon, lokasi, harga, dan jadwal seluruhnya fiktif/indikatif. Field `_PERINGATAN` di tiap file JSON dan `_dummy: true` per entri wajib ditampilkan/dicek sebelum dipakai di UI.
- **Telepon**: pola berurutan (`0812-0000-0001`, dst.), sengaja BUKAN nomor acak yang terlihat asli, dan diberi keterangan "tidak aktif, jangan dihubungi".
- **Peta**: tautan *pencarian* Google Maps (nama kantor + kota), bukan alamat/koordinat presisi — supaya tidak kebetulan menunjuk ke bangunan sungguhan.
- **Harga (`tarif`)**: kisaran indikatif PER ORANG (3 tingkatan diputar per indeks, supaya tidak seragam), jelas ditandai "(indikatif/dummy)" — bukan tarif resmi dan bukan cerminan kualitas layanan sungguhan.
- Scraping data asli sengaja TIDAK dilakukan: sumber resmi Notaris (ini.id, Mitra ATR/BPN) berbasis cari-per-nama (tidak bisa diambil sekaligus), organisasi advokat terpecah (PERADI/PERADIN/KAI), dan mempublikasikan ulang data kontak orang sungguhan tanpa izin berisiko terhadap UU 27/2022 PDP (yang justru ada di korpus regulasi kita) serta risiko data usang.
- **Jalur ke data asli yang direkomendasikan:** pendaftaran mandiri oleh Notaris/PPAT/advokat mitra — mereka mengisi profil sendiri, app hanya menampilkan (seperti direktori mitra, bukan scraping pihak ketiga).
- Backend sudah live di Vercel: kalau fitur ini ikut dideploy, **wajib diberi label jelas "Contoh/Demo"** di UI.

## Status dan yang belum
## Status dan yang belum
- [x] Regulasi terkumpul, teks diekstrak (6 dari 9 PDF di-OCR), chunk per Pasal, embedding, `search()`
- [x] Panduan prosedur (2), test set Q&A dev (45) + held-out (25), evaluasi (Hit@k, MRR, P/R@k) + ablasi
- [x] Taksonomi 10 kategori (sama dengan AI Engineer) + 12 dokumen sintetis dev + 6 dokumen held-out + alat ukur deteksi risiko
- [x] Penilaian dataset pelengkap HF; draf bagian proposal dan daftar pustaka (`docs/PROPOSAL_DATASET_METODE.md`)
- [x] Embedding Gemini selesai (`gemini-embedding-2`, 1.452 chunk), vektor ikut repo, laporan `PERBANDINGAN_EMBEDDING.md`
- [x] `analyze()` dan chatbot dengan retriever sudah tersambung di backend (AI Engineer + Backend)
- [ ] Angka held-out final (retrieval dan risiko) setelah model final dikonfirmasi, template proposal panitia (format sitasi), isi bagian [ISI] di draf proposal
- [ ] Verifikasi butir "praktik umum" pada panduan prosedur ke sumber resmi
- ❓ Belum diputuskan tim: hosting backend (Dockerfile masih hanya membawa `backend/`, sedangkan `data_engineer/` juga harus ikut) dan kuota Gemini untuk demo
