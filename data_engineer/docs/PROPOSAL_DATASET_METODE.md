# DRAF: Dataset dan Metode (untuk proposal)

> Draf untuk bagian "Dataset & Metode" dan "Daftar Pustaka". Format sitasi memakai gaya umum peraturan perundang-undangan Indonesia dan **harus disesuaikan
> dengan template proposal panitia** (belum kami terima). Butir bertanda [ISI] menunggu hasil yang belum tersedia.

## 1. Sumber data
Knowledge base dibangun dari sembilan naskah peraturan perundang-undangan yang bersifat publik (peraturan perundang-undangan tidak menjadi objek hak cipta, Pasal 42 UU No. 28 Tahun 2014). Naskah diunduh secara manual (bukan scraping) dari JDIH ATR/BPN dan portal peraturan resmi.

| No | Peraturan | Topik | Peran dalam sistem |
|---|---|---|---|
| 1 | UU No. 5 Tahun 1960 (UUPA) | Pokok-pokok agraria, jenis hak atas tanah | Dasar hak milik, HGU, HGB, hak pakai, hak sewa |
| 2 | PP No. 24 Tahun 1997 | Pendaftaran tanah | Peralihan hak, akta PPAT, sertifikat |
| 3 | PP No. 18 Tahun 2021 | Hak pengelolaan, hak atas tanah, rumah susun, pendaftaran tanah | Jangka waktu hak, pendaftaran, sertipikat elektronik |
| 4 | UU No. 21 Tahun 1997 | BPHTB (versi awal) | Dipertahankan sebagai pembanding; berstatus tidak berlaku (lihat 2.5) |
| 5 | UU No. 28 Tahun 2009 (Pasal 85–93) | BPHTB sebagai pajak daerah | Rujukan BPHTB yang berlaku |
| 6 | Permen ATR/BPN No. 3 Tahun 2023 | Dokumen elektronik dalam pendaftaran tanah | Menggantikan Permen 1/2021 (Sertipikat Elektronik) |
| 7 | KUHPerdata Buku II | Kebendaan | Dasar hak milik, hipotek, waris |
| 8 | UU No. 2 Tahun 2012 | Pengadaan tanah untuk kepentingan umum | Ganti kerugian |
| 9 | UU No. 27 Tahun 2022 | Pelindungan data pribadi | Privasi data dalam sistem |

Selain regulasi, dua **panduan prosedur** (balik nama sertifikat, cek keaslian sertifikat) disusun sebagai ringkasan berbasis Pasal yang sudah diverifikasi; butir praktik umum ditandai dan bukan teks hukum resmi.
Dataset pihak ketiga (Hugging Face) dinilai dan tidak dipakai (lihat `docs/DATASET_PELENGKAP.md`).

## 2. Pengolahan data
1. **Ekstraksi teks.** PyMuPDF untuk PDF bertext layer. Enam dari sembilan PDF adalah hasil pindai dengan lapisan teks yang rusak (urutan acak, salah baca), sehingga di-OCR ulang dengan Tesseract (bahasa Indonesia, 300 dpi).
2. **Pembersihan.** Penghapusan header/footer halaman, watermark unduhan, baris sampah OCR, dan blok penutup/lampiran; penyambungan kata yang terpotong di akhir baris.
3. **Chunking per Pasal.** Pemotongan dengan pola "Pasal N" (regex), pemisahan batang tubuh dan Penjelasan, dan pemecahan Pasal panjang di batas ayat/butir (maks. ±1.800 karakter). Heading yang rusak akibat OCR dipulihkan dari urutan nomor. Hasil: **1.452 chunk** (1.214 batang tubuh, 224 penjelasan, 14 panduan). Judul Bab/Bagian disimpan sebagai konteks.
4. **Validasi dan penambalan.** Setiap dokumen diperiksa kelengkapan nomor Pasalnya; tujuh Pasal yang gagal terbaca (PP 18/2021 Ps 66 dan 85; UU 21/1997 Ps 4, 9, 13, 24; KUHPerdata Ps 1162) diketik manual dari PDF asli.
5. **Status hukum.** Tiap chunk diberi status (`berlaku`, `diubah sebagian`, `dicabut`). PP 24/1997 ditandai diubah sebagian: PP 18/2021 Pasal 103 huruf c mencabut ketentuan jangka waktu pengumuman (PP 24/1997 Pasal 26 ayat 1 dan Pasal 45 ayat 1 huruf e), sisanya tetap berlaku (Pasal 102). UU 21/1997 jo. UU 20/2000 menurut Pasal 180 angka 6 UU 28/2009 hanya berlaku paling lama satu tahun sejak UU 28/2009 berlaku, sehingga aturan itu disembunyikan secara default dari hasil pencarian.

