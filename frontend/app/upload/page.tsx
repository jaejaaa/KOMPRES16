"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/api";

const MAX_MB = 10;

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf") return setError("File harus berformat PDF.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Ukuran file maksimal ${MAX_MB} MB.`);
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadDocument(file);
      router.push(`/analisis/${res.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Cek dokumen tanah</h1>
        <p className="mt-2 text-slate-600">
          Unggah perjanjian jual beli, AJB, atau surat tanah lainnya. Kami tandai pasal yang perlu kamu waspadai.
        </p>
      </header>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
          dragging ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white hover:bg-slate-50"
        }`}
      >
        {file ? (
          <>
            <p className="font-medium text-slate-900">{file.name}</p>
            <p className="mt-1 text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · klik untuk ganti file</p>
          </>
        ) : (
          <>
            <p className="font-medium text-slate-900">Tarik file PDF ke sini</p>
            <p className="mt-1 text-sm text-slate-500">atau klik untuk pilih file (maks {MAX_MB} MB)</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      <button
        onClick={submit}
        disabled={!file || loading}
        className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Mengunggah..." : "Periksa dokumen"}
      </button>

      <p className="text-xs text-slate-500">
        Dokumen hanya dipakai untuk analisis ini. Hasil analisis adalah bantuan awal, bukan pengganti notaris/PPAT.
      </p>
    </main>
  );
}
