// Daftar peraturan yang dipakai JagaTanah, ditampilkan di bagian "Dasar hukum" halaman depan.
// Ringkasan disusun dari teks peraturan di data_engineer/data/extracted.
// Tanda ==...== menandai kalimat inti yang diberi stabilo merah.
// Tautan sudah dicek satu per satu; KUHPerdata tidak tersedia di JDIH BPK sehingga memakai JDIH Mahkamah Agung.

export interface Regulasi {
  nama: string;
  tentang: string;
  dicabut?: boolean;
  ringkasan: string[];
  catatan?: string;
  tautan: { url: string; sumber: string };
}

const BPK = "JDIH BPK";

export const REGULASI: Regulasi[] = [
  {
    nama: "UU No. 5 Tahun 1960",
    tentang: "Peraturan Dasar Pokok-Pokok Agraria (UUPA)",
    ringkasan: [
      "Dasar dari seluruh hukum pertanahan di Indonesia. UUPA menyatukan hukum tanah yang dulu terbelah antara hukum adat dan hukum Barat, lalu mengatur jenis-jenis hak atas tanah seperti hak milik, hak guna usaha, hak guna bangunan, dan hak pakai. Semua hak atas tanah mempunyai fungsi sosial (Pasal 6).",
      "==Hanya warga negara Indonesia yang dapat mempunyai hak milik== (Pasal 21). ==Jual beli, hibah, atau cara lain yang memindahkan hak milik kepada orang asing batal karena hukum dan tanahnya jatuh kepada negara==, sedangkan uang yang sudah dibayarkan tidak dapat dituntut kembali (Pasal 26 ayat 2).",
    ],
    tautan: { url: "https://peraturan.bpk.go.id/Details/51310/uu-no-5-tahun-1960", sumber: BPK },
  },
  {
    nama: "PP No. 24 Tahun 1997",
    tentang: "Pendaftaran Tanah",
    ringkasan: [
      "Mengatur tata cara pendaftaran tanah, mulai dari pengukuran bidang tanah sampai penerbitan sertipikat. ==Sertipikat adalah alat bukti yang kuat==, selama data di dalamnya sesuai dengan surat ukur dan buku tanah di Kantor Pertanahan (Pasal 32 ayat 1).",
      "Jika sertipikat sudah terbit secara sah dan tanahnya dikuasai dengan itikad baik, ==pihak lain tidak dapat lagi menuntut hak atas tanah itu bila dalam 5 tahun tidak mengajukan keberatan atau gugatan== (Pasal 32 ayat 2). Jual beli, hibah, dan peralihan hak lainnya ==hanya dapat didaftarkan jika dibuktikan dengan akta PPAT== (Pasal 37).",
    ],
    catatan: "Sebagian ketentuannya telah diubah oleh PP No. 18 Tahun 2021.",
    tautan: { url: "https://peraturan.bpk.go.id/Details/56273/pp-no-24-tahun-1997", sumber: BPK },
  },
  {
    nama: "PP No. 18 Tahun 2021",
    tentang: "Hak Pengelolaan, Hak atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah",
    ringkasan: [
      "Aturan pelaksana UU Cipta Kerja di bidang pertanahan. Mengatur jangka waktu hak atas tanah, antara lain hak guna usaha paling lama 35 tahun, diperpanjang 25 tahun, dan diperbarui 35 tahun (Pasal 22), serta hak guna bangunan di atas tanah negara paling lama 30 tahun, diperpanjang 20 tahun, dan diperbarui 30 tahun (Pasal 37). Pendaftaran tanah juga dapat dilakukan secara elektronik (Pasal 84).",
      "==Bukti tertulis tanah bekas milik adat yang dimiliki perorangan wajib didaftarkan paling lama 5 tahun sejak PP ini berlaku==. Setelah batas itu lewat, ==bukti tersebut tidak dapat lagi dipakai sebagai alat bukti hak, hanya sebagai petunjuk== dalam pendaftaran tanah (Pasal 96).",
    ],
    tautan: { url: "https://peraturan.bpk.go.id/Details/161848/pp-no-18-tahun-2021", sumber: BPK },
  },
  {
    nama: "Permen ATR/BPN No. 3 Tahun 2023",
    tentang: "Penerbitan Dokumen Elektronik dalam Kegiatan Pendaftaran Tanah",
    ringkasan: [
      "Mengatur penerbitan dokumen pertanahan dalam bentuk elektronik, termasuk sertipikat elektronik (Sertipikat-el) yang datanya tersimpan di buku tanah elektronik. ==Dokumen elektronik dan hasil cetaknya merupakan alat bukti hukum yang sah== (Pasal 6 ayat 2).",
      "==Jika hasil cetak Sertipikat-el berbeda dengan data di pangkalan data Kementerian, yang berlaku adalah data di pangkalan data Kementerian== (Pasal 21 ayat 2). Keaslian Sertipikat-el dapat dicek dengan memindai kode QR di aplikasi resmi Kementerian.",
    ],
    catatan: "Peraturan ini mencabut Permen ATR/BPN No. 1 Tahun 2021 tentang Sertipikat Elektronik.",
    tautan: { url: "https://peraturan.bpk.go.id/Details/269663/permen-atrkepala-bpn-no-3-tahun-2023", sumber: BPK },
  },
  {
    nama: "UU No. 28 Tahun 2009",
    tentang: "Pajak Daerah dan Retribusi Daerah (ketentuan BPHTB)",
    ringkasan: [
      "Mengatur pajak dan retribusi daerah, termasuk Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) yang sejak 2011 dipungut oleh pemerintah kabupaten/kota. Dasar pengenaannya adalah nilai perolehan, misalnya harga transaksi untuk jual beli (Pasal 87), dengan ==tarif BPHTB paling tinggi 5%== (Pasal 88).",
      "==PPAT/notaris hanya boleh menandatangani akta pemindahan hak atas tanah setelah wajib pajak menyerahkan bukti pembayaran BPHTB== (Pasal 91).",
    ],
    catatan: "Menurut JDIH BPK, UU ini telah dicabut dengan UU No. 1 Tahun 2022 tentang Hubungan Keuangan antara Pemerintah Pusat dan Pemerintahan Daerah.",
    tautan: { url: "https://peraturan.bpk.go.id/Details/38763/uu-no-28-tahun-2009", sumber: BPK },
  },
  {
    nama: "UU No. 2 Tahun 2012",
    tentang: "Pengadaan Tanah bagi Pembangunan untuk Kepentingan Umum",
    ringkasan: [
      "Mengatur cara negara memperoleh tanah warga untuk pembangunan kepentingan umum, seperti jalan umum, waduk, atau rumah sakit pemerintah. Pengadaan tanah harus menyeimbangkan kepentingan pembangunan dan kepentingan masyarakat, serta ==dilaksanakan dengan ganti kerugian yang layak dan adil== (Pasal 9).",
      "Bentuk dan besarnya ganti kerugian ditetapkan lewat musyawarah. ==Jika tidak sepakat, pemilik dapat mengajukan keberatan ke pengadilan negeri paling lama 14 hari kerja setelah musyawarah== (Pasal 38). Jika pemilik tetap menolak, ganti kerugian dititipkan di pengadilan negeri (Pasal 42).",
    ],
    catatan: "Beberapa ketentuannya telah diubah oleh UU Cipta Kerja (UU No. 6 Tahun 2023).",
    tautan: { url: "https://peraturan.bpk.go.id/Details/39012/uu-no-2-tahun-2012", sumber: BPK },
  },
  {
    nama: "UU No. 27 Tahun 2022",
    tentang: "Pelindungan Data Pribadi",
    ringkasan: [
      "Mengatur perlindungan data pribadi, termasuk data yang tercantum di dokumen tanah seperti nama, NIK, dan alamat pemilik. ==Setiap pihak yang memproses data pribadi wajib memiliki dasar pemrosesan yang sah==, misalnya persetujuan yang jelas dari pemilik data untuk tujuan tertentu (Pasal 20).",
      "==Memperoleh atau mengumpulkan data pribadi milik orang lain secara melawan hukum untuk keuntungan sendiri dilarang== (Pasal 65), dan pelanggarannya dapat dikenai sanksi pidana.",
    ],
    tautan: { url: "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022", sumber: BPK },
  },
  {
    nama: "KUHPerdata Buku II",
    tentang: "Kebendaan",
    ringkasan: [
      "Buku II Kitab Undang-Undang Hukum Perdata mengatur tentang benda dan hak atas benda. ==Hak milik adalah hak untuk menikmati dan berbuat bebas atas suatu barang, selama tidak melanggar undang-undang dan hak orang lain== (Pasal 570). Hak milik hanya dapat diperoleh dengan cara tertentu, antara lain pewarisan dan penyerahan berdasarkan jual beli atau peristiwa perdata lainnya (Pasal 584).",
      "==Sejak UUPA berlaku, ketentuan Buku II mengenai bumi, air, dan kekayaan alam sudah dicabut==, kecuali soal hipotek yang saat itu masih berlaku. Untuk urusan tanah, yang dipakai adalah UUPA; Buku II menjadi rujukan pelengkap untuk asas-asas kebendaan.",
    ],
    tautan: { url: "https://jdih.mahkamahagung.go.id/legal-product/kitab-undang-undang-hukum-perdata/detail", sumber: "JDIH Mahkamah Agung" },
  },
  {
    nama: "UU No. 21 Tahun 1997",
    tentang: "Bea Perolehan Hak atas Tanah dan Bangunan",
    dicabut: true,
    ringkasan: [
      "Undang-undang lama tentang BPHTB, yaitu pajak yang dibayar pihak yang memperoleh hak atas tanah atau bangunan, dengan tarif 5% (Pasal 5). Dulu BPHTB dipungut sebagai pajak pusat, lalu sebagian besar hasilnya dibagikan ke daerah (Pasal 23).",
      "==UU No. 28 Tahun 2009 mengalihkan BPHTB menjadi pajak daerah, dan UU ini hanya berlaku paling lama satu tahun setelahnya== (Pasal 180 UU No. 28 Tahun 2009). JagaTanah menyimpannya sebagai pembanding, misalnya untuk memahami dokumen transaksi lama.",
    ],
    tautan: { url: "https://peraturan.bpk.go.id/Details/46012/uu-no-21-tahun-1997", sumber: BPK },
  },
];
