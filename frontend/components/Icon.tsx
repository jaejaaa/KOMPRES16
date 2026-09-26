// Ikon garis sederhana (24x24, ikut warna teks). Tambah path baru di sini kalau butuh ikon lain.
const PATHS = {
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  upload: "M12 16V4m0 0L7 9m5-5 5 5M5 20h14",
  chat: "M4 5h16v11H9l-5 4z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M9 7h6",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  check: "M5 12.5 10 17l9-10",
  question: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5 5-5-5 5-5",
  send: "M4 12 20 4l-6 16-3-7z",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  scale: "M12 4v16M8 20h8M5 8h14M5 8l-2.5 6a2.5 2.5 0 0 0 5 0zm14 0-2.5 6a2.5 2.5 0 0 0 5 0z",
  info: "M12 11v6M12 7h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
