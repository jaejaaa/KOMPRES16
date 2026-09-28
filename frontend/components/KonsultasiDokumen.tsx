"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAkun } from "@/lib/akun";
import Icon from "./Icon";
import LoginDialog from "./LoginDialog";
import { btn, Notice } from "./ui";

// Tombol "Konsultasikan dokumen ini". Tamu harus masuk dulu (backend menolak chat dokumen dari akun tamu).
export default function KonsultasiDokumen({ documentId }: { documentId: string }) {
  const router = useRouter();
  const akun = useAkun();
  const [login, setLogin] = useState(false);
  const [tamuHilang, setTamuHilang] = useState(false);
  const href = `/chat?doc=${encodeURIComponent(documentId)}`;

  if (tamuHilang)
    return (
      <Notice tone="warning" title="Dokumen perlu diunggah ulang">
        Anda masuk ke akun yang sudah pernah dibuat sebelumnya, sehingga dokumen yang diperiksa sebagai tamu tidak ikut
        tersimpan.{" "}
        <Link href="/upload" className="font-semibold underline underline-offset-2">Unggah ulang dokumen</Link>
      </Notice>
    );

  if (akun.masuk)
    return (
      <Link href={href} className={`${btn.primary} w-full px-4 text-sm`}>
        <Icon name="chat" className="size-4" /> Konsultasikan dokumen ini
      </Link>
    );

  return (
    <>
      <button type="button" onClick={() => setLogin(true)} disabled={!akun.siap} className={`${btn.primary} w-full px-4 text-sm`}>
        <Icon name="chat" className="size-4" /> Konsultasikan dokumen ini
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
        <Icon name="lock" className="size-3.5" /> Perlu masuk atau daftar akun
      </p>
      <LoginDialog
        open={login}
        onClose={() => setLogin(false)}
        judul="Masuk untuk bertanya soal dokumen ini"
        pesan="Tanya jawab tentang isi dokumen hanya tersedia untuk pengguna yang masuk. Hasil pemeriksaan Anda tetap tersimpan setelah masuk."
        onBerhasil={(h) => (h.dokumenTamuHilang ? setTamuHilang(true) : router.push(href))}
      />
    </>
  );
}
