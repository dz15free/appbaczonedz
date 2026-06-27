"use client";

import { ref, get, set, update, push, onValue, remove, query, orderByChild, equalTo } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════
   نظام الوصول المدفوع بالأكواد (ملخّصات + غرف)
   - كل كود فريد، يُستخدم مرّة واحدة، يُقفل على أول حساب
   - عمولة الموقع نسبة مئوية (افتراضي 10%) يتحكّم بها الأدمن
════════════════════════════════════════════ */

export type PaidItemType = "library" | "room";

export interface AccessCode {
  id: string;
  code: string;            // الكود الفريد (يُعطى للطالب)
  itemType: PaidItemType;
  itemId: string;          // معرّف الملخّص أو الغرفة
  itemTitle: string;       // للعرض في السجلّ
  price: number;           // السعر بالدينار
  commissionPct: number;   // نسبة عمولة الموقع وقت الإنشاء
  ownerId: string;         // الأستاذ/الناشر
  ownerName: string;
  createdBy: string;       // من ولّد الكود (أستاذ أو أدمن)
  createdAt: number;
  // بعد الاستخدام:
  redeemedBy?: string;     // uid الطالب الذي قفل الكود
  redeemedName?: string;
  redeemedAt?: number;
  settled?: boolean;       // هل سوّى الأدمن حساب الأستاذ؟
  settledAt?: number;
}

/** نسبة العمولة العامة (settings/commissionPct) */
export function useCommissionPct(): number {
  // قراءة متزامنة عبر hook بسيط
  return 10; // قيمة افتراضية تُستبدل عبر listenCommissionPct عند الحاجة
}
export async function getCommissionPct(): Promise<number> {
  try {
    const snap = await get(ref(rtdb, "settings/commissionPct"));
    const v = snap.val();
    return typeof v === "number" ? v : 10;
  } catch { return 10; }
}
export async function setCommissionPct(pct: number) {
  await set(ref(rtdb, "settings/commissionPct"), Math.max(0, Math.min(100, pct)));
}
export function listenCommissionPct(cb: (pct: number) => void) {
  return onValue(ref(rtdb, "settings/commissionPct"), (snap) => {
    const v = snap.val();
    cb(typeof v === "number" ? v : 10);
  });
}

/** توليد كود فريد قابل للقراءة */
function genCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BZ-${part()}-${part()}`;
}

/** إنشاء كود وصول جديد لعنصر مدفوع */
export async function createAccessCode(input: {
  itemType: PaidItemType;
  itemId: string;
  itemTitle: string;
  price: number;
  ownerId: string;
  ownerName: string;
  createdBy: string;
}): Promise<string> {
  const commissionPct = await getCommissionPct();
  const code = genCode();
  const r = push(ref(rtdb, "accessCodes"));
  const data: Omit<AccessCode, "id"> = {
    code,
    itemType: input.itemType,
    itemId: input.itemId,
    itemTitle: input.itemTitle,
    price: input.price,
    commissionPct,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    createdBy: input.createdBy,
    createdAt: Date.now(),
  };
  await set(r, data);
  return code;
}

/** أكواد ولّدها مستخدم معيّن (أستاذ/أدمن) */
export function listenMyCodes(uid: string, cb: (codes: AccessCode[]) => void) {
  return onValue(query(ref(rtdb, "accessCodes"), orderByChild("createdBy"), equalTo(uid)), (snap) => {
    const val = (snap.val() as Record<string, Omit<AccessCode, "id">>) ?? {};
    cb(Object.entries(val).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.createdAt - a.createdAt));
  });
}

/** أكواد مرتبطة بأستاذ (مالك المحتوى) — لإحصائياته الخاصّة */
export function listenOwnerCodes(ownerId: string, cb: (codes: AccessCode[]) => void) {
  return onValue(query(ref(rtdb, "accessCodes"), orderByChild("ownerId"), equalTo(ownerId)), (snap) => {
    const val = (snap.val() as Record<string, Omit<AccessCode, "id">>) ?? {};
    cb(Object.entries(val).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.createdAt - a.createdAt));
  });
}

/** كل الأكواد (للأدمن: السجلّ المالي) */
export function listenAllCodes(cb: (codes: AccessCode[]) => void) {
  return onValue(query(ref(rtdb, "accessCodes"), orderByChild("createdAt")), (snap) => {
    const val = (snap.val() as Record<string, Omit<AccessCode, "id">>) ?? {};
    cb(Object.entries(val).map(([id, c]) => ({ id, ...c })).sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function deleteAccessCode(codeId: string) {
  await remove(ref(rtdb, `accessCodes/${codeId}`));
}

/** تعليم عملية بأنها سُوّيت (الأدمن دفع للأستاذ حصّته) */
export async function markSettled(codeId: string, settled: boolean) {
  await update(ref(rtdb, `accessCodes/${codeId}`), {
    settled,
    settledAt: settled ? Date.now() : null,
  });
}

/**
 * استبدال الكود من طرف الطالب:
 * - يتحقّق من وجوده وعدم استخدامه
 * - يقفله على حساب الطالب ويمنحه الوصول
 * يُرجع رسالة الخطأ أو null عند النجاح
 */
export async function redeemCode(code: string, uid: string, name: string): Promise<string | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return "أدخل الكود.";

  // ابحث عن الكود
  const snap = await get(query(ref(rtdb, "accessCodes"), orderByChild("code"), equalTo(trimmed)));
  const val = snap.val() as Record<string, Omit<AccessCode, "id">> | null;
  if (!val) return "الكود غير صحيح.";

  const entry = Object.entries(val)[0];
  if (!entry) return "الكود غير صحيح.";
  const [codeId, data] = entry;

  if (data.redeemedBy) {
    if (data.redeemedBy === uid) {
      // أعد منح الوصول (مفيد إن فُقد)
      await grantAccess(uid, data.itemType, data.itemId);
      return null;
    }
    return "هذا الكود مُستخدَم مسبقاً من حساب آخر.";
  }

  // اقفل الكود على هذا الطالب وامنحه الوصول (عمليتان)
  await update(ref(rtdb, `accessCodes/${codeId}`), {
    redeemedBy: uid, redeemedName: name, redeemedAt: Date.now(),
  });
  await grantAccess(uid, data.itemType, data.itemId);
  return null;
}

/** منح الوصول لعنصر مدفوع (يُخزّن تحت حساب الطالب) */
async function grantAccess(uid: string, itemType: PaidItemType, itemId: string) {
  await set(ref(rtdb, `userAccess/${uid}/${itemType}/${itemId}`), true);
}

/** هل لدى الطالب وصول لعنصر؟ (استماع حيّ) */
export function listenHasAccess(uid: string, itemType: PaidItemType, itemId: string, cb: (has: boolean) => void) {
  return onValue(ref(rtdb, `userAccess/${uid}/${itemType}/${itemId}`), (snap) => {
    cb(snap.val() === true);
  });
}

/** التحقّق مرّة واحدة */
export async function checkAccess(uid: string, itemType: PaidItemType, itemId: string): Promise<boolean> {
  try {
    const snap = await get(ref(rtdb, `userAccess/${uid}/${itemType}/${itemId}`));
    return snap.val() === true;
  } catch { return false; }
}

/** حساب توزيع المبلغ (عمولة الموقع وحصّة الأستاذ) */
export function splitAmount(price: number, commissionPct: number) {
  const commission = Math.round((price * commissionPct) / 100);
  const owner = price - commission;
  return { commission, owner };
}
