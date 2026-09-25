import json
import logging
import os
from datetime import datetime, timezone
from functools import cache
from typing import Literal
from uuid import UUID, uuid4

import firebase_admin
import pymupdf
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials, firestore
from pydantic import BaseModel, Field

# Struktur Firestore:
#   documents/{id}     user_id, filename, status, summary, risks[], error, created_at
#   chat_history/{id}  user_id, question, answer, sources[], created_at
# User pakai Firebase Auth (anonymous). PDF tidak disimpan, cuma diekstrak teksnya lalu dianalisis.
# ponytail: tanpa Firebase Storage (butuh Blaze plan); tambahkan kalau perlu fitur download PDF asli.

app = FastAPI(title="Hukum Tanah API")
# ponytail: izinkan semua origin untuk dev, ganti ke domain frontend sebelum final
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
log = logging.getLogger("uvicorn.error")

Status = Literal["pending", "done", "failed"]


class Risk(BaseModel):
    pasal: str
    kutipan: str
    kategori: str
    level: Literal["low", "medium", "high"]  # FE: low = hijau, medium = kuning, high = merah
    alasan: str


class Document(BaseModel):
    id: UUID
    filename: str
    status: Status
    created_at: datetime


class Analysis(BaseModel):
    document_id: UUID
    status: Status
    summary: str | None = None
    risks: list[Risk] = []
    error: str | None = None


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class ChatOut(BaseModel):
    answer: str
    sources: list[str]


class ChatItem(ChatOut):
    question: str
    created_at: datetime


MAX_PDF_BYTES = 10 * 1024 * 1024
CHAT_FALLBACK = ChatOut(answer="Maaf, asisten sedang tidak bisa menjawab. Coba lagi sebentar lagi.", sources=[])


@cache
def fb():
    # Railway: FIREBASE_CREDENTIALS = isi JSON service account. Lokal: GOOGLE_APPLICATION_CREDENTIALS = path file JSON.
    raw = os.environ.get("FIREBASE_CREDENTIALS")
    cred = credentials.Certificate(json.loads(raw)) if raw else None
    firebase_admin.initialize_app(cred)
    return firestore.client()


def current_user(token: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> str:
    fb()
    try:
        return auth.verify_id_token(token.credentials)["uid"]
    except (ValueError, auth.InvalidIdTokenError):
        raise HTTPException(401, "Token tidak valid atau kedaluwarsa")


def now():
    return datetime.now(timezone.utc)


# --- Colokan untuk AI Engineer: ganti isi 2 fungsi ini (atau `from ai import analyze, answer`), format output wajib sama ---

def analyze(text: str) -> dict:
    return {
        "summary": "Perjanjian jual-beli tanah seluas 120 m² di Kota Bandung antara Budi (penjual) dan Sari (pembeli).",
        "risks": [
            {"pasal": "Pasal 5", "kutipan": "Uang muka tidak dapat dikembalikan dengan alasan apa pun.",
             "kategori": "Uang muka (DP) hangus tanpa syarat jelas", "level": "high",
             "alasan": "DP hangus walaupun pembatalan terjadi karena kesalahan penjual."},
            {"pasal": "Pasal 2", "kutipan": "Objek jual-beli adalah tanah SHM No. 123 seluas 120 m².",
             "kategori": "Ketidakjelasan objek tanah", "level": "low",
             "alasan": "Nomor sertifikat dan luas sudah jelas; batas-batas tanah sebaiknya ditambahkan."},
        ],
    }


def answer(question: str) -> dict:
    return {"answer": "SHM adalah hak terkuat dan terpenuh atas tanah (dummy, menunggu RAG).",
            "sources": ["UU No. 5 Tahun 1960 (UUPA) Pasal 20"]}


# --- Endpoint ---

def extract_text(pdf: bytes) -> str:
    try:
        with pymupdf.open(stream=pdf, filetype="pdf") as doc:
            return "\n".join(page.get_text() for page in doc).strip()
    except (pymupdf.FileDataError, RuntimeError):
        raise HTTPException(422, "PDF rusak atau tidak bisa dibaca")


# ponytail: BackgroundTasks hilang kalau server restart, dokumen nyangkut di "pending". Pakai antrean kalau itu kejadian.
def run_analysis(doc_id: str, text: str):
    ref = fb().collection("documents").document(doc_id)
    try:
        out = Analysis(document_id=doc_id, status="done", **analyze(text))  # validasi output AI sebelum disimpan
        ref.update(out.model_dump(include={"status", "summary", "risks"}))
    except Exception:
        log.exception("Analisis gagal untuk dokumen %s", doc_id)
        ref.update({"status": "failed", "error": "Analisis gagal, coba upload ulang beberapa saat lagi."})


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/upload", response_model=Document, status_code=202)
def upload(file: UploadFile, tasks: BackgroundTasks, uid: str = Depends(current_user)):
    pdf = file.file.read(MAX_PDF_BYTES + 1)
    if len(pdf) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF maksimal 10 MB")
    if not pdf.startswith(b"%PDF"):
        raise HTTPException(415, "File harus PDF")
    text = extract_text(pdf)
    if not text:
        # ponytail: PDF hasil scan ditolak; tambah OCR kalau banyak dokumen user berupa scan
        raise HTTPException(422, "PDF tidak berisi teks (kemungkinan hasil scan). Gunakan PDF digital.")

    doc_id = uuid4()
    doc = {"user_id": uid, "filename": file.filename or "dokumen.pdf",
           "status": "pending", "summary": None, "risks": [], "error": None, "created_at": now()}
    fb().collection("documents").document(str(doc_id)).set(doc)
    tasks.add_task(run_analysis, str(doc_id), text)
    return Document(id=doc_id, **doc)


@app.get("/documents", response_model=list[Document])
def list_documents(uid: str = Depends(current_user)):
    snaps = fb().collection("documents").where(filter=firestore.FieldFilter("user_id", "==", uid)).stream()
    # ponytail: sort di Python biar nggak perlu composite index; ganti ke order_by kalau dokumen per user ribuan
    docs = [Document(id=s.id, **s.to_dict()) for s in snaps]
    return sorted(docs, key=lambda d: d.created_at, reverse=True)


@app.get("/analysis/{document_id}", response_model=Analysis)
def get_analysis(document_id: UUID, uid: str = Depends(current_user)):
    snap = fb().collection("documents").document(str(document_id)).get()
    if not snap.exists or snap.get("user_id") != uid:
        raise HTTPException(404, "Dokumen tidak ditemukan")  # 404 juga untuk punya orang lain, biar id nggak bocor
    return Analysis(document_id=document_id, **snap.to_dict())


@app.post("/chat", response_model=ChatOut)
def chat(body: ChatIn, uid: str = Depends(current_user)):
    try:
        out = ChatOut(**answer(body.question))
    except Exception:
        log.exception("Chat gagal")
        return CHAT_FALLBACK  # LLM timeout/rate limit: jawab sopan, jangan crash, jangan simpan ke riwayat
    fb().collection("chat_history").add({"user_id": uid, "question": body.question, **out.model_dump(), "created_at": now()})
    return out


@app.get("/chat/history", response_model=list[ChatItem])
def chat_history(uid: str = Depends(current_user)):
    snaps = fb().collection("chat_history").where(filter=firestore.FieldFilter("user_id", "==", uid)).stream()
    return sorted((ChatItem(**s.to_dict()) for s in snaps), key=lambda c: c.created_at)  # lama → baru, urutan chat
