import type { AnalysisResult, ChatResponse, HasilKonsultan, KategoriKasus, Konsultan, UploadResponse } from "@/types/api";

export const mockAnalysis: AnalysisResult = {
  document_id: "doc_demo",
  status: "done",
  summary:
    "Dokumen ini adalah perjanjian jual beli tanah seluas 120 m² di Bekasi. Pembeli diminta melunasi pembayaran sebelum sertifikat dicek ke BPN, dan perjanjian dibuat di bawah tangan (tanpa PPAT). Ada 2 pasal yang perlu diwaspadai sebelum tanda tangan.",
  risks: [
    {
      pasal: "Pasal 3",
      kutipan: "Pihak Kedua wajib melunasi seluruh harga tanah paling lambat 7 hari sejak perjanjian ini ditandatangani.",
      kategori: "Pembayaran",
      level: "high",
      alasan: "Pembayaran lunas diminta sebelum ada pengecekan sertifikat. Kalau sertifikat bermasalah, uang susah ditarik kembali.",
    },
    {
      pasal: "Pasal 6",
      kutipan: "Perjanjian ini cukup ditandatangani kedua belah pihak tanpa perlu dibuatkan akta oleh pejabat manapun.",
      kategori: "Keabsahan Transaksi",
      level: "high",
      alasan: "Tanpa akta PPAT, peralihan hak tidak bisa didaftarkan, jadi sertifikat tidak bisa dibalik nama (PP 24/1997 Pasal 37).",
    },
    {
      pasal: "Pasal 8",
      kutipan: "Biaya balik nama ditanggung oleh Pihak Kedua.",
      kategori: "Biaya & Pajak",
      level: "medium",
      alasan: "Tidak disebutkan siapa yang membayar PPh penjual dan BPHTB, bisa jadi sumber sengketa.",
    },
    {
      pasal: "Pasal 1",
      kutipan: "Pihak Pertama menjual sebidang tanah Hak Milik dengan Sertifikat No. 1234 ...",
      kategori: "Identitas Objek",
      level: "low",
      alasan: "Objek tanah dan nomor sertifikat disebutkan jelas.",
    },
  ],
  error: null,
};

export const mockFailed: AnalysisResult = {
  document_id: "doc_gagal",
  status: "failed",
  summary: null,
  risks: [],
  error: "Teks tidak bisa dibaca. Pastikan PDF bukan hasil scan yang buram.",
};

export const mockDocuments: UploadResponse[] = [
  { id: "doc_demo", filename: "Perjanjian_Jual_Beli_Bekasi.pdf", status: "done", created_at: "2026-09-25T10:12:00Z" },
  { id: "doc_gagal", filename: "scan_AJB_lama.pdf", status: "failed", created_at: "2026-09-24T08:40:00Z" },
];

// Teks disclaimer & pesan di luar cakupan disalin dari backend/chatbot/guardrails.py
const DISCLAIMER = "Jawaban ini bersifat informatif, bukan pengganti nasihat hukum resmi.";

export const mockChatReply: ChatResponse = {
  jawaban:
    "Jual beli tanah harus dibuat dengan Akta Jual Beli (AJB) oleh PPAT. Tanpa akta PPAT, peralihan hak tidak bisa didaftarkan di Kantor Pertanahan, jadi sertifikat tidak bisa dibalik nama ke nama pembeli.\n\nKuitansi atau perjanjian di bawah tangan saja tidak cukup untuk proses balik nama.",
  sumber: [
    {
      id: "pp-24-1997:bata:ps37",
      uu: "PP 24/1997",
      pasal: "Pasal 37",
      kutipan:
        "(1) Peralihan hak atas tanah dan hak milik atas satuan rumah susun melalui jual beli, tukar menukar, hibah, pemasukan dalam perusahaan dan perbuatan hukum pemindahan hak lainnya, kecuali pemindahan hak melalui lelang hanya dapat didaftarkan jika dibuktikan dengan akta yang dibuat oleh PPAT yang berwenang menurut ketentuan peraturan perundang-undangan yang berlaku.",
      asal: "regulasi",
      status: "diubah sebagian (PP 18/2021)",
    },
    {
      id: "panduan-balik-nama-3",
      uu: "Panduan: Balik Nama Sertifikat Tanah",
      pasal: "Langkah 3 - Tanda tangan Akta Jual Beli (AJB) di hadapan PPAT",
      kutipan: "AJB yang sah dari PPAT adalah dasar untuk balik nama; perjanjian di bawah tangan atau kuitansi saja tidak cukup untuk pendaftaran peralihan hak.",
      asal: "panduan",
      status: "panduan",
    },
  ],
  di_luar_cakupan: false,
  status: "ok",
  disclaimer: DISCLAIMER,
};

