// منطق المصادقة — مُرحّل من الكود القديم، نظيف وبـ TypeScript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

// ترجمة أخطاء Firebase إلى رسائل عربية واضحة
function arabicError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجّل بالفعل.",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
    "auth/weak-password": "كلمة المرور ضعيفة جداً (6 أحرف على الأقل).",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
    "auth/too-many-requests": "محاولات كثيرة. حاول لاحقاً.",
    "auth/network-request-failed": "تحقّق من اتصالك بالإنترنت.",
  };
  return map[code] ?? "حدث خطأ غير متوقّع. حاول مرة أخرى.";
}

export class AuthError extends Error {}

// إنشاء حساب جديد (نفس منطق الكود القديم: تسجيل → تفعيل بالبريد → خروج)
export async function registerUser(name: string, email: string, password: string) {
  if (!name || !email || !password) throw new AuthError("الرجاء تعبئة جميع الحقول.");
  if (password.length < 6) throw new AuthError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    // أنشئ مستند المستخدم في Firestore (مع خطّافات الأمان للمستقبل)
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      avatarUrl: null,
      track: null, // تُحدَّد في صفحة الإعداد
      wilaya: null,
      role: "student",
      points: 0,
      level: 1,
      badges: [],
      platformBan: false, // خطّاف الإشراف (مرحلة لاحقة)
      createdAt: serverTimestamp(),
    });
    await signOut(auth); // لا ندخل قبل التفعيل
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    throw new AuthError(arabicError(code));
  }
}

// تسجيل الدخول مع التحقق من تفعيل البريد
export async function loginUser(email: string, password: string) {
  if (!email || !password) throw new AuthError("الرجاء إدخال البريد وكلمة المرور.");
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      await signOut(auth);
      throw new AuthError("يجب تفعيل حسابك أولاً. تحقّق من الرابط في بريدك.");
    }
  } catch (err: unknown) {
    if (err instanceof AuthError) throw err;
    const code = (err as { code?: string })?.code ?? "";
    throw new AuthError(arabicError(code));
  }
}

export async function resetPassword(email: string) {
  if (!email) throw new AuthError("الرجاء إدخال بريدك الإلكتروني.");
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    throw new AuthError(arabicError(code));
  }
}

export async function logoutUser() {
  await signOut(auth);
}

// هل أكمل المستخدم إعداد ملفه (الشعبة + الولاية)؟
export async function needsOnboarding(user: User): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return true;
  const data = snap.data();
  return !data.track || !data.wilaya;
}

// حفظ الشعبة والولاية
export async function saveProfile(uid: string, track: string, wilaya: string) {
  await setDoc(doc(db, "users", uid), { track, wilaya }, { merge: true });
}
