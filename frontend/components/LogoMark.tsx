import Image from "next/image";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";

// Emblem JagaTanah (timbangan di atas buku) marun, dipakai di seluruh halaman; versi putih hanya untuk ikon tab
// browser (app/icon.png, app/favicon.ico). File 1024px + unoptimized supaya tulisan pada emblem tidak pecah
// saat halaman di-zoom (tanpa itu Next memperkecil gambar sesuai ukuran tampil).
export default function LogoMark({ size = 32 }: { size?: number; inverse?: boolean }) {
  return <Image src="/logo/jagatanah-marun.webp" alt="" width={size} height={size} unoptimized className="shrink-0" aria-hidden />;
}

// "Jaga" + "Tanah" dua warna; nama diambil dari lib/site.ts
export function Wordmark({ inverse = false, withTagline = true }: { inverse?: boolean; withTagline?: boolean }) {
  const pisah = APP_NAME.match(/^(Jaga)(.*)$/);
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={withTagline ? 40 : 32} />
      <span className="leading-tight">
        <span className={`block text-lg font-extrabold tracking-tight ${inverse ? "text-white" : "text-ink"}`}>
          {pisah ? (
            <>
              {pisah[1]}
              <span className={inverse ? "text-accent" : "text-primary"}>{pisah[2]}</span>
            </>
          ) : (
            APP_NAME
          )}
        </span>
        {withTagline && (
          // Di navbar laptop kecil (lg) tagline disembunyikan supaya menu + tombol akun muat
          <span className={`hidden text-xs font-medium sm:block lg:hidden xl:block ${inverse ? "text-white/70" : "text-ink-soft"}`}>
            {APP_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
}
