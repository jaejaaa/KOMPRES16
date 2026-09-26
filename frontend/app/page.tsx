import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { MAX_PDF_MB } from "@/lib/site";

const LANGKAH = [
  { judul: "Unggah PDF", isi: `Perjanjian jual beli, AJB, atau surat tanah lain. Cukup PDF digital, maksimal ${MAX_PDF_MB} MB.` },
  { judul: "Pasal berisiko ditandai", isi: "Tiap pasal diberi label tinggi, perlu dicek, atau aman, lengkap dengan alasannya." },
  { judul: "Tanya kalau masih bingung", isi: "Asisten menjawab dengan bahasa sehari-hari dan menyebut pasal dasarnya." },
];

const FITUR: { href: string; icon: IconName; judul: string; isi: string }[] = [
  { href: "/upload", icon: "doc", judul: "Cek dokumen tanah", isi: "Temukan pasal yang merugikan sebelum kamu tanda tangan atau bayar uang muka." },
  { href: "/chat", icon: "chat", judul: "Tanya hukum tanah", isi: "SHM vs HGB, siapa bayar BPHTB, sah atau tidaknya jual beli tanpa PPAT." },
  { href: "/panduan", icon: "book", judul: "Panduan prosedur", isi: "Langkah cek keaslian sertifikat dan balik nama, disertai pasal rujukannya." },
];

const REGULASI = [
  "UU 5/1960 (UUPA)",
  "PP 24/1997",
  "PP 18/2021",
  "Permen ATR/BPN 3/2023",
  "UU 28/2009",
  "UU 2/2012",
  "UU 27/2022",
  "KUHPerdata Buku II",
  "UU 21/1997",
];

function DokumenLensa() {
  return (
    <div className="relative mx-auto w-full max-w-md pb-20 md:pb-10" aria-hidden>
      {/* Selembar perjanjian */}
      <div className="rotate-[-1.5deg] rounded-sm border border-line bg-card px-6 py-7 font-serif text-[13px] leading-relaxed text-ink-soft shadow-[0_24px_48px_-24px_rgb(34_26_26/0.35)]">
        <p className="text-center text-xs font-semibold tracking-[0.2em] text-ink">PERJANJIAN JUAL BELI TANAH</p>
        <div className="mx-auto mt-2 h-px w-16 bg-brass" />
        <p className="mt-4"><b className="text-ink">Pasal 1.</b> Pihak Pertama menjual sebidang tanah Hak Milik dengan Sertifikat No. 1234 seluas 120 m² kepada Pihak Kedua.</p>
        <p className="mt-2"><b className="text-ink">Pasal 3.</b> Pihak Kedua wajib melunasi seluruh harga tanah paling lambat 7 hari sejak perjanjian ini ditandatangani.</p>
        <p className="mt-2 rounded bg-risk-high-bg/70 px-1 -mx-1">
          <b className="text-ink">Pasal 6.</b> Perjanjian ini cukup ditandatangani kedua belah pihak tanpa perlu dibuatkan akta oleh pejabat manapun.
        </p>
        <p className="mt-2"><b className="text-ink">Pasal 8.</b> Biaya balik nama ditanggung oleh Pihak Kedua.</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 w-full rounded bg-line/60" />
          <div className="h-2 w-5/6 rounded bg-line/60" />
          <div className="h-2 w-2/3 rounded bg-line/60" />
        </div>
      </div>

      {/* Lensa kaca yang menyorot pasal berisiko */}
      <div className="lens absolute -bottom-2 left-4 right-4 rounded-3xl p-5 md:-left-10 md:right-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-high-bg px-2.5 py-1 text-xs font-semibold text-risk-high-text">
          <Icon name="alert" className="size-3.5" /> Risiko tinggi · Pasal 6
        </span>
        <p className="mt-3 font-serif text-lg leading-snug text-ink">
          &ldquo;&hellip;tanpa perlu dibuatkan <mark className="bg-transparent text-brand underline decoration-brass decoration-2 underline-offset-4">akta oleh pejabat manapun</mark>.&rdquo;
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Tanpa akta PPAT, sertifikat tidak bisa dibalik nama ke nama pembeli.
        </p>
        <p className="mt-2 text-xs font-medium text-brass-deep">PP 24/1997 Pasal 37 ayat 1</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-12 pt-10 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brass-deep">Untuk calon pembeli tanah</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.1] text-ink md:text-5xl">
            Baca dulu pasalnya, <span className="text-brand">baru tanda tangan.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-soft">
            Unggah perjanjian jual beli atau AJB. Kami tandai pasal yang berisiko dan jelaskan dengan bahasa sehari-hari,
            lengkap dengan dasar hukumnya.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/upload" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-hover">
              Cek dokumen sekarang <Icon name="arrow" className="size-4" />
            </Link>
            <Link href="/chat" className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-5 py-3 font-semibold text-ink transition-colors hover:border-brand/40">
              Tanya hukum tanah
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
            <Icon name="scale" className="size-4 text-brass" />
            Berdasarkan 9 peraturan pertanahan, dari UUPA sampai aturan sertifikat elektronik.
          </p>
        </div>
        <DokumenLensa />
      </section>

      {/* Cara kerja */}
      <section className="border-y border-line bg-card/60">
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">Cara kerjanya</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brass/50 font-serif text-lg font-semibold text-brass-deep">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{l.judul}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{l.isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Fitur */}
      <section className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <h2 className="font-serif text-2xl font-semibold text-ink">Yang bisa kamu lakukan</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FITUR.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-line bg-card p-5 transition-colors hover:border-brand/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon name={f.icon} />
              </span>
              <h3 className="mt-4 font-semibold text-ink">{f.judul}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.isi}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                Buka <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Dasar hukum */}
      <section className="mx-auto max-w-5xl px-4 md:px-8">
        <div className="rounded-2xl border border-line bg-card p-6 md:p-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">Dasar hukumnya bisa kamu cek sendiri</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Setiap jawaban menyebut pasal yang dipakai. Basis pengetahuannya disusun dari peraturan berikut, dan aturan
            yang sudah dicabut tidak dipakai sebagai jawaban.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {REGULASI.map((r) => (
              <li key={r} className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-ink">
                {r}
                {r === "UU 21/1997" && <span className="text-ink-soft"> · dicabut</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
