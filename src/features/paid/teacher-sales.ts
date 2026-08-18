"use client";

import { ref, onValue, update, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   مبيعات الأستاذ عبر الدفع الإلكتروني · وبيانات تواصله

   **مبيعات الأكواد ومبيعات Chargily تظهران في لوحة واحدة.** لوحتان
   منفصلتان تعنيان أن يجمع الأستاذ أرباحه بنفسه — وهو أوّل مصدر للشكّ
   في المنصّة.

   والعمولة **مجمّدة مع كل عملية** لا محسوبة وقت العرض: لو حُسبت عند
   الفتح لتغيّرت أرباح مبيعات قديمة كلّما عدّل الأدمن النسبة.
════════════════════════════════════════════════════════════ */

export interface TeacherSale {
  id: string;
  buyerUid: string;
  itemType: "library" | "room" | "course";
  itemId: string;
  itemTitle: string;
  price: number;
  commissionPct: number;
  commission: number;
  net: number;
  method: "chargily";
  settled: boolean;
  paidAt: number;
}

/** مبيعات أستاذ واحد — يقرأها هو والأدمن فقط */
export function listenTeacherSales(uid: string, cb: (rows: TeacherSale[]) => void) {
  return onValue(ref(rtdb, `teacherSales/${uid}`), (snap) => {
    const val = (snap.val() as Record<string, Omit<TeacherSale, "id">> | null) ?? {};
    const rows = Object.entries(val).map(([id, r]) => ({ id, ...r }));
    rows.sort((a, b) => b.paidAt - a.paidAt);   // الأحدث أوّلاً
    cb(rows);
  });
}

/** يُعلّم الأدمن العملية بعد تحويل المبلغ فعلاً إلى الأستاذ */
export async function markSaleSettled(ownerId: string, saleId: string, settled: boolean) {
  await update(ref(rtdb, `teacherSales/${ownerId}/${saleId}`), { settled });
  await update(ref(rtdb, `chargilyPayments/${saleId}`), { settled });
}

/* ── بيانات تواصل الأستاذ ── */

export type TeacherContactVisibility = "admin" | "students" | "all" | "private" | "public";

export interface TeacherContact {
  /** رقم الهاتف — اختياري تماماً */
  phone?: string;
  /** روابط: فيسبوك · تيليغرام · إنستغرام · موقع… */
  links?: { label: string; url: string }[];
  /** جمهور الظهور الجديد: الإدارة أو الطلاب أو الجميع؛ private/public قديمان للتوافق. */
  visibility?: TeacherContactVisibility;
}

export function listenTeacherContact(uid: string, cb: (c: TeacherContact | null) => void) {
  return onValue(ref(rtdb, `teacherContact/${uid}`), (snap) => {
    cb((snap.val() as TeacherContact | null) ?? null);
  });
}

function normalizeContactVisibility(value: TeacherContactVisibility | undefined): "admin" | "students" | "all" {
  if (value === "public" || value === "all") return "all";
  if (value === "students") return "students";
  return "admin";
}

export async function saveTeacherContact(uid: string, c: TeacherContact) {
  const clean: Record<string, unknown> = {
    visibility: normalizeContactVisibility(c.visibility),
    updatedAt: Date.now(),
  };
  // قاعدة البيانات ترفض undefined وتُسقط الكتابة كلّها
  if (c.phone?.trim()) clean.phone = c.phone.trim().slice(0, 40);
  const links = (c.links ?? [])
    .filter((l) => l.url?.trim() && l.label?.trim())
    .slice(0, 6)
    .map((l) => ({ label: l.label.trim().slice(0, 40), url: normalizeUrl(l.url) }));
  if (links.length) clean.links = links;
  await update(ref(rtdb, `teacherContact/${uid}`), clean);
}

export async function clearTeacherContact(uid: string) {
  await remove(ref(rtdb, `teacherContact/${uid}`));
}

/** رابط بلا بروتوكول لا يعمل: `facebook.com/x` يُفتح كمسار داخلي */
export function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t.slice(0, 300);
  return `https://${t}`.slice(0, 300);
}

/** ملخّص مالي جاهز للعرض */
export function summarize(sales: TeacherSale[]) {
  const gross = sales.reduce((s, x) => s + (x.price || 0), 0);
  const net = sales.reduce((s, x) => s + (x.net || 0), 0);
  const commission = sales.reduce((s, x) => s + (x.commission || 0), 0);
  const settled = sales.filter((x) => x.settled).reduce((s, x) => s + (x.net || 0), 0);
  return { gross, net, commission, settled, pending: net - settled, count: sales.length };
}
