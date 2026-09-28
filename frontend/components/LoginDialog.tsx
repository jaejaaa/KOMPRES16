"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { daftarDenganEmail, masukDenganEmail, masukDenganGoogle, resetKataSandi, type HasilMasuk } from "@/lib/firebase";
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

type Tab = "masuk" | "daftar";
const MIN_SANDI = 6;
const INPUT =
  "tanpa-cincin-fokus w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink transition-all placeholder:text-ink-soft/60 focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/10";
const LABEL = "text-xs font-bold uppercase tracking-wide text-ink-soft";

export default function LoginDialog({
  open,
  onClose,
  judul = "Masuk ke JagaTanah",
  pesan = "Masuk atau buat akun baru agar riwayat pemeriksaan dan percakapan Anda tersimpan dan bisa dibuka kembali kapan saja.",
  onBerhasil,
}: {
  open: boolean;
  onClose: () => void;
  judul?: string;
  pesan?: string;
  onBerhasil?: (hasil: Extract<HasilMasuk, { ok: true }>) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("masuk");
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [proses, setProses] = useState<"email" | "google" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function tutup() {
    setError(null);
    setInfo(null);
    setSandi("");
    setProses(null);
    onClose();
  }

  function gantiTab(t: Tab) {
    setTab(t);
    setError(null);
    setInfo(null);
  }

  function selesai(hasil: HasilMasuk) {
    setProses(null);
    if (hasil.ok) {
      tutup();
      onBerhasil?.(hasil);
    } else if (hasil.pesan) {
      setError(hasil.pesan);
    }
  }

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const alamat = email.trim();
    if (!alamat) return setError("Email wajib diisi.");
    if (sandi.length < MIN_SANDI) return setError(`Kata sandi minimal ${MIN_SANDI} karakter.`);
    setProses("email");
    selesai(tab === "masuk" ? await masukDenganEmail(alamat, sandi) : await daftarDenganEmail(alamat, sandi));
  }

  async function google() {
    setError(null);
    setInfo(null);
    setProses("google");
    selesai(await masukDenganGoogle());
  }

  async function lupaSandi() {
    setError(null);
    setInfo(null);
    const alamat = email.trim();
    if (!alamat) return setError("Isi email Anda terlebih dahulu, lalu klik “Lupa kata sandi?” lagi.");
    setProses("reset");
    const r = await resetKataSandi(alamat);
    setProses(null);
    if (r.ok) setInfo(r.pesan);
    else setError(r.pesan);
  }

  const sibuk = proses !== null;

  return (
    <dialog
      ref={ref}
      onClose={tutup}
      onClick={(e) => e.target === ref.current && tutup()}
      aria-labelledby="judul-masuk"
      className="m-auto max-h-[92dvh] w-[min(94vw,28rem)] overflow-y-auto rounded-[2rem] border-0 bg-surface p-0 text-ink shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
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

        <h2 id="judul-masuk" className="flex items-center gap-2.5 pr-8 text-xl font-extrabold tracking-tight">
          <LogoMark size={26} /> {judul}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pesan}</p>

        <div role="tablist" aria-label="Pilih masuk atau daftar" className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-bg p-1">
          {(["masuk", "daftar"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => gantiTab(t)}
              className={`rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                tab === t ? "bg-surface text-ink shadow-soft" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t === "masuk" ? "Masuk" : "Daftar Baru"}
            </button>
          ))}
        </div>

        <form onSubmit={kirim} className="mt-6 space-y-4" noValidate>
          <label className="block">
            <span className={LABEL}>Email</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className={`${INPUT} mt-2`}
            />
          </label>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sandi" className={LABEL}>Kata Sandi</label>
              {tab === "masuk" && (
                <button type="button" onClick={lupaSandi} disabled={sibuk} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                  {proses === "reset" ? "Mengirim…" : "Lupa kata sandi?"}
                </button>
              )}
            </div>
            <div className="relative mt-2">
              <input
                id="sandi"
                type={lihatSandi ? "text" : "password"}
                autoComplete={tab === "masuk" ? "current-password" : "new-password"}
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                placeholder={`Minimal ${MIN_SANDI} karakter`}
                className={`${INPUT} pr-12`}
              />
              <button
                type="button"
                onClick={() => setLihatSandi(!lihatSandi)}
                aria-label={lihatSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={lihatSandi}
                className="absolute inset-y-0 right-1 flex w-10 items-center justify-center text-ink-soft hover:text-ink"
              >
                <Icon name={lihatSandi ? "eyeOff" : "eye"} className="size-5" />
              </button>
            </div>
          </div>

          {error && <div className="fade-up"><Notice tone="danger">{error}</Notice></div>}
          {info && <div className="fade-up"><Notice tone="success">{info}</Notice></div>}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={tutup}
              className="rounded-xl border border-line py-3 font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={sibuk}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {proses === "email" && <Spinner className="size-4" />}
              {tab === "masuk" ? "Masuk Akun" : "Buat Akun"}
            </button>
          </div>
        </form>

        <div className="my-6 flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
          <span className="h-px flex-1 bg-line" /> atau masuk cepat <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={google}
          disabled={sibuk}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface py-3 font-semibold text-ink shadow-soft transition-colors hover:border-line-strong disabled:opacity-60"
        >
          {proses === "google" ? <Spinner className="size-5" /> : <GoogleIcon />}
          {proses === "google" ? "Menunggu login Google…" : "Masuk dengan Google"}
        </button>
      </div>
    </dialog>
  );
}
