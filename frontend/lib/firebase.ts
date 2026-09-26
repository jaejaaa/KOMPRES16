import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function firebaseAuth() {
  const app = getApps()[0] ?? initializeApp(config);
  return getAuth(app);
}

export async function getToken(): Promise<string> {
  const auth = firebaseAuth();
  // Tunggu sesi lama ke-restore dulu. Tanpa ini, tiap refresh bikin user anonymous BARU
  // dan riwayat dokumen (GET /documents) jadi kosong.
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser!.getIdToken();
}
