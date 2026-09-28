"use client";
import { useEffect, useRef, type ReactNode } from "react";

// Isi muncul pelan saat di-scroll ke layar.
// dari: "bawah" (naik + fade, default), "kiri"/"kanan" (meluncur dari samping), "garis" (tergambar dari atas ke bawah).
// ulang: animasi diputar lagi setiap kali elemen masuk layar (mis. saat user scroll balik ke atas).
// Default-nya terlihat: hanya elemen yang masih di bawah layar saat halaman siap yang disembunyikan dulu,
// jadi di HP lambat (atau tanpa JavaScript) konten tidak pernah kosong.
export default function Reveal({
  children,
  delay = 0,
  className = "",
  dari = "bawah",
  batas = "-40px",
  ulang = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  dari?: "bawah" | "kiri" | "kanan" | "garis";
  batas?: string; // seberapa jauh elemen harus masuk layar sebelum muncul (rootMargin bawah)
  ulang?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const diBawahLayar = el.getBoundingClientRect().top >= window.innerHeight;
    // Tanpa "ulang", elemen yang sudah terlihat saat halaman dibuka tidak perlu dipantau sama sekali
    if (!diBawahLayar && !ulang) return;
    if (diBawahLayar) el.dataset.shown = "false";

    const muncul = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.shown = "true";
        if (!ulang) muncul.disconnect();
      },
      { threshold: 0.12, rootMargin: `0px 0px ${batas} 0px` },
    );
    muncul.observe(el);

    // Sembunyikan lagi hanya setelah elemen BENAR-BENAR keluar layar, supaya user tidak melihatnya menghilang
    const keluar = ulang
      ? new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) el.dataset.shown = "false";
        })
      : null;
    keluar?.observe(el);

    return () => {
      muncul.disconnect();
      keluar?.disconnect();
    };
  }, [batas, ulang]);

  return (
    <div ref={ref} data-dari={dari} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {/* "garis": efek terpotong dipasang di lapisan dalam; kalau di elemen yang dipantau,
          IntersectionObserver menganggapnya tak terlihat sehingga tidak pernah muncul */}
      {dari === "garis" ? <div className="reveal-garis absolute inset-0">{children}</div> : children}
    </div>
  );
}
