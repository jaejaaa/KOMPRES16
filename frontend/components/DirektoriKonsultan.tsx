"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cariKonsultan, getKategoriKasus } from "@/lib/api";
import { PROVINSI } from "@/lib/provinsi";
import type { HasilKonsultan, KategoriKasus, Konsultan, Profesi } from "@/types/api";
import Icon from "./Icon";
import { btn, container, Notice, Panel } from "./ui";

const PROFESI: Record<Profesi, string> = { notaris_ppat: "Notaris/PPAT", advokat: "Advokat" };

function KartuKonsultan({ k, namaKategori }: { k: Konsultan; namaKategori: (id: string) => string }) {
  const inisial = k.nama.replace(/^(Dr\.|H\.|Hj\.)\s*/i, "").charAt(0).toUpperCase();
  return (
    <article className="lift flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary" aria-hidden>
          {inisial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-ink">{k.nama}</h3>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-ink">Contoh</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <Icon name="building" className="size-4 shrink-0" /> <span className="truncate">{k.kantor}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
            <Icon name="pin" className="size-4 shrink-0" /> {k.kota}, {k.provinsi}
          </p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Menangani">
        {k.kategori_kasus.map((id) => (
          <li key={id} className="rounded-full bg-bg px-2.5 py-1 text-xs text-ink">{namaKategori(id)}</li>
        ))}
      </ul>
      <p className="mt-auto pt-4 text-xs italic text-ink-soft">Kontak: {k.kontak}</p>
    </article>
  );
}

function Bagian({ profesi, daftar, provinsi, namaKategori }: { profesi: Profesi; daftar: Konsultan[]; provinsi: string; namaKategori: (id: string) => string }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
        {PROFESI[profesi]} <span className="rounded-full bg-bg px-2 text-sm font-semibold text-ink-soft">{daftar.length}</span>
      </h3>
      {daftar.length ? (
        <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {daftar.map((k, i) => (
            <li key={k.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <KartuKonsultan k={k} namaKategori={namaKategori} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong p-5 text-sm text-ink-soft">
          Belum ada contoh {PROFESI[profesi]} {provinsi ? `di ${provinsi}` : ""} untuk kebutuhan ini.
          {provinsi && " Coba pilih “Semua provinsi”."}
        </p>
      )}
    </section>
  );
}

export default function DirektoriKonsultan({ kategoriAwal }: { kategoriAwal?: string }) {
  const [daftarKategori, setDaftarKategori] = useState<KategoriKasus[] | null>(null);
  const [kategori, setKategori] = useState(kategoriAwal ?? "");
  const [provinsi, setProvinsi] = useState("");
  const [ulang, setUlang] = useState(0);
  const [hasil, setHasil] = useState<{ kunci: string; data?: HasilKonsultan; error?: string } | null>(null);
  const kunci = `${kategori}|${provinsi}|${ulang}`;
  const memuat = !!kategori && hasil?.kunci !== kunci;

  useEffect(() => {
    let aktif = true;
    getKategoriKasus()
      .then((list) => {
        if (!aktif) return;
        setDaftarKategori(list);
        // kategoriAwal cuma dipakai kalau valid (ada di daftar); selain itu jatuh ke kategori pertama
        setKategori((k) => k || (kategoriAwal && list.some((x) => x.id === kategoriAwal) ? kategoriAwal : list[0]?.id) || "");
      })
      .catch(() => aktif && setDaftarKategori([]));
    return () => { aktif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kategoriAwal cuma dipakai sekali saat mount
  }, []);

  useEffect(() => {
    if (!kategori) return;
    let aktif = true;
    cariKonsultan(kategori, provinsi || undefined)
      .then((data) => aktif && setHasil({ kunci, data }))
      .catch((e) => aktif && setHasil({ kunci, error: (e as Error).message }));
    return () => { aktif = false; };
  }, [kategori, provinsi, kunci]);

  const kat = daftarKategori?.find((k) => k.id === kategori);
  const namaKategori = (id: string) => daftarKategori?.find((k) => k.id === id)?.nama.split(" (")[0] ?? id;

  return (
    <div className={`${container} grid grid-cols-1 items-start gap-6 pt-8 lg:grid-cols-[320px_1fr]`}>
      <aside className="space-y-4 lg:sticky lg:top-28">
        <Panel title="Kebutuhan Anda" icon="list">
          {/* HP: pilihan ringkas */}
          <label className="block lg:hidden">
            <span className="sr-only">Kebutuhan</span>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 text-ink"
            >
              {daftarKategori?.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </label>

          {/* Laptop: daftar pilihan */}
          <div role="radiogroup" aria-label="Kebutuhan" className="hidden space-y-2 lg:block">
            {!daftarKategori && [1, 2, 3, 4].map((n) => <div key={n} className="h-14 animate-pulse rounded-2xl bg-bg" />)}
            {daftarKategori?.map((k) => {
              const pilih = k.id === kategori;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={pilih}
                  onClick={() => setKategori(k.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${pilih ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40 hover:bg-bg"
                    }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${pilih ? "border-primary bg-primary text-white" : "border-line-strong"
                      }`}
                  >
                    {pilih && <Icon name="check" className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm leading-snug ${pilih ? "font-semibold text-ink" : "text-ink"}`}>{k.nama}</span>
                    <span className="mt-1 block text-xs text-ink-soft">{k.profesi.map((p) => PROFESI[p]).join(" · ")}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Lokasi" icon="pin">
          <label className="block">
            <span className="sr-only">Provinsi</span>
            <select
              value={provinsi}
              onChange={(e) => setProvinsi(e.target.value)}
              className="w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 text-ink"
            >
              <option value="">Semua provinsi</option>
              {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </Panel>
      </aside>

      <div className="min-w-0 space-y-6">
        <Notice tone="warning" title="Data contoh (demo)">
          Nama, kantor, dan kontak di halaman ini fiktif untuk keperluan demo, bukan daftar Notaris/PPAT atau advokat
          sungguhan. Jangan dipakai untuk menghubungi siapa pun.
        </Notice>

        {kat && (
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">{kat.nama}</h2>
            {kat.catatan && <p className="mt-2 leading-relaxed text-ink-soft">{kat.catatan}</p>}
          </div>
        )}

        {hasil?.error && hasil.kunci === kunci ? (
          <Notice tone="danger" title="Gagal memuat">
            {hasil.error}{" "}
            <button type="button" onClick={() => setUlang((n) => n + 1)} className="font-semibold underline underline-offset-2">Coba lagi</button>
          </Notice>
        ) : memuat || !hasil?.data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden>
            {[1, 2, 3, 4].map((n) => <div key={n} className="h-44 animate-pulse rounded-3xl bg-surface shadow-soft" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {kat?.profesi.includes("notaris_ppat") && (
              <Bagian profesi="notaris_ppat" daftar={hasil.data.notaris_ppat} provinsi={provinsi} namaKategori={namaKategori} />
            )}
            {kat?.profesi.includes("advokat") && (
              <Bagian profesi="advokat" daftar={hasil.data.advokat} provinsi={provinsi} namaKategori={namaKategori} />
            )}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-line border-l-4 border-l-accent bg-surface p-6 shadow-soft md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-bold text-ink">Belum yakin butuh siapa?</h2>
            <p className="mt-1 text-sm text-ink-soft">Ceritakan masalah Anda ke JagaTanah AI, jawabannya disertai dasar hukum.</p>
          </div>
          <Link href="/chat" className={`${btn.primary} shrink-0 whitespace-nowrap`}>
            <Icon name="chat" className="size-4" /> Tanya JagaTanah AI
          </Link>
        </div>
      </div>
    </div>
  );
}
