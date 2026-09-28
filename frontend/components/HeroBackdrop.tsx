import Image from "next/image";

// Latar pembuka beranda: foto patung keadilan diwarnai oranye-maroon (duotone) di sisi kanan,
// memudar ke kiri, dengan cahaya lembut, tekstur titik, dan garis poligon emas.
// Diletakkan sebagai anak pertama section berposisi relative; semua lapisan hanya dekorasi.
// ringkas = versi kecil untuk banner judul halaman (lebih pendek dari layar pembuka beranda).

// Titik poligon dalam koordinat viewBox 0 0 720 760 (menempel di sisi kanan)
const TITIK: [number, number][] = [
  [40, 120], [290, 70], [610, 150], [680, 470], [410, 690], [100, 610],
];
const GARIS_DALAM: [number, number][][] = [
  [[290, 70], [410, 690]],
  [[100, 610], [680, 470]],
];

// Foto latar yang tersedia. negatif = warna foto dibalik dulu (terang jadi gelap) sebelum diwarnai.
// terang = foto berlatar terang yang TIDAK dibalik: kecerahannya diturunkan supaya banner tetap gelap-maroon.
export const FOTO_LATAR = {
  patung: { src: "/hero/patung-bg.jpg", posisi: "62% 38%", negatif: false, terang: false },
  lup: { src: "/hero/lup-bg.jpg", posisi: "30% 60%", negatif: true, terang: false },
  kamus: { src: "/hero/kamus-bg.jpg", posisi: "55% 35%", negatif: true, terang: false },
  buku: { src: "/hero/buku-bg.jpg", posisi: "60% 40%", negatif: false, terang: false },
  pena: { src: "/hero/pena-bg.jpg", posisi: "55% 50%", negatif: false, terang: true },
} as const;
export type FotoLatar = keyof typeof FOTO_LATAR;

export default function HeroBackdrop({ ringkas = false, foto = "patung" }: { ringkas?: boolean; foto?: FotoLatar }) {
  const f = FOTO_LATAR[foto];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Foto duotone: grayscale -> dikali oranye (sorotan) -> disaring maroon (bayangan) */}
      <div
        className={`absolute inset-y-0 right-0 isolate w-full opacity-45 md:opacity-100 ${ringkas ? "md:w-[55%]" : "md:w-[68%]"}`}
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 38%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 38%)",
        }}
      >
        <Image
          src={f.src}
          alt=""
          fill
          preload
          sizes={ringkas ? "(min-width: 768px) 55vw, 100vw" : "(min-width: 768px) 68vw, 100vw"}
          className="object-cover"
          style={{
            objectPosition: ringkas ? f.posisi : "62% center",
            filter: f.negatif
              ? "grayscale(1) invert(1) contrast(1.5) brightness(1.05)"
              : f.terang
                ? "grayscale(1) contrast(1.7) brightness(0.62)"
                : "grayscale(1) contrast(1.6) brightness(0.95)",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#FFB347] via-[#E0601A] to-[#7A1A05] mix-blend-multiply" />
        <div className="absolute inset-0 bg-[#4A0000] mix-blend-screen" />
      </div>

      {/* Cahaya kemerahan lembut di belakang teks */}
      <div
        className="absolute inset-0"
        style={{
          background: ringkas
            ? "radial-gradient(34rem 16rem at 14% 60%, rgb(170 40 0 / 0.4), transparent 70%)"
            : "radial-gradient(40rem 30rem at 18% 72%, rgb(170 40 0 / 0.45), transparent 70%)",
        }}
      />

      {/* Tekstur titik halus di sisi kanan */}
      <div
        className="absolute inset-y-0 right-0 hidden w-1/2 md:block"
        style={{
          backgroundImage: "radial-gradient(rgb(0 0 0 / 0.35) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
          maskImage: "linear-gradient(to left, black, transparent)",
          WebkitMaskImage: "linear-gradient(to left, black, transparent)",
        }}
      />

      {/* Garis poligon emas: hanya di pembuka beranda, tidak di banner halaman (ringkas) */}
      {!ringkas && (
        <svg
          viewBox="0 0 720 760"
          preserveAspectRatio="xMaxYMid meet"
          className="absolute inset-y-0 right-0 hidden h-full w-1/2 md:block"
          fill="none"
        >
          <polygon points={TITIK.map((t) => t.join(",")).join(" ")} stroke="#E8B23A" strokeOpacity="0.55" strokeWidth="1.2" />
          {GARIS_DALAM.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#E8B23A" strokeOpacity="0.45" strokeWidth="1.2" />
          ))}
          {TITIK.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#E8B23A" fillOpacity="0.9" />
          ))}
        </svg>
      )}
    </div>
  );
}
