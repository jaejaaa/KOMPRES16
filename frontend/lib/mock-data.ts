import type { AnalysisResult, ChatResponse } from "@/types/api";

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

export const mockChatReply: ChatResponse = {
  jawaban: "Jual beli tanah perlu dibuat dengan akta PPAT supaya sertifikat bisa dibalik nama ke nama pembeli.",
  sumber: [
    {
      id: "pp24-37",
      uu: "PP No. 24 Tahun 1997",
      pasal: "Pasal 37 ayat (1)",
      kutipan: "Peralihan hak atas tanah dan hak milik atas satuan rumah susun melalui jual beli ... hanya dapat didaftarkan jika dibuktikan dengan akta yang dibuat oleh PPAT yang berwenang ...",
      asal: "regulasi",
    },
  ],
  di_luar_cakupan: false,
  status: "ok",
  disclaimer: "Jawaban ini bersifat informatif, bukan pengganti nasihat hukum resmi.",
};
