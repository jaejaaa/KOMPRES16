"use client";
import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { AUTH_EVENT, firebaseAuth } from "./firebase";

export interface Akun {
  siap: boolean; // false selama sesi lama belum selesai dipulihkan
  uid: string | null;
  masuk: boolean; // true = login Google, false = tamu / belum ada sesi
  nama: string | null;
  email: string | null;
  foto: string | null;
}

const ringkas = (u: User | null): Akun => ({
  siap: true,
  uid: u?.uid ?? null,
  masuk: !!u && !u.isAnonymous,
  nama: u?.displayName ?? null,
  email: u?.email ?? null,
  foto: u?.photoURL ?? null,
});

// Status akun untuk tampilan. onIdTokenChanged juga terpanggil saat akun tamu digabung ke Google
// (uid sama, tapi token baru); AUTH_EVENT sebagai cadangan setelah masuk/keluar.
export function useAkun(): Akun {
  const [akun, setAkun] = useState<Akun>({ siap: false, uid: null, masuk: false, nama: null, email: null, foto: null });

  useEffect(() => {
    const auth = firebaseAuth();
    const segarkan = () => setAkun(ringkas(auth.currentUser));
    const lepas = onIdTokenChanged(auth, segarkan);
    window.addEventListener(AUTH_EVENT, segarkan);
    return () => {
      lepas();
      window.removeEventListener(AUTH_EVENT, segarkan);
    };
  }, []);

  return akun;
}
