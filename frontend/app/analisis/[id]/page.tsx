"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/api";
import type { AnalysisResult, RiskLevel } from "@/types/api";
import RiskCard, { RISK_STYLE, RiskBadge } from "@/components/RiskCard";
import Icon from "@/components/Icon";
import KonsultasiDokumen from "@/components/KonsultasiDokumen";
import { btn, container, Notice, PageHeader, Panel, Spinner, StepBar } from "@/components/ui";

const ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
const LEVELS = ["high", "medium", "low"] as const;
const POLL_MS = 2500;

function Kerangka({ aktif, children }: { aktif: 1 | 2; children: React.ReactNode }) {
  return (
    <main>
      <PageHeader
        icon="list"
        crumbs={[{ href: "/", label: "Beranda" }, { href: "/upload", label: "Cek Dokumen" }, { label: "Hasil Pemeriksaan" }]}
        title="Hasil Pemeriksaan Dokumen"
        desc="Pasal diurutkan dari risiko tertinggi. Buka kutipan untuk membaca teks asli pasalnya."
      />
      <StepBar aktif={aktif} />
      <div className={`${container} pt-6`}>{children}</div>
    </main>
  );
}

function Masalah({ judul, pesan }: { judul: string; pesan: string }) {
  return (
    <Kerangka aktif={2}>
      <Panel className="mx-auto max-w-2xl text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-risk-high-bg text-risk-high">
          <Icon name="alert" className="size-8" />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{judul}</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">{pesan}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/upload" className={btn.primary}>
            <Icon name="upload" className="size-4" /> Unggah ulang
          </Link>
          <Link href="/chat" className={btn.secondary}>Tanya JagaTanah AI</Link>
        </div>
      </Panel>
    </Kerangka>
  );
}

