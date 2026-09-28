// Salinan dari data_engineer/data/panduan/ (Turbopack tidak bisa import file di luar folder frontend).
// Kalau Data Engineer mengubah panduan, salin ulang file JSON-nya ke frontend/data/panduan/.
import balikNama from "@/data/panduan/balik-nama.json";
import cekKeaslian from "@/data/panduan/cek-keaslian.json";
import tanahGarapan from "@/data/panduan/tanah-garapan.json";

interface RawPanduan {
  doc: string;
  doc_title: string;
  chunks: { judul: string; text: string }[];
}

export interface Bagian {
  judul: string;
  teks: string;
  nomor: number | null; // "Langkah 2 - ..." / "Cara 1 - ..." -> 2 / 1
  praktikUmum: boolean; // butir dari informasi publik sekunder, perlu diverifikasi
}

export interface Panduan {
  slug: string;
  judul: string;
  judulLengkap: string;
  ringkas: string;
  bagian: Bagian[];
}

function olah(slug: string, raw: RawPanduan, ringkas: string): Panduan {
  return {
    slug,
    judul: raw.doc.replace(/^Panduan:\s*/, ""),
    judulLengkap: raw.doc_title,
    ringkas,
    bagian: raw.chunks.map((c) => {
      const m = c.judul.match(/^(?:Langkah|Cara)\s+(\d+)\s*-\s*(.+)$/);
      return {
        judul: m ? m[2] : c.judul,
        teks: c.text,
        nomor: m ? Number(m[1]) : null,
        praktikUmum: /praktik umum/i.test(c.judul) || /^praktik umum/i.test(c.text),
      };
    }),
  };
}

export const PANDUAN: Panduan[] = [
  olah("cek-keaslian", cekKeaslian, "Pastikan sertifikat asli dan cocok dengan data Kantor Pertanahan sebelum membayar apa pun."),
  olah("balik-nama", balikNama, "Alur lengkap dari cek sertifikat, pembayaran pajak, AJB di PPAT, sampai sertifikat atas nama Anda."),
  olah("tanah-garapan", tanahGarapan, "Tanah garapan/girik yang belum bersertifikat masih bisa didaftarkan jadi SHM — begini caranya, dan yang perlu dicek dulu kalau mau membelinya."),
];

export const getPanduan = (slug: string) => PANDUAN.find((p) => p.slug === slug);

// Jumlah rujukan "(... Pasal ...)" di seluruh panduan, untuk info di daftar panduan
export const jumlahRujukan = (p: Panduan) =>
  p.bagian.reduce((n, b) => n + (b.teks.match(/\([^()]*Pasal[^()]*\)/g)?.length ?? 0), 0);
