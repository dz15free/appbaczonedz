"use client";

import { get, ref, remove, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export const ACCOUNT_VERIFICATION_NOTIFICATION_ID = "account-verification";
export const ACCOUNT_VERIFICATION_NOTIFICATION_TYPE = "account_verification";

const noticeRef = (uid: string) => ref(rtdb, `notifications/${uid}/${ACCOUNT_VERIFICATION_NOTIFICATION_ID}`);

/** ينشئ إشعاراً ثابتاً للحساب غير المؤكد دون تكرار أو تغيير تاريخ إنشائه. */
export async function ensureAccountVerificationNotification(uid: string) {
  if (!uid) return;
  const target = noticeRef(uid);
  const snapshot = await get(target);
  if (snapshot.exists()) return;
  await set(target, {
    type: ACCOUNT_VERIFICATION_NOTIFICATION_TYPE,
    text: "أكّد بريدك الإلكتروني لإكمال حماية حسابك. يمكنك فتح إعدادات الأمان لإعادة إرسال رسالة التأكيد.",
    link: "/profile#account-security",
    read: false,
    persistent: true,
    createdAt: Date.now(),
  });
}

/** يحذف الإشعار الثابت بعد أن تصبح قيمة emailVerified صحيحة. */
export async function removeAccountVerificationNotification(uid: string) {
  if (!uid) return;
  await remove(noticeRef(uid));
}
