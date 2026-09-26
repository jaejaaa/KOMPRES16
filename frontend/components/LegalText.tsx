// Teks biasa, tapi rujukan dalam kurung yang menyebut Pasal, mis. "(PP 24/1997 Pasal 37 ayat 1)",
// ditampilkan sebagai sitasi supaya pembaca awam tahu mana dasar hukumnya.
const RUJUKAN = /(\([^()]*Pasal[^()]*\))/g;

export default function LegalText({ children }: { children: string }) {
  return (
    <>
      {children.split(RUJUKAN).map((part, i) =>
        i % 2 === 1 ? (
          <cite key={i} className="rounded bg-brass/10 px-1 py-px text-[0.9em] font-medium not-italic text-brass-deep">
            {part.slice(1, -1)}
          </cite>
        ) : (
          part
        ),
      )}
    </>
  );
}
