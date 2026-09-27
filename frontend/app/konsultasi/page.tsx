import type { Metadata } from "next";
import DirektoriKonsultan from "@/components/DirektoriKonsultan";
import { PageHeader } from "@/components/ui";
import { APP_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Konsultasi Hukum — ${APP_NAME}` };

export default function KonsultasiPage() {
  return (
    <main>
      <PageHeader
        icon="scale"
        crumbs={[{ href: "/", label: "Beranda" }, { label: "Konsultasi Hukum" }]}
        title="Konsultasi Hukum"
        desc="Temukan Notaris/PPAT atau advokat yang sesuai dengan urusan tanah Anda."
      />
      <DirektoriKonsultan />
    </main>
  );
}
