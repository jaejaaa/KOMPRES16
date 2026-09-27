import { initializeApp, getApps, type FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseAuth() {
  const app = getApps()[0] ?? initializeApp(config);
  return getAuth(app);
}

// Satu proses pembuatan akun tamu untuk semua request yang datang bersamaan.
// Tanpa ini, 2 request paralel bisa membuat 2 akun tamu berbeda, lalu dokumen tercatat milik akun yang salah.
let tamuSedangDibuat: Promise<unknown> | null = null;

// Tamu (anonim) disimpan per tab (sessionStorage): tab ditutup = akun tamu & riwayatnya hilang.
// User yang masuk dengan Google disimpan permanen (localStorage) sampai ia keluar.
export async function getToken(): Promise<string> {
  const auth = firebaseAuth();
  // Tunggu sesi lama ke-restore dulu. Tanpa ini, tiap refresh bikin user anonymous BARU
  // dan riwayat dokumen (GET /documents) jadi kosong.
  await auth.authStateReady();
  if (!auth.currentUser) {
    tamuSedangDibuat ??= setPersistence(auth, browserSessionPersistence)
      .then(() => signInAnonymously(auth))
      .finally(() => { tamuSedangDibuat = null; });
    await tamuSedangDibuat;
  }
  return auth.currentUser!.getIdToken();
}

export type HasilMasuk =
  | { ok: true; dokumenTamuHilang: boolean } // true: masuk ke akun Google lama, dokumen tamu tidak ikut
  | { ok: false; pesan: string | null }; // pesan null = dibatalkan user

const PESAN_AUTH: Record<string, string | null> = {
  "auth/popup-closed-by-user": null,
  "auth/cancelled-popup-request": null,
  "auth/popup-blocked": "Jendela login diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.",
  "auth/unauthorized-domain": "Alamat situs ini belum diizinkan untuk login Google. Hubungi tim pengembang.",
  "auth/network-request-failed": "Koneksi internet bermasalah. Periksa koneksi Anda, lalu coba lagi.",
};

export const AUTH_EVENT = "jagatanah-auth";

export async function masukDenganGoogle(): Promise<HasilMasuk> {
  const auth = firebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const tamu = auth.currentUser?.isAnonymous ? auth.currentUser : null;

  try {
    let dokumenTamuHilang = false;
    if (tamu) {
      try {
        // Akun tamu "dinaikkan" jadi akun Google: uid tetap, jadi dokumen yang baru diperiksa ikut terbawa
        await linkWithPopup(tamu, provider);
      } catch (e) {
        if ((e as FirebaseError).code !== "auth/credential-already-in-use") throw e;
        // Akun Google ini sudah pernah dipakai: masuk ke akun lama, dokumen tamu tidak bisa ikut
        const cred = GoogleAuthProvider.credentialFromError(e as FirebaseError);
        if (!cred) throw e;
        await signInWithCredential(auth, cred);
        dokumenTamuHilang = true;
      }
    } else {
      await signInWithPopup(auth, provider);
    }
    // Pindahkan sesi ke penyimpanan permanen. Dilakukan SETELAH popup supaya popup tidak diblokir browser.
    await setPersistence(auth, browserLocalPersistence);
    window.dispatchEvent(new Event(AUTH_EVENT));
    return { ok: true, dokumenTamuHilang };
  } catch (e) {
    const code = (e as FirebaseError).code ?? "";
    return { ok: false, pesan: code in PESAN_AUTH ? PESAN_AUTH[code] : "Gagal masuk. Silakan coba lagi." };
  }
}

export async function keluar() {
  const auth = firebaseAuth();
  await signOut(auth);
  // Request berikutnya otomatis membuat akun tamu baru di sesi tab (lihat getToken)
  await setPersistence(auth, browserSessionPersistence);
  window.dispatchEvent(new Event(AUTH_EVENT));
}
