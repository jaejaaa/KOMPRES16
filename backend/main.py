import json
import logging
import os
import sys
from datetime import datetime, timezone
from functools import cache
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

import firebase_admin
import pymupdf
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from firebase_admin import auth, credentials, firestore
from pydantic import BaseModel, Field

load_dotenv()  # harus sebelum import chatbot: chatbot/config.py baca GEMINI_MODEL saat di-import
os.environ.setdefault("SEARCH_BACKEND", "local")  # vektor dari file .npy; tanpa ini search.py pilih Firestore (kosong) karena kredensial Firebase ada
os.environ.setdefault("MIN_RETRIEVAL_SCORE", "0.65")  # skala skor Gemini embedding, lihat data_engineer/data/eval/PERBANDINGAN_EMBEDDING.md
sys.path.insert(0, str(Path(__file__).resolve().parent))  # Vercel memuat file ini sebagai backend.main dari root repo
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "data_engineer" / "scripts"))
from retriever import Retriever
from analisis import DokumenTidakRelevan, analyze, saran_kategori_kasus
from chatbot import jawab_chat
from konsultan import cari_konsultan, kategori_kasus

# Struktur Firestore:
#   documents/{id}     user_id, filename, text, status, summary, risks[], error, created_at
#   chat_history/{id}  user_id, document_id (null = chat umum), pertanyaan, jawaban, sumber[], status, created_at
# User pakai Firebase Auth (anonymous). File PDF tidak disimpan, cuma teksnya (untuk analisis + konteks chat).
# ponytail: tanpa Firebase Storage (butuh Blaze plan); tambahkan kalau perlu fitur download PDF asli.

app = FastAPI(title="Hukum Tanah API")
# ponytail: izinkan semua origin untuk dev, ganti ke domain frontend sebelum final
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
log = logging.getLogger("uvicorn.error")
REGULASI = Retriever()  # retriever Data Engineer (Gemini embedding); 1 panggilan embedding per pertanyaan

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
    pertanyaan: str = Field(min_length=1, max_length=2000)
    document_id: UUID | None = None  # isi kalau user lagi buka dokumen; sekalian jadi id sesi chat


class ChatItem(BaseModel):
    pertanyaan: str
    jawaban: str
    sumber: list[dict]
    status: str
    created_at: datetime
    document_id: str | None = None  # bukan penyaring lagi (riwayat 1 percakapan per akun); FE tampilkan tanda "Mode dokumen"


MAX_PDF_BYTES = 4 * 1024 * 1024  # Vercel menolak body request > 4,5 MB
MAX_TEXT_CHARS = 200_000  # ponytail: batas dokumen Firestore 1 MiB; simpan teks di Storage kalau dokumen user lebih panjang


@cache
def fb():
    # Railway: FIREBASE_CREDENTIALS = isi JSON service account. Lokal: GOOGLE_APPLICATION_CREDENTIALS = path file JSON.
    raw = os.environ.get("FIREBASE_CREDENTIALS")
    cred = credentials.Certificate(json.loads(raw)) if raw else None
    firebase_admin.initialize_app(cred)
    return firestore.client()


