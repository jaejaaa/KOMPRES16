import { initializeApp, getApps, type FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
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
  // Masuk / daftar dengan email
  "auth/invalid-email": "Format email tidak valid.",
  "auth/missing-password": "Kata sandi wajib diisi.",
  "auth/weak-password": "Kata sandi minimal 6 karakter.",
  "auth/email-already-in-use": "Email ini sudah terdaftar. Silakan pilih tab Masuk.",
  "auth/credential-already-in-use": "Email ini sudah terdaftar. Silakan pilih tab Masuk.",
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/wrong-password": "Email atau kata sandi salah.",
  "auth/user-not-found": "Email atau kata sandi salah.",
  "auth/user-disabled": "Akun ini dinonaktifkan.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu beberapa saat, lalu coba lagi.",
  "auth/operation-not-allowed": "Metode masuk ini belum diaktifkan. Hubungi tim pengembang.",
};

const pesanDari = (e: unknown) => {
  const code = (e as FirebaseError).code ?? "";
  return code in PESAN_AUTH ? PESAN_AUTH[code] : "Gagal masuk. Silakan coba lagi.";
};

// Setelah berhasil masuk: sesi dipindah ke penyimpanan permanen & komponen lain diberi tahu
async function selesaiMasuk() {
  await setPersistence(firebaseAuth(), browserLocalPersistence);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

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
    await selesaiMasuk();
    return { ok: true, dokumenTamuHilang };
  } catch (e) {
    return { ok: false, pesan: pesanDari(e) };
  }
}

// Daftar akun baru dengan email. Tamu "dinaikkan" (uid tetap) supaya dokumen yang baru diperiksa ikut tersimpan.
export async function daftarDenganEmail(email: string, sandi: string): Promise<HasilMasuk> {
  const auth = firebaseAuth();
  const tamu = auth.currentUser?.isAnonymous ? auth.currentUser : null;
  try {
    if (tamu) await linkWithCredential(tamu, EmailAuthProvider.credential(email, sandi));
    else await createUserWithEmailAndPassword(auth, email, sandi);
    await selesaiMasuk();
    return { ok: true, dokumenTamuHilang: false };
  } catch (e) {
    return { ok: false, pesan: pesanDari(e) };
  }
}

// Masuk ke akun email yang sudah ada. Akun lama punya uid sendiri, jadi dokumen yang diperiksa sebagai tamu tidak ikut.
export async function masukDenganEmail(email: string, sandi: string): Promise<HasilMasuk> {
  const auth = firebaseAuth();
  const adaTamu = !!auth.currentUser?.isAnonymous;
  try {
    await signInWithEmailAndPassword(auth, email, sandi);
    await selesaiMasuk();
    return { ok: true, dokumenTamuHilang: adaTamu };
  } catch (e) {
    return { ok: false, pesan: pesanDari(e) };
  }
}

// Kirim email atur ulang kata sandi. Firebase tidak memberi tahu apakah email terdaftar (demi keamanan).
export async function resetKataSandi(email: string): Promise<{ ok: boolean; pesan: string }> {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email);
    return { ok: true, pesan: `Jika ${email} terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Periksa kotak masuk atau folder spam.` };
  } catch (e) {
    return { ok: false, pesan: pesanDari(e) ?? "Gagal mengirim email. Silakan coba lagi." };
  }
}

export async function keluar() {
  const auth = firebaseAuth();
  await signOut(auth);
  // Request berikutnya otomatis membuat akun tamu baru di sesi tab (lihat getToken)
  await setPersistence(auth, browserSessionPersistence);
  window.dispatchEvent(new Event(AUTH_EVENT));
}
