// Ganti nama aplikasi di sini, otomatis berubah di header, footer & judul tab
export const APP_NAME = "JagaTanah";
export const APP_TAGLINE = "Layanan Pemeriksaan Dokumen Tanah";

// Batas ukuran PDF, harus sama dengan MAX_PDF_BYTES di backend/main.py.
// Vercel menolak request di atas 4,5 MB, jadi jangan dinaikkan selama backend di Vercel.
export const MAX_PDF_MB = 4;

export const MENU = [
  { href: "/", label: "Beranda" },
  { href: "/upload", label: "Cek Dokumen" },
  { href: "/chat", label: "Konsultasi Hukum" },
  { href: "/panduan", label: "Panduan" },
];
