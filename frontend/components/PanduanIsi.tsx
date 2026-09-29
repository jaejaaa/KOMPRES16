"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { Bagian, Panduan } from "@/lib/panduan";
import { STABILO_PANDUAN } from "@/lib/stabilo-panduan";
import Icon from "./Icon";
import LegalText from "./LegalText";
import { btn, container, Notice, Panel } from "./ui";

const EVENT = "jagatanah-panduan";

// Langkah yang sudah dicentang disimpan di localStorage per panduan (hanya di peramban ini)
function useLangkahSelesai(slug: string) {
  const key = `jagatanah:panduan:${slug}`;
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(EVENT, cb);
      };
    },
    () => {
      try {
        return localStorage.getItem(key) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  let selesai: string[] = [];
  try {
    selesai = JSON.parse(raw);
  } catch {}
  const simpan = (baru: string[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(baru));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [selesai, simpan] as const;
}

type Butir = Bagian & { anchor: string };

function PraktikUmum() {
  return (
    <Notice tone="warning" title="Praktik umum">
      Berasal dari informasi publik dan bisa berbeda per daerah. Verifikasi ke Kantor Pertanahan atau PPAT setempat.
    </Notice>
  );
}

export default function PanduanIsi({ p }: { p: Panduan }) {
  const [selesai, simpan] = useLangkahSelesai(p.slug);
  const stabilo = STABILO_PANDUAN[p.slug] ?? [];
  const butir: Butir[] = p.bagian.map((b, i) => ({ ...b, anchor: `bagian-${i + 1}` }));
  const langkah = butir.filter((b) => b.nomor !== null);
  const jumlahSelesai = langkah.filter((b) => selesai.includes(b.anchor)).length;
  const persen = langkah.length ? Math.round((jumlahSelesai / langkah.length) * 100) : 0;
  const toggle = (a: string) => simpan(selesai.includes(a) ? selesai.filter((x) => x !== a) : [...selesai, a]);

  return (
    <div className={`${container} grid grid-cols-1 items-start gap-6 pt-8 lg:grid-cols-[280px_1fr]`}>
      <aside className="space-y-4 lg:sticky lg:top-28">
        {/* Progres & checklist hanya untuk panduan yang punya langkah bernomor ("Langkah 1", "Cara 1", ...) */}
        {langkah.length > 0 && (
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Progres Anda</p>
              <p className="text-sm tabular-nums text-ink-soft">
                {jumlahSelesai}/{langkah.length} langkah
              </p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100} aria-label="Langkah selesai">
              <div className="h-full rounded-full bg-risk-low transition-all duration-500" style={{ width: `${persen}%` }} />
            </div>
            {jumlahSelesai > 0 && (
              <button type="button" onClick={() => simpan([])} className="mt-3 text-xs font-semibold text-ink-soft hover:text-primary">
                Ulangi dari awal
              </button>
            )}
          </div>
        )}

        {/* Di HP daftar isi disembunyikan supaya isi panduan langsung terlihat */}
        <Panel title="Daftar isi" icon="list" flush className="hidden lg:block">
          <ol className="px-3 pb-3 text-sm">
            {butir.map((b) => {
              const ok = selesai.includes(b.anchor);
              return (
                <li key={b.anchor}>
                  <a href={`#${b.anchor}`} className="flex items-start gap-2.5 rounded-2xl px-3 py-2 text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary">
                    <span
                      className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        ok ? "bg-risk-low text-white" : b.nomor ? "bg-primary-soft text-primary" : "bg-bg text-ink-soft"
                      }`}
                    >
                      {ok ? <Icon name="check" className="size-3" /> : (b.nomor ?? "•")}
                    </span>
                    <span className={ok ? "line-through decoration-ink-soft/40" : ""}>{b.judul}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </Panel>
      </aside>

      <div className="min-w-0 space-y-4">
        {butir.map((b) => {
          if (b.nomor === null)
            return (
              <div key={b.anchor} id={b.anchor} className="scroll-mt-28">
                <Panel title={b.judul} icon={b.praktikUmum ? "info" : "book"}>
                  {b.praktikUmum && <div className="mb-4"><PraktikUmum /></div>}
                  <p className="leading-relaxed text-ink-soft"><LegalText stabilo={stabilo}>{b.teks}</LegalText></p>
                </Panel>
              </div>
            );

          const ok = selesai.includes(b.anchor);
          return (
            <article
              key={b.anchor}
              id={b.anchor}
              className={`scroll-mt-28 rounded-3xl border p-5 shadow-soft transition-all duration-300 md:p-6 ${
                ok ? "border-risk-low/30 bg-risk-low-bg/50" : "border-line bg-surface"
              }`}
            >
              <div className="flex gap-4">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold transition-all duration-300 ${
                    ok ? "bg-risk-low text-white" : "bg-linear-to-br from-secondary to-primary text-white shadow-lift"
                  }`}
                >
                  {ok ? <Icon name="check" className="size-5" /> : b.nomor}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-secondary">Langkah {b.nomor}</p>
                  <h2 className="mt-0.5 text-lg font-bold text-ink">{b.judul}</h2>
                  {b.praktikUmum && <div className="mt-3"><PraktikUmum /></div>}
                  <p className="mt-2 leading-relaxed text-ink-soft"><LegalText stabilo={stabilo}>{b.teks}</LegalText></p>
                  <button
                    type="button"
                    onClick={() => toggle(b.anchor)}
                    aria-pressed={ok}
                    className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                      ok ? "bg-risk-low text-white" : "border border-line-strong bg-surface text-ink hover:border-risk-low hover:text-risk-low-text"
                    }`}
                  >
                    <Icon name="check" className="size-4" /> {ok ? "Sudah selesai" : "Tandai selesai"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        <div className="hero-bg flex flex-col items-start justify-between gap-5 overflow-hidden rounded-[2rem] p-6 text-white md:flex-row md:items-center md:p-8">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Masih ada yang belum jelas?</h2>
            <p className="mt-1 text-sm text-white/75">Tanyakan langsung, jawaban disertai pasal dasarnya.</p>
          </div>
          <Link href="/chat" className={btn.accent}>
            <Icon name="chat" className="size-4" /> Tanya JagaTanah AI
          </Link>
        </div>

        <Notice title="Informasi umum">
          Panduan ini bersifat edukasi, bukan nasihat hukum. Syarat, biaya, dan lama proses bisa berbeda per daerah.
        </Notice>
      </div>
    </div>
  );
}
