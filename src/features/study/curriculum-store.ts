"use client";

import { ref, onValue, push, set, remove, update } from "firebase/database";
import { isFirebaseConfigured, rtdb } from "@/lib/firebase/config";
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
  if (!isFirebaseConfigured) { cb([]); return () => {}; }
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


/* ════════════════════════════════════════════════════════════
   إخفاء مادّة — تحكّم الأدمن

   الحذف الحقيقي لا يكفي: الدروس الثابتة في الشيفرة لا تُحذف من قاعدة
   البيانات. فنُسجّل «مادّة مخفيّة» فتختفي من تتبّع الدراسة ومن بطاقات
   المراجعة معاً، سواء كانت ثابتة أو مُضافة.

   والإخفاء **قابل للتراجع** بخلاف الحذف: خطأ الأدمن لا يُتلف بيانات.
   وتقدّم الطالب على دروسها يبقى محفوظاً، فإن أُعيدت عاد معها.
════════════════════════════════════════════════════════════ */

const HIDDEN = "curriculum/hiddenSubjects";

/** مفتاح آمن: قاعدة البيانات ترفض . $ # [ ] / في المفاتيح */
function subjKey(stream: string, subject: string) {
  return `${stream}__${subject}`.replace(/[.$#[\]/]/g, "_");
}

export function listenHiddenSubjects(cb: (hidden: Set<string>) => void) {
  if (!isFirebaseConfigured) { cb(new Set()); return () => {}; }
  return onValue(ref(rtdb, HIDDEN), (snap) => {
    const val = (snap.val() as Record<string, boolean> | null) ?? {};
    cb(new Set(Object.keys(val).filter((k) => val[k])));
  });
}

export function isSubjectHidden(hidden: Set<string>, stream: string, subject: string) {
  return hidden.has(subjKey(stream, subject));
}

export async function setSubjectHidden(stream: string, subject: string, hide: boolean) {
  const r = ref(rtdb, `${HIDDEN}/${subjKey(stream, subject)}`);
  if (hide) await set(r, true);
  else await remove(r);
}

/** حذف نهائي لكل دروس مادّة **مُضافة** — لا يمسّ الثابتة في الشيفرة */
export async function deleteSubjectLessons(rows: CustomLesson[], stream: string, subject: string) {
  let n = 0;
  for (const l of rows) {
    if (l.stream === stream && l.subject === subject && l.key) {
      await deleteLesson(l.key);
      n++;
    }
  }
  return n;
}


/* ── الشعب: إخفاء وإعادة تسمية ──
   الشعبة الثابتة في الشيفرة لا تُحذف بحذف سجلّها، فنُخفيها بدل أن
   نُوهم بحذف لا يحدث. وإعادة التسمية تنقل دروسها معها، وإلّا بقيت
   يتيمة تحت اسم لم يعد ظاهراً. */

const HSTREAM = "curriculum/hiddenStreams";
const RSTREAM = "curriculum/streamNames";

function safe(k: string) { return k.replace(/[.$#[\]/]/g, "_"); }

export function listenStreamMeta(
  cb: (m: { hidden: Set<string>; renames: Record<string, string> }) => void,
) {
  let hidden = new Set<string>();
  let renames: Record<string, string> = {};
  const emit = () => cb({ hidden, renames });
  if (!isFirebaseConfigured) { emit(); return () => {}; }
  const u1 = onValue(ref(rtdb, HSTREAM), (s) => {
    const v = (s.val() as Record<string, boolean> | null) ?? {};
    hidden = new Set(Object.keys(v).filter((k) => v[k]));
    emit();
  });
  const u2 = onValue(ref(rtdb, RSTREAM), (s) => {
    renames = (s.val() as Record<string, string> | null) ?? {};
    emit();
  });
  return () => {
    if (typeof u1 === "function") u1();
    if (typeof u2 === "function") u2();
  };
}

export function isStreamHidden(hidden: Set<string>, stream: string) {
  return hidden.has(safe(stream));
}

export async function setStreamHidden(stream: string, hide: boolean) {
  const r = ref(rtdb, `${HSTREAM}/${safe(stream)}`);
  if (hide) await set(r, true); else await remove(r);
}

/** إعادة تسمية شعبة **وتحديث دروسها المُضافة** حتى لا تُيتَّم */
export async function renameStream(rows: CustomLesson[], from: string, to: string) {
  const name = to.trim();
  if (!name || name === from) return 0;
  await set(ref(rtdb, `${RSTREAM}/${safe(from)}`), name);
  let n = 0;
  for (const l of rows) {
    if (l.stream === from && l.key) {
      await update(ref(rtdb, `${PATH}/${l.key}`), { stream: name });
      n++;
    }
  }
  return n;
}

/** حذف كل الدروس المُضافة لشعبة — الثابتة تُخفى فقط */
export async function deleteStreamLessons(rows: CustomLesson[], stream: string) {
  let n = 0;
  for (const l of rows) {
    if (l.stream === stream && l.key) { await deleteLesson(l.key); n++; }
  }
  return n;
}
