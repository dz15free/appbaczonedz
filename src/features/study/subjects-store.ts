"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { isFirebaseConfigured, rtdb } from "@/lib/firebase/config";
import { ALL_SUBJECTS, type Subject } from "@/lib/constants";

/* ════════════════════════════════════════════════════════════
   سجلّ المواد — مصدر واحد للموقع كلّه

   كانت المواد مكتوبة في **ثلاثة أماكن منفصلة**:
     • `lib/constants.ts` → الغرف والتصفية
     • `create-room-dialog.tsx` → قائمة إنشاء غرفة
     • `library/page.tsx` → المكتبة
   فإضافة مادّة تعني تعديل ثلاثة ملفّات وإعادة نشر، ونسيان واحد يعني
   مادّة تظهر في الغرف وتغيب عن المكتبة.

   الآن مصدر واحد يقرأ منه الجميع: الثابت في الشيفرة كأساس، وما يضيفه
   الأدمن فوقه.

   لماذا نُبقي الثابت: يعمل فوراً بلا شبكة، ولا يستهلك حصّة قراءة،
   ويصمد لو سقطت قاعدة البيانات — فلا تفرغ قوائم الموقع كلّها.

   والتعديل يفوز على الثابت عند تطابق المعرّف، فتستطيع **تصحيح اسم**
   مادّة ثابتة دون لمس الشيفرة.
════════════════════════════════════════════════════════════ */

const PATH = "siteSubjects";

export interface SiteSubject extends Subject {
  /** مخفيّة: تبقى في البيانات القديمة ولا تظهر في قوائم الاختيار */
  hidden?: boolean;
  /** ترتيب العرض — الأصغر أوّلاً */
  order?: number;
}

type Row = { name?: string; hidden?: boolean; order?: number };

/** يدمج الثابت مع تعديلات الأدمن ويُرتّب */
export function mergeSubjects(overrides: Record<string, Row>): SiteSubject[] {
  const map = new Map<string, SiteSubject>();
  ALL_SUBJECTS.forEach((s, i) => map.set(s.id, { ...s, order: i }));

  for (const [id, row] of Object.entries(overrides ?? {})) {
    const base = map.get(id);
    map.set(id, {
      id,
      name: (row?.name ?? base?.name ?? id).trim() || id,
      hidden: row?.hidden === true,
      order: typeof row?.order === "number" ? row.order : (base?.order ?? 999),
    });
  }
  return [...map.values()].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name, "ar"),
  );
}

/**
 * المواد الظاهرة للاختيار — يستعملها كل مكان في الموقع.
 * تبدأ بالثابت فوراً ثم تُحدَّث من قاعدة البيانات، فلا تومض القوائم
 * فارغة أثناء التحميل.
 */
export function useSiteSubjects(includeHidden = false) {
  const [subjects, setSubjects] = useState<SiteSubject[]>(() => mergeSubjects({}));

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onValue(ref(rtdb, PATH), (snap) => {
      setSubjects(mergeSubjects((snap.val() as Record<string, Row> | null) ?? {}));
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  return includeHidden ? subjects : subjects.filter((s) => !s.hidden);
}

/** الاسم المعروض لمعرّف — يقبل معرّفاً غير معروف بدل أن يُظهر فراغاً */
export function subjectName(subjects: SiteSubject[], id: string): string {
  return subjects.find((s) => s.id === id)?.name ?? id;
}

/* ── عمليات الأدمن ── */

/** معرّف مشتقّ من الاسم: مستقرّ، ولا يكسر ربط المحتوى القديم عند التعديل */
export function slugifySubject(name: string): string {
  return (
    name.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 40) ||
    `sub-${Date.now().toString(36)}`
  );
}

export async function addSubject(name: string, id?: string) {
  const key = (id ?? slugifySubject(name)).trim();
  if (!key || !name.trim()) return null;
  await set(ref(rtdb, `${PATH}/${key}`), { name: name.trim().slice(0, 120), hidden: false });
  return key;
}

export async function renameSubject(id: string, name: string) {
  if (!name.trim()) return;
  await update(ref(rtdb, `${PATH}/${id}`), { name: name.trim().slice(0, 120) });
}

export async function setSubjectVisible(id: string, visible: boolean) {
  await update(ref(rtdb, `${PATH}/${id}`), { hidden: !visible });
}

/**
 * حذف نهائي — للمُضافة فقط.
 * المادّة الثابتة في الشيفرة لا تُحذف بحذف سجلّها؛ لذلك نُخفيها بدل أن
 * نُوهم الأدمن بحذف لا يحدث.
 */
export async function deleteSubject(id: string) {
  const isStatic = ALL_SUBJECTS.some((s) => s.id === id);
  if (isStatic) {
    await update(ref(rtdb, `${PATH}/${id}`), { hidden: true });
    return "hidden" as const;
  }
  await remove(ref(rtdb, `${PATH}/${id}`));
  return "deleted" as const;
}
