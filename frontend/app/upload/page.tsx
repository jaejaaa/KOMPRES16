"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDocuments, uploadDocument } from "@/lib/api";
import type { DocStatus, UploadResponse } from "@/types/api";
import Icon from "@/components/Icon";
import { MAX_PDF_MB as MAX_MB } from "@/lib/site";

const STATUS: Record<DocStatus, { label: string; className: string }> = {
  pending: { label: "Sedang dianalisis", className: "bg-risk-mid-bg text-risk-mid-text" },
  done: { label: "Selesai", className: "bg-risk-low-bg text-risk-low-text" },
  failed: { label: "Gagal", className: "bg-risk-high-bg text-risk-high-text" },
};

const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function DokumenSaya() {
  const [docs, setDocs] = useState<UploadResponse[] | null>(null);

  useEffect(() => {
    let aktif = true;
    getDocuments()
      .then((d) => aktif && setDocs(d))
      .catch(() => aktif && setDocs([])); // daftar ini pelengkap, jangan ganggu upload kalau gagal
    return () => { aktif = false; };
  }, []);

  if (!docs?.length) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl font-semibold text-ink">Dokumen kamu</h2>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {docs.map((d) => {
          const s = STATUS[d.status] ?? STATUS.pending;
          return (
            <li key={d.id}>
              <Link href={`/analisis/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                <Icon name="doc" className="size-5 shrink-0 text-brass" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{d.filename}</span>
                  <span className="block text-xs text-ink-soft">{tanggal(d.created_at)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-8 md:px-8 md:pt-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brass-deep">Cek dokumen</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink md:text-4xl">Periksa dokumen tanahmu</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Unggah perjanjian jual beli, AJB, atau surat tanah lainnya. Kami tandai pasal yang perlu kamu waspadai.
        </p>
      </header>

      <div
        role="button"
        tabIndex={0}
        aria-label="Pilih file PDF"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-brand bg-brand-soft" : "border-line bg-card hover:border-brand/40"
        }`}
      >
        <span className={`flex size-12 items-center justify-center rounded-2xl ${file ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
          <Icon name={file ? "doc" : "upload"} className="size-6" />
        </span>
        {file ? (
          <>
            <p className="mt-4 max-w-full truncate font-semibold text-ink">{file.name}</p>
            <p className="mt-1 text-sm text-ink-soft">{(file.size / 1024 / 1024).toFixed(2)} MB · klik untuk ganti file</p>
          </>
        ) : (
          <>
            <p className="mt-4 font-semibold text-ink">Tarik file PDF ke sini</p>
            <p className="mt-1 text-sm text-ink-soft">atau klik untuk pilih file (maks {MAX_MB} MB)</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      {error && (
        <p className="fade-up mt-4 flex gap-2 rounded-xl bg-risk-high-bg p-3 text-sm text-risk-high-text" role="alert">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!file || loading}
        className="mt-5 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
      >
        {loading ? "Menganalisis dokumen, tunggu sebentar..." : "Periksa dokumen"}
      </button>

      <ul className="mt-6 space-y-2 text-sm text-ink-soft">
        <li className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-risk-low" /> Gunakan PDF digital. PDF hasil scan/foto belum bisa dibaca.</li>
        <li className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-risk-low" /> Dokumen hanya dipakai untuk analisis dan tanya jawab milikmu sendiri.</li>
        <li className="flex gap-2"><Icon name="info" className="mt-0.5 size-4 shrink-0 text-brass" /> Hasil analisis adalah bantuan awal, bukan pengganti notaris/PPAT.</li>
      </ul>

      <DokumenSaya />
    </main>
  );
}
