// تهيئة Firebase — Auth + Firestore + Realtime Database (الباقة المجانية Spark)
// ملاحظة: apiKey مكشوف بشكل طبيعي وآمن؛ الحماية تأتي من Security Rules.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// منع إعادة التهيئة في بيئة Next.js (HMR / SSR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // البيانات الدائمة (مستخدمون/غرف/دردشة/منشورات)
export const rtdb = getDatabase(app); // اللحظي المؤقت (حضور/فيديو/سبورة/إشارات صوت)
export default app;
