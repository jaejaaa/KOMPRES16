"use client";
import { useState } from "react";
import Icon from "./Icon";
import { REGULASI } from "@/lib/regulasi";

// Teks ringkasan: bagian ==...== diberi stabilo merah
function Ringkasan({ teks }: { teks: string }) {
  return (
    <p className="leading-relaxed text-ink-soft">
      {teks.split(/==(.+?)==/).map((bagian, i) =>
        i % 2 ? (
          <mark key={i} className="stabilo">
            {bagian}
          </mark>
        ) : (
          bagian
        ),
      )}
    </p>
  );
}

// Daftar dasar hukum: klik satu peraturan untuk membuka ringkasan dan tautan dokumen aslinya
export default function DasarHukum() {
  const [buka, setBuka] = useState<number | null>(null);

  return (
    <ol className="divide-y divide-line">
      {REGULASI.map((r, i) => {
        const terbuka = buka === i;
        return (
          <li key={r.nama} data-terbuka={terbuka}>
            <h3>
              <button
                type="button"
                id={`regulasi-${i}`}
                aria-expanded={terbuka}
                aria-controls={`regulasi-${i}-isi`}
                onClick={() => setBuka(terbuka ? null : i)}
                className={`flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-primary-soft ${
                  terbuka ? "bg-primary-soft" : ""
                } ${r.dicabut ? "text-ink-soft" : ""}`}
              >
                <span className="w-6 shrink-0 pt-px text-sm font-bold tabular-nums text-primary">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {r.nama}
                    {r.dicabut && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-ink-soft">Dicabut</span>}
                  </span>
                  <span className="mt-0.5 block text-sm font-normal leading-snug text-ink-soft">{r.tentang}</span>
                </span>
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    terbuka ? "bg-primary text-white" : "bg-bg text-primary"
                  }`}
                >
                  <Icon name="chevron" className={`size-4 transition-transform duration-300 ${terbuka ? "rotate-180" : ""}`} />
                </span>
              </button>
            </h3>

            <div
              id={`regulasi-${i}-isi`}
              role="region"
              aria-labelledby={`regulasi-${i}`}
              className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ gridTemplateRows: terbuka ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden" inert={!terbuka}>
                <div className="space-y-3 px-4 pb-6 pt-3 sm:pl-14">
                  {r.ringkasan.map((t) => (
                    <Ringkasan key={t} teks={t} />
                  ))}
                  {r.catatan && <p className="text-sm text-ink-soft">Catatan: {r.catatan}</p>}
                  <a
                    href={r.tautan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 rounded-full border border-primary/25 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                  >
                    Baca dokumen asli di {r.tautan.sumber}
                    <Icon name="external" className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
