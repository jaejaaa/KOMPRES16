import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import LegalText from "@/components/LegalText";
import { PANDUAN, getPanduan, type Bagian } from "@/lib/panduan";
import { APP_NAME } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => PANDUAN.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/panduan/[slug]">): Promise<Metadata> {
  const p = getPanduan((await params).slug);
  return { title: p ? `${p.judul} — ${APP_NAME}` : APP_NAME };
}

function PraktikUmum() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-risk-mid-bg px-2.5 py-0.5 text-xs font-semibold text-risk-mid-text">
      <Icon name="info" className="size-3.5" /> Praktik umum, cek ke kantor setempat
    </span>
  );
}

// Urutan asli dipertahankan; langkah bernomor yang berurutan digabung jadi satu timeline
function kelompokkan(bagian: Bagian[]) {
  const grup: { langkah: boolean; isi: Bagian[] }[] = [];
  for (const b of bagian) {
    const langkah = b.nomor !== null;
    const akhir = grup.at(-1);
    if (akhir && akhir.langkah && langkah) akhir.isi.push(b);
    else grup.push({ langkah, isi: [b] });
  }
  return grup;
}

export default async function PanduanDetail({ params }: PageProps<"/panduan/[slug]">) {
  const p = getPanduan((await params).slug);
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-8 md:px-8">
      <Link href="/panduan" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <Icon name="back" className="size-4" /> Semua panduan
      </Link>

      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-brass-deep">Panduan</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink md:text-4xl">{p.judul}</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">{p.judulLengkap}</p>

      <div className="mt-10 space-y-8">
        {kelompokkan(p.bagian).map((g, gi) =>
          g.langkah ? (
            <ol key={gi} className="relative space-y-8 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-line">
              {g.isi.map((b) => (
                <li key={b.judul} className="relative flex gap-5">
                  <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-brass/50 bg-paper font-serif text-lg font-semibold text-brass-deep">
                    {b.nomor}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <h2 className="text-lg font-semibold text-ink">{b.judul}</h2>
                    {b.praktikUmum && <div className="mt-2"><PraktikUmum /></div>}
                    <p className="mt-2 leading-relaxed text-ink-soft"><LegalText>{b.teks}</LegalText></p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            g.isi.map((b, i) => (
              <section
                key={b.judul}
                className={gi === 0 && i === 0 ? "rounded-2xl border border-line bg-card p-6" : "border-t border-line pt-8"}
              >
                <h2 className="font-serif text-xl font-semibold text-ink">{b.judul}</h2>
                {b.praktikUmum && <div className="mt-2"><PraktikUmum /></div>}
                <p className="mt-3 leading-relaxed text-ink-soft"><LegalText>{b.teks}</LegalText></p>
              </section>
            ))
          ),
        )}
      </div>

      <Link
        href="/chat"
        className="group mt-12 flex items-center gap-4 rounded-2xl border border-brand/20 bg-brand-soft p-5 transition-colors hover:border-brand/40"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <Icon name="chat" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold text-ink">Ada yang belum jelas?</span>
          <span className="block text-sm text-ink-soft">Tanyakan langsung, jawaban disertai pasal dasarnya.</span>
        </span>
        <Icon name="arrow" className="size-5 text-brand transition-transform group-hover:translate-x-0.5" />
      </Link>

      <p className="mt-6 text-xs text-ink-soft">
        Panduan ini edukasi umum, bukan nasihat hukum. Syarat, biaya, dan lama proses bisa berbeda per daerah.
      </p>
    </main>
  );
}
