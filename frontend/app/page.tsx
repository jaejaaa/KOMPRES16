import Link from "next/link";

const MENU = [
  { href: "/upload", title: "Cek dokumen tanah", desc: "Unggah perjanjian atau AJB, lihat pasal mana yang berisiko." },
  { href: "/chat", title: "Tanya hukum tanah", desc: "Tanya apa saja soal jual beli, sertifikat, atau warisan tanah." },
  { href: "/panduan", title: "Panduan prosedur", desc: "Langkah balik nama sertifikat dan cek keaslian sertifikat." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
        Mau beli tanah? Cek dulu dokumennya sebelum tanda tangan.
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Asisten yang membaca dokumen tanah dan menjelaskannya dengan bahasa sehari-hari, lengkap dengan dasar hukumnya.
      </p>

      <nav className="mt-8 grid gap-3 md:grid-cols-3">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <h2 className="font-semibold text-slate-900">{m.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{m.desc}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
