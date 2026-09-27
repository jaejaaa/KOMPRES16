"use client";
import { useEffect, useRef, useState } from "react";
import { masukDenganGoogle, type HasilMasuk } from "@/lib/firebase";
import Icon from "./Icon";
import LogoMark from "./LogoMark";
import { Notice, Spinner } from "./ui";

export function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

const MANFAAT = ["Riwayat pemeriksaan dan percakapan tersimpan permanen", "Bisa bertanya soal dokumen yang sudah diperiksa"];

export default function LoginDialog({
  open,
  onClose,
  judul = "Masuk ke JagaTanah",
  pesan = "Masuk dengan akun Google agar riwayat Anda tersimpan dan bisa dibuka kembali kapan saja.",
  onBerhasil,
}: {
  open: boolean;
  onClose: () => void;
  judul?: string;
  pesan?: string;
  onBerhasil?: (hasil: Extract<HasilMasuk, { ok: true }>) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function tutup() {
    setError(null);
    onClose();
  }

  async function masuk() {
    setLoading(true);
    setError(null);
    const hasil = await masukDenganGoogle();
    setLoading(false);
    if (hasil.ok) {
      tutup();
      onBerhasil?.(hasil);
    } else if (hasil.pesan) {
      setError(hasil.pesan);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={tutup}
      onClick={(e) => e.target === ref.current && tutup()}
      aria-labelledby="judul-masuk"
      className="m-auto w-[min(92vw,27rem)] rounded-3xl border-0 bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 md:p-8">
        <button
          type="button"
          onClick={tutup}
          aria-label="Tutup"
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-bg hover:text-ink"
        >
          <Icon name="x" className="size-5" />
        </button>

        <LogoMark size={44} />
        <h2 id="judul-masuk" className="mt-5 text-2xl font-extrabold tracking-tight">{judul}</h2>
        <p className="mt-2 leading-relaxed text-ink-soft">{pesan}</p>

        <ul className="mt-5 space-y-2.5 text-sm">
          {MANFAAT.map((m) => (
            <li key={m} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-risk-low-bg text-risk-low">
                <Icon name="check" className="size-3" />
              </span>
              {m}
            </li>
          ))}
        </ul>

        {error && (
          <div className="fade-up mt-5">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}

        <button
          type="button"
          onClick={masuk}
          disabled={loading}
          autoFocus
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-surface px-5 py-3.5 font-semibold text-ink shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? <Spinner /> : <GoogleIcon />}
          {loading ? "Menunggu login Google…" : "Masuk dengan Google"}
        </button>
        <button type="button" onClick={tutup} className="mt-3 w-full rounded-full py-2 text-sm font-semibold text-ink-soft hover:text-ink">
          Nanti saja
        </button>
        <p className="mt-3 text-center text-xs text-ink-soft">Login hanya dipakai untuk menyimpan riwayat Anda.</p>
      </div>
    </dialog>
  );
}
