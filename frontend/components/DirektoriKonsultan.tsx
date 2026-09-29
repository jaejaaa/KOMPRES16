"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cariKonsultan, getKategoriKasus, getLokasi } from "@/lib/api";
import { PROVINSI } from "@/lib/provinsi";
import type { HasilKonsultan, KategoriKasus, Konsultan, Profesi } from "@/types/api";
import DetailKonsultan from "./DetailKonsultan";
import Icon from "./Icon";
import { btn, container, Notice, Panel } from "./ui";

const PROFESI: Record<Profesi, string> = { notaris_ppat: "Notaris/PPAT", advokat: "Advokat" };

type Pilih = (k: Konsultan, profesi: Profesi) => void;

// Seluruh kartu bisa diklik untuk membuka popup detail
function KartuKonsultan({ k, namaKategori, onPilih }: { k: Konsultan; namaKategori: (id: string) => string; onPilih: () => void }) {
  const inisial = k.nama.replace(/^(Dr\.|H\.|Hj\.)\s*/i, "").charAt(0).toUpperCase();
  return (
    <button
      type="button"
      onClick={onPilih}
      aria-haspopup="dialog"
      className="lift group flex h-full w-full flex-col rounded-3xl border border-line bg-surface p-5 text-left shadow-soft hover:border-primary/40"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary" aria-hidden>
          {inisial}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">{k.nama}</h3>
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
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary">
        Lihat detail <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}

const PER_PAGE = 8;

// Deret nomor halaman, dipendekkan dgn "…" kalau totalnya banyak (mis. 1 2 3 … 12 saat di halaman 1-3)
function deretHalaman(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, page - 1, page, page + 1]);
  const nomor = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const hasil: (number | "…")[] = [];
  nomor.forEach((n, i) => {
    if (i > 0 && n - (nomor[i - 1] as number) > 1) hasil.push("…");
    hasil.push(n);
  });
  return hasil;
}

