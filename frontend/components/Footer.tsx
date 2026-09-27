import Link from "next/link";
import { MENU } from "@/lib/site";
import { Wordmark } from "./LogoMark";
import { container } from "./ui";

export default function Footer() {
  return (
    <footer className="hero-bg mt-20 text-sm text-white/75">
      <div className={`${container} grid grid-cols-1 gap-10 py-14 md:grid-cols-[1.4fr_1fr_1.2fr]`}>
        <div>
          <Wordmark inverse />
          <p className="mt-4 max-w-sm leading-relaxed">
            Membantu masyarakat memahami dokumen dan prosedur pertanahan dengan bahasa sederhana, lengkap dengan dasar
            hukumnya.
          </p>
        </div>

        <nav aria-label="Menu bawah">
          <h2 className="font-semibold text-white">Layanan</h2>
          <ul className="mt-3 space-y-2">
            {MENU.filter((m) => m.href !== "/").map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="underline-offset-4 transition-colors hover:text-white hover:underline">
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-semibold text-white">Perhatian</h2>
          <p className="mt-3 leading-relaxed">
            Informasi di JagaTanah bersifat edukasi umum dan bukan nasihat hukum. Untuk keputusan transaksi, konsultasikan
            dengan PPAT, notaris, atau Kantor Pertanahan setempat.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className={`${container} py-5 text-xs`}>
          © 2026 JagaTanah · Proyek Kompetisi KOMPRES 16 Informatika. Bukan situs resmi pemerintah.
        </p>
      </div>
    </footer>
  );
}
