// Komponen dasar tampilan layanan: judul halaman, panel, pemberitahuan, langkah, tombol
import Link from "next/link";
import type { ReactNode } from "react";
import HeroBackdrop, { type FotoLatar } from "./HeroBackdrop";
import Icon, { type IconName } from "./Icon";

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none";
export const btn = {
  primary: `${BTN} bg-primary text-white shadow-soft hover:bg-primary-hover hover:shadow-lift disabled:bg-line disabled:text-ink-soft disabled:shadow-none`,
  secondary: `${BTN} border border-line-strong bg-surface text-primary hover:border-primary hover:bg-primary-soft`,
  accent: `${BTN} bg-accent text-ink shadow-[0_10px_30px_-10px_rgb(245_180_0/0.7)] hover:bg-accent-hover`,
  onDark: `${BTN} border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20`,
};

export const container = "mx-auto w-full max-w-6xl px-4 md:px-8";

// Navbar melayang tingginya 76px (pt-3 + h-16). Latar maroon ditarik ke atas sejauh itu
// supaya warnanya mulai dari ujung atas layar, lalu isinya didorong turun lagi.
export const NAV_OFFSET = "-mt-[76px] pt-[76px]";

export function PageHeader({
  crumbs,
  title,
  desc,
  icon,
  latar = true,
  foto,
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  desc?: ReactNode;
  icon?: IconName;
  latar?: boolean; // latar foto (versi ringkas dari beranda); false = maroon polos
  foto?: FotoLatar; // default patung dewi keadilan
}) {
  return (
    // Penuh kiri-kanan dan mulai dari atas layar, di belakang navbar melayang (lihat NAV_OFFSET)
    <section className={`hero-bg relative overflow-hidden ${NAV_OFFSET} text-white`}>
      {latar && <HeroBackdrop ringkas foto={foto} />}
      <div className={`${container} relative pb-16 pt-10 md:pb-20 md:pt-14`}>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/70">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex items-center gap-1.5">
                {i > 0 && <Icon name="chevron" className="size-3.5 -rotate-90 text-white/40" />}
                {c.href ? (
                  <Link href={c.href} className="rounded-full px-1 transition-colors hover:text-white">{c.label}</Link>
                ) : (
                  <span aria-current="page" className="rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-5 flex items-start gap-4">
          {icon && (
            <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur sm:flex">
              <Icon name={icon} className="size-7 text-accent" />
            </span>
          )}
          <div>
            <h1
              className="text-3xl font-extrabold tracking-tight md:text-[2.5rem] md:leading-tight"
              style={latar ? { textShadow: "0 2px 24px rgba(60,0,0,.6)" } : undefined}
            >
              {title}
            </h1>
            {desc && <p className="mt-2 max-w-2xl leading-relaxed text-white/75">{desc}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
  flush = false,
}: {
  title?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean; // tanpa padding isi, untuk tabel/daftar
}) {
  return (
    <section className={`rounded-3xl border border-line bg-surface shadow-soft ${className}`}>
      {title && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <h2 className="flex items-center gap-3 font-bold text-ink">
            {icon && (
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={icon} className="size-[18px]" />
              </span>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={flush ? "pt-3" : "p-6 pt-4"}>{children}</div>
    </section>
  );
}

const NOTICE: Record<"info" | "warning" | "danger" | "success", { box: string; icon: IconName; bulat: string }> = {
  info: { box: "bg-muted text-ink", icon: "info", bulat: "bg-ink text-white" },
  warning: { box: "bg-risk-mid-bg text-risk-mid-text", icon: "alert", bulat: "bg-risk-mid text-white" },
  danger: { box: "bg-risk-high-bg text-risk-high-text", icon: "alert", bulat: "bg-risk-high text-white" },
  success: { box: "bg-risk-low-bg text-risk-low-text", icon: "check", bulat: "bg-risk-low text-white" },
};

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof NOTICE;
  title?: ReactNode;
  children?: ReactNode;
}) {
  const s = NOTICE[tone];
  return (
    <div role={tone === "danger" ? "alert" : undefined} className={`flex gap-3 rounded-2xl p-4 text-sm leading-relaxed ${s.box}`}>
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${s.bulat}`}>
        <Icon name={s.icon} className="size-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const LANGKAH = ["Unggah dokumen", "Analisis otomatis", "Hasil pemeriksaan"];

// Diagram alur layanan cek dokumen (bukan tombol): 0 = unggah, 1 = analisis, 2 = hasil.
// Tahap berpindah sendiri saat dokumen diproses, jadi sengaja dibuat seperti bagan, bukan tab.
export function StepBar({ aktif }: { aktif: 0 | 1 | 2 }) {
  return (
    <div className={`${container} pt-8`}>
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface px-5 py-4 shadow-soft md:flex-row md:items-center md:gap-8 md:px-6">
        <p className="shrink-0 text-sm font-semibold text-ink-soft">Alur pemeriksaan</p>
        <ol className="flex flex-1 items-start md:items-center" aria-label="Alur pemeriksaan">
          {LANGKAH.map((l, i) => {
            const selesai = i < aktif;
            const kini = i === aktif;
            return (
              <li key={l} className={`flex items-start md:items-center ${i < LANGKAH.length - 1 ? "flex-1" : ""}`}>
                <div aria-current={kini ? "step" : undefined} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center md:w-auto md:flex-row md:gap-2.5 md:text-left">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-500 ${
                      selesai
                        ? "bg-risk-low text-white"
                        : kini
                          ? "bg-primary text-white ring-4 ring-primary/15"
                          : "border-2 border-line-strong text-ink-soft"
                    }`}
                  >
                    {selesai ? <Icon name="check" className="size-4" /> : i + 1}
                  </span>
                  <span className={`text-xs leading-tight md:text-sm ${kini ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {l}
                    {selesai && <span className="sr-only"> (selesai)</span>}
                    {kini && <span className="sr-only"> (tahap saat ini)</span>}
                  </span>
                </div>
                {i < LANGKAH.length - 1 && (
                  <span className="mx-1 mt-4 flex flex-1 items-center md:mx-3 md:mt-0" aria-hidden>
                    <span className={`h-0 flex-1 border-t-2 border-dashed ${selesai ? "border-risk-low" : "border-line-strong"}`} />
                    <Icon name="chevron" className={`-ml-1 size-4 -rotate-90 ${selesai ? "text-risk-low" : "text-line-strong"}`} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
