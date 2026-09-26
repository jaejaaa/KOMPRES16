// Sesuai backend/main.py dan backend/chatbot/service.py
export type RiskLevel = "high" | "medium" | "low";
export type DocStatus = "pending" | "done" | "failed";

export interface Risk {
  pasal: string;
  kutipan: string;
  kategori: string;
  level: RiskLevel;
  alasan: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  status: DocStatus;
  created_at: string;
}

export interface AnalysisResult {
  document_id: string;
  status: DocStatus;
  summary: string | null;
  risks: Risk[];
  error: string | null;
}

export interface ChatSource {
  id: string;
  uu: string;
  pasal: string;
  kutipan: string;
  asal: "regulasi" | "dokumen" | "panduan";
  status?: string;
  halaman?: number;
}

export type ChatStatus = "ok" | "di_luar_cakupan" | "error";

export interface ChatResponse {
  jawaban: string;
  sumber: ChatSource[];
  di_luar_cakupan: boolean;
  status: ChatStatus;
  disclaimer: string;
}

export interface ChatHistoryItem {
  pertanyaan: string;
  jawaban: string;
  sumber: ChatSource[];
  status: string;
  created_at: string;
}
