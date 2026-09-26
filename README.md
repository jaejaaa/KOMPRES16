# KOMPRES 16 — Asisten Hukum Tanah (AI Legal & Public Service Assistant)

Kompetisi KOMPRES 16 Informatika 2026, kategori Software Development. Tim 4 orang:
UI/UX + Frontend, Backend, AI Engineer, Data Engineer.

## Peta repo

| Folder | Isi | Peran pemilik |
|---|---|---|
| [`backend/`](backend/) | FastAPI + Firebase (Auth anonim, Firestore). Endpoint upload/analisis/chat, modul `chatbot/` (Gemini) | Backend, AI Engineer |
| [`data_engineer/`](data_engineer/) | Knowledge base regulasi: PDF sumber → chunk per Pasal → embedding → `search()`; panduan prosedur; test set & evaluasi | Data Engineer |
| [`frontend/`](frontend/) | Next.js 16 + Tailwind: beranda, cek dokumen, hasil analisis, tanya hukum (chat), panduan. Pakai data mock selama URL backend belum diisi | UI/UX + Frontend |

## Alur sistem

```
Frontend ──▶ Backend (FastAPI) ──▶ chatbot/ (Gemini) ──▶ search() ──▶ knowledge base
 upload,       auth, upload,         prompt, guardrail,     data_engineer/scripts     (chunks.jsonl
 chat          Firestore             sitasi Pasal                                      + embeddings)
```

## Kontrak antar modul
- **Chat:** `POST /chat` `{pertanyaan, document_id?}` → `{jawaban, sumber[], di_luar_cakupan, status, disclaimer}`; riwayat `GET /chat/history?document_id=`.
- **Retrieval:** `search(query, top_k) -> [{id, sumber, pasal, teks, asal, score(0-1), status, ...}]`, atau `Retriever().search()` → `[(Chunk, skor)]`.
  Detail di [`data_engineer/README.md`](data_engineer/README.md).
- **Analisis dokumen:** `analyze(text) -> {summary, risks:[{pasal, kutipan, kategori, level(low|medium|high), alasan}]}`. *(menunggu AI Engineer)*
- **Panduan:** halaman `/panduan` membaca salinan `data_engineer/data/panduan/*.json` di `frontend/data/panduan/` (Next.js tidak bisa import file di luar `frontend/`). Kalau panduan diubah, kabari Frontend supaya salinannya diperbarui.

## Menjalankan frontend
```
cd frontend
npm install
npm run dev        # buka http://localhost:3000
```
Buat `frontend/.env.local` (tidak masuk git) berisi `NEXT_PUBLIC_FIREBASE_*` (config web Firebase) dan `NEXT_PUBLIC_API_URL`.
Selama `NEXT_PUBLIC_API_URL` kosong, frontend memakai data mock. Setelah backend online: isi URL-nya, set `NEXT_PUBLIC_USE_MOCK=false`, lalu restart `npm run dev`.

## Status singkat
- ✅ Knowledge base: 9 regulasi, 1.452 chunk, test set 45 pertanyaan, retrieval Hit@5 0,93 (dev set).
- ✅ Backend: Auth, upload PDF, chat + riwayat, chatbot Gemini tersambung (masih memakai data regulasi contoh).
- ✅ Frontend: semua halaman sudah didesain dan berjalan dengan data mock; tinggal disambungkan ke URL backend.
- ⏳ Chatbot belum memakai `search()` asli; analisis dokumen (`analyze`) masih dummy.
- ✅ **Diputuskan:** embedding pindah ke Gemini (`gemini-embedding-001`); laporan perbandingan dengan bge-m3 di `data_engineer/data/eval/PERBANDINGAN_EMBEDDING.md`.
- ❓ **Belum diputuskan:** penyimpanan vektor (file `.npy` di git vs Firestore) dan tempat hosting backend.

## Aturan main repo
1. **Jangan commit rahasia** (`.env`, kunci service account, API key). Pakai `.env` lokal; contoh ada di `.env.example` tiap folder.
2. Ambil perubahan dengan `git pull --rebase`, lalu `git push`. Satu orang mengubah satu folder sebisa mungkin, supaya tidak bentrok.
3. File turunan besar (`*.npy`, `.venv`) tidak masuk git; dibangun ulang oleh skrip.
4. Data/dokumen contoh tidak berisi data pribadi asli.
