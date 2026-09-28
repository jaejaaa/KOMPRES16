import type { Metadata } from "next";
import DirektoriKonsultan from "@/components/DirektoriKonsultan";
import { PageHeader } from "@/components/ui";
import { APP_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Konsultasi Hukum — ${APP_NAME}` };

// /konsultasi?kategori=<id>  -> dari rekomendasi di halaman hasil analisis, kategori sudah terpilih
export default async function KonsultasiPage({ searchParams }: PageProps<"/konsultasi">) {
  const { kategori } = await searchParams;
  const kategoriAwal = typeof kategori === "string" && kategori ? kategori : undefined;
  return (
    <main>
      <PageHeader
        foto="pena"
        icon="scale"
        crumbs={[{ href: "/", label: "Beranda" }, { label: "Konsultasi Hukum" }]}
        title="Konsultasi Hukum"
        desc="Temukan Notaris/PPAT atau advokat yang sesuai dengan urusan tanah Anda."
      />
      <DirektoriKonsultan kategoriAwal={kategoriAwal} />
    </main>
  );
}
