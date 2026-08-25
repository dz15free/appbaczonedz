"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, update, remove } from "firebase/database";
import { isFirebaseConfigured, rtdb } from "@/lib/firebase/config";

/* ════════════════════════════════════════════════════════════
   قائمة الموقع — يتحكّم بها الأدمن

   🐛 **سبب تكرار «حساب معدل البكالوريا»**: كانت الروابط في **ثلاث
   قوائم منفصلة** في الشيفرة — `MORE_DROPDOWN_BASE` و`dynamicLinks`
   و`MENU_ITEMS_EXTERNAL` — تُدمج بطرق مختلفة للحاسوب والهاتف. فظهر
   الرابط مرّتين على الحاسوب (القديم والجديد)، ومرّة واحدة بالرابط
   القديم على الهاتف.

   **مصدر واحد يُنهي هذا الصنف من الأعطاب نهائياً**: قائمة واحدة تُقرأ
   في المكانين، فيستحيل أن يختلفا.

   والافتراضي في الشيفرة يعمل فوراً بلا شبكة، وما يحفظه الأدمن يفوز
   عليه — فلو سقطت قاعدة البيانات لا تفرغ قائمة الموقع.
════════════════════════════════════════════════════════════ */

const PATH = "settings/navLinks";

export interface NavLink {
  id: string;
  label: string;
  href: string;
  /** اسم الأيقونة في نظامنا — أو فارغ */
  icon?: string;
  /** يُفتح في تبويب جديد. يُشتقّ تلقائياً إن بدأ الرابط بـhttp */
  external?: boolean;
  /** ترتيب العرض — الأصغر أوّلاً */
  order: number;
  hidden?: boolean;
}

/* الافتراضي: نفس ما كان معروضاً، **بلا تكرار**، ومرتّب بالأهمّية.
   «حساب معدل البكالوريا» يشير إلى صفحتنا الداخلية `/calculate` لا إلى
   الرابط القديم — وهو سبب التكرار. */
export const DEFAULT_NAV: NavLink[] = [
  { id: "specialties", label: "التخصصات الجامعية", href: "/specialties", icon: "book", order: 10 },
  { id: "calculate", label: "حساب معدل البكالوريا", href: "/calculate", icon: "poll", order: 20 },
  { id: "tools", label: "أدوات البكالوريا", href: "/tools", icon: "grid", order: 22 },
  { id: "guides", label: "أدلّة التوجيه", href: "/guides", icon: "book", order: 24 },
  { id: "planner", label: "مخطّط البكالوريا للطباعة", href: "/tools/planner", icon: "file", order: 30 },
  { id: "weighted", label: "حساب المعدّل الموزون", href: "https://www.baczonedz.com/p/2026.html", icon: "target", external: true, order: 40 },
  { id: "past", label: "بكالوريات سابقة", href: "https://www.baczonedz.com/p/blog-page_9.html", icon: "file", external: true, order: 50 },
  { id: "sim", label: "محاكاة البكالوريا", href: "https://www.baczonedz.com/p/blog-page_81.html", icon: "check", external: true, order: 60 },
  { id: "program", label: "إنشاء برنامج مراجعة", href: "https://www.baczonedz.com/p/blog-page_5.html", icon: "timer", external: true, order: 70 },
];

function normalize(rows: NavLink[]): NavLink[] {
  return rows
    .filter((l) => l.label?.trim() && l.href?.trim())
    .map((l) => ({
      ...l,
      // الرابط الخارجي يُشتقّ من شكله: الأدمن لا يجب أن يتذكّر خانة
      external: l.external ?? /^https?:\/\//i.test(l.href),
    }))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/** يدمج الافتراضي مع تعديلات الأدمن — التعديل يفوز بالمعرّف */
export function mergeNav(overrides: Record<string, Partial<NavLink>> | null): NavLink[] {
  const map = new Map<string, NavLink>();
  for (const d of DEFAULT_NAV) map.set(d.id, { ...d });
  for (const [id, o] of Object.entries(overrides ?? {})) {
    const base = map.get(id);
    // `__deleted` يُخفي عنصراً افتراضياً لا يمكن حذفه من الشيفرة
    if (o && (o as { deleted?: boolean }).deleted) { map.delete(id); continue; }
    map.set(id, {
      id,
      label: o?.label ?? base?.label ?? id,
      href: o?.href ?? base?.href ?? "#",
      icon: o?.icon ?? base?.icon,
      external: o?.external ?? base?.external,
      order: typeof o?.order === "number" ? o.order : (base?.order ?? 999),
      hidden: o?.hidden ?? base?.hidden,
    });
  }
  return normalize([...map.values()]);
}

/** للاستعمال في الواجهة — يبدأ بالافتراضي فلا تومض القائمة فارغة */
export function useNavLinks(includeHidden = false) {
  const [links, setLinks] = useState<NavLink[]>(() => mergeNav(null));

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onValue(ref(rtdb, PATH), (snap) => {
      setLinks(mergeNav((snap.val() as Record<string, Partial<NavLink>> | null) ?? null));
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  return includeHidden ? links : links.filter((l) => !l.hidden);
}

/* ── عمليات الأدمن ── */

export async function saveNavLink(l: NavLink) {
  const clean: Record<string, unknown> = {
    label: l.label.trim().slice(0, 80),
    href: l.href.trim().slice(0, 400),
    order: Number(l.order) || 999,
    hidden: Boolean(l.hidden),
    external: /^https?:\/\//i.test(l.href.trim()),
  };
  if (l.icon) clean.icon = l.icon;
  await update(ref(rtdb, `${PATH}/${l.id}`), clean);
}

/** حذف: الافتراضي يُعلَّم محذوفاً (لا يمكن مسحه من الشيفرة)، والمُضاف يُمسح */
export async function deleteNavLink(id: string) {
  const isDefault = DEFAULT_NAV.some((d) => d.id === id);
  if (isDefault) await set(ref(rtdb, `${PATH}/${id}`), { deleted: true });
  else await remove(ref(rtdb, `${PATH}/${id}`));
}

export function newNavId(label: string): string {
  const slug = label.trim().toLowerCase()
    .replace(/\s+/g, "-").replace(/[^a-z0-9\u0600-\u06FF-]/g, "").slice(0, 30);
  return slug || `link-${Date.now().toString(36)}`;
}
