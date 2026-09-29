"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { fotoKonsultan } from "@/lib/foto-konsultan";
import type { Konsultan } from "@/types/api";
import Icon, { type IconName } from "./Icon";
import { btn } from "./ui";

// Data konsultan dari Data Engineer membawa catatan internal dalam kurung, mis. "(dummy)" atau
// "(indikatif/dummy)" -- dibuang di sini supaya tampilannya bersih.
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
  foto: fotoKartu,
  profesi,
  namaKategori,
  onClose,
}: {
  konsultan: Konsultan | null;
  foto?: string; // foto yang sama dengan kartu yang diklik
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

  // Inisial 2 huruf dari nama tanpa gelar, mis. "Dr. H. Ahmad Fauzi, S.H." -> "AF"
  const inisial = k?.nama
    .split(",")[0]
    .replace(/^((Dr|H|Hj|Prof)\.\s*)+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata.charAt(0).toUpperCase())
    .join("");
  const foto = fotoKartu ?? (k ? fotoKonsultan(k) : undefined);
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

          {/* Banner: teks di kiri, foto (atau inisial) di kanan dengan lingkaran emas yang separuhnya terpotong di bawah */}
          <div className="relative h-[230px] overflow-hidden rounded-t-3xl bg-[#650000] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_115%,rgb(230_180_58/0.22),transparent_55%)]" aria-hidden />
            <div className="absolute bottom-0 right-4 h-[165px] w-[150px] min-[420px]:right-9 min-[420px]:h-[205px] min-[420px]:w-[200px]" aria-hidden>
              {foto ? (
                <>
                  <span className="absolute left-1/2 top-full size-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[rgb(230_180_58/0.55)] min-[420px]:size-[180px]" />
                  <Image
                    src={foto}
                    alt=""
                    fill
                    sizes="200px"
                    unoptimized={foto.startsWith("http")}
                    className="object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]"
                  />
                </>
              ) : (
                // Tanpa foto: lingkaran inisial di tengah tinggi banner
                <span className="absolute bottom-[65px] left-1/2 flex size-[100px] -translate-x-1/2 items-center justify-center rounded-full bg-white/[0.08] text-4xl font-bold text-[#E6B43A] ring-[1.5px] ring-[rgb(230_180_58/0.55)] ring-offset-[5px] ring-offset-[#650000] min-[420px]:bottom-[54px] min-[420px]:size-[122px] min-[420px]:text-5xl">
                  {inisial}
                </span>
              )}
            </div>

            <div className="relative z-10 flex h-full max-w-[calc(100%-170px)] flex-col justify-center pl-6 min-[420px]:max-w-[316px]">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#E6B43A]">{profesi}</p>
              <h2 id="judul-konsultan" className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tight min-[420px]:text-[26px]">
                {k.nama}
              </h2>
              <p className="mt-1.5 text-sm text-white/75">{k.kantor}</p>
            </div>
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
