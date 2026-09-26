# Backend KOMPRES 16 (FastAPI + Firebase)

Live: https://kompres16-backend.vercel.app (dokumentasi endpoint: `/docs`)

## Jalan lokal
```
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env         # isi GEMINI_API_KEY
cd backend && GOOGLE_APPLICATION_CREDENTIALS=/path/firebase-key.json uvicorn main:app --reload
```
Tes: `python test_main.py` dan `python -m unittest discover -s tests` (dari folder `backend/`).

## Deploy (Vercel)
Dari root repo: `npx vercel deploy --prod --yes`. Konfigurasi ada di `pyproject.toml` (entrypoint + dependensi),
`vercel.json` (maxDuration), dan `.vercelignore`. Env di Vercel: `GEMINI_API_KEY`, `GEMINI_MODEL`, `FIREBASE_CREDENTIALS` (isi JSON service account).
Di Vercel, analisis dokumen dijalankan langsung di `/upload` (tanpa background task); PDF maksimal 4 MB.
Retriever memakai `data_engineer/scripts` + `data_engineer/data/chunks`, jadi deploy harus dari root repo.
