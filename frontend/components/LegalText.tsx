// Teks biasa, tapi rujukan dalam kurung yang menyebut Pasal, mis. "(PP 24/1997 Pasal 37 ayat 1)",
// ditampilkan sebagai sitasi supaya pembaca awam tahu mana dasar hukumnya.
const RUJUKAN = /(\([^()]*Pasal[^()]*\))/g;

export default function LegalText({ children }: { children: string }) {
  return (
    <>
      {children.split(RUJUKAN).map((part, i) =>
        i % 2 === 1 ? (
          <cite key={i} className="box-decoration-clone rounded-md bg-primary-soft px-1.5 py-px text-[0.85em] font-semibold not-italic text-primary">
            {part.slice(1, -1)}
          </cite>
        ) : (
          part
        ),
      )}
    </>
  );
}