## 3. Representasi dan pencarian
- **Embedding.** Setiap chunk diberi awalan sumber dan konteks (nama peraturan, judul Bab/Bagian, nomor Pasal) lalu diubah menjadi vektor. Model awal `BAAI/bge-m3` (1024 dimensi); model produksi dipindah ke Gemini (`gemini-embedding-2`, 768 dimensi) karena kendala hosting server kecil; pada test set pengembangan Gemini sepadan/lebih baik (Hit@1 0,78 vs 0,68; Hit@5 0,95 vs 0,93; lihat data/eval/PERBANDINGAN_EMBEDDING.md). `gemini-embedding-001` tidak sempat dievaluasi karena kuota harian tier gratis.
- **Pencarian.** Kemiripan kosinus antara vektor pertanyaan dan chunk; keluaran berisi teks, sumber, nomor Pasal, status, dan skor 0–1. Pertanyaan diperluas dengan glosarium singkatan/istilah awam (SHM, HGB, AJB, BPHTB, "balik nama" → "peralihan hak"). Pencarian kata kunci (hybrid) diuji dan **tidak dipakai** karena menurunkan akurasi pada test set.
- **Penolakan di luar cakupan.** Berdasarkan skor kosinus terbaik dengan ambang yang disetel per model, ditambah aturan prompt "jawab hanya dari konteks".

## 4. Taksonomi risiko dan dokumen sintetis
Untuk menguji deteksi risiko dibuat **8 dokumen perjanjian fiktif** (6 jual-beli, 2 sewa tanah; 2 di antaranya bersih) dalam bentuk PDF digital, berisi **14 pasal berisiko** dan **56 pasal aman** dengan kunci jawaban (pasal, kategori, level). Draf **8 kategori risiko** (K1–K8: uang muka hangus; objek tanah tidak jelas; status/beban hak tidak dijamin; peralihan tanpa akta PPAT; pajak/biaya tidak jelas; denda/syarat berat sebelah; waktu pelaksanaan tidak jelas; subjek hak tidak memenuhi syarat) dengan dasar Pasal hanya bila ada di korpus. Seluruh nama, alamat, dan nomor sertifikat rekaan; tidak ada data pribadi nyata. Pelabelan adalah penilaian perancang dataset dan bukan nasihat hukum. [ISI hasil deteksi risiko setelah `analyze()` selesai: scripts/09_eval_risk.py]

## 5. Evaluasi
- **Test set Q&A** (pengembangan): 45 pertanyaan (40 dapat dijawab, 5 di luar cakupan) berupa regulasi, bahasa awam, panduan, jebakan aturan dicabut, dan pertanyaan multi-Pasal. Jawaban acuan dan bukti kunci diverifikasi otomatis terhadap teks Pasal.
- **Set penguji terpisah** (held-out): 25 pertanyaan (21 dapat dijawab, 4 di luar cakupan), Pasal rujukan berbeda; dijalankan hanya sekali untuk angka final dan tidak dipakai menyetel apa pun.
- **Metrik:** Hit@k, MRR, Precision@k, Recall@k (retrieval); penolakan di luar cakupan (salah tolak / salah terima) pada berbagai ambang. Catatan: Precision@5 dibatasi jumlah Pasal rujukan per pertanyaan (1–2), sehingga maksimumnya sekitar 0,2–0,4.
- **Hasil pengembangan (bge-m3, top-5):** Hit@1 0,68; Hit@3 0,88; Hit@5 0,93; MRR 0,79; Recall@5 0,94; Precision@5 0,30. Angka ini optimistis karena parameter dituning pada set yang sama.
- **Hasil final (held-out):** [ISI setelah model final dipilih: `python scripts/06_eval_retrieval.py --set heldout`]
- **Perbandingan model embedding:** [ISI dari data/eval/PERBANDINGAN_EMBEDDING.md]

