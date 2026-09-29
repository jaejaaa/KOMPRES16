import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";

// Public Sans: font yang dirancang untuk situs layanan publik, jelas dibaca di layar
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Pahami isi perjanjian jual beli dan dokumen tanah sebelum tanda tangan. Pasal yang rancu atau perlu dicek ulang ditandai dengan bahasa sederhana, lengkap dengan dasar hukumnya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={publicSans.variable}>
      {/* overflow-x-clip: pengaman agar elemen dekoratif tidak membuat halaman bisa digeser ke samping di HP */}
      <body className="flex min-h-screen flex-col overflow-x-clip antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
