// Ganti nama aplikasi di sini, otomatis berubah di navbar & judul tab
export const APP_NAME = "Cek Tanah";
export const APP_TAGLINE = "Cek dokumen tanah sebelum tanda tangan";

// Batas ukuran PDF, harus sama dengan MAX_PDF_BYTES di backend/main.py.
// Vercel menolak request di atas 4,5 MB, jadi jangan dinaikkan selama backend di Vercel.
export const MAX_PDF_MB = 4;
