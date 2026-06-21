// منطق المصادقة — مُرحّل من الكود القديم، نظيف وبـ TypeScript
// البيانات في Realtime Database (لا Firestore — لتجنّب مشكلة الفوترة)
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

export async function registerUser(name: string, email: string, password: string, role: "student" | "teacher" = "student") {
  if (!name || !email || !password) throw new AuthError("الرجاء تعبئة جميع الحقول.");
  if (password.length < 6) throw new AuthError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // مستند المستخدم في RTDB
    await set(ref(rtdb, `users/${cred.user.uid}`), {
      name,
      email,
      avatarUrl: null,
      track: null,
      wilaya: null,
      role: role === "teacher" ? "teacher" : "student",
      points: 0,
      level: 1,
      platformBan: false,
      createdAt: Date.now(),
    });
    // يبقى المستخدم مسجّلاً دخوله مباشرة دون الحاجة لتأكيد البريد
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    throw new AuthError(arabicError(code));
  }
}

export async function loginUser(email: string, password: string) {
  if (!email || !password) throw new AuthError("الرجاء إدخال البريد وكلمة المرور.");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // لا حاجة لتأكيد البريد — الدخول مباشر
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
  if (!data.wilaya) return true;
  // الأستاذ يحتاج مادة، الطالب يحتاج شعبة
  if (data.role === "teacher") return !data.teachSubject;
  return !data.track;
}

export async function saveProfile(uid: string, data: { track?: string; teachSubject?: string; wilaya: string }) {
  const updates: Record<string, string | null> = { wilaya: data.wilaya };
  if (data.track !== undefined) updates.track = data.track || null;
  if (data.teachSubject !== undefined) updates.teachSubject = data.teachSubject || null;
  await update(ref(rtdb, `users/${uid}`), updates);
}

// يضمن وجود الاسم في RTDB — يُستدعى عند تحميل التطبيق لإصلاح الحسابات القديمة
export async function ensureNameInRTDB(user: User) {
  const displayName = user.displayName;
  if (!displayName) return;
  try {
    const snap = await get(ref(rtdb, `users/${user.uid}/name`));
    const stored = snap.val() as string | null;
    if (!stored || stored === "طالب") {
      await update(ref(rtdb, `users/${user.uid}`), { name: displayName });
    }
  } catch { /* تجاهل */ }
}

// تعديل بيانات الحساب (الاسم/الشعبة/الولاية)
export async function updateAccount(
  user: User,
  data: { name: string; track?: string; teachSubject?: string; wilaya?: string }
) {
  const name = data.name.trim();
  if (!name) throw new AuthError("الرجاء إدخال الاسم.");
  const updates: Record<string, string | null> = { name };
  if (data.track !== undefined) updates.track = data.track || null;
  if (data.teachSubject !== undefined) updates.teachSubject = data.teachSubject || null;
  if (data.wilaya !== undefined) updates.wilaya = data.wilaya || null;
  await update(ref(rtdb, `users/${user.uid}`), updates);
  if (user.displayName !== name) await updateProfile(user, { displayName: name });
}

export async function updateAvatar(uid: string, dataUrl: string) {
  await update(ref(rtdb, `users/${uid}`), { avatarUrl: dataUrl });
}
