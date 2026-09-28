"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, getChatHistory, sendChat } from "@/lib/api";
import { useAkun } from "@/lib/akun";
import { PANDUAN } from "@/lib/panduan";
import type { ChatResponse, ChatSource } from "@/types/api";
import Icon from "./Icon";
import LoginDialog from "./LoginDialog";
import LogoMark from "./LogoMark";
import TamuBanner from "./TamuBanner";
import { btn, container, Notice, PageHeader, Panel } from "./ui";

type Pesan =
  | { id: number; peran: "user"; teks: string; dokumen: boolean }
  | { id: number; peran: "asisten"; data: ChatResponse }
  | { id: number; peran: "gagal"; pertanyaan: string; pesan: string };

const SARAN_UMUM = [
  "Apakah jual beli tanah tanpa PPAT sah?",
  "Siapa yang membayar BPHTB saat jual beli tanah?",
  "Apa bedanya sertifikat SHM dan HGB?",
  "Bagaimana cara balik nama sertifikat?",
];
const SARAN_DOKUMEN = [
  "Pasal mana yang paling berbahaya di dokumen saya?",
  "Apa maksud Pasal 6 di perjanjian saya?",
  "Apa yang harus saya minta ke penjual sebelum tanda tangan?",
];
const DISCLAIMER = "Jawaban ini bersifat informatif, bukan pengganti nasihat hukum resmi.";
const MAX_CHARS = 2000; // sama dengan batas backend (ChatIn.pertanyaan)  

