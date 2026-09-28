import Icon, { type IconName } from "./Icon";
import Reveal from "./Reveal";

export interface Tahap {
  judul: string;
  isi: string;
  icon: IconName;
}

const nomor = (n: number) => String(n).padStart(2, "0");

// Garis putus-putus antar kartu, tergambar dari atas ke bawah saat di-scroll.
// Laptop: kurva dari tengah kartu kiri ke tengah kartu kanan (atau sebaliknya). HP: garis lurus di sisi kiri.
function Penghubung({ keKanan, ke }: { keKanan: boolean; ke: number }) {
  return (
    <Reveal dari="garis" batas="-18%" ulang className="relative h-20 md:h-28">
      <svg className="absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden>
        <path
          d={keKanan ? "M23 0 C23 60, 77 40, 77 100" : "M77 0 C77 60, 23 40, 23 100"}
          stroke="var(--color-primary)"
          strokeOpacity="0.45"
          strokeWidth="2.5"
          strokeDasharray="7 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute inset-y-0 left-8 border-l-2 border-dashed border-primary/40 md:hidden" aria-hidden />
      <span
        className="absolute left-8 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-surface text-xs font-bold tabular-nums text-primary shadow-soft md:left-1/2"
        aria-hidden
      >
        {nomor(ke)}
      </span>
    </Reveal>
  );
}

// Alur tahapan zig-zag: kartu bergantian kiri-kanan dan meluncur masuk dari sisinya satu per satu saat di-scroll.
export default function AlurTahapan({ tahap }: { tahap: Tahap[] }) {
  return (
    <ol className="mt-10">
      {tahap.map((t, i) => {
        const kiri = i % 2 === 0;
        return (
          <li key={t.judul}>
            <Reveal dari={kiri ? "kiri" : "kanan"} batas="-12%" ulang className={`md:w-[46%] ${kiri ? "" : "md:ml-auto"}`}>
              <article className="lift rounded-3xl border border-line bg-surface p-6 shadow-soft md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    Tahap {nomor(i + 1)}
                  </span>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
                    <Icon name={t.icon} className="size-6" />
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-ink">{t.judul}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{t.isi}</p>
              </article>
            </Reveal>
            {i < tahap.length - 1 && <Penghubung keKanan={kiri} ke={i + 2} />}
          </li>
        );
      })}
    </ol>
  );
}
