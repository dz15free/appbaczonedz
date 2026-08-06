"use client";

import { useEffect, useState } from "react";
import { ref, onValue, update, remove } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   تعديل الصفحات من لوحة الإدارة

   الأدمن يستطيع **استبدال محتوى صفحة كاملة بـHTML يكتبه**، أو تغيير
   عنوانها ووصفها فقط.

   ⚠️ **لماذا الاستبدال لا التعديل الحرفي للشيفرة:** صفحات الحاسبة
   تحوي منطق حساب حقيقياً — لو أتحنا تعديل شيفرتها لكان أوّل خطأ مطبعي
   يُعطّل الحساب أو يكسر البناء كلّه. فالمنطق يبقى في الشيفرة، والمحتوى
   التحريري يُستبدل بأمان.

   ⚠️ **وHTML الأدمن يُحقن كما هو (`dangerouslySetInnerHTML`)** — وهذا
   مقبول هنا **فقط** لأنّ الكاتب هو مالك الموقع نفسه، لا مستخدم عامّ.
   لا تُتِح هذا المسار لغير الأدمن أبداً: قاعدة الكتابة تحصره به.
════════════════════════════════════════════════════════════ */

const PATH = "pageOverrides";

export interface PageOverride {
  /** عنوان الصفحة — يظهر في المتصفّح وفي Google */
  title?: string;
  description?: string;
  /** محتوى HTML كامل يحلّ محلّ المحتوى الافتراضي */
  html?: string;
  /** مفعّل: بدونه يبقى المحتوى الأصلي */
  enabled?: boolean;
  /** يُخفي الصفحة كلّها (تُرجع 404 للزوّار) */
  disabled?: boolean;
  updatedAt?: number;
}

/** الصفحات القابلة للتعديل — قائمة صريحة، لا أي مسار */
export const EDITABLE_PAGES: { key: string; label: string; path: string }[] = [
  { key: "calculate", label: "حساب المعدل — الصفحة الرئيسية", path: "/calculate" },
  { key: "calculate-sciences", label: "حساب المعدل — علوم تجريبية", path: "/calculate/sciences" },
  { key: "calculate-math", label: "حساب المعدل — رياضيات", path: "/calculate/math" },
  { key: "calculate-engineering", label: "حساب المعدل — تقني رياضي (الهندسة)", path: "/calculate/engineering" },
  { key: "calculate-economy", label: "حساب المعدل — تسيير واقتصاد", path: "/calculate/economy" },
  { key: "calculate-letters", label: "حساب المعدل — آداب وفلسفة", path: "/calculate/letters" },
  { key: "calculate-languages", label: "حساب المعدل — لغات أجنبية", path: "/calculate/languages" },
  { key: "calculate-arts", label: "حساب المعدل — فنون", path: "/calculate/arts" },
  { key: "specialties", label: "دليل التخصّصات — الصفحة الرئيسية", path: "/specialties" },
];

export function useAllOverrides() {
  const [rows, setRows] = useState<Record<string, PageOverride>>({});
  useEffect(() => {
    const unsub = onValue(ref(rtdb, PATH), (snap) => {
      setRows((snap.val() as Record<string, PageOverride> | null) ?? {});
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);
  return rows;
}

/** لصفحة واحدة — تُستعمل في الصفحة نفسها */
export function usePageOverride(key: string) {
  const [o, setO] = useState<PageOverride | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onValue(
      ref(rtdb, `${PATH}/${key}`),
      (snap) => { setO((snap.val() as PageOverride | null) ?? null); setLoading(false); },
      () => setLoading(false),
    );
    return () => { if (typeof unsub === "function") unsub(); };
  }, [key]);
  return { override: o, loading };
}

export async function savePageOverride(key: string, o: PageOverride) {
  const clean: Record<string, unknown> = { updatedAt: Date.now() };
  // القاعدة ترفض undefined وتُسقط الكتابة كلّها
  if (o.title !== undefined) clean.title = o.title.slice(0, 200);
  if (o.description !== undefined) clean.description = o.description.slice(0, 400);
  if (o.html !== undefined) clean.html = o.html;
  if (o.enabled !== undefined) clean.enabled = Boolean(o.enabled);
  if (o.disabled !== undefined) clean.disabled = Boolean(o.disabled);
  await update(ref(rtdb, `${PATH}/${key}`), clean);
}

export async function resetPageOverride(key: string) {
  await remove(ref(rtdb, `${PATH}/${key}`));
}