function Paginasi({ page, total, onPilihHalaman }: { page: number; total: number; onPilihHalaman: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <nav aria-label="Halaman" className="mt-4 flex items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPilihHalaman(page - 1)}
        aria-label="Halaman sebelumnya"
        className="flex size-9 items-center justify-center rounded-full border border-line-strong text-ink-soft hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="back" className="size-4" />
      </button>
      {deretHalaman(page, total).map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-sm text-ink-soft">…</span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onPilihHalaman(n)}
            aria-current={n === page ? "page" : undefined}
            className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${n === page ? "bg-primary text-white" : "text-ink hover:bg-bg"
              }`}
          >
            {n}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= total}
        onClick={() => onPilihHalaman(page + 1)}
        aria-label="Halaman berikutnya"
        className="flex size-9 items-center justify-center rounded-full border border-line-strong text-ink-soft hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="arrow" className="size-4" />
      </button>
    </nav>
  );
}

function Bagian({
  profesi,
  daftar,
  provinsi,
  kota,
  namaKategori,
  onPilih,
  resetKey,
}: {
  profesi: Profesi;
  daftar: Konsultan[];
  provinsi: string;
  kota: string;
  namaKategori: (id: string) => string;
  onPilih: Pilih;
  resetKey: string;
}) {
  // Halaman disimpan bersama kunci filter: begitu filter berubah, halaman otomatis kembali ke 1 (tanpa useEffect)
  const [posisi, setPosisi] = useState({ kunci: resetKey, page: 1 });
  const page = posisi.kunci === resetKey ? posisi.page : 1;
  const setPage = (p: number) => setPosisi({ kunci: resetKey, page: p });
  const totalPages = Math.max(1, Math.ceil(daftar.length / PER_PAGE));
  const halaman = daftar.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const lokasi = kota ? `${kota}, ${provinsi}` : provinsi;
  return (
    <section>
      <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
        {PROFESI[profesi]} <span className="rounded-full bg-bg px-2 text-sm font-semibold text-ink-soft">{daftar.length}</span>
      </h3>
      {daftar.length ? (
        <>
          <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {halaman.map((k, i) => (
              <li key={k.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <KartuKonsultan k={k} namaKategori={namaKategori} onPilih={() => onPilih(k, profesi)} />
              </li>
            ))}
          </ul>
          <Paginasi page={page} total={totalPages} onPilihHalaman={setPage} />
        </>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong p-5 text-sm text-ink-soft">
          Belum ada {PROFESI[profesi]} {lokasi ? `di ${lokasi}` : ""} untuk kebutuhan ini.
          {kota ? " Coba pilih “Semua kota/kabupaten”." : provinsi && " Coba pilih “Semua provinsi”."}
        </p>
      )}
    </section>
  );
}

export default function DirektoriKonsultan({ kategoriAwal }: { kategoriAwal?: string }) {
  const [daftarKategori, setDaftarKategori] = useState<KategoriKasus[] | null>(null);
  const [kategori, setKategori] = useState(kategoriAwal ?? "");
  const [provinsi, setProvinsi] = useState("");
  const [kota, setKota] = useState("");
  const [lokasi, setLokasi] = useState<Record<string, string[]>>({});
  const [ulang, setUlang] = useState(0);
  const [hasil, setHasil] = useState<{ kunci: string; data?: HasilKonsultan; error?: string } | null>(null);
  const [dipilih, setDipilih] = useState<{ k: Konsultan; profesi: Profesi } | null>(null);
  const pilih: Pilih = (k, profesi) => setDipilih({ k, profesi });
  const kunci = `${kategori}|${provinsi}|${kota}|${ulang}`;
  const memuat = !!kategori && hasil?.kunci !== kunci;
  const kotaTersedia = provinsi ? lokasi[provinsi] ?? [] : [];

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
    getLokasi()
      .then((data) => aktif && setLokasi(data))
      .catch(() => {});
    return () => { aktif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kategoriAwal cuma dipakai sekali saat mount
  }, []);

  useEffect(() => {
    if (!kategori) return;
    let aktif = true;
    cariKonsultan(kategori, provinsi || undefined, kota || undefined)
      .then((data) => aktif && setHasil({ kunci, data }))
      .catch((e) => aktif && setHasil({ kunci, error: (e as Error).message }));
    return () => { aktif = false; };
  }, [kategori, provinsi, kota, kunci]);

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
              className="fokus-marun w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 text-ink transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/15"
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
          <div className="space-y-2">
            <label className="block">
              <span className="sr-only">Provinsi</span>
              <select
                value={provinsi}
                onChange={(e) => { setProvinsi(e.target.value); setKota(""); }}
                className="fokus-marun w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 text-ink transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/15"
              >
                <option value="">Semua provinsi</option>
                {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            {provinsi && kotaTersedia.length > 0 && (
              <label className="block">
                <span className="sr-only">Kota/Kabupaten</span>
                <select
                  value={kota}
                  onChange={(e) => setKota(e.target.value)}
                  className="fokus-marun w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 text-ink transition-all focus:border-secondary focus:ring-4 focus:ring-secondary/15"
                >
                  <option value="">Semua kota/kabupaten di {provinsi}</option>
                  {kotaTersedia.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
            )}
          </div>
        </Panel>
      </aside>

      <div className="min-w-0 space-y-6">

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
              <Bagian profesi="notaris_ppat" daftar={hasil.data.notaris_ppat} provinsi={provinsi} kota={kota} namaKategori={namaKategori} onPilih={pilih} resetKey={kunci} />
            )}
            {kat?.profesi.includes("advokat") && (
              <Bagian profesi="advokat" daftar={hasil.data.advokat} provinsi={provinsi} kota={kota} namaKategori={namaKategori} onPilih={pilih} resetKey={kunci} />
            )}
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-line border-l-4 border-l-[#E8A5A5] bg-surface p-6 shadow-soft md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-bold text-ink">Belum yakin butuh siapa?</h2>
            <p className="mt-1 text-sm text-ink-soft">Ceritakan masalah Anda ke JagaTanah AI, jawabannya disertai dasar hukum.</p>
          </div>
          <Link href="/chat" className={`${btn.primary} shrink-0 whitespace-nowrap`}>
            <Icon name="chat" className="size-4" /> Tanya JagaTanah AI
          </Link>
        </div>
      </div>

      <DetailKonsultan
        konsultan={dipilih?.k ?? null}
        profesi={dipilih ? PROFESI[dipilih.profesi] : ""}
        namaKategori={namaKategori}
        onClose={() => setDipilih(null)}
      />
    </div>
  );
}
