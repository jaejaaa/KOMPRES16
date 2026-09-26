import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PANDUAN } from "@/lib/panduan";
import { APP_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Panduan prosedur — ${APP_NAME}` };

export default function PanduanPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-8 md:px-8 md:pt-12">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brass-deep">Panduan</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-ink md:text-4xl">Panduan prosedur tanah</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Langkah demi langkah dengan bahasa sederhana. Setiap langkah menyebut pasal peraturan yang menjadi dasarnya.
      </p>

      <ul className="mt-8 space-y-4">
        {PANDUAN.map((p) => {
          const langkah = p.bagian.filter((b) => b.nomor !== null).length;
          return (
            <li key={p.slug}>
              <Link
                href={`/panduan/${p.slug}`}
                className="group flex gap-4 rounded-2xl border border-line bg-card p-5 transition-colors hover:border-brand/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon name="book" />
                </span>
                <span className="flex-1">
                  <span className="block font-serif text-xl font-semibold text-ink">{p.judul}</span>
                  <span className="mt-1 block leading-relaxed text-ink-soft">{p.ringkas}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                    {langkah} langkah <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/chat"
        className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-line p-5 text-ink-soft hover:border-brand/40"
      >
        <Icon name="chat" className="size-5 shrink-0 text-brand" />
        <span className="flex-1">Kasusmu berbeda? <span className="font-semibold text-brand">Tanyakan langsung</span> ke asisten.</span>
      </Link>
    </main>
  );
}
