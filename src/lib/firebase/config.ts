// تهيئة Firebase — Auth + Realtime Database فقط (مجاني بلا فوترة على باقة Spark)
// ملاحظة: apiKey مكشوف بشكل طبيعي وآمن؛ الحماية تأتي من Security Rules.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.databaseURL &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId,
);

/*
 * Public pages and static guides are rendered on the server. During a local
 * build there may be no public Firebase env at all; importing Auth with an
 * incomplete config makes Firebase throw `auth/invalid-api-key` before the
 * page can be generated. Do not invent a key or write a .env fallback: use a
 * server-only typed placeholder. Public preview consumers guard the absent
 * service; production initializes the real project when public env values exist.
 */
const app: FirebaseApp | null = getApps().length
  ? getApp()
  : isFirebaseConfigured
    ? initializeApp(firebaseConfig)
    : null;

function unavailable<T>(_service: string): T {
  // Public pages must remain readable in a build preview without secrets.
  // Consumers that need live Firebase data guard with isFirebaseConfigured;
  // production still initializes the real service when all public env values exist.
  return {} as T;
}

export const auth: Auth = app ? getAuth(app) : unavailable<Auth>("Auth");
export const rtdb: Database = app ? getDatabase(app) : unavailable<Database>("Realtime Database");
export default app;
