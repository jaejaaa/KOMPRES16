import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import { btn, container, Notice, PageHeader } from "@/components/ui";
import { jumlahRujukan, PANDUAN } from "@/lib/panduan";
import { APP_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Panduan Prosedur — ${APP_NAME}` };

export default function PanduanPage() {
  return (
    <main>
      <PageHeader
        foto="buku"
        icon="book"
        crumbs={[{ href: "/", label: "Beranda" }, { label: "Panduan" }]}
        title="Panduan Prosedur Pertanahan"
        desc="Langkah demi langkah dengan bahasa sederhana. Tandai langkah yang sudah Anda selesaikan agar tidak ada yang terlewat."
      />

      <div className={`${container} pt-8`}>
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {PANDUAN.map((p, i) => {
            const langkah = p.bagian.filter((b) => b.nomor !== null).length;
            return (
              <li key={p.slug}>
                <Reveal delay={i * 100} className="h-full">
                  <Link
                    href={`/panduan/${p.slug}`}
                    className="lift group flex h-full flex-col rounded-[2rem] border border-line bg-surface p-6 shadow-soft md:p-8"
                  >
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-secondary to-primary text-white shadow-lift transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
                      <Icon name={i === 0 ? "shield" : "doc"} className="size-7" />
                    </span>
                    <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">{p.judul}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{p.ringkas}</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 font-medium text-ink">
                        <Icon name="list" className="size-4 text-secondary" /> {langkah} langkah
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 font-medium text-ink">
                        <Icon name="scale" className="size-4 text-secondary" /> {jumlahRujukan(p)} rujukan pasal
                      </span>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-2 pt-7 font-semibold text-primary">
                      Buka panduan
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft transition-all group-hover:translate-x-1 group-hover:bg-primary group-hover:text-white">
                        <Icon name="arrow" className="size-4" />
                      </span>
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <Notice title="Berlaku umum">
            Syarat, biaya, dan lama proses bisa berbeda per daerah. Pastikan kembali ke Kantor Pertanahan atau PPAT setempat.
          </Notice>
          <Link href="/chat" className={btn.secondary}>
            <Icon name="chat" className="size-4" /> Kasus Anda berbeda? Tanyakan
          </Link>
        </div>
      </div>
    </main>
  );
}