export default function AnalisisPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskLevel | "all">("all");

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await getAnalysis(id);
        if (stop) return;
        setData(res);
        if (res.status !== "done" && res.status !== "failed") timer = setTimeout(poll, POLL_MS);
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
    };
    poll();
    return () => { stop = true; clearTimeout(timer); };
  }, [id]);

  if (error) return <Masalah judul="Hasil tidak dapat dimuat" pesan={error} />;

  if (data?.status === "failed")
    return <Masalah judul="Analisis gagal" pesan={data.error ?? "Dokumen tidak dapat dianalisis."} />;

  if (!data || data.status !== "done")
    return (
      <Kerangka aktif={1}>
        <Panel className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4" aria-live="polite">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lift">
              <Spinner className="size-7" />
            </span>
            <div>
              <p className="text-lg font-bold text-ink">Dokumen sedang dianalisis</p>
              <p className="text-sm text-ink-soft">Biasanya kurang dari 30 detik. Halaman ini akan terisi otomatis.</p>
            </div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-bg">
            <div className="progress-bar h-full w-2/5 rounded-full bg-linear-to-r from-secondary to-primary" />
          </div>
          <div className="mt-6 space-y-3" aria-hidden>
            {["w-3/4", "w-full", "w-5/6"].map((w) => <div key={w} className={`h-3 ${w} animate-pulse rounded-full bg-bg`} />)}
          </div>
        </Panel>
      </Kerangka>
    );

  const risks = [...data.risks].sort((a, b) => (ORDER[a.level] ?? 1) - (ORDER[b.level] ?? 1));
  const count = (lvl: RiskLevel) => risks.filter((r) => r.level === lvl).length;
  const tinggi = count("high");
  const sedang = count("medium");
  const tampil = filter === "all" ? risks : risks.filter((r) => r.level === filter);
  const chips: { id: RiskLevel | "all"; label: string; n: number }[] = [
    { id: "all", label: "Semua", n: risks.length },
    ...LEVELS.map((l) => ({ id: l, label: RISK_STYLE[l].label, n: count(l) })),
  ];

  return (
    <Kerangka aktif={2}>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section className="fade-up grid grid-cols-1 gap-6 rounded-3xl border border-line bg-surface p-6 shadow-soft md:grid-cols-[1fr_220px] md:p-8">
            <div>
              <p className="text-sm font-semibold text-secondary">Ringkasan</p>
              <p className="mt-3 text-lg leading-relaxed text-ink">{data.summary}</p>
            </div>
            <div className="rounded-2xl bg-bg p-5">
              <p className="text-sm text-ink-soft">Pasal ditandai</p>
              <p className="text-5xl font-extrabold tracking-tight text-primary">{risks.length}</p>
              {risks.length > 0 && (
                <div className="mt-4 flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden>
                  {LEVELS.map((l, i) =>
                    count(l) ? (
                      <span
                        key={l}
                        className={`grow-x h-full rounded-full ${RISK_STYLE[l].bar}`}
                        style={{ flexGrow: count(l), animationDelay: `${i * 150}ms` }}
                      />
                    ) : null,
                  )}
                </div>
              )}
              <ul className="mt-4 space-y-1.5 text-sm">
                {LEVELS.map((l) => (
                  <li key={l} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-ink-soft">
                      <span className={`size-2.5 rounded-full ${RISK_STYLE[l].bar}`} /> {RISK_STYLE[l].label}
                    </span>
                    <span className="font-bold tabular-nums text-ink">{count(l)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              {tinggi > 0 ? (
                <Notice tone="danger" title={`Ditemukan ${tinggi} pasal berisiko tinggi`}>
                  Sebaiknya bahas dengan penjual dan PPAT sebelum tanda tangan atau membayar.
                </Notice>
              ) : sedang > 0 ? (
                <Notice tone="warning" title={`Ada ${sedang} pasal yang perlu dicek`}>
                  Pastikan maksud pasal tersebut jelas sebelum tanda tangan.
                </Notice>
              ) : (
                <Notice tone="success" title="Tidak ditemukan pasal berisiko tinggi">
                  Tetap periksa keaslian sertifikat sebelum bertransaksi.
                </Notice>
              )}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight text-ink">Rincian temuan</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Saring temuan">
                {chips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilter(c.id)}
                    disabled={c.n === 0}
                    aria-pressed={filter === c.id}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${
                      filter === c.id ? "bg-primary text-white shadow-soft" : "border border-line bg-surface text-ink-soft hover:border-primary hover:text-primary"
                    }`}
                  >
                    {c.label}
                    <span className={`rounded-full px-1.5 text-xs tabular-nums ${filter === c.id ? "bg-white/20" : "bg-bg"}`}>{c.n}</span>
                  </button>
                ))}
              </div>
            </div>
            <div key={filter} className="mt-4 space-y-3">
              {tampil.length === 0 && <p className="text-ink-soft">Tidak ada pasal yang ditandai.</p>}
              {tampil.map((r, i) => (
                <div key={`${r.pasal}-${i}`} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <RiskCard risk={r} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <Panel title="Langkah selanjutnya" icon="arrow">
            <KonsultasiDokumen documentId={data.document_id} />
            <ul className="mt-4 space-y-1">
              {[
                { href: "/panduan/cek-keaslian", icon: "book" as const, label: "Cek keaslian sertifikat" },
                { href: "/panduan/balik-nama", icon: "book" as const, label: "Prosedur balik nama" },
                { href: "/upload", icon: "upload" as const, label: "Periksa dokumen lain" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-primary-soft hover:text-primary">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-bg text-primary">
                      <Icon name={l.icon} className="size-4" />
                    </span>
                    <span className="flex-1">{l.label}</span>
                    <Icon name="arrow" className="size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="rounded-3xl border border-line bg-surface p-5 text-sm shadow-soft">
            <div className="flex justify-between gap-4">
              <span className="text-ink-soft">Nomor pemeriksaan</span>
              <span className="font-mono font-bold uppercase text-ink">{data.document_id.slice(0, 8)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-ink-soft">Tingkat risiko tertinggi</span>
              <RiskBadge level={tinggi ? "high" : sedang ? "medium" : "low"} />
            </div>
          </div>

          <Notice tone="warning" title="Bukan nasihat hukum">
            Hasil ini bantuan awal. Konsultasikan keputusan transaksi dengan PPAT atau notaris.
          </Notice>
        </aside>
      </div>
    </Kerangka>
  );
}