export const mockChatDokumen: ChatResponse = {
  jawaban:
    "Pasal 6 di dokumen Anda menyatakan perjanjian cukup ditandatangani kedua pihak tanpa akta pejabat. Artinya transaksi ini tidak dibuat di hadapan PPAT, padahal balik nama sertifikat hanya bisa didaftarkan dengan akta PPAT.\n\nSebelum membayar, minta penjual sepakat membuat AJB di PPAT dan ubah Pasal 6.",
  sumber: [
    {
      id: "dok-6",
      uu: "Dokumen yang Anda unggah",
      pasal: "Pasal 6",
      kutipan: "Perjanjian ini cukup ditandatangani kedua belah pihak tanpa perlu dibuatkan akta oleh pejabat manapun.",
      asal: "dokumen",
    },
    mockChatReply.sumber[0],
  ],
  di_luar_cakupan: false,
  status: "ok",
  disclaimer: DISCLAIMER,
};

export const mockDiLuarCakupan: ChatResponse = {
  jawaban:
    "Pertanyaan ini di luar cakupan basis pengetahuan saya yang berfokus pada hukum pertanahan dan fitur aplikasi ini. Disarankan konsultasi dengan notaris/PPAT atau advokat untuk kepastian lebih lanjut.",
  sumber: [],
  di_luar_cakupan: true,
  status: "di_luar_cakupan",
  disclaimer: DISCLAIMER,
};

// Tiru perilaku backend secara kasar supaya semua tampilan chat bisa dites tanpa server
export function mockJawab(pertanyaan: string, documentId?: string): ChatResponse {
  const q = pertanyaan.toLowerCase();
  if (documentId && /pasal|dokumen|kontrak|perjanjian|saya/.test(q)) return mockChatDokumen;
  if (/tanah|sertifikat|shm|hgb|ajb|ppat|bphtb|balik nama|jual beli|waris|bpn|pajak|akta/.test(q)) return mockChatReply;
  return mockDiLuarCakupan;
}

// Tiruan kecil direktori konsultan (bentuk sama dengan backend/data_engineer/scripts/konsultan.py)
export const mockKategoriKasus: KategoriKasus[] = [
  { id: "balik-nama", nama: "Balik nama / peralihan hak (jual-beli, hibah)", profesi: ["notaris_ppat"] },
  {
    id: "waris",
    nama: "Mengurus warisan tanah",
    profesi: ["notaris_ppat", "advokat"],
    catatan: "Notaris/PPAT bila para ahli waris sepakat damai; advokat bila ahli waris tidak sepakat atau bersengketa.",
  },
  { id: "sengketa-tanah", nama: "Sengketa tanah (sudah/berpotensi ke pengadilan)", profesi: ["advokat"] },
];

const mockKonsultan: Konsultan[] = [
  { id: "N01", nama: "Contoh Notaris A, S.H., M.Kn.", jenis: "Notaris/PPAT (dummy)", kantor: "Kantor Notaris & PPAT Contoh A", kota: "Bandung", provinsi: "Jawa Barat", kategori_kasus: ["balik-nama", "waris"], kontak: "(contoh - belum ada nomor/alamat asli)", _dummy: true },
  { id: "A01", nama: "Contoh Advokat B, S.H., M.H.", jenis: "Advokat (dummy)", kantor: "Kantor Hukum Contoh B", kota: "Jakarta Selatan", provinsi: "DKI Jakarta", kategori_kasus: ["waris", "sengketa-tanah"], kontak: "(contoh - belum ada nomor/alamat asli)", _dummy: true },
];

export function mockCariKonsultan(kategori: string, provinsi?: string): HasilKonsultan {
  const kat = mockKategoriKasus.find((k) => k.id === kategori);
  const cocok = (k: Konsultan) => k.kategori_kasus.includes(kategori) && (!provinsi || k.provinsi === provinsi);
  return {
    kategori: kat?.nama ?? null,
    catatan: kat?.catatan ?? null,
    notaris_ppat: kat?.profesi.includes("notaris_ppat") ? mockKonsultan.filter((k) => k.id.startsWith("N") && cocok(k)) : [],
    advokat: kat?.profesi.includes("advokat") ? mockKonsultan.filter((k) => k.id.startsWith("A") && cocok(k)) : [],
    peringatan: "SELURUH DATA DI HALAMAN INI FIKTIF untuk demo, bukan daftar Notaris/PPAT/Advokat sungguhan.",
  };
}
