import { Fragment, type ReactNode } from "react";

// Teks biasa, tapi rujukan dalam kurung yang menyebut Pasal, mis. "(PP 24/1997 Pasal 37 ayat 1)",
// ditampilkan sebagai sitasi supaya pembaca awam tahu mana dasar hukumnya.
// stabilo: kalimat (persis sama dengan teks) yang diberi stabilo merah, mis. kalimat inti panduan.
const RUJUKAN = /(\([^()]*Pasal[^()]*\))/g;

// Pecah teks biasa: bagian yang cocok dengan salah satu kalimat stabilo dibungkus <mark>
function beriStabilo(teks: string, stabilo: string[]): ReactNode[] {
  const hasil: ReactNode[] = [];
  let sisa = teks;
  while (sisa) {
    let posisi = -1;
    let kalimat = "";
    for (const s of stabilo) {
      const i = sisa.indexOf(s);
      if (i >= 0 && (posisi < 0 || i < posisi)) {
        posisi = i;
        kalimat = s;
      }
    }
    if (posisi < 0) {
      hasil.push(sisa);
      break;
    }
    if (posisi > 0) hasil.push(sisa.slice(0, posisi));
    hasil.push(
      <mark key={hasil.length} className="stabilo stabilo-gulir">
        {kalimat}
      </mark>,
    );
    sisa = sisa.slice(posisi + kalimat.length);
  }
  return hasil;
}

export default function LegalText({ children, stabilo = [] }: { children: string; stabilo?: string[] }) {
  return (
    <>
      {children.split(RUJUKAN).map((part, i) =>
        i % 2 === 1 ? (
          <cite key={i} className="box-decoration-clone rounded-md bg-primary-soft px-1.5 py-px text-[0.85em] font-semibold not-italic text-primary">
            {part.slice(1, -1)}
          </cite>
        ) : (
          <Fragment key={i}>{stabilo.length ? beriStabilo(part, stabilo) : part}</Fragment>
        ),
      )}
    </>
  );
}
