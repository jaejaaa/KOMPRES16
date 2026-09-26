import Link from "next/link";
import { APP_NAME } from "@/lib/site";
import LogoMark from "./LogoMark";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-ink-soft md:flex-row md:items-start md:justify-between md:px-8">
        <div className="max-w-md">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <LogoMark size={22} /> {APP_NAME}
          </p>
          <p className="mt-2">
            Informasi di aplikasi ini bersifat edukasi umum, bukan nasihat hukum. Untuk keputusan transaksi, konsultasikan
            dengan PPAT, notaris, atau Kantor Pertanahan setempat.
          </p>
        </div>
        <nav className="flex gap-5" aria-label="Tautan bawah">
          <Link href="/upload" className="hover:text-ink">Cek dokumen</Link>
          <Link href="/chat" className="hover:text-ink">Tanya hukum</Link>
          <Link href="/panduan" className="hover:text-ink">Panduan</Link>
        </nav>
      </div>
      <p className="pb-6 text-center text-xs text-ink-soft">KOMPRES 16 · 2026</p>
    </footer>
  );
}
