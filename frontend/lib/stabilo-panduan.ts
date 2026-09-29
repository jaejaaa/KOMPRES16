// Kalimat inti di tiap panduan yang diberi stabilo merah (sama seperti ringkasan dasar hukum di beranda).
// Ditulis persis sama dengan teks di data/panduan/*.json (milik Data Engineer, tidak diubah); kalau teksnya
// berubah dan kalimat tidak ditemukan lagi, stabilo pada kalimat itu hilang saja tanpa merusak tampilan.
// Pilih sekitar satu kalimat per bagian: batas waktu, syarat wajib, atau peringatan.
export const STABILO_PANDUAN: Record<string, string[]> = {
  "cek-keaslian": [
    "keaslian dan keabsahan sertifikat diuji dengan mencocokkannya dengan data di Kantor Pertanahan",
    "Cara paling andal adalah pengecekan sertifikat di Kantor Pertanahan (BPN) tempat tanah berada",
    "tidak menggantikan pencocokan sertifikat fisik dengan buku tanah di Kantor Pertanahan",
    "Waspada bila penjual menolak sertifikat dicek ke Kantor Pertanahan, hanya mau menunjukkan fotokopi, atau harga jauh di bawah pasar",
    "bukan dari hasil cetak atau tangkapan layar yang dikirim pihak lain",
    "hentikan transaksi dan jangan membayar uang muka atau pelunasan",
  ],
  "balik-nama": [
    "Peralihan hak melalui jual beli hanya dapat didaftarkan jika dibuktikan dengan akta yang dibuat oleh PPAT yang berwenang",
    "PPAT wajib menolak membuat akta jika sertifikat asli tidak disampaikan atau sertifikat yang diserahkan tidak sesuai dengan daftar-daftar di Kantor Pertanahan",
    "PPAT hanya dapat menandatangani akta pemindahan hak setelah wajib pajak menyerahkan bukti pembayaran pajak",
    "perjanjian di bawah tangan atau kuitansi saja tidak cukup untuk pendaftaran peralihan hak",
    "Selambat-lambatnya 7 (tujuh) hari kerja sejak akta ditandatangani",
    "jika perbuatan hukum tidak dibuktikan dengan akta PPAT atau kutipan risalah lelang",
    "tanyakan rincian biayanya di awal",
    "sertifikat hak, surat kematian pemegang hak, dan surat tanda bukti sebagai ahli waris",
  ],
  "tanah-garapan": [
    "Membeli tanah garapan yang belum melalui proses ini mengandung risiko",
    "penguasaan fisik atas tanah tersebut selama 20 (dua puluh) tahun atau lebih secara berturut-turut",
    "Kalau ada pihak lain yang mengklaim atau mempermasalahkan tanah tersebut, jalur pembuktian ini tidak bisa dipakai begitu saja",
    "tidak otomatis bisa didaftarkan hanya karena sudah lama digarap warga",
    "pemilik wajib mendaftarkan tanahnya sendiri secara sporadik",
    "pengumuman selama 30 (tiga puluh) hari kalender",
    "jika tidak ada keberatan yang diajukan selama masa pengumuman",
    "urus dulu pendaftaran/sertifikat atas nama penjual sebelum transaksi",
    "sebaiknya dikonsultasikan ke advokat",
  ],
};
