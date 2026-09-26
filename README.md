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
- **Analisis dokumen:** `analyze(text) -> {summary, risks:[{pasal, kutipan, kategori, level(low|medium|high), alasan}]}` di `backend/analisis/`.
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
- ✅ Backend live: **https://kompres16-backend.vercel.app** (Vercel, deploy manual, lihat [`backend/README.md`](backend/README.md)).
- ✅ Chat memakai `Retriever` Data Engineer (Gemini `gemini-embedding-2`, vektor `.npy` di repo, ambang 0,65).
- ✅ Analisis dokumen memakai `analyze()` asli (10 kategori risiko).
- ✅ Knowledge base: 9 regulasi, 1.452 chunk; retrieval Hit@5 0,95 (dev set), laporan di `data_engineer/data/eval/PERBANDINGAN_EMBEDDING.md`.
- ⏳ Frontend: sambungkan ke URL backend di atas, lalu deploy ke Vercel (domainnya ditambahkan ke Firebase Authorized domains + CORS backend).

## Aturan main repo
1. **Jangan commit rahasia** (`.env`, kunci service account, API key). Pakai `.env` lokal; contoh ada di `.env.example` tiap folder.
2. Ambil perubahan dengan `git pull --rebase`, lalu `git push`. Satu orang mengubah satu folder sebisa mungkin, supaya tidak bentrok.
3. File turunan besar (`*.npy`, `.venv`) tidak masuk git; dibangun ulang oleh skrip.
4. Data/dokumen contoh tidak berisi data pribadi asli.
