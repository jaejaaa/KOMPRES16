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
  chevron: "m6 9 6 6 6-6",
  shield: "M12 3 20 6v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  mail: "M3 6h18v12H3zM3 7l9 6.5L21 7",
  plus: "M12 5v14M5 12h14",
  x: "M7 7l10 10M17 7 7 17",
  filter: "M4 5h16l-6 8v5l-4 2v-7z",
  pin: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  wallet: "M4 7h15a1 1 0 0 1 1 1v11H4zM4 7l12-3v3M16 13.5h.01",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3.1-.4 4.4-1",
  building: "M4 21V5l8-3 8 3v16M4 21h16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
