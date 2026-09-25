# Setup Firestore untuk knowledge base regulasi

Untuk **pemilik project Firebase** (satu kali). Data regulasi bersifat publik, tetapi penulisan dibatasi.

1. **Firestore** dibuat dalam mode **Native** (Firebase console → Build → Firestore Database). Catat *Project ID*
   dan nama database (biasanya `(default)`). Vector search kemungkinan memerlukan paket berbayar (Blaze) — cek di console.
2. **Service account** untuk pengunggah data: Project settings → Service accounts → *Generate new private key*.
   Bagikan file JSON **hanya** ke Data Engineer lewat kanal aman. Jangan di-commit / ditempel di chat.
   Peran minimal: `Cloud Datastore User` (untuk baca-tulis). Backend/AI Engineer cukup peran baca (`Cloud Datastore Viewer`).
3. **Aturan keamanan** (Firestore → Rules) — klien web tidak boleh menyentuh koleksi ini; server (Admin SDK) tetap bisa:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /regulation_chunks/{doc} { allow read, write: if false; }
     }
   }
   ```
4. **Indeks vektor** (wajib untuk `find_nearest`; dimensi 1024 = bge-m3, tipe flat), dijalankan dengan `gcloud` oleh pemilik project:
   ```bash
   gcloud firestore indexes composite create \
     --project=PROJECT_ID --collection-group=regulation_chunks --query-scope=COLLECTION \
     --field-config=vector-config='{"dimension":"1024","flat": "{}"}',field-path=embedding
   ```
   Pembuatan indeks butuh beberapa menit; statusnya bisa dilihat di console (Indexes).

## Konfigurasi lokal (`.env`, tidak masuk git)
```
GOOGLE_APPLICATION_CREDENTIALS=/path/aman/serviceAccount.json
FIREBASE_PROJECT_ID=PROJECT_ID
SEARCH_BACKEND=firestore
```

## Skema dokumen (`regulation_chunks/{id}`)
`doc_slug, doc, doc_title, section, bab, pasal, pasal_inferred, status, is_active, page_start, page_end, content, embedding (Vector 1024)`.
