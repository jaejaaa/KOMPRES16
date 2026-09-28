import type { Konsultan } from "@/types/api";

// Foto banner detail konsultan. Data dummy belum punya field `foto`, jadi foto dipilih dari public/konsultan
// sesuai nama depan, bergiliran berdasarkan nomor id. Kalau data sudah membawa `foto`, itu yang dipakai.
// Nama yang tidak ada di daftar di bawah tetap memakai lingkaran inisial.
const FOTO = {
  pria: ["/konsultan/notaris1.png", "/konsultan/notaris2.png", "/konsultan/notaris5.png"],
  wanita: ["/konsultan/notaris3.png", "/konsultan/notaris4.png", "/konsultan/notaris6.png"],
};

// Kelompok nama depan mengikuti NAMA_DEPAN di data_engineer/scripts/10_make_konsultan_dummy.py,
// ditambah nama-nama yang ditulis manual di script yang sama.
const PRIA = new Set([
  "Ahmad", "Budi", "Chandra", "Dedi", "Eko", "Fajar", "Gilang", "Hadi", "Iwan", "Joko", "Krisna", "Lukman", "Made",
  "Nugroho", "Oscar", "Putu", "Rian", "Surya", "Taufik", "Umar", "Wayan", "Zainal", "Bayu", "Dimas", "Farhan", "Galih",
  "Hendra", "Indra", "Kevin", "Nyoman", "Pandu", "Rizki", "Sandi", "Teguh", "Wahyu", "Yudha", "Arif", "Bagas", "Doni",
  "Erlangga", "Firman", "Guntur", "Hasan", "Ivan", "Kurnia", "Lutfi", "Mardi", "Naufal",
  "Yusuf", "Deni", "Muhammad", "Moh.", "Bambang", "Agus", "Sutrisno", "Bagus", "Lalu", "Yohanes", "Rudi", "La", "Frangky",
  "Yance", "Teuku", "Rico", "Johan", "Reza", "Gunawan", "Fadli", "Yudi", "Rahmat", "Arief", "I", "Yosef", "Erwin",
  "Farid", "Ridwan",
]);
const WANITA = new Set([
  "Ayu", "Bella", "Citra", "Dewi", "Eka", "Fitri", "Gita", "Hana", "Indah", "Kartika", "Laila", "Maya", "Nadia", "Oktavia",
  "Putri", "Ratna", "Sari", "Tia", "Utami", "Vina", "Wulan", "Yuni", "Zahra", "Anisa", "Bunga", "Clara", "Diah", "Elsa",
  "Farah", "Gina", "Hesti", "Ika", "Julia", "Kirana", "Lestari", "Mira", "Nia", "Puspa", "Rina", "Sinta", "Tari", "Vera",
  "Widya", "Yanti",
  "Siti", "Elisa", "Meilani", "Fitriani", "Christine", "Retno", "Puspita", "Ni", "Maria", "Herlina", "Nurul", "Grace",
  "Nurhayati", "Sarah", "Dorince", "Boru", "Melly", "Wina", "Angelina", "Yenny", "Nina", "Sri", "Baiq", "Novi", "Meike",
  "Wa", "Ruth", "Beatrix",
]);
// "Andi" dipakai pria maupun wanita, jadi ditentukan per nama lengkap
const NAMA_LENGKAP: Record<string, keyof typeof FOTO> = {
  "Andi Saputra": "pria",
  "Andi Rahman Massepe": "pria",
  "Andi Nurul Fadillah": "wanita",
};

export function fotoKonsultan(k: Konsultan): string | undefined {
  if (k.foto) return k.foto;
  const nama = k.nama.split(",")[0].replace(/^((Dr|H|Hj|Prof)\.\s*)+/i, "").trim();
  const depan = nama.split(/\s+/)[0];
  const kelompok = NAMA_LENGKAP[nama] ?? (depan === "Andi" ? undefined : PRIA.has(depan) ? "pria" : WANITA.has(depan) ? "wanita" : undefined);
  if (!kelompok) return undefined;
  const daftar = FOTO[kelompok];
  return daftar[(parseInt(k.id.replace(/\D/g, ""), 10) || 0) % daftar.length];
}
