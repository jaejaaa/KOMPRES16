"use client";
import { useState } from "react";
import type { Risk, RiskLevel } from "@/types/api";
import Icon, { type IconName } from "./Icon";

// Warna risiko selalu ditemani ikon + teks, jangan warna saja
export const RISK_STYLE: Record<RiskLevel, { label: string; icon: IconName; bar: string; badge: string }> = {
  high: { label: "Risiko tinggi", icon: "alert", bar: "bg-risk-high", badge: "bg-risk-high-bg text-risk-high-text" },
  medium: { label: "Perlu dicek", icon: "question", bar: "bg-risk-mid", badge: "bg-risk-mid-bg text-risk-mid-text" },
  low: { label: "Aman", icon: "check", bar: "bg-risk-low", badge: "bg-risk-low-bg text-risk-low-text" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level] ?? RISK_STYLE.medium;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.badge}`}>
      <Icon name={s.icon} className="size-3.5" /> {s.label}
    </span>
  );
}

export default function RiskCard({ risk }: { risk: Risk }) {
  const [open, setOpen] = useState(false);
  const s = RISK_STYLE[risk.level] ?? RISK_STYLE.medium;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-card pl-1.5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} aria-hidden />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="font-serif text-lg font-semibold text-ink">{risk.pasal}</h3>
          <RiskBadge level={risk.level} />
        </div>
        <p className="mt-1 text-sm font-medium text-ink-soft">{risk.kategori}</p>

        <p className="mt-3 leading-relaxed text-ink">{risk.alasan}</p>

        {risk.kutipan && (
          <>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="mt-4 text-sm font-semibold text-brand hover:underline"
              aria-expanded={open}
            >
              {open ? "Sembunyikan teks asli" : "Lihat teks asli pasal"}
            </button>
            {open && (
              <blockquote className="fade-up mt-3 border-l-2 border-brass pl-4 font-serif italic leading-relaxed text-ink-soft">
                &ldquo;{risk.kutipan}&rdquo;
              </blockquote>
            )}
          </>
        )}
      </div>
    </article>
  );
}
