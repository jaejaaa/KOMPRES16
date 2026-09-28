import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PanduanIsi from "@/components/PanduanIsi";
import { PageHeader } from "@/components/ui";
import { PANDUAN, getPanduan } from "@/lib/panduan";
import { APP_NAME } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => PANDUAN.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/panduan/[slug]">): Promise<Metadata> {
  const p = getPanduan((await params).slug);
  return { title: p ? `${p.judul} — ${APP_NAME}` : APP_NAME };
}

export default async function PanduanDetail({ params }: PageProps<"/panduan/[slug]">) {
  const p = getPanduan((await params).slug);
  if (!p) notFound();

  return (
    <main>
      <PageHeader
        foto="buku"
        icon="book"
        crumbs={[{ href: "/", label: "Beranda" }, { href: "/panduan", label: "Panduan" }, { label: p.judul }]}
        title={p.judul}
        desc={p.judulLengkap}
      />
      <PanduanIsi p={p} />
    </main>
  );
}
