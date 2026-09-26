"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getChatHistory, sendChat } from "@/lib/api";
import { PANDUAN } from "@/lib/panduan";
import type { ChatResponse, ChatSource } from "@/types/api";
import Icon from "./Icon";
import LogoMark from "./LogoMark";

type Pesan =
  | { id: number; peran: "user"; teks: string }
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
  "Pasal 6 di perjanjian saya maksudnya apa?",
  "Apa yang harus saya minta ke penjual sebelum tanda tangan?",
];
const DISCLAIMER = "Jawaban ini bersifat informatif, bukan pengganti nasihat hukum resmi.";
const MAX_CHARS = 2000; // sama dengan batas backend (ChatIn.pertanyaan)

function Sumber({ s, nomor }: { s: ChatSource; nomor: number }) {
  const [open, setOpen] = useState(false);
  const panduan = s.asal === "panduan" ? PANDUAN.find((p) => s.uu.includes(p.judul)) : undefined;
  const judul = s.asal === "dokumen" ? "Dokumen kamu" : s.uu.replace(/^Panduan:\s*/, "Panduan: ");
  const catatan = s.status && s.status !== "berlaku" && s.status !== "panduan" ? s.status : null;

  return (
    <li className="rounded-xl border border-line bg-paper">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
      >
        <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brass/15 text-xs font-semibold text-brass-deep">
          {nomor}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-semibold text-ink">{judul}</span>
          <span className="text-ink-soft"> · {s.pasal}</span>
          {(catatan || s.halaman) && (
            <span className="block text-xs text-ink-soft">
              {[catatan, s.halaman && `hlm. ${s.halaman}`].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs font-semibold text-brand">{open ? "Tutup" : "Baca"}</span>
      </button>
      {open && (
        <div className="fade-up border-t border-line px-4 py-3">
          <blockquote className="whitespace-pre-line font-serif text-sm leading-relaxed text-ink">{s.kutipan}</blockquote>
          {panduan && (
            <Link href={`/panduan/${panduan.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Buka panduan lengkap <Icon name="arrow" className="size-4" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function Avatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-card" aria-hidden>
      <LogoMark size={18} />
    </span>
  );
}

function Jawaban({ data }: { data: ChatResponse }) {
  if (data.di_luar_cakupan)
    return (
      <div className="rounded-2xl rounded-tl-md border border-dashed border-line bg-paper p-4 text-ink-soft">
        <p className="flex gap-2">
          <Icon name="info" className="mt-0.5 size-4 shrink-0 text-brass" />
          <span className="whitespace-pre-line">{data.jawaban}</span>
        </p>
      </div>
    );

  return (
    <div className="rounded-2xl rounded-tl-md border border-line bg-card p-4">
      <p className="whitespace-pre-line leading-relaxed text-ink">{data.jawaban}</p>
      {data.sumber.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass-deep">Dasar hukum</p>
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
  const nextId = useRef(0);
  const akhirRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const id = () => nextId.current++;

  // Muat riwayat percakapan sebelumnya (per dokumen, atau chat umum)
  useEffect(() => {
    let aktif = true;
    getChatHistory(documentId)
      .then((items) => {
        if (!aktif || !items.length) return;
        setPesan(
          items.flatMap((h): Pesan[] => [
            { id: nextId.current++, peran: "user", teks: h.pertanyaan },
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
      .catch(() => {}); // riwayat pelengkap; chat baru tetap bisa dipakai
    return () => { aktif = false; };
  }, [documentId]);

  useEffect(() => {
    akhirRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pesan.length, loading]);

  async function tanya(pertanyaan: string, ulang = false) {
    const q = pertanyaan.trim().slice(0, MAX_CHARS);
    if (!q || loading) return;
    if (!ulang) {
      setInput("");
      setPesan((p) => [...p, { id: id(), peran: "user", teks: q }]);
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
      setPesan((p) => [...p, { id: id(), peran: "gagal", pertanyaan: q, pesan: (e as Error).message }]);
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

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-4 md:px-8">
      <header className="pt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brass-deep">Tanya hukum</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Tanya soal hukum tanah</h1>
        {documentId ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Icon name="doc" className="size-4 text-brand" /> Sedang membahas dokumen kamu
            </span>
            <Link href={`/analisis/${encodeURIComponent(documentId)}`} className="font-semibold text-brand hover:underline">
              Lihat hasil analisis
            </Link>
            <Link href="/chat" className="text-ink-soft hover:text-ink">Tanya umum saja</Link>
          </div>
        ) : (
          <p className="mt-2 leading-relaxed text-ink-soft">
            Jawaban disusun dari peraturan pertanahan dan selalu menyebut pasal dasarnya.
          </p>
        )}
      </header>

      <section role="log" aria-live="polite" aria-label="Percakapan" className="flex-1 space-y-5 py-6">
        {kosong && (
          <div>
            <p className="text-sm font-medium text-ink-soft">Coba mulai dari pertanyaan ini:</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {saran.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => tanya(s)}
                  className="rounded-xl border border-line bg-card px-4 py-3 text-left text-sm text-ink transition-colors hover:border-brand/40"
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
              <div key={m.id} className="fade-up flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-white">{m.teks}</p>
              </div>
            );
          if (m.peran === "gagal")
            return (
              <div key={m.id} className="fade-up flex gap-3">
                <Avatar />
                <div className="flex-1 rounded-2xl rounded-tl-md bg-risk-high-bg p-4 text-sm text-risk-high-text" role="alert">
                  <p className="flex gap-2">
                    <Icon name="alert" className="mt-0.5 size-4 shrink-0" /> {m.pesan}
                  </p>
                  <button
                    type="button"
                    onClick={() => coba(m)}
                    disabled={loading}
                    className="mt-3 inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    <Icon name="refresh" className="size-4" /> Coba lagi
                  </button>
                </div>
              </div>
            );
          return (
            <div key={m.id} className="fade-up flex gap-3">
              <Avatar />
              <div className="min-w-0 flex-1"><Jawaban data={m.data} /></div>
            </div>
          );
        })}

        {loading && (
          <div className="fade-up flex gap-3" aria-label="Sedang menyusun jawaban">
            <Avatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3.5 text-brand" aria-hidden>
              <span className="typing-dot size-2 rounded-full bg-current" />
              <span className="typing-dot size-2 rounded-full bg-current" />
              <span className="typing-dot size-2 rounded-full bg-current" />
            </div>
          </div>
        )}
        <div ref={akhirRef} />
      </section>

      <form
        onSubmit={(e) => { e.preventDefault(); tanya(input); }}
        className="sticky bottom-0 bg-linear-to-t from-paper from-70% to-transparent pb-4 pt-6"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-card p-2 shadow-[0_8px_24px_-12px_rgb(34_26_26/0.25)] focus-within:border-brand/50">
          <label htmlFor="pertanyaan" className="sr-only">Pertanyaan</label>
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
            placeholder={documentId ? "Tanya soal dokumen kamu…" : "Tulis pertanyaanmu…"}
            className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-ink outline-none placeholder:text-ink-soft/70"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Kirim pertanyaan"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-ink-soft"
          >
            <Icon name="send" className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-ink-soft">{disclaimer}</p>
      </form>
    </main>
  );
}
