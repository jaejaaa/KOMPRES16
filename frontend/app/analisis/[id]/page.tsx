"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/api";
import type { AnalysisResult, RiskLevel } from "@/types/api";
import RiskCard from "@/components/RiskCard";

const ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
const POLL_MS = 2500;

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

  const retry = (
    <Link href="/upload" className="mt-4 inline-block font-medium text-blue-700 hover:underline">
      Unggah dokumen lain
    </Link>
  );

  if (error)
    return <main className="mx-auto max-w-3xl p-6"><p className="text-red-700">{error}</p>{retry}</main>;

  if (!data || (data.status !== "done" && data.status !== "failed"))
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-slate-600" aria-live="polite">Sedang membaca dokumen kamu, biasanya kurang dari 30 detik...</p>
      </main>
    );

  if (data.status === "failed")
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-bold text-slate-900">Analisis gagal</h1>
        <p className="mt-2 text-red-700">{data.error ?? "Dokumen tidak bisa dianalisis."}</p>
        {retry}
      </main>
    );

  const risks = [...data.risks].sort((a, b) => (ORDER[a.level] ?? 1) - (ORDER[b.level] ?? 1));
  const count = (lvl: RiskLevel) => risks.filter((r) => r.level === lvl).length;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Hasil pengecekan dokumen</h1>

      <section className="rounded-lg bg-slate-50 p-4">
        <h2 className="font-semibold text-slate-900">Ringkasan</h2>
        <p className="mt-2 leading-relaxed text-slate-700">{data.summary}</p>
        <p className="mt-3 text-sm text-slate-600">
          {count("high")} pasal berisiko tinggi, {count("medium")} perlu dicek, {count("low")} aman
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Detail per pasal</h2>
        {risks.length === 0 && <p className="text-slate-600">Tidak ditemukan pasal berisiko.</p>}
        {risks.map((r, i) => <RiskCard key={`${r.pasal}-${i}`} risk={r} />)}
      </section>

      <p className="text-xs text-slate-500">
        Hasil ini bantuan awal, bukan pengganti konsultasi dengan notaris/PPAT.
      </p>
    </main>
  );
}
