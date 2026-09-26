"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/site";
import LogoMark from "./LogoMark";
import Icon from "./Icon";

const LINKS = [
  { href: "/upload", label: "Cek dokumen" },
  { href: "/chat", label: "Tanya hukum" },
  { href: "/panduan", label: "Panduan" },
];

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Halaman hasil analisis masih bagian dari alur "Cek dokumen"
  const isActive = (href: string) => path.startsWith(href) || (href === "/upload" && path.startsWith("/analisis"));

  return (
    <header className="glass sticky top-0 z-40">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <LogoMark />
          <span>{APP_NAME}</span>
        </Link>

        <ul className="hidden items-center gap-1 text-sm sm:flex">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block border-b-2 px-3 py-2 transition-colors ${
                    active ? "border-brass font-semibold text-brand" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="menu-hp"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          className="-mr-2 rounded-lg p-2 text-ink sm:hidden"
        >
          <Icon name={open ? "close" : "menu"} className="size-6" />
        </button>
      </nav>

      {open && (
        <ul id="menu-hp" className="border-t border-line/70 px-4 pb-3 pt-1 sm:hidden">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`block border-l-2 px-3 py-3 ${
                    active ? "border-brass font-semibold text-brand" : "border-transparent text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