def current_token(token: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> dict:
    fb()
    try:
        return auth.verify_id_token(token.credentials)
    except (ValueError, auth.InvalidIdTokenError):
        raise HTTPException(401, "Token tidak valid atau kedaluwarsa")


def current_user(token: dict = Depends(current_token)) -> str:
    return token["uid"]


def now():
    return datetime.now(timezone.utc)


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
    except DokumenTidakRelevan as e:
        log.info("Dokumen %s ditolak: bukan dokumen hukum pertanahan", doc_id)
        ref.update({"status": "failed", "error": str(e)})
    except Exception:
        log.exception("Analisis gagal untuk dokumen %s", doc_id)
        ref.update({"status": "failed", "error": "Analisis gagal, coba upload ulang beberapa saat lagi."})


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")  # yang buka URL backend di browser langsung lihat daftar endpoint


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/upload", response_model=Document, status_code=202)
def upload(file: UploadFile, tasks: BackgroundTasks, uid: str = Depends(current_user)):
    pdf = file.file.read(MAX_PDF_BYTES + 1)
    if len(pdf) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF maksimal 4 MB")
    if not pdf.startswith(b"%PDF"):
        raise HTTPException(415, "File harus PDF")
    text = extract_text(pdf)
    if not text:
        # ponytail: PDF hasil scan ditolak; tambah OCR kalau banyak dokumen user berupa scan
        raise HTTPException(422, "PDF tidak berisi teks (kemungkinan hasil scan). Gunakan PDF digital.")

    doc_id = uuid4()
    doc = {"user_id": uid, "filename": file.filename or "dokumen.pdf", "text": text[:MAX_TEXT_CHARS],
           "status": "pending", "summary": None, "risks": [], "error": None, "created_at": now()}
    fb().collection("documents").document(str(doc_id)).set(doc)
    if os.environ.get("VERCEL"):  # serverless: tugas setelah respons tidak dijamin jalan, jadi analisis dulu (maxDuration di vercel.json)
        run_analysis(str(doc_id), text)
    else:
        tasks.add_task(run_analysis, str(doc_id), text)
    return Document(id=doc_id, **doc)


@app.get("/documents", response_model=list[Document])
def list_documents(uid: str = Depends(current_user)):
    snaps = fb().collection("documents").where(filter=firestore.FieldFilter("user_id", "==", uid)).stream()
    # ponytail: sort di Python biar nggak perlu composite index; ganti ke order_by kalau dokumen per user ribuan
    docs = [Document(id=s.id, **s.to_dict()) for s in snaps]
    return sorted(docs, key=lambda d: d.created_at, reverse=True)


def own_document(document_id: UUID, uid: str) -> dict:
    snap = fb().collection("documents").document(str(document_id)).get()
    if not snap.exists or snap.get("user_id") != uid:
        raise HTTPException(404, "Dokumen tidak ditemukan")  # 404 juga untuk punya orang lain, biar id nggak bocor
    return snap.to_dict()


@app.get("/analysis/{document_id}", response_model=Analysis)
def get_analysis(document_id: UUID, uid: str = Depends(current_user)):
    return Analysis(document_id=document_id, **own_document(document_id, uid))


# Rekomendasi konsultan (dummy) berdasarkan kategori risiko "high" yang ditemukan analyze().
# Dihitung on-demand (bukan disimpan): cari_konsultan() cuma baca JSON lokal, murah dan selalu segar.
@app.get("/analysis/{document_id}/konsultan")
def analysis_konsultan(document_id: UUID, uid: str = Depends(current_user)):
    risks = own_document(document_id, uid).get("risks") or []
    return [{"kategori_kasus": k, **cari_konsultan(k)} for k in saran_kategori_kasus(risks)]


def history(uid: str) -> list[dict]:
    # Satu percakapan per akun: chat umum dan chat per-dokumen digabung jadi satu riwayat
    # (document_id tetap disimpan per pesan sebagai penanda, bukan lagi penyaring).
    # ponytail: tidak dibatasi jumlah; pertimbangkan limit/pagination kalau riwayat per user membesar.
    q = fb().collection("chat_history").where(filter=firestore.FieldFilter("user_id", "==", uid))
    return sorted((s.to_dict() for s in q.stream()), key=lambda h: h["created_at"])  # lama → baru


# def (bukan async def): jawab_chat blocking, FastAPI otomatis jalankan di threadpool
@app.post("/chat")
def chat(body: ChatIn, token: dict = Depends(current_token)):
    uid = token["uid"]
    doc_id = str(body.document_id) if body.document_id else None
    if doc_id and token["firebase"]["sign_in_provider"] == "anonymous":
        raise HTTPException(403, "Login dulu untuk lanjut tanya soal dokumen ini")
    konteks = own_document(body.document_id, uid).get("text") if doc_id else None
    riwayat = []
    for h in history(uid):
        riwayat += [{"role": "user", "content": h["pertanyaan"]}, {"role": "assistant", "content": h["jawaban"]}]

    hasil = jawab_chat(body.pertanyaan, riwayat, konteks, retriever=REGULASI)
    if hasil["status"] != "error":  # jawaban "layanan bermasalah" jangan masuk riwayat
        fb().collection("chat_history").add({
            "user_id": uid, "document_id": doc_id, "pertanyaan": body.pertanyaan, "jawaban": hasil["jawaban"],
            "sumber": hasil["sumber"], "status": hasil["status"], "created_at": now()})
    return hasil  # apa adanya: jawaban, sumber, di_luar_cakupan, status, disclaimer


@app.get("/chat/history", response_model=list[ChatItem])
def chat_history(uid: str = Depends(current_user)):
    return history(uid)


# Data konsultan masih DUMMY (Data Engineer): FE wajib tampilkan field "peringatan" + label "Contoh/Demo"
@app.get("/konsultan/kategori")
def konsultan_kategori():
    return kategori_kasus()


@app.get("/konsultan")
def konsultan(kategori: str, provinsi: str | None = None, kota: str | None = None):
    return cari_konsultan(kategori, provinsi, kota)