## 6. Keterbatasan
Pertanyaan perbandingan dan multi-Pasal serta definisi pendek (mis. "pengertian hipotek") masih lemah; status hukum bersifat per dokumen kecuali dua Pasal yang ditandai khusus; panduan prosedur memuat butir praktik umum yang perlu diverifikasi ke Kantor Pertanahan; pelabelan risiko pada data sintetis adalah penilaian perancang; kuota API embedding tier gratis (1.000 permintaan per hari per model) membatasi layanan; sistem bukan pengganti nasihat hukum profesional.

## Daftar Pustaka (draf; sesuaikan format dengan template panitia)
Data nomor Lembaran/Berita Negara diambil dari teks naskah yang dipakai.

1. Indonesia. *Undang-Undang Nomor 5 Tahun 1960 tentang Peraturan Dasar Pokok-Pokok Agraria*. Ditetapkan 24 September 1960. Lembaran Negara Tahun 1960 Nomor 104, Tambahan Lembaran Negara Nomor 2043.
2. Indonesia. *Peraturan Pemerintah Nomor 24 Tahun 1997 tentang Pendaftaran Tanah*. Ditetapkan 8 Juli 1997. Lembaran Negara Tahun 1997 Nomor 59, Tambahan Lembaran Negara Nomor 3696.
3. Indonesia. *Peraturan Pemerintah Nomor 18 Tahun 2021 tentang Hak Pengelolaan, Hak Atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah*. Ditetapkan 2 Februari 2021. Lembaran Negara Tahun 2021 Nomor 28, Tambahan Lembaran Negara Nomor 6630.
4. Indonesia. *Undang-Undang Nomor 21 Tahun 1997 tentang Bea Perolehan Hak atas Tanah dan Bangunan*. Ditetapkan 29 Mei 1997. Lembaran Negara Tahun 1997 Nomor 44, Tambahan Lembaran Negara Nomor 3688.
5. Indonesia. *Undang-Undang Nomor 28 Tahun 2009 tentang Pajak Daerah dan Retribusi Daerah*. Ditetapkan 15 September 2009. Lembaran Negara Tahun 2009 Nomor 130, Tambahan Lembaran Negara Nomor 5049.
6. Indonesia. *Peraturan Menteri Agraria dan Tata Ruang/Kepala Badan Pertanahan Nasional Nomor 3 Tahun 2023 tentang Penerbitan Dokumen Elektronik dalam Kegiatan Pendaftaran Tanah*. Ditetapkan 16 Juni 2023, diundangkan 20 Juni 2023. Berita Negara Tahun 2023 Nomor 461.
7. Indonesia. *Undang-Undang Nomor 2 Tahun 2012 tentang Pengadaan Tanah bagi Pembangunan untuk Kepentingan Umum*. Ditetapkan 14 Januari 2012. Lembaran Negara Tahun 2012 Nomor 22, Tambahan Lembaran Negara Nomor 5280.
8. Indonesia. *Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi*. Ditetapkan 17 Oktober 2022. Lembaran Negara Tahun 2022 Nomor 196, Tambahan Lembaran Negara Nomor 6820.
9. *Kitab Undang-Undang Hukum Perdata (Burgerlijk Wetboek voor Indonesië)*, Buku Kedua tentang Kebendaan. [ISI: rujukan Staatsblad dan sumber salinan; salinan yang dipakai berasal dari hukumonline.com dan perlu diverifikasi terhadap naskah resmi.]
10. Sumber unduhan naskah: JDIH ATR/BPN (jdih.atrbpn.go.id) dan peraturan.bpk.go.id. [ISI: URL dan tanggal akses per dokumen.]
11. Model dan layanan: BAAI. *BGE M3-Embedding* (`BAAI/bge-m3`); Google. *Gemini API Embeddings* (`gemini-embedding-001`, `gemini-embedding-2`). [ISI: sitasi sesuai template.]
