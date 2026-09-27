"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDocuments, uploadDocument } from "@/lib/api";
import type { DocStatus, UploadResponse } from "@/types/api";
import Icon from "@/components/Icon";
import LoginDialog from "@/components/LoginDialog";
import TamuBanner from "@/components/TamuBanner";
import { useAkun } from "@/lib/akun";
import { btn, container, Notice, PageHeader, Panel, Spinner, StepBar } from "@/components/ui";
import { MAX_PDF_MB as MAX_MB } from "@/lib/site";

const STATUS: Record<DocStatus, { label: string; className: string }> = {
  pending: { label: "Diproses", className: "bg-risk-mid-bg text-risk-mid-text" },
  done: { label: "Selesai", className: "bg-risk-low-bg text-risk-low-text" },
  failed: { label: "Gagal", className: "bg-risk-high-bg text-risk-high-text" },
};

// Pesan yang bergantian selama dokumen diproses (hanya penanda, bukan progres sebenarnya)
const TAHAP = ["Mengunggah dokumen", "Membaca teks dokumen", "Mencocokkan pasal dengan peraturan", "Menyusun hasil pemeriksaan"];

const SYARAT = [
  "PDF digital, bukan hasil scan atau foto",
  `Ukuran file maksimal ${MAX_MB} MB`,
  "Berisi pasal perjanjian, misal. jual beli, AJB, atau sewa",
];

const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function RiwayatPemeriksaan({ uid }: { uid: string | null }) {
  const [docs, setDocs] = useState<UploadResponse[] | null>(null);

  // Dimuat ulang saat akun berganti (mis. setelah masuk ke akun Google lain).
  // Belum punya akun sama sekali = belum ada riwayat, jadi tidak perlu memanggil backend.
  useEffect(() => {
    if (!uid) return;
    let aktif = true;
    getDocuments()
      .then((d) => aktif && setDocs(d))
      .catch(() => aktif && setDocs([])); // daftar ini pelengkap, jangan ganggu upload kalau gagal
    return () => { aktif = false; };
  }, [uid]);

  if (!docs?.length) return null;

  return (
    <Panel title="Riwayat pemeriksaan" icon="clock" className="mt-6">
      <ul className="space-y-2">
        {docs.map((d) => {
          const s = STATUS[d.status] ?? STATUS.pending;
          return (
            <li key={d.id}>
              <Link
                href={`/analisis/${d.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-transparent bg-bg p-3.5 transition-all hover:border-primary/30 hover:bg-primary-soft"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-soft">
                  <Icon name="doc" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{d.filename}</span>
                  <span className="block text-xs text-ink-soft">{tanggal(d.created_at)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.className}`}>{s.label}</span>
                <Icon name="arrow" className="size-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tahap, setTahap] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const akun = useAkun();
  const [login, setLogin] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setTahap((x) => Math.min(x + 1, TAHAP.length - 1)), 1800);
    return () => clearInterval(t);
  }, [loading]);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf") return setError("File harus berformat PDF.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Ukuran file maksimal ${MAX_MB} MB.`);
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setTahap(0);
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

  const buka = () => !loading && inputRef.current?.click();

  return (
    <main>
      <PageHeader
        icon="doc"
        crumbs={[{ href: "/", label: "Beranda" }, { label: "Cek Dokumen" }]}
        title="Pemeriksaan Dokumen Tanah"
        desc="Unggah perjanjian jual beli, AJB, atau dokumen tanah lainnya. Pasal yang perlu diwaspadai akan ditandai beserta alasannya."
      />
      <StepBar aktif={loading ? 1 : 0} />

      <div className={`${container} pt-6`}>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          <Panel title="Unggah dokumen" icon="upload">
            {loading && file ? (
              <div className="fade-up rounded-3xl bg-linear-to-br from-primary-soft to-bg p-6 md:p-8" aria-live="polite">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lift">
                    <Spinner className="size-7" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{file.name}</p>
                    <p key={tahap} className="fade-up mt-0.5 text-sm text-primary">{TAHAP[tahap]}…</p>
                  </div>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="progress-bar h-full w-2/5 rounded-full bg-linear-to-r from-secondary to-primary" />
                </div>
                <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {TAHAP.map((t, i) => (
                    <li key={t} className={`flex items-center gap-2 text-sm transition-colors ${i <= tahap ? "text-ink" : "text-ink-soft/60"}`}>
                      <span className={`flex size-5 items-center justify-center rounded-full ${i < tahap ? "bg-risk-low text-white" : i === tahap ? "bg-primary text-white" : "bg-surface"}`}>
                        {i < tahap ? <Icon name="check" className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
            ) : file ? (
              <div className="fade-up flex items-center gap-4 rounded-3xl border-2 border-primary/20 bg-primary-soft p-5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lift">
                  <Icon name="doc" className="size-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{file.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-risk-low-text">
                    <Icon name="check" className="size-4" /> Siap diperiksa · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                  aria-label="Hapus file"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft transition-colors hover:bg-risk-high-bg hover:text-risk-high"
                >
                  <Icon name="x" className="size-5" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Pilih file PDF"
                onClick={buka}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    buka();
                  }
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
                className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 ${dragging
                    ? "scale-[1.01] border-secondary bg-primary-soft"
                    : "border-line-strong bg-linear-to-b from-bg to-surface hover:border-secondary hover:bg-primary-soft/50"
                  }`}
              >
                <span
                  className={`flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-secondary to-primary text-white shadow-lift transition-transform duration-300 group-hover:-translate-y-1 ${dragging ? "animate-bounce" : ""
                    }`}
                >
                  <Icon name="upload" className="size-7" />
                </span>
                <p className="mt-5 text-lg font-bold text-ink">{dragging ? "Lepaskan untuk mengunggah" : "Tarik file PDF ke sini"}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  atau <span className="font-semibold text-secondary underline underline-offset-4">pilih dari perangkat</span> · maks {MAX_MB} MB
                </p>
              </div>
            )}
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />

            {error && (
              <div className="fade-up mt-4">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}

            {akun.siap && !akun.masuk && (
              <div className="mt-5">
                <TamuBanner
                  pesan="Riwayat pemeriksaan hanya tersimpan selama tab ini terbuka."
                  onMasuk={() => setLogin(true)}
                />
              </div>
            )}

            <button type="button" onClick={submit} disabled={!file || loading} className={`${btn.primary} mt-3 w-full py-4 text-base`}>
              {loading ? (
                <>
                  <Spinner /> Menganalisis dokumen, tunggu sebentar...
                </>
              ) : (
                <>
                  Periksa Dokumen <Icon name="arrow" className="size-5" />
                </>
              )}
            </button>
          </Panel>

          <aside className="space-y-4">
            <Panel title="Persyaratan" icon="list">
              <ul className="space-y-3 text-sm text-ink">
                {SYARAT.map((s) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-risk-low-bg text-risk-low">
                      <Icon name="check" className="size-3.5" />
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Notice title="Privasi dokumen">
              File PDF tidak disimpan. Teks dokumen hanya dipakai untuk analisis dan tanya jawab di sesi Anda.
            </Notice>
            <Notice tone="warning" title="Bukan nasihat hukum">
              Hasil pemeriksaan adalah bantuan awal. Konsultasikan keputusan transaksi dengan PPAT atau notaris.
            </Notice>
          </aside>
        </div>

        <div id="riwayat" className="scroll-mt-28">
          <RiwayatPemeriksaan uid={akun.uid} />
        </div>
      </div>
      <LoginDialog open={login} onClose={() => setLogin(false)} />
    </main>
  );
}
