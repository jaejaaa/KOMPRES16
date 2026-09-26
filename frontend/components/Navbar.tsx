"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/site";
import LogoMark from "./LogoMark";

const LINKS = [
  { href: "/upload", label: "Cek dokumen" },
  { href: "/chat", label: "Tanya hukum" },
  { href: "/panduan", label: "Panduan" },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <header className="glass sticky top-0 z-40">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <LogoMark />
          <span>{APP_NAME}</span>
        </Link>

        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <li key={l.href} className={l.href === "/upload" ? "" : "hidden sm:block"}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block border-b-2 px-3 py-2 transition-colors ${
                    active
                      ? "border-brass font-semibold text-brand"
                      : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
