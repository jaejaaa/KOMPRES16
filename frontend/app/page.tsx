import Link from "next/link";
import HeroBackdrop from "@/components/HeroBackdrop";
import Icon from "@/components/Icon";
import LayananTabs from "@/components/LayananTabs";
import Reveal from "@/components/Reveal";
import { btn, container, NAV_OFFSET } from "@/components/ui";
import { MAX_PDF_MB } from "@/lib/site";

const PINTASAN = [
  { href: "/upload", judul: "Cek Dokumen", isi: "Periksa pasal perjanjian Anda" },
  { href: "/chat", judul: "Konsultasi Hukum", isi: "Tanya seputar hukum pertanahan" },
  { href: "/panduan", judul: "Panduan Prosedur", isi: "Cek sertifikat dan balik nama" },
];

const CARA = [
  { judul: "Unggah dokumen", isi: `Pilih file PDF perjanjian jual beli, AJB, atau surat tanah lain. Ukuran maksimal ${MAX_PDF_MB} MB.` },
  { judul: "Tunggu analisis", isi: "Setiap pasal dibaca dan dicocokkan dengan peraturan pertanahan. Prosesnya hanya beberapa detik." },
  { judul: "Baca hasilnya", isi: "Pasal diberi tingkat risiko beserta alasannya. Bila masih ragu, tanyakan langsung di Konsultasi Hukum." },
];

const REGULASI: { nama: string; tentang: string; dicabut?: boolean }[] = [
  { nama: "UU No. 5 Tahun 1960", tentang: "Peraturan Dasar Pokok-Pokok Agraria (UUPA)" },
  { nama: "PP No. 24 Tahun 1997", tentang: "Pendaftaran Tanah" },
  { nama: "PP No. 18 Tahun 2021", tentang: "Hak Pengelolaan, Hak atas Tanah, Satuan Rumah Susun, dan Pendaftaran Tanah" },
  { nama: "Permen ATR/BPN No. 3 Tahun 2023", tentang: "Penerbitan Dokumen Elektronik dalam Kegiatan Pendaftaran Tanah" },
  { nama: "UU No. 28 Tahun 2009", tentang: "Pajak Daerah dan Retribusi Daerah (ketentuan BPHTB)" },
  { nama: "UU No. 2 Tahun 2012", tentang: "Pengadaan Tanah bagi Pembangunan untuk Kepentingan Umum" },
  { nama: "UU No. 27 Tahun 2022", tentang: "Pelindungan Data Pribadi" },
  { nama: "KUHPerdata Buku II", tentang: "Kebendaan" },
  { nama: "UU No. 21 Tahun 1997", tentang: "Bea Perolehan Hak atas Tanah dan Bangunan", dicabut: true },
];

