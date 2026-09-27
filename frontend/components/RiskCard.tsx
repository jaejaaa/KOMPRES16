import type { Risk, RiskLevel } from "@/types/api";
import Icon, { type IconName } from "./Icon";

// Warna risiko selalu ditemani ikon + teks, jangan warna saja
export const RISK_STYLE: Record<RiskLevel, { label: string; icon: IconName; bulat: string; badge: string; bar: string }> = {
  high: { label: "Risiko tinggi", icon: "alert", bulat: "bg-risk-high text-white", badge: "bg-risk-high-bg text-risk-high-text", bar: "bg-risk-high" },
  medium: { label: "Perlu dicek", icon: "question", bulat: "bg-risk-mid text-white", badge: "bg-risk-mid-bg text-risk-mid-text", bar: "bg-risk-mid" },
  low: { label: "Aman", icon: "check", bulat: "bg-risk-low text-white", badge: "bg-risk-low-bg text-risk-low-text", bar: "bg-risk-low" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level] ?? RISK_STYLE.medium;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${s.badge}`}>
      <Icon name={s.icon} className="size-3.5" /> {s.label}
    </span>
  );
}

export default function RiskCard({ risk }: { risk: Risk }) {
  const s = RISK_STYLE[risk.level] ?? RISK_STYLE.medium;

  return (
    <article className="lift group rounded-3xl border border-line bg-surface p-5 shadow-soft md:p-6">
      <div className="flex gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${s.bulat} transition-transform duration-300 group-hover:scale-105`}>
          <Icon name={s.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-ink">{risk.pasal}</h3>
            <RiskBadge level={risk.level} />
          </div>
          {/* "Aspek yang diperiksa" supaya kategori tidak terbaca sebagai masalah saat level-nya Aman */}
          <p className="mt-0.5 text-sm text-ink-soft">
            Aspek yang diperiksa: <span className="font-semibold text-ink">{risk.kategori}</span>
          </p>
          <p className="mt-3 leading-relaxed text-ink">{risk.alasan}</p>

          {risk.kutipan && (
            <details className="mt-4 overflow-hidden rounded-2xl bg-bg">
              <summary className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
                Lihat kutipan pasal
                <Icon name="chevron" className="chevron size-4 transition-transform duration-300" />
              </summary>
              <blockquote className="border-l-4 border-primary/30 mx-4 mb-4 pl-4 text-sm italic leading-relaxed text-ink-soft">
                &ldquo;{risk.kutipan}&rdquo;
              </blockquote>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
