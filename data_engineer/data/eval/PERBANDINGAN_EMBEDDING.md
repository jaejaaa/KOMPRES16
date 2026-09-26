# Perbandingan embedding: bge-m3 vs gemini

Dibuat otomatis oleh `scripts/07_compare_providers.py` pada 2026-09-26 18:38. Test set yang sama untuk keduanya: `data/eval/testset_qa.json` (40 pertanyaan yang bisa dijawab + pertanyaan di luar cakupan), top-5.

## Kesimpulan

**gemini sepadan atau lebih baik** dari bge-m3 pada test set ini, jadi pindah ke gemini masuk akal.

- Pasal yang benar ada di 5 teratas: **bge-m3 93%** vs **gemini 95%** (+2 poin).
- Pasal yang benar di peringkat 1: bge-m3 68% vs gemini 78% (+10 poin).
- Skala perbedaan: hanya 40 pertanyaan, jadi selisih Hit@1 di atas setara **+4 pertanyaan**; anggap sebagai **indikasi, bukan bukti kuat**.
- Catatan: test set ini juga dipakai untuk menyetel parameter, jadi angka bersifat **optimistis**. Angka final proposal harus dari set penguji terpisah.

## 1. Akurasi (semakin tinggi semakin baik)

| Ukuran | bge-m3 | gemini | Selisih |
|---|---|---|---|
| Hit@1 (benar di peringkat 1) | 0.68 | 0.78 | +0.10 |
| Hit@3 | 0.88 | 0.95 | +0.07 |
| Hit@5 | 0.93 | 0.95 | +0.02 |
| MRR (rata-rata 1/peringkat) | 0.79 | 0.86 | +0.08 |
| Recall@5 (porsi Pasal rujukan yang ditemukan) | 0.94 | 0.96 | +0.03 |
| Precision@5 (porsi hasil top-5 yang relevan) | 0.30 | 0.31 | +0.01 |

*Catatan Precision@5:* tiap pertanyaan hanya punya 1–2 Pasal rujukan, jadi presisi di top-5 secara matematis tidak bisa melebihi sekitar 0,2–0,4 (1–2 hasil relevan dari 5). Angka ini dipakai untuk **membandingkan model**, bukan sebagai skor mutlak; ukuran utama yang bermakna untuk RAG adalah Recall@5 dan Hit@k.

Per kategori pertanyaan (Hit@5):

| Kategori | jumlah | bge-m3 | gemini |
|---|---|---|---|
| awam | 4 | 1.00 | 1.00 |
| multi | 2 | 0.50 | 0.50 |
| panduan | 4 | 1.00 | 1.00 |
| regulasi | 29 | 0.93 | 0.97 |
| status | 1 | 1.00 | 1.00 |

## 2. Pertanyaan yang berubah

Membaik di gemini: **11** pertanyaan. Memburuk: **6**.

**Membaik di gemini**

- [R01] Apa yang dimaksud dengan hak milik menurut UUPA?  (bge-m3: tidak ada di top-5 → gemini: peringkat 1)
- [R05] Berapa tarif maksimal BPHTB?  (bge-m3: peringkat 2 → gemini: peringkat 1)
- [R06] Siapa yang menjadi subjek pajak BPHTB?  (bge-m3: peringkat 2 → gemini: peringkat 1)
- [R07] Apakah sertifikat tanah merupakan alat bukti yang kuat?  (bge-m3: peringkat 2 → gemini: peringkat 1)
- [R09] Peralihan hak atas tanah karena jual beli harus dibuktikan dengan apa agar bisa didaftarkan?  (bge-m3: peringkat 4 → gemini: peringkat 1)
- [R12] Apa yang terjadi pada hak atas tanah jika tanahnya musnah karena peristiwa alam?  (bge-m3: peringkat 2 → gemini: peringkat 1)
- [R14] Apakah dokumen elektronik pendaftaran tanah sah sebagai alat bukti?  (bge-m3: peringkat 2 → gemini: peringkat 1)
- [R17] Apa sanksi administratif jika melanggar ketentuan pelindungan data pribadi?  (bge-m3: peringkat 2 → gemini: peringkat 1)
- [R24] Apa pengertian hipotek?  (bge-m3: tidak ada di top-5 → gemini: peringkat 1)
- [A03] Kalau HGB saya sudah habis masa berlakunya, tanahnya jadi milik siapa?  (bge-m3: peringkat 5 → gemini: peringkat 2)
- [S01] Berapa nilai perolehan objek pajak tidak kena pajak (NPOPTKP) untuk BPHTB?  (bge-m3: peringkat 2 → gemini: peringkat 1)

**Memburuk di gemini**

- [R04] Berapa jangka waktu hak guna usaha?  (bge-m3: peringkat 1 → gemini: tidak ada di top-5)
- [R13] Berapa lama pengumuman data fisik dan data yuridis dalam pendaftaran tanah?  (bge-m3: peringkat 1 → gemini: peringkat 2)
- [R20] Bagaimana ganti kerugian dalam pengadaan tanah untuk kepentingan umum?  (bge-m3: peringkat 1 → gemini: peringkat 2)
- [R25] Apa yang harus diserahkan untuk mendaftarkan peralihan hak karena pewarisan?  (bge-m3: peringkat 1 → gemini: peringkat 2)
- [R26] Kapan sertipikat elektronik mulai berlaku efektif?  (bge-m3: peringkat 1 → gemini: peringkat 2)
- [R29] Apa yang dimaksud dengan pendaftaran tanah?  (bge-m3: peringkat 1 → gemini: peringkat 2)

