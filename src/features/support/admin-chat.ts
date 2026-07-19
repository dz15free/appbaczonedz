"use client";

import { useEffect, useState } from "react";
import { ref, push, update, onValue, query, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { threadId } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   دردشة الدعم مع إدارة الموقع

   لا نظام رسائل جديد: نُعيد استعمال عقدة dms الموجودة.
   خيطان منفصلان حتى لا تختلط أسئلة الدفع بالأسئلة العامة:

     dms/{a_b}       → الدردشة العامة (نفس خيط الرسائل الخاصة)
     dms/{a_b}_pay   → دردشة الدفع وحدها

   قاعدة dms الحالية تشترط أن يحوي اسم الخيط هوية الكاتب،
   واللاحقة _pay لا تكسر ذلك — فلا حاجة لتعديل القواعد.
════════════════════════════════════════════════════════════ */

export type SupportKind = "general" | "payment";

export interface SupportInfo {
  adminUid?: string;
  adminName: string;
  adminEmail: string;
}

export const SUPPORT_DEFAULTS = {
  adminName: "BaczoneDz",
  adminEmail: "aouina.said.netfer@gmail.com",
};

export interface SupportMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export function supportThreadId(uid: string, adminUid: string, kind: SupportKind) {
  const base = threadId(uid, adminUid);
  return kind === "payment" ? `${base}_pay` : base;
}

/** هوية جهة الدعم — يضبطها الأدمن مرّة من لوحة التحكّم */
export function useSupportInfo(): SupportInfo {
  const [info, setInfo] = useState<SupportInfo>({ ...SUPPORT_DEFAULTS });
  useEffect(() => {
    return onValue(ref(rtdb, "settings/support"), (snap) => {
      const v = (snap.val() as Partial<SupportInfo> | null) ?? {};
      setInfo({
        adminUid: v.adminUid,
        adminName: v.adminName || SUPPORT_DEFAULTS.adminName,
        adminEmail: v.adminEmail || SUPPORT_DEFAULTS.adminEmail,
      });
    });
  }, []);
  return info;
}

export async function setSupportAccount(adminUid: string, adminName: string, adminEmail: string) {
  await update(ref(rtdb, "settings/support"), { adminUid, adminName, adminEmail });
}

export function listenSupportMessages(
  uid: string, adminUid: string, kind: SupportKind, cb: (list: SupportMessage[]) => void
) {
  const tid = supportThreadId(uid, adminUid, kind);
  const q = query(ref(rtdb, `dms/${tid}/messages`), limitToLast(200));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, Omit<SupportMessage, "id">>) ?? {};
    cb(
      Object.entries(val)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => a.createdAt - b.createdAt)
    );
  });
}

export async function sendSupportMessage(
  me: { uid: string; name: string },
  adminUid: string,
  adminName: string,
  kind: SupportKind,
  text: string
) {
  const trimmed = text.trim();
  if (!trimmed || !adminUid) return;
  const tid = supportThreadId(me.uid, adminUid, kind);

  await push(ref(rtdb, `dms/${tid}/messages`), {
    senderId: me.uid,
    text: trimmed.slice(0, 2000),
    createdAt: Date.now(),
  });

  // قائمة المحادثات — نميّز خيط الدفع باسمه حتى يظهر منفصلاً عند الأدمن
  const label = kind === "payment" ? `${adminName} — الدفع` : adminName;
  const myLabel = kind === "payment" ? `${me.name} — الدفع` : me.name;
  const key = kind === "payment" ? `${adminUid}_pay` : adminUid;
  const adminKey = kind === "payment" ? `${me.uid}_pay` : me.uid;

  await update(ref(rtdb, `dmThreads/${me.uid}`), {
    [key]: { name: label, lastText: trimmed, lastAt: Date.now() },
  });
  await update(ref(rtdb, `dmThreads/${adminUid}`), {
    [adminKey]: { name: myLabel, lastText: trimmed, lastAt: Date.now() },
  });
}

/** عدد الرسائل غير المقروءة تقريبياً — آخر رسالة من الطرف الآخر */
export async function hasUnreadFromAdmin(uid: string, adminUid: string, kind: SupportKind) {
  const tid = supportThreadId(uid, adminUid, kind);
  const snap = await get(query(ref(rtdb, `dms/${tid}/messages`), limitToLast(1)));
  const val = (snap.val() as Record<string, SupportMessage> | null) ?? null;
  if (!val) return false;
  const last = Object.values(val)[0];
  return last?.senderId === adminUid;
}
