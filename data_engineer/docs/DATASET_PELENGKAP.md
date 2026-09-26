# Penilaian dataset pelengkap (Hugging Face, DahonoLabs)

Brief Data Engineer menyebut dua dataset opsional dan mewajibkan verifikasi sebelum dipakai. **Keduanya dinilai dari halaman deskripsinya saja
(tidak diunduh, isinya belum diperiksa baris per baris).** Keputusan: **tidak dipakai untuk saat ini**; regulasi resmi tetap satu-satunya sumber kebenaran.

| | Indonesian-Legal-Glossary | Indonesian-Legal-Vision |
|---|---|---|
| Isi | 1.771 istilah hukum + definisi (kolom `id`, `term`, `definition`, `letter`, `source`) | 1.000 gambar dokumen (500 regulasi resmi + 500 dokumen sintetis: sewa, kerja, utang, kuasa, jual beli properti) + anotasi analisis |
| Lisensi | CC BY 4.0 (wajib atribusi) | Apache 2.0 |
| Ukuran | 1,26 MB | 156 MB |
| Cocok dengan proyek? | Sebagian: istilah hukum **umum** (contoh entri: "kontrak baku"), bukan khusus pertanahan; berupa definisi, **bukan** padanan istilah awam → istilah UU | Kurang: berupa **gambar**, sedangkan backend menolak PDF scan (422) dan alur kita berbasis teks |
| Risiko | Definisi buatan pihak ketiga, bukan teks hukum resmi; menambah 1.771 chunk (> kuota harian embedding gratis) dan berpotensi mengencerkan hasil | Perlu OCR; anotasi belum diverifikasi |
| Keputusan | Tidak dimasukkan ke indeks. Bisa dipertimbangkan nanti hanya untuk memilih istilah pertanahan yang relevan sebagai bahan glosarium perluasan query, setelah diverifikasi manual | Tidak dipakai. Daftar jenis cacatnya dipakai sebagai **inspirasi** taksonomi risiko |

Inspirasi taksonomi dari deskripsi Legal Vision (perlu disepakati dengan AI Engineer, belum dimasukkan ke draf 8 kategori):
tanda tangan / meterai tidak sah, klausul denda yang melanggar hukum (sudah tercakup K6), pelanggaran harta bersama perkawinan (persetujuan pasangan; dasar hukumnya tidak ada di korpus kita).

Bila salah satu dataset dipakai kelak: cantumkan atribusi (CC BY 4.0 / Apache 2.0) di proposal dan daftar pustaka, dan jangan menjadikannya sumber kebenaran regulasi.