## 3. Ambang "di luar cakupan" (WAJIB disetel ulang bila ganti model)

Skor kosinus tiap model punya skala berbeda, jadi ambang lama tidak boleh dipakai apa adanya. "Salah tolak" = pertanyaan valid ikut ditolak; "salah terima" = pertanyaan di luar cakupan lolos.

| Ambang | bge-m3: salah tolak | bge-m3: salah terima | gemini: salah tolak | gemini: salah terima |
|---|---|---|---|---|
| 0.35 | 0% | 100% | 0% | 100% |
| 0.40 | 0% | 100% | 0% | 100% |
| 0.45 | 3% | 80% | 0% | 100% |
| 0.50 | 3% | 60% | 0% | 100% |
| 0.55 | 3% | 40% | 0% | 80% |
| 0.60 | 3% | 20% | 0% | 80% |
| 0.65 | 3% | 20% | 0% | 40% |
| 0.70 | 50% | 0% | 0% | 40% |
| 0.75 | 73% | 0% | 13% | 0% |

- Ambang saran bge-m3: **0.60** (salah tolak 3%, salah terima 20%).
- Ambang saran gemini: **0.65** (salah tolak 0%, salah terima 40%).
- **Perhatian:** pada ambang sarannya, gemini meloloskan lebih banyak pertanyaan di luar cakupan (40% vs 20% untuk bge-m3): skor kosinusnya cenderung tinggi untuk semua teks (skor terbaik pertanyaan di luar cakupan: O01=0.54, O02=0.72, O03=0.71, O04=0.65, O05=0.63). Akibatnya gerbang skor kurang tajam; **andalkan juga aturan prompt "jawab hanya dari konteks"** dan jangan menganggap skor tinggi = relevan.
- Aturan pemilihan: ambang terendah yang menjaga salah tolak ≤ 5% dengan salah terima terkecil. Sampel kecil (5 pertanyaan di luar cakupan), jadi anggap sebagai titik awal.
- Pertanyaan yang dekat topik tapi tidak tercakup (mis. tarif PPh penjualan tanah) tidak bisa dipisahkan oleh skor; itu tetap ditangani aturan prompt "jawab hanya dari konteks".

## 4. Hal praktis

| | bge-m3 | gemini |
|---|---|---|
| Model | BAAI/bge-m3 | gemini-embedding-2@768 |
| Dijalankan di | komputer/server kita | server Google (API) |
| Dimensi vektor | 1024 | 768 |
| Ukuran file vektor | 5.9 MB | 4.5 MB |
| Rata-rata waktu per kueri (termasuk embed pertanyaan) | 65 ms | 1201 ms |
| Butuh di server | PyTorch + model ±2,3 GB, RAM besar | hanya internet + GEMINI_API_KEY |
| Data pertanyaan pengguna | tetap di server kita | dikirim ke Google |

Waktu kueri Gemini tergantung jaringan, dan tier gratis memiliki batas kecepatan; cek kuota terbaru di dokumentasi Google sebelum produksi.

## 5. Apa yang berubah untuk tiap orang

- **Data Engineer:** embedding dibangun dengan `gemini` (`EMBED_PROVIDER=gemini`); file vektor menjadi `embeddings_gemini.npy` (+ `.meta.json`). Bila teks chunk berubah, vektor dibangun ulang otomatis.
- **AI Engineer:** `search()` dan `Retriever` **tidak berubah antarmukanya**. Yang berubah: skala `score`, jadi `MIN_RETRIEVAL_SCORE` harus diganti ke ambang saran gemini di atas. Tes ulang gerbang "di luar cakupan".
- **Backend:** tidak perlu PyTorch/`sentence-transformers` bila memakai gemini; cukup `google-genai` (sudah ada di requirements) dan `GEMINI_API_KEY` sebagai variabel lingkungan/secret. Pastikan `data_engineer/scripts` dan `data_engineer/data/chunks/` (chunks.jsonl + file vektor) ikut ke deployment.
- **Semua:** setiap pertanyaan pengguna sekarang membuat 1 panggilan API embedding; perhatikan kuota (bagi key: satu key per orang/peran, jangan dipakai bersama).

## 6. Langkah selanjutnya

1. Tim membaca laporan ini dan mengonfirmasi model embedding final.
2. Data Engineer: commit file vektor final (setelah baris whitelist `*.npy` di `.gitignore` dibuka) atau sepakati cara lain berbagi vektor.
3. AI Engineer: set `MIN_RETRIEVAL_SCORE` ke ambang baru, sambungkan `Retriever` ke `jawab_chat(retriever=...)`, uji dengan Gemini asli.
4. Backend: sesuaikan Dockerfile/requirements, uji `/chat` end-to-end.
5. Setelah tahap ini sinkron: Data Engineer melanjutkan set penguji terpisah, dokumen sintetis (menunggu taksonomi risiko), dan bagian dataset & metode proposal.