function Sumber({ s, nomor }: { s: ChatSource; nomor: number }) {
  const panduan = s.asal === "panduan" ? PANDUAN.find((p) => s.uu.includes(p.judul)) : undefined;
  const judul = s.asal === "dokumen" ? "Dokumen Anda" : s.uu;
  const catatan = s.status && s.status !== "berlaku" && s.status !== "panduan" ? s.status : null;

  return (
    <li>
      <details className="group overflow-hidden rounded-2xl bg-bg transition-colors open:bg-primary-soft/60">
        <summary className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-primary-soft">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{nomor}</span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-ink">{judul}</span>
            <span className="text-ink-soft"> · {s.pasal}</span>
            {(catatan || s.halaman) && (
              <span className="block text-xs text-ink-soft">{[catatan, s.halaman && `hlm. ${s.halaman}`].filter(Boolean).join(" · ")}</span>
            )}
          </span>
          <Icon name="chevron" className="chevron mt-0.5 size-4 shrink-0 text-primary transition-transform duration-300" />
        </summary>
        <div className="px-3.5 pb-3.5">
          <blockquote className="whitespace-pre-line rounded-xl bg-surface p-3.5 text-sm leading-relaxed text-ink">{s.kutipan}</blockquote>
          {panduan && (
            <Link href={`/panduan/${panduan.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Buka panduan lengkap <Icon name="arrow" className="size-4" />
            </Link>
          )}
        </div>
      </details>
    </li>
  );
}

function Asisten({ children }: { children: React.ReactNode }) {
  return (
    <div className="fade-up flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft" aria-hidden>
        <LogoMark size={24} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Jawaban({ data }: { data: ChatResponse }) {
  return (
    <div className="rounded-3xl rounded-tl-md border border-line bg-surface p-5 shadow-soft">
      <p className="whitespace-pre-line leading-relaxed text-ink">{data.jawaban}</p>
      {/* AI tidak bisa menjawab: arahkan ke Notaris/PPAT atau advokat di halaman Konsultasi Hukum */}
      {data.di_luar_cakupan && (
        <Link
          href="/konsultasi"
          className="group mt-4 flex items-center gap-3 rounded-2xl bg-bg px-4 py-3 text-sm transition-colors hover:bg-primary-soft"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-soft">
            <Icon name="scale" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink group-hover:text-primary group-hover:underline group-hover:underline-offset-2">
              Cari Notaris/PPAT atau advokat
            </span>
            <span className="block text-xs text-ink-soft">Buka halaman Konsultasi Hukum</span>
          </span>
          <Icon name="arrow" className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
        </Link>
      )}
      {data.sumber.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <Icon name="scale" className="size-4" /> Dasar hukum
          </p>
          <ol className="mt-2 space-y-2">
            {data.sumber.map((s, i) => <Sumber key={`${s.id}-${i}`} s={s} nomor={i + 1} />)}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function ChatRoom({ documentId }: { documentId?: string }) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [disclaimer, setDisclaimer] = useState(DISCLAIMER);
  const akun = useAkun();
  const [perluMasuk, setPerluMasuk] = useState(false); // backend membalas 403
  const [login, setLogin] = useState(false);
  const [tamuHilang, setTamuHilang] = useState(false);
  const [tawaranDitutup, setTawaranDitutup] = useState(false);
  const nextId = useRef(0);
  const akhirRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const id = () => nextId.current++;

  // Chat umum dan chat per-dokumen satu riwayat yang sama (1 percakapan per akun), jadi
  // dimuat sekali per status akun, TIDAK setiap kali documentId berpindah (lihat komentar
  // di bawah untuk penyetelan ulang perluMasuk/tamuHilang saat mode dokumen berganti).
  useEffect(() => {
    // Tunggu status akun; tamu tidak punya riwayat chat dokumen (ditolak backend)
    if (!akun.siap || !akun.uid || (documentId && !akun.masuk)) return;
    let aktif = true;
    getChatHistory()
      .then((items) => {
        if (!aktif || !items.length) return;
        setPesan(
          items.flatMap((h): Pesan[] => [
            { id: nextId.current++, peran: "user", teks: h.pertanyaan, dokumen: !!h.document_id },
            {
              id: nextId.current++,
              peran: "asisten",
              data: {
                jawaban: h.jawaban,
                sumber: h.sumber,
                status: h.status === "di_luar_cakupan" ? "di_luar_cakupan" : "ok",
                di_luar_cakupan: h.status === "di_luar_cakupan",
                disclaimer: DISCLAIMER,
              },
            },
          ]),
        );
      })
      .catch(() => { }); // riwayat pelengkap; chat baru tetap bisa dipakai
    return () => { aktif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja tidak depend ke documentId, lihat komentar di atas
  }, [akun.siap, akun.masuk, akun.uid]);

  // documentId berganti (mis. "Tanya umum saja" / buka dokumen lain): kunci/notice lama sudah
  // tidak relevan untuk mode yang baru, tapi riwayat percakapan (pesan) TETAP tampil menyatu.
  useEffect(() => {
    setPerluMasuk(false);
    setTamuHilang(false);
  }, [documentId]);

  useEffect(() => {
    if (pesan.length || loading) akhirRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan.length, loading]);

  async function tanya(pertanyaan: string, ulang = false) {
    const q = pertanyaan.trim().slice(0, MAX_CHARS);
    if (!q || loading) return;
    if (!ulang) {
      setInput("");
      setPesan((p) => [...p, { id: id(), peran: "user", teks: q, dokumen: !!documentId }]);
    }
    setLoading(true);
    try {
      const data = await sendChat(q, documentId);
      if (data.disclaimer) setDisclaimer(data.disclaimer);
      setPesan((p) => [
        ...p,
        data.status === "error"
          ? { id: id(), peran: "gagal", pertanyaan: q, pesan: data.jawaban }
          : { id: id(), peran: "asisten", data },
      ]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setPerluMasuk(true);
      else setPesan((p) => [...p, { id: id(), peran: "gagal", pertanyaan: q, pesan: (e as Error).message }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function coba(m: Extract<Pesan, { peran: "gagal" }>) {
    setPesan((p) => p.filter((x) => x.id !== m.id));
    tanya(m.pertanyaan, true);
  }

  const saran = documentId ? SARAN_DOKUMEN : SARAN_UMUM;
  const kosong = pesan.length === 0 && !loading;
  // Tanya soal dokumen hanya untuk pengguna yang masuk (email atau Google)
  const terkunci = (!!documentId || perluMasuk) && akun.siap && !akun.masuk;

  return (
    <main>
      <PageHeader
        foto="kamus"
        icon="chat"
        crumbs={[{ href: "/", label: "Beranda" }, { label: "JagaTanah AI" }]}
        title="JagaTanah AI"
        desc="Ajukan pertanyaan seputar tanah. Setiap jawaban menyebut pasal peraturan yang menjadi dasarnya."
      />

      <div className={`${container} grid grid-cols-1 items-start gap-6 pt-8 lg:grid-cols-[1fr_300px]`}>
        <section className="flex min-h-[65vh] min-w-0 flex-col rounded-[2rem] border border-line bg-surface shadow-soft" aria-label="Percakapan">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-6">
            <span className="flex items-center gap-3">
              <span className="relative flex size-11 items-center justify-center rounded-2xl bg-primary-soft">
                <LogoMark size={26} />
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-risk-low" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block font-bold text-ink">JagaTanah AI</span>
                <span className="block text-xs text-ink-soft">Menjawab berdasarkan peraturan pertanahan</span>
              </span>
            </span>
            {documentId && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-ink">
                <Icon name="doc" className="size-3.5" /> Mode dokumen
              </span>
            )}
          </header>

          {documentId && (
            <div className="px-5 pt-5 md:px-6">
              <Notice title="Anda sedang membahas dokumen yang diunggah">
                Jawaban akan merujuk isi dokumen Anda.{" "}
                <Link href={`/analisis/${encodeURIComponent(documentId)}`} className="font-semibold text-primary underline underline-offset-2">
                  Lihat hasil pemeriksaan
                </Link>{" "}
                ·{" "}
                <Link href="/chat" className="font-semibold text-primary underline underline-offset-2">Tanya umum saja</Link>
              </Notice>
            </div>
          )}

          <div role="log" aria-live="polite" className="flex-1 space-y-6 p-5 md:p-6">
            {tamuHilang ? (
              <Notice tone="warning" title="Dokumen perlu diunggah ulang">
                Anda masuk ke akun yang sudah pernah dibuat sebelumnya, sehingga dokumen yang diperiksa sebagai tamu tidak ikut
                tersimpan.{" "}
                <Link href="/upload" className="font-semibold underline underline-offset-2">Unggah ulang dokumen</Link>
              </Notice>
            ) : terkunci ? (
              <div className="fade-up py-8 text-center">
                <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary text-white shadow-lift">
                  <Icon name="lock" className="size-7" />
                </span>
                <p className="mt-4 text-xl font-extrabold tracking-tight text-ink">Masuk untuk bertanya soal dokumen ini</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                  Tanya jawab tentang isi dokumen hanya tersedia untuk pengguna yang masuk. Hasil pemeriksaan Anda tetap
                  tersimpan setelah masuk.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => setLogin(true)} className={btn.primary}>
                    Masuk atau Daftar
                  </button>
                  <Link href="/chat" className={btn.secondary}>Tanya umum saja</Link>
                </div>
              </div>
            ) : kosong && (
              <div className="fade-up py-6 text-center">
                <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-secondary to-primary shadow-lift">
                  <Icon name="chat" className="size-7 text-white" />
                </span>
                <p className="mt-4 text-xl font-extrabold tracking-tight text-ink">Ada yang ingin Anda tanyakan?</p>
                <p className="mt-1 text-sm text-ink-soft">Pilih contoh di bawah atau tulis pertanyaan Anda sendiri.</p>
                <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                  {saran.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => tanya(s)}
                      className="pop-in rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pesan.map((m) => {
              if (m.peran === "user")
                return (
                  <div key={m.id} className="fade-up flex flex-col items-end gap-1">
                    {m.dokumen && (
                      <span className="flex items-center gap-1 pr-1 text-[0.7rem] font-semibold text-ink-soft">
                        <Icon name="doc" className="size-3" /> Soal dokumen
                      </span>
                    )}
                    <p className="max-w-[85%] whitespace-pre-line rounded-3xl rounded-br-md bg-linear-to-br from-secondary to-primary px-5 py-3 text-white shadow-soft">
                      {m.teks}
                    </p>
                  </div>
                );
              if (m.peran === "gagal")
                return (
                  <Asisten key={m.id}>
                    <Notice tone="danger">
                      {m.pesan}
                      <button
                        type="button"
                        onClick={() => coba(m)}
                        disabled={loading}
                        className="mt-2 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 font-semibold transition-colors hover:bg-risk-high hover:text-white disabled:opacity-50"
                      >
                        <Icon name="refresh" className="size-4" /> Coba lagi
                      </button>
                    </Notice>
                  </Asisten>
                );
              return (
                <Asisten key={m.id}>
                  <Jawaban data={m.data} />
                </Asisten>
              );
            })}

            {loading && (
              <Asisten>
                <div className="inline-flex items-center gap-3 rounded-3xl rounded-tl-md border border-line bg-surface px-5 py-3.5 text-sm text-ink-soft shadow-soft">
                  <span className="flex gap-1 text-secondary" aria-hidden>
                    <span className="typing-dot size-2 rounded-full bg-current" />
                    <span className="typing-dot size-2 rounded-full bg-current" />
                    <span className="typing-dot size-2 rounded-full bg-current" />
                  </span>
                  Mencari dasar hukum dan menyusun jawaban
                </div>
              </Asisten>
            )}
            <div ref={akhirRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); tanya(input); }} className="sticky bottom-0 rounded-b-[2rem] bg-surface/90 p-4 backdrop-blur md:px-6">
            {!documentId && akun.siap && !akun.masuk && !tawaranDitutup && (
              <div className="mb-3">
                <TamuBanner
                  pesan="Percakapan hanya tersimpan selama tab ini terbuka."
                  onMasuk={() => setLogin(true)}
                  onTutup={() => setTawaranDitutup(true)}
                />
              </div>
            )}
            <div className="flex items-end gap-2 rounded-[1.75rem] border border-line-strong bg-surface p-1.5 pl-5 shadow-soft transition-all focus-within:border-secondary focus-within:ring-4 focus-within:ring-secondary/15">
              <label htmlFor="pertanyaan" className="sr-only">Pertanyaan Anda</label>
              <textarea
                ref={inputRef}
                id="pertanyaan"
                rows={1}
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    tanya(input);
                  }
                }}
                disabled={terkunci}
                placeholder={terkunci ? "Masuk terlebih dahulu untuk bertanya" : documentId ? "Tulis pertanyaan tentang dokumen Anda…" : "Tulis pertanyaan Anda…"}
                className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-ink outline-none placeholder:text-ink-soft/70 tanpa-cincin-fokus"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || terkunci}
                aria-label="Kirim pertanyaan"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:scale-105 hover:bg-primary-hover active:scale-95 disabled:scale-100 disabled:bg-line disabled:text-ink-soft"
              >
                <Icon name="send" className="size-5" />
              </button>
            </div>
            <p className="mt-2 px-2 text-center text-xs text-ink-soft">{disclaimer}</p>
          </form>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <Panel title="Butuh bantuan profesional?" icon="scale">
            <p className="text-sm leading-relaxed text-ink-soft">Temukan Notaris/PPAT atau advokat sesuai urusan tanah Anda.</p>
            <Link href="/konsultasi" className={`${btn.secondary} mt-4 w-full py-2.5 text-sm`}>Konsultasi Hukum</Link>
          </Panel>
          <Panel title="Butuh langkah lengkap?" icon="book">
            <ul className="space-y-1">
              {PANDUAN.map((p) => (
                <li key={p.slug}>
                  <Link href={`/panduan/${p.slug}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-primary-soft hover:text-primary">
                    <span className="flex-1">{p.judul}</span>
                    <Icon name="arrow" className="size-4 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
      <LoginDialog
        open={login}
        onClose={() => setLogin(false)}
        judul={documentId ? "Masuk untuk bertanya soal dokumen ini" : undefined}
        onBerhasil={(h) => (h.dokumenTamuHilang && documentId ? setTamuHilang(true) : setPerluMasuk(false))}
      />
    </main>
  );
}
