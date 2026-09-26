"use client";
import { useState } from "react";
import type { Risk, RiskLevel } from "@/types/api";

const RISK_STYLE: Record<RiskLevel, { label: string; bar: string; badge: string }> = {
  high: { label: "Risiko tinggi", bar: "bg-red-600", badge: "bg-red-50 text-red-700 ring-red-200" },
  medium: { label: "Perlu dicek", bar: "bg-amber-500", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  low: { label: "Aman", bar: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export default function RiskCard({ risk }: { risk: Risk }) {
  const [open, setOpen] = useState(false);
  const s = RISK_STYLE[risk.level] ?? RISK_STYLE.medium;

  return (
    <article className="relative overflow-hidden rounded-lg border border-slate-200 bg-white pl-5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} aria-hidden />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{risk.pasal}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.badge}`}>{s.label}</span>
          <span className="text-xs text-slate-500">{risk.kategori}</span>
        </div>

        <p className="mt-2 text-slate-700">{risk.alasan}</p>

        {risk.kutipan && (
          <>
            <button
              onClick={() => setOpen(!open)}
              className="mt-3 text-sm font-medium text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-expanded={open}
            >
              {open ? "Sembunyikan teks asli" : "Lihat teks asli pasal"}
            </button>
            {open && (
              <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600">
                {risk.kutipan}
              </blockquote>
            )}
          </>
        )}
      </div>
    </article>
  );
}
