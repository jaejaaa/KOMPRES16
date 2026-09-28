import { ViewTransition } from "react";

// Animasi perpindahan halaman: isi halaman lama memudar, isi baru muncul memudar sambil naik tipis
// (kelas CSS "halaman-masuk"/"halaman-keluar" di globals.css). Template dipasang ulang setiap pindah halaman,
// jadi enter/exit selalu terpicu. Banner punya ViewTransition bernama sendiri di PageHeader supaya tetap di tempat.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="halaman-masuk" exit="halaman-keluar" default="none">
      {children}
    </ViewTransition>
  );
}
