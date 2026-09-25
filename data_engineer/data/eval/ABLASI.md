# Ablasi retrieval (dev set: `testset_qa.json`, 40 pertanyaan yang bisa dijawab)

Model embedding: BAAI/bge-m3 (1024 dim), top-5, skor kosinus. Metrik: Hit@k = Pasal rujukan ada di k teratas; MRR = rata-rata 1/peringkat rujukan pertama.
Sumber: eksperimen 2026-09-25, reproduksi dengan `scripts/06_eval_retrieval.py` (varian fusi dijalankan lewat skrip sementara).

| Varian | Hit@1 | Hit@3 | Hit@5 | MRR |
|---|---|---|---|---|
| **Vektor saja (dipilih)** | **0,68** | **0,88** | **0,93** | **0,79** |
| Hybrid, bobot kata kunci 0,25 | 0,65 | 0,88 | 0,90 | 0,76 |
| Hybrid, bobot kata kunci 1,0 (setelan awal) | 0,53 | 0,80 | 0,85 | 0,68 |

Temuan:
- Kata kunci (tanpa stemming bahasa Indonesia) menambah derau: kata umum ("saja", "termasuk", "pengertian") menaikkan Pasal yang salah.
- Menyaring bagian KUHPerdata (warisan/wasiat) tidak mengubah hasil → tidak dilakukan.
- Menambahkan judul Bab/Bagian ke teks embedding: perubahan dalam batas derau (Hit@5 0,88 → 0,85 pada setelan hybrid awal) → tetap dipakai karena murah, bukan klaim perbaikan.
- Perluasan singkatan (glosarium: SHM, HGB, "balik nama") menaikkan uji awal 9 pertanyaan dari 8/9 ke 9/9.

Catatan metodologi: parameter (bobot, filter) dipilih memakai test set yang sama, jadi angka di atas **optimistis**.
Untuk angka di proposal, gunakan set penguji terpisah yang tidak dipakai untuk tuning.
