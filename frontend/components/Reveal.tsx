"use client";
import { useEffect, useRef, type ReactNode } from "react";

// Isi muncul pelan (naik + fade) saat di-scroll ke layar.
// Default-nya terlihat: hanya elemen yang masih di bawah layar saat halaman siap yang disembunyikan dulu,
// jadi di HP lambat (atau tanpa JavaScript) konten tidak pernah kosong.
export default function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.shown = "false";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.shown = "true";
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
