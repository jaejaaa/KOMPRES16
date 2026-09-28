"use client";
import { useEffect, useRef } from "react";
import type { Konsultan } from "@/types/api";
import Icon, { type IconName } from "./Icon";
import { btn } from "./ui";

// Data konsultan dari Data Engineer membawa catatan internal dalam kurung, mis. "(dummy)" atau
// "(indikatif/dummy)". Keterangan data contoh sudah ada di kotak peringatan halaman, jadi di sini dibuang.
const bersih = (teks?: string) => teks?.replace(/\s*\([^)]*dummy[^)]*\)/gi, "").trim() || undefined;

function Baris({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name={icon} className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink-soft">{label}</p>
        <div className="mt-0.5 text-ink">{children}</div>
      </div>
    </div>
  );
}

// Popup detail satu Notaris/PPAT atau advokat. Kompatibel dengan data lama (kontak) dan baru (telepon, peta, jadwal, tarif).
export default function DetailKonsultan({
  konsultan: k,
  profesi,
  namaKategori,
  onClose,
}: {
  konsultan: Konsultan | null;
  profesi: string;
  namaKategori: (id: string) => string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (k && !d.open) d.showModal();
    if (!k && d.open) d.close();
  }, [k]);

  const inisial = k?.nama.replace(/^(Dr\.|H\.|Hj\.)\s*/i, "").charAt(0).toUpperCase();
  const telepon = bersih(k?.telepon);
  const jadwal = bersih(k?.jadwal);
  const tarif = bersih(k?.tarif);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="judul-konsultan"
      className="m-auto max-h-[90dvh] w-[min(94vw,32rem)] overflow-y-auto rounded-3xl border-0 bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      {k && (
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-surface/80 text-ink-soft transition-colors hover:bg-bg hover:text-ink"
          >
            <Icon name="x" className="size-5" />
          </button>

          <div className="hero-bg rounded-t-3xl px-6 pb-6 pt-7 text-white">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/25" aria-hidden>
              {inisial}
            </span>
            <p className="mt-4 text-sm font-semibold text-accent">{profesi}</p>
            <h2 id="judul-konsultan" className="mt-1 text-2xl font-extrabold tracking-tight">{k.nama}</h2>
            <p className="mt-1 text-white/75">{k.kantor}</p>
          </div>

          <div className="divide-y divide-line px-6">
            <Baris icon="pin" label="Lokasi">{k.kota}, {k.provinsi}</Baris>
            {jadwal && <Baris icon="clock" label="Jadwal praktik">{jadwal}</Baris>}
            {tarif && <Baris icon="wallet" label="Perkiraan tarif">{tarif}</Baris>}
            {telepon && <Baris icon="phone" label="Telepon">{telepon}</Baris>}
            {!telepon && k.kontak && <Baris icon="phone" label="Kontak">{bersih(k.kontak) ?? k.kontak}</Baris>}
            <Baris icon="list" label="Menangani">
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {k.kategori_kasus.map((id) => (
                  <li key={id} className="rounded-full bg-bg px-2.5 py-1 text-xs">{namaKategori(id)}</li>
                ))}
              </ul>
            </Baris>
          </div>

          <div className="flex flex-col gap-2 p-6 pt-3 sm:flex-row">
            {k.peta && (
              <a href={k.peta} target="_blank" rel="noopener noreferrer" className={`${btn.primary} flex-1`}>
                <Icon name="pin" className="size-4" /> Lihat di Google Maps
                <Icon name="external" className="size-3.5 opacity-70" />
              </a>
            )}
            <button type="button" onClick={onClose} className={`${btn.secondary} ${k.peta ? "" : "flex-1"}`}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
