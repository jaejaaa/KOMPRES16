import type { AnalysisResult, ChatHistoryItem, ChatResponse, HasilKonsultan, KategoriKasus, SaranKonsultasi, UploadResponse } from "@/types/api";
import { mockAnalysis, mockCariKonsultan, mockDocuments, mockFailed, mockJawab, mockKategoriKasus, mockSaranKonsultasi } from "./mock-data";
import { getToken } from "./firebase";
import { MAX_PDF_MB } from "./site";

// Mock aktif selama URL backend belum ada / NEXT_PUBLIC_USE_MOCK=true
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false" || !BASE_URL;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ERROR_TEXT: Record<number, string> = {
  401: "Sesi Anda telah berakhir. Muat ulang halaman lalu coba lagi.",
  403: "Masuk dengan Google terlebih dahulu untuk bertanya soal dokumen ini.",
  413: `Ukuran file terlalu besar. Maksimal ${MAX_PDF_MB} MB.`,
  415: "File harus berformat PDF.",
};

// Error dari backend, lengkap dengan kode status (mis. 403 = tamu belum masuk)
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : null;
    throw new ApiError(res.status, ERROR_TEXT[res.status] ?? detail ?? `Terjadi kesalahan (${res.status}). Coba lagi.`);
  }
  return data as T;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  if (USE_MOCK) {
    await delay(800);
    if (file.type !== "application/pdf") throw new Error(ERROR_TEXT[415]);
    if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(ERROR_TEXT[413]);
    // Tips tes: upload file yang namanya mengandung "gagal" buat lihat tampilan error
    const id = file.name.toLowerCase().includes("gagal") ? "doc_gagal" : "doc_demo";
    return { id, filename: file.name, status: "pending", created_at: new Date().toISOString() };
  }
  const form = new FormData();
  form.append("file", file);
  return request("/upload", { method: "POST", body: form });
}

let mockPolls = 0;
export async function getAnalysis(id: string): Promise<AnalysisResult> {
  if (USE_MOCK) {
    await delay(600);
    if (mockPolls++ < 2) return { document_id: id, status: "pending", summary: null, risks: [], error: null };
    mockPolls = 0;
    return id === "doc_gagal" ? mockFailed : { ...mockAnalysis, document_id: id };
  }
  return request(`/analysis/${id}`);
}

export async function getDocuments(): Promise<UploadResponse[]> {
  if (USE_MOCK) return mockDocuments;
  return request("/documents");
}

// Rekomendasi konsultan (dummy) berdasarkan kategori risiko "high" yang ditemukan di dokumen ini
export async function getSaranKonsultasi(documentId: string): Promise<SaranKonsultasi[]> {
  if (USE_MOCK) {
    await delay(500);
    return documentId === mockAnalysis.document_id ? mockSaranKonsultasi : [];
  }
  return request(`/analysis/${documentId}/konsultan`);
}

// documentId diisi kalau user bertanya tentang dokumen yang sedang dibuka
export async function sendChat(pertanyaan: string, documentId?: string): Promise<ChatResponse> {
  if (USE_MOCK) {
    await delay(1200);
    return mockJawab(pertanyaan, documentId);
  }
  return request("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pertanyaan, document_id: documentId ?? null }),
  });
}

// Satu riwayat gabungan per akun (chat umum + chat per-dokumen jadi satu percakapan)
export async function getChatHistory(): Promise<ChatHistoryItem[]> {
  if (USE_MOCK) return [];
  return request("/chat/history");
}

// Direktori konsultan: endpoint publik, tidak perlu token login
async function publik<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new ApiError(res.status, "Data konsultan belum bisa dimuat. Coba lagi beberapa saat.");
  return res.json() as Promise<T>;
}

export async function getKategoriKasus(): Promise<KategoriKasus[]> {
  if (USE_MOCK) return mockKategoriKasus;
  return publik("/konsultan/kategori");
}

export async function cariKonsultan(kategori: string, provinsi?: string): Promise<HasilKonsultan> {
  if (USE_MOCK) {
    await delay(400);
    return mockCariKonsultan(kategori, provinsi);
  }
  const q = new URLSearchParams({ kategori });
  if (provinsi) q.set("provinsi", provinsi);
  return publik(`/konsultan?${q}`);
}
