"use client";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import Icon, { type IconName } from "./Icon";
import { RiskBadge } from "./RiskCard";
import { btn } from "./ui";

function PratinjauCek() {
  const baris = [
    { pasal: "Pasal 6", aspek: "Peralihan hak tanpa akta PPAT", level: "high" as const },
    { pasal: "Pasal 5", aspek: "Pajak dan biaya tidak jelas", level: "high" as const },
    { pasal: "Pasal 3", aspek: "Uang muka dan pembatalan", level: "medium" as const },
    { pasal: "Pasal 7", aspek: "Waktu pelaksanaan", level: "low" as const },
  ];
  return (
    <ul className="space-y-2.5">
      {baris.map((b, i) => (
        <li key={b.pasal} className="pop-in flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-soft" style={{ animationDelay: `${i * 90}ms` }}>
          <span className="w-16 shrink-0 text-sm font-bold text-ink">{b.pasal}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{b.aspek}</span>
          <RiskBadge level={b.level} />
        </li>
      ))}
    </ul>
  );
}

function PratinjauChat() {
  return (
    <div className="space-y-3">
      <p className="pop-in ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-white">
        Siapa yang membayar BPHTB saat jual beli tanah?
      </p>
      <div className="pop-in rounded-2xl rounded-tl-md bg-surface p-4 text-sm leading-relaxed text-ink shadow-soft" style={{ animationDelay: "150ms" }}>
        BPHTB dibayar oleh pihak yang memperoleh hak atas tanah, yaitu <b>pembeli</b>.
        <span className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Icon name="scale" className="size-3.5" /> UU 28/2009 · Pasal 86
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Icon name="book" className="size-3.5" /> Panduan balik nama
          </span>
        </span>
      </div>
    </div>
  );
}

function PratinjauPanduan() {
  const langkah = ["Cek sertifikat dan objek tanah", "Bayar BPHTB dan PPh", "Tanda tangan AJB di hadapan PPAT", "PPAT mendaftarkan akta"];
  return (
    <ol className="space-y-2.5">
      {langkah.map((l, i) => (
        <li key={l} className="pop-in flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-soft" style={{ animationDelay: `${i * 90}ms` }}>
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 2 ? "bg-risk-low text-white" : "bg-primary-soft text-primary"}`}>
            {i < 2 ? <Icon name="check" className="size-4" /> : i + 1}
          </span>
          <span className={`text-sm ${i < 2 ? "text-ink-soft line-through decoration-ink-soft/40" : "font-medium text-ink"}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

const TAB: { id: string; label: string; pendek: string; icon: IconName; judul: string; isi: string; poin: string[]; href: string; cta: string; pratinjau: ReactNode }[] = [
  {
    id: "cek",
    label: "Cek Dokumen",
    pendek: "Cek Dokumen",
    icon: "doc",
    judul: "Temukan pasal berisiko dalam hitungan detik",
    isi: "Unggah perjanjian dalam bentuk PDF. Setiap pasal diberi tingkat risiko, alasan yang mudah dipahami, dan kutipan teks aslinya.",
    poin: ["Tingkat risiko per pasal", "Ringkasan isi dokumen", "Riwayat tersimpan setelah masuk"],
    href: "/upload",
    cta: "Periksa dokumen",
    pratinjau: <PratinjauCek />,
  },
  {
    id: "chat",
    label: "Konsultasi Hukum",
    pendek: "Konsultasi",
    icon: "chat",
    judul: "Tanya apa saja, jawaban disertai pasalnya",
    isi: "Ajukan pertanyaan seputar jual beli, sertifikat, pajak, atau isi dokumen Anda. Jawaban merujuk langsung ke peraturan.",
    poin: ["Bahasa sederhana", "Sumber pasal bisa dibaca", "Bahas dokumen Anda setelah masuk"],
    href: "/chat",
    cta: "Mulai konsultasi",
    pratinjau: <PratinjauChat />,
  },
  {
    id: "panduan",
    label: "Panduan",
    pendek: "Panduan",
    icon: "book",
    judul: "Ikuti prosedur langkah demi langkah",
    isi: "Panduan cek keaslian sertifikat dan balik nama. Tandai langkah yang sudah Anda selesaikan agar tidak ada yang terlewat.",
    poin: ["Checklist langkah", "Rujukan pasal di tiap langkah", "Dokumen yang perlu disiapkan"],
    href: "/panduan",
    cta: "Lihat panduan",
    pratinjau: <PratinjauPanduan />,
  },
];

export default function LayananTabs() {
  const [aktif, setAktif] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const t = TAB[aktif];

  function onKey(e: KeyboardEvent) {
    const arah = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!arah) return;
    e.preventDefault();
    const baru = (aktif + arah + TAB.length) % TAB.length;
    setAktif(baru);
    tabRefs.current[baru]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Layanan JagaTanah"
        onKeyDown={onKey}
        className="mx-auto grid grid-cols-3 gap-1 rounded-3xl border border-line bg-surface p-1.5 shadow-soft sm:flex sm:w-fit sm:rounded-full"
      >
        {TAB.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={i === aktif}
            aria-controls={`panel-${x.id}`}
            tabIndex={i === aktif ? 0 : -1}
            onClick={() => setAktif(i)}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-semibold transition-all duration-300 sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm ${
              i === aktif ? "bg-primary text-white shadow-soft" : "text-ink-soft hover:bg-bg hover:text-primary"
            }`}
          >
            <Icon name={x.icon} className="size-4" />
            <span className="sm:hidden">{x.pendek}</span>
            <span className="hidden sm:inline">{x.label}</span>
          </button>
        ))}
      </div>

      <div
        key={t.id}
        role="tabpanel"
        id={`panel-${t.id}`}
        aria-labelledby={`tab-${t.id}`}
        className="fade-up mt-8 grid grid-cols-1 items-center gap-8 rounded-[2rem] border border-line bg-surface p-6 shadow-soft md:grid-cols-2 md:p-10"
      >
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">{t.judul}</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">{t.isi}</p>
          <ul className="mt-5 space-y-2.5">
            {t.poin.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-ink">
                <span className="flex size-6 items-center justify-center rounded-full bg-risk-low-bg text-risk-low">
                  <Icon name="check" className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Link href={t.href} className={`${btn.primary} mt-7`}>
            {t.cta} <Icon name="arrow" className="size-4" />
          </Link>
        </div>
        <div className="rounded-3xl bg-linear-to-br from-primary-soft to-bg p-5 md:p-6">{t.pratinjau}</div>
      </div>
    </div>
  );
}
