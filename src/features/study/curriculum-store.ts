"use client";

import { ref, onValue, push, set, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { LESSONS, type Lesson } from "@/features/study/curriculum";

/* ════════════════════════════════════════════════════════════
   مخزن المنهج — الثابت + المُضاف يدوياً

   ملفّ المناهج الذي أرسلتَه يغطّي جزءاً (علوم تجريبية ولغات جيّدتان،
   والباقي ناقص). فبدل انتظار ملفّ كامل، تُضيف أنت الناقص من لوحة
   الإدارة ويظهر فوراً لكل الطلاب.

   لماذا مصدران لا مصدر واحد:
   • الثابت في الشيفرة → يُحمَّل فوراً بلا انتظار الشبكة، ولا يستهلك
     حصّة قراءة، ويعمل حتى لو سقطت قاعدة البيانات.
   • المُضاف في قاعدة البيانات → يتغيّر بلا إعادة نشر للموقع.

   الدمج يعطي الأولوية للمُضاف عند تطابق المعرّف، فتستطيع **تصحيح**
   درساً في الملفّ الثابت دون لمس الشيفرة.
════════════════════════════════════════════════════════════ */

const PATH = "curriculum/lessons";

export interface CustomLesson extends Lesson {
  /** مفتاح السجلّ في قاعدة البيانات — للتعديل والحذف */
  key?: string;
}

/** الدروس المُضافة يدوياً فقط */
export function listenCustomLessons(cb: (rows: CustomLesson[]) => void) {
  return onValue(ref(rtdb, PATH), (snap) => {
    const val = (snap.val() as Record<string, Lesson> | null) ?? {};
    const rows = Object.entries(val).map(([key, l]) => ({ ...l, key }));
    rows.sort(
      (a, b) =>
        a.stream.localeCompare(b.stream, "ar") ||
        a.subject.localeCompare(b.subject, "ar") ||
        a.trimester - b.trimester ||
        a.order - b.order,
    );
    cb(rows);
  });
}

/**
 * المنهج الكامل = الثابت + المُضاف.
 * المُضاف يفوز عند تطابق `id` حتى يمكن تصحيح خطأ في الملفّ الثابت.
 */
export function mergeLessons(custom: CustomLesson[]): Lesson[] {
  const byId = new Map<string, Lesson>();
  for (const l of LESSONS) byId.set(l.id, l);
  for (const l of custom) byId.set(l.id, l);
  return [...byId.values()].sort(
    (a, b) =>
      a.stream.localeCompare(b.stream, "ar") ||
      a.subject.localeCompare(b.subject, "ar") ||
      a.trimester - b.trimester ||
      a.order - b.order,
  );
}

/** يُنشئ معرّفاً مستقرّاً حين لا يكتبه الأدمن — لا يعتمد على الوقت
    وحده كي لا يتغيّر مع كل حفظ ويكسر الربط بتقدّم الطالب. */
function makeId(l: Omit<Lesson, "id">): string {
  const slug = (t: string) =>
    t.trim().replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 24);
  return `CUS_${slug(l.stream)}_${slug(l.subject)}_${l.trimester}_${l.order}`;
}

export async function addLesson(l: Omit<Lesson, "id"> & { id?: string }) {
  const row: Lesson = {
    id: l.id?.trim() || makeId(l),
    title: l.title.trim(),
    unit: l.unit.trim(),
    subject: l.subject.trim(),
    stream: l.stream.trim(),
    order: Number(l.order) || 1,
    trimester: Number(l.trimester) || 1,
  };
  // قاعدة البيانات ترفض undefined — نبني كائناً نظيفاً صراحةً
  await set(push(ref(rtdb, PATH)), row);
  return row;
}

export async function updateLesson(key: string, patch: Partial<Lesson>) {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
  await update(ref(rtdb, `${PATH}/${key}`), clean);
}

export async function deleteLesson(key: string) {
  await remove(ref(rtdb, `${PATH}/${key}`));
}

/** إضافة دفعة واحدة — للصق ملفّ JSON كامل بدل إدخال درس درس */
export async function addLessonsBulk(rows: (Omit<Lesson, "id"> & { id?: string })[]) {
  let ok = 0;
  for (const r of rows) {
    if (!r.title?.trim() || !r.subject?.trim() || !r.stream?.trim()) continue;
    await addLesson(r);
    ok++;
  }
  return ok;
}
