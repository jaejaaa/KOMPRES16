"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAkun, type Akun } from "@/lib/akun";
import { keluar } from "@/lib/firebase";
import { AI, MENU } from "@/lib/site";
import { Wordmark } from "./LogoMark";
import Icon from "./Icon";
import LoginDialog from "./LoginDialog";
import { btn } from "./ui";

function Avatar({ akun, size = "size-10" }: { akun: Akun; size?: string }) {
  const inisial = (akun.nama ?? akun.email ?? "?").trim().charAt(0).toUpperCase();
  return akun.foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- foto profil Google dari domain luar, cukup <img> biasa
    <img src={akun.foto} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-primary font-bold text-white`}>{inisial}</span>
  );
}

// Menu profil (desktop): nama, email, riwayat, keluar. Tertutup saat klik di luar atau tekan Esc.
function MenuProfil({ akun }: { akun: Akun }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const luar = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setBuka(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setBuka(!buka)}
        aria-expanded={buka}
        aria-label={`Akun ${akun.nama ?? ""}`}
        className="flex rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30"
      >
        <Avatar akun={akun} />
      </button>
      {buka && (
        <div className="fade-up absolute right-0 top-full mt-3 w-72 rounded-3xl border border-line bg-surface p-2 shadow-lift">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar akun={akun} size="size-11" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{akun.nama ?? "Pengguna"}</p>
              <p className="truncate text-sm text-ink-soft">{akun.email}</p>
            </div>
          </div>
          <div className="border-t border-line pt-1">
            <Link
              href="/upload#riwayat"
              onClick={() => setBuka(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
            >
              <Icon name="clock" className="size-4 text-primary" /> Riwayat pemeriksaan
            </Link>
            <button
              type="button"
              onClick={() => { setBuka(false); keluar(); }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-bg"
            >
              <Icon name="back" className="size-4 text-primary" /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const path = usePathname();
  const akun = useAkun();
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Halaman hasil analisis masih bagian dari layanan "Cek Dokumen"
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href) || (href === "/upload" && path.startsWith("/analisis"));

  // Bayangan navbar menebal setelah halaman di-scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 md:px-6">
      <header
        className={`glass mx-auto max-w-6xl rounded-[1.75rem] border border-white/60 transition-shadow duration-300 ${
          scrolled ? "shadow-lift" : "shadow-soft"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-4 pl-4 pr-2 md:pl-5">
          <Link href="/" onClick={() => setOpen(false)} aria-label="JagaTanah, ke beranda" className="rounded-full">
            <Wordmark />
          </Link>

          <nav aria-label="Menu utama" className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-bg/80 p-1">
              {MENU.map((m) => {
                const active = isActive(m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                        active ? "bg-surface text-primary shadow-soft" : "text-ink-soft hover:text-primary"
                      }`}
                    >
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Dibungkus div: "hidden" langsung di tombol kalah oleh inline-flex milik btn */}
          <div className="hidden items-center gap-2 lg:flex">
            {!akun.siap ? (
              <span className="size-10 animate-pulse rounded-full bg-bg" aria-hidden />
            ) : akun.masuk ? (
              <MenuProfil akun={akun} />
            ) : (
              <button type="button" onClick={() => setLogin(true)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
                Masuk
              </button>
            )}
            <Link
              href={AI.href}
              aria-current={path.startsWith(AI.href) ? "page" : undefined}
              className={`${btn.primary} px-5 py-2.5 text-sm`}
            >
              <Icon name="chat" className="size-4" /> {AI.label}
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {akun.masuk && <Avatar akun={akun} size="size-9" />}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="menu-hp"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              className="flex size-11 items-center justify-center rounded-full bg-bg text-ink transition-colors hover:bg-primary-soft"
            >
              <Icon name={open ? "close" : "menu"} className="size-5" />
            </button>
          </div>
        </div>

        {open && (
          <nav id="menu-hp" aria-label="Menu utama" className="fade-up px-3 pb-3 lg:hidden">
            <ul className="space-y-1 border-t border-line pt-3">
              {MENU.map((m) => {
                const active = isActive(m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 font-semibold ${
                        active ? "bg-primary-soft text-primary" : "text-ink hover:bg-bg"
                      }`}
                    >
                      {m.label}
                      <Icon name="arrow" className="size-4 opacity-50" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 border-t border-line pt-3">
              {akun.masuk ? (
                <div className="flex items-center gap-3 px-2">
                  <Avatar akun={akun} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{akun.nama ?? "Pengguna"}</p>
                    <p className="truncate text-sm text-ink-soft">{akun.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); keluar(); }}
                    className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOpen(false); setLogin(true); }}
                  className={`${btn.secondary} w-full`}
                >
                  Masuk dengan Google
                </button>
              )}
              <Link href={AI.href} onClick={() => setOpen(false)} className={`${btn.primary} mt-2 w-full`}>
                <Icon name="chat" className="size-4" /> {AI.label}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <LoginDialog open={login} onClose={() => setLogin(false)} />
    </div>
  );
}
