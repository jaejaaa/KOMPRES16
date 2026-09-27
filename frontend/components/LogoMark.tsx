import { APP_NAME, APP_TAGLINE } from "@/lib/site";

// Perisai (jaga) berisi sebidang tanah + tanda centang = "tanah yang terjaga"
export default function LogoMark({ size = 32, inverse = false }: { size?: number; inverse?: boolean }) {
  const perisai = inverse ? "#FFFFFF" : "var(--color-primary)";
  const centang = inverse ? "var(--color-primary)" : "#FFFFFF";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 2 27.5 6v8.6c0 7.1-4.7 12.6-11.5 15.4C9.2 27.2 4.5 21.7 4.5 14.6V6z" fill={perisai} />
      <path d="M9.5 19.6 16 16.2l6.5 3.4L16 23z" fill="var(--color-accent)" />
      <path d="M11.5 10.6l3.2 3.2 6-6.2" fill="none" stroke={centang} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Jaga" + "Tanah" dua warna; nama diambil dari lib/site.ts
export function Wordmark({ inverse = false, withTagline = true }: { inverse?: boolean; withTagline?: boolean }) {
  const pisah = APP_NAME.match(/^(Jaga)(.*)$/);
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark inverse={inverse} size={withTagline ? 36 : 28} />
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