const FAQ = [
  { q: "Apakah layanan ini dipungut biaya?", a: "Tidak. JagaTanah dapat digunakan tanpa biaya." },
  {
    q: "Apakah saya perlu masuk (login)?",
    a: "Pemeriksaan dokumen dan tanya jawab umum bisa langsung dipakai tanpa akun. Masuk dengan Google diperlukan untuk bertanya soal dokumen yang sudah diperiksa dan agar riwayat Anda tersimpan permanen. Tanpa masuk, riwayat hanya tersimpan selama tab peramban masih terbuka.",
  },
  {
    q: "Dokumen apa saja yang bisa diperiksa?",
    a: `Perjanjian jual beli, Akta Jual Beli (AJB), perjanjian sewa, dan dokumen tanah lain dalam bentuk PDF digital, maksimal ${MAX_PDF_MB} MB. PDF hasil pindaian (scan) atau foto belum bisa dibaca.`,
  },
  {
    q: "Apakah dokumen saya aman?",
    a: "File PDF tidak disimpan. Sistem hanya menyimpan teks dokumen untuk keperluan analisis dan tanya jawab, dan data tersebut hanya bisa dibuka dari akun Anda. Untuk pengguna tamu, data tidak bisa dibuka lagi setelah tab ditutup.",
  },
  {
    q: "Apakah hasil pemeriksaan bisa dijadikan dasar hukum?",
    a: "Tidak. Hasil pemeriksaan adalah bantuan awal untuk memahami isi dokumen. Keputusan transaksi tetap perlu dikonsultasikan dengan PPAT, notaris, atau Kantor Pertanahan.",
  },
  {
    q: "Dari mana jawaban konsultasi hukum berasal?",
    a: "Dari kumpulan peraturan pertanahan dan panduan prosedur. Setiap jawaban menampilkan pasal yang dijadikan dasar sehingga dapat Anda periksa sendiri.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Pembuka: satu layar penuh, maroon dengan foto patung keadilan di latar */}
      <section className={`relative overflow-hidden bg-[#650000] ${NAV_OFFSET} flex min-h-svh flex-col text-white`}>
        <HeroBackdrop />
        <div className={`${container} relative flex flex-1 items-center py-16`}>
          <div className="fade-up max-w-3xl">
            <h1
              className="text-[2.75rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ textShadow: "0 2px 24px rgba(60,0,0,.6)" }}
            >
              Periksa dokumen tanah <span className="text-accent">sebelum tanda tangan.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
              Unggah perjanjian jual beli atau dokumen tanah lainnya. Pasal yang berisiko ditandai dan dijelaskan dengan
              bahasa sederhana, lengkap dengan dasar hukumnya. Gratis, bisa langsung dipakai tanpa membuat akun.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/upload" className={`${btn.accent} px-7 py-3.5`}>
                Mulai Pemeriksaan <Icon name="arrow" className="size-4" />
              </Link>
              <Link href="/chat" className={`${btn.onDark} px-7 py-3.5`}>
                Konsultasi Hukum
              </Link>
            </div>
          </div>
        </div>

        {/* Pintasan layanan di dasar layar pembuka */}
        <nav aria-label="Pintasan layanan" className="relative border-t border-white/15">
          <ul className={`${container} grid grid-cols-1 sm:grid-cols-3`}>
            {PINTASAN.map((p, i) => (
              <li key={p.href} className={i > 0 ? "border-t border-white/15 sm:border-l sm:border-t-0" : ""}>
                <Link
                  href={p.href}
                  className={`group flex items-center justify-between gap-4 py-5 transition-colors hover:text-accent ${i === 0 ? "sm:pr-6" : "sm:px-6"}`}
                >
                  <span>
                    <span className="block font-semibold">{p.judul}</span>
                    <span className="block text-sm text-white/65">{p.isi}</span>
                  </span>
                  <Icon name="arrow" className="size-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      {/* Layanan interaktif */}
      <section id="layanan" className={`${container} scroll-mt-24 pt-20`}>
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Layanan JagaTanah</h2>
          <p className="mt-3 text-lg text-ink-soft">Pilih layanan untuk melihat contoh tampilannya.</p>
        </Reveal>
        <Reveal delay={100} className="mt-8">
          <LayananTabs />
        </Reveal>
      </section>

      {/* Cara menggunakan */}
      <section id="cara" className={`${container} scroll-mt-24 pt-20`}>
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Cara menggunakan layanan</h2>
          <p className="mt-3 text-lg text-ink-soft">Pemeriksaan dokumen dilakukan dalam tiga tahap.</p>
        </Reveal>
        <ol className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {CARA.map((c, i) => (
            <li key={c.judul}>
              <Reveal delay={i * 100} className="border-t-2 border-primary pt-6">
                <span className="text-sm font-bold tabular-nums text-primary">Tahap {i + 1}</span>
                <h3 className="mt-2 text-xl font-bold text-ink">{c.judul}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{c.isi}</p>
              </Reveal>
            </li>
          ))}
        </ol>
        <Link href="/upload" className={`${btn.primary} mt-10`}>
          Mulai Pemeriksaan <Icon name="arrow" className="size-4" />
        </Link>
      </section>

      {/* Dasar hukum */}
      <section id="dasar-hukum" className={`${container} scroll-mt-24 pt-20`}>
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Dasar hukum yang digunakan</h2>
          <p className="mt-3 text-lg text-ink-soft">Setiap hasil pemeriksaan dan jawaban menyebut pasal dari peraturan berikut.</p>
        </Reveal>
        <Reveal delay={100} className="mt-8 rounded-3xl border border-line bg-surface p-2 shadow-soft">
          <ol className="grid grid-cols-1 md:grid-cols-2">
            {REGULASI.map((r, i) => (
              <li key={r.nama} className={`flex gap-4 rounded-2xl p-4 transition-colors hover:bg-primary-soft ${r.dicabut ? "text-ink-soft" : ""}`}>
                <span className="w-6 shrink-0 pt-px text-sm font-bold tabular-nums text-primary">{i + 1}.</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {r.nama}
                    {r.dicabut && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-ink-soft">Dicabut</span>}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{r.tentang}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
        <p className="mt-4 text-sm text-ink-soft">Peraturan yang sudah dicabut disimpan sebagai pembanding dan tidak dipakai untuk menjawab.</p>
      </section>

      {/* Pertanyaan umum */}
      <section id="faq" className={`${container} scroll-mt-24 grid grid-cols-1 gap-8 pt-20 lg:grid-cols-[1fr_1.6fr]`}>
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Pertanyaan umum</h2>
          <p className="mt-3 text-lg text-ink-soft">Belum menemukan jawaban yang Anda cari?</p>
          <Link href="/chat" className={`${btn.secondary} mt-5`}>Tanyakan langsung</Link>
        </Reveal>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group rounded-2xl border border-line bg-surface shadow-soft transition-colors open:border-primary/30">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 font-semibold text-ink">
                  {f.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg text-primary transition-colors group-open:bg-primary group-open:text-white">
                    <Icon name="plus" className="plus size-4 transition-transform duration-300" />
                  </span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
