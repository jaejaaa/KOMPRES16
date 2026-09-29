import Icon from "./Icon";

// Kartu kecil "mode tamu" di atas kolom ketik / tombol utama.
// onTutup diisi = bisa ditutup dengan tanda silang (chat); dikosongkan = peringatan tetap (telaah dokumen).
export default function TamuBanner({ pesan, onMasuk, onTutup }: { pesan: string; onMasuk: () => void; onTutup?: () => void }) {
  return (
    <div className={`fade-up relative flex items-center gap-3 rounded-2xl border border-line bg-bg py-3 pl-4 text-sm ${onTutup ? "pr-10" : "pr-4"}`} role="note">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon name="lock" className="size-4" />
      </span>
      <p className="min-w-0 flex-1 leading-snug text-ink">
        <span className="font-semibold">Anda sedang dalam mode tamu.</span> <span className="text-ink-soft">{pesan}</span>
      </p>
      <button
        type="button"
        onClick={onMasuk}
        className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Masuk
      </button>
      {onTutup && (
        <button
          type="button"
          onClick={onTutup}
          aria-label="Tutup pemberitahuan mode tamu"
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-line hover:text-ink"
        >
          <Icon name="x" className="size-3.5" />
        </button>
      )}
    </div>
  );
}
