// منطق المصادقة — مُرحّل من الكود القديم، نظيف وبـ TypeScript
// البيانات في Realtime Database (لا Firestore — لتجنّب مشكلة الفوترة)
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  type User,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { auth, rtdb } from "@/lib/firebase/config";

function arabicError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجّل بالفعل.",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
    "auth/weak-password": "كلمة المرور ضعيفة جداً (6 أحرف على الأقل).",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
    "auth/too-many-requests": "محاولات كثيرة. حاول لاحقاً.",
    "auth/network-request-failed": "تحقّق من اتصالك بالإنترنت.",
    "PERMISSION_DENIED": "صلاحيات قاعدة البيانات تمنع العملية. تحقّق من قواعد RTDB.",
  };
  return map[code] ?? "حدث خطأ غير متوقّع. حاول مرة أخرى.";
}

export class AuthError extends Error {}

export async function registerUser(name: string, email: string, password: string) {
  if (!name || !email || !password) throw new AuthError("الرجاء تعبئة جميع الحقول.");
  if (password.length < 6) throw new AuthError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    // مستند المستخدم في RTDB (مع خطّاف الإشراف للمستقبل)
    await set(ref(rtdb, `users/${cred.user.uid}`), {
      name,
      email,
      avatarUrl: null,
      track: null,
      wilaya: null,
      role: "student",
      points: 0,
      level: 1,
      platformBan: false,
      createdAt: Date.now(),
    });
    await signOut(auth);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    throw new AuthError(arabicError(code));
  }
}

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

export async function needsOnboarding(user: User): Promise<boolean> {
  const snap = await get(ref(rtdb, `users/${user.uid}`));
  if (!snap.exists()) return true;
  const data = snap.val();
  return !data.track || !data.wilaya;
}

export async function saveProfile(uid: string, track: string, wilaya: string) {
  await update(ref(rtdb, `users/${uid}`), { track, wilaya });
}

// تعديل بيانات الحساب (الاسم/الشعبة/الولاية)
export async function updateAccount(
  user: User,
  data: { name: string; track: string; wilaya: string }
) {
  const name = data.name.trim();
  if (!name) throw new AuthError("الرجاء إدخال الاسم.");
  await update(ref(rtdb, `users/${user.uid}`), { name, track: data.track, wilaya: data.wilaya });
  if (user.displayName !== name) await updateProfile(user, { displayName: name });
}
