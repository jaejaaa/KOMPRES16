"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/api";
import type { AnalysisResult, RiskLevel } from "@/types/api";
import RiskCard, { RiskBadge } from "@/components/RiskCard";
import Icon from "@/components/Icon";

const ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
const POLL_MS = 2500;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-8 md:px-8">
      <Link href="/upload" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <Icon name="back" className="size-4" /> Cek dokumen lain
      </Link>
      {children}
    </main>
  );
}

function Masalah({ judul, pesan }: { judul: string; pesan: string }) {
  return (
    <Shell>
      <div className="mt-6 rounded-2xl border border-line bg-card p-6" role="alert">
        <span className="flex size-10 items-center justify-center rounded-xl bg-risk-high-bg text-risk-high-text">
          <Icon name="alert" />
        </span>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">{judul}</h1>
        <p className="mt-2 text-ink-soft">{pesan}</p>
        <Link href="/upload" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-hover">
          <Icon name="upload" className="size-4" /> Unggah ulang
        </Link>
      </div>
    </Shell>
  );
}

export default function AnalisisPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <Masalah judul="Hasil tidak bisa dimuat" pesan={error} />;

  if (data?.status === "failed")
    return <Masalah judul="Analisis gagal" pesan={data.error ?? "Dokumen tidak bisa dianalisis."} />;

  if (!data || data.status !== "done")
    return (
      <Shell>
        <div className="mt-6 rounded-2xl border border-line bg-card p-6" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="flex gap-1 text-brand" aria-hidden>
              <span className="typing-dot size-2 rounded-full bg-current" />
              <span className="typing-dot size-2 rounded-full bg-current" />
              <span className="typing-dot size-2 rounded-full bg-current" />
            </span>
            <p className="font-semibold text-ink">Sedang membaca dokumen kamu</p>
          </div>
          <p className="mt-2 text-sm text-ink-soft">Biasanya kurang dari 30 detik. Halaman ini akan terisi otomatis.</p>
          <div className="mt-6 space-y-3" aria-hidden>
            <div className="h-3 w-3/4 animate-pulse rounded bg-line/60" />
            <div className="h-3 w-full animate-pulse rounded bg-line/60" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-line/60" />
          </div>
        </div>
      </Shell>
    );

  const risks = [...data.risks].sort((a, b) => (ORDER[a.level] ?? 1) - (ORDER[b.level] ?? 1));
  const count = (lvl: RiskLevel) => risks.filter((r) => r.level === lvl).length;
  const tinggi = count("high");

  return (
    <Shell>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">Hasil pengecekan dokumen</h1>

      <section className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-brass-deep">Ringkasan</h2>
        <p className="mt-3 font-serif text-lg leading-relaxed text-ink">{data.summary}</p>

        <dl className="mt-6 grid gap-2 sm:grid-cols-3 sm:gap-3">
          {(["high", "medium", "low"] as const).map((lvl) => (
            <div key={lvl} className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 sm:block sm:p-3">
              <dt><RiskBadge level={lvl} /></dt>
              <dd className="font-serif text-2xl font-semibold text-ink sm:mt-2 sm:text-3xl">
                {count(lvl)} <span className="font-sans text-sm font-normal text-ink-soft">pasal</span>
              </dd>
            </div>
          ))}
        </dl>

        {tinggi > 0 && (
          <p className="mt-4 flex gap-2 rounded-xl bg-risk-high-bg p-3 text-sm text-risk-high-text">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
            Ada {tinggi} pasal berisiko tinggi. Sebaiknya bahas dulu dengan penjual dan PPAT sebelum tanda tangan atau membayar.
          </p>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Detail per pasal</h2>
        {risks.length === 0 && <p className="text-ink-soft">Tidak ditemukan pasal berisiko.</p>}
        {risks.map((r, i) => <RiskCard key={`${r.pasal}-${i}`} risk={r} />)}
      </section>

      <Link
        href={`/chat?doc=${encodeURIComponent(data.document_id)}`}
        className="group mt-8 flex items-center gap-4 rounded-2xl border border-brand/20 bg-brand-soft p-5 transition-colors hover:border-brand/40"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <Icon name="chat" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-ink">Masih bingung? Tanya soal dokumen ini</span>
          <span className="block text-sm text-ink-soft">Misalnya: &ldquo;Pasal 6 maksudnya apa? Apa yang harus saya minta ke penjual?&rdquo;</span>
        </span>
        <Icon name="arrow" className="size-5 text-brand transition-transform group-hover:translate-x-0.5" />
      </Link>

      <p className="mt-6 text-xs text-ink-soft">
        Hasil ini bantuan awal, bukan pengganti konsultasi dengan notaris/PPAT.
      </p>
    </Shell>
  );
}
