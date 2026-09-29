"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSaranKonsultasi } from "@/lib/api";
import type { SaranKonsultasi as SaranKonsultasiItem } from "@/types/api";
import Icon from "./Icon";
import { Panel } from "./ui";

// Rekomendasi konsultan (dummy) berdasarkan kategori risiko "high" yang ditemukan analyze().
// Sengaja tidak render apa pun kalau belum ada risiko high yang cocok, daripada tampil kosong/aneh.
export default function SaranKonsultasi({ documentId }: { documentId: string }) {
  const [saran, setSaran] = useState<SaranKonsultasiItem[] | null>(null);

  useEffect(() => {
    let aktif = true;
    getSaranKonsultasi(documentId)
      .then((s) => aktif && setSaran(s))
      .catch(() => aktif && setSaran([])); // pelengkap; kegagalan tidak boleh mengganggu hasil analisis
    return () => { aktif = false; };
  }, [documentId]);

  if (!saran?.length) return null;

  return (
    <Panel title="Rekomendasi konsultasi" icon="scale">
      <p className="text-sm leading-relaxed text-ink-soft">
        Ditemukan risiko tinggi yang biasanya perlu pendapat profesional.
      </p>
      <ul className="mt-3 space-y-3">
        {saran.map((s) => {
          const contoh = [...s.notaris_ppat, ...s.advokat][0];
          return (
            <li key={s.kategori_kasus} className="rounded-2xl border border-line p-3.5">
              <p className="text-sm font-semibold text-ink">{s.kategori}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                {contoh ? (
                  <>
                    <Icon name="building" className="size-4 shrink-0" /> {contoh.nama} · {contoh.kota}
                  </>
                ) : (
                  "Belum ada contoh untuk kategori ini."
                )}
              </p>
              <Link
                href={`/konsultasi?kategori=${encodeURIComponent(s.kategori_kasus)}`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Lihat direktori <Icon name="arrow" className="size-4" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
