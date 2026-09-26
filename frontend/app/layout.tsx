import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: "Asisten yang membaca dokumen tanah dan menjelaskannya dengan bahasa sehari-hari, lengkap dengan dasar hukumnya.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${serif.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
