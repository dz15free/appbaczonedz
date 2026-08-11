"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck, faPlus, faTrash, faChevronUp, faChevronDown, faArrowRight,
  faArrowLeft, faFloppyDisk, faPaperPlane, faSpinner, faEye, faCircleInfo,
  faLayerGroup, faXmark, faGripLines, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useSiteSubjects } from "@/features/study/subjects-store";
import {
  createCourse, saveCourse, submitForReview, canTeacherEdit,
  type CourseDraftInput,
} from "@/features/courses/courses";
import {
  type Course, type CourseSection, type CourseLesson, type LessonContent, type LessonKind,
  COURSE_BRANCHES, LESSON_KIND_LABEL, COURSE_STATUS_LABEL,
  branchIds, isAllBranches, newId, validateLessonUrl, countLessons, sumDuration,
  formatDuration, providerOf,
} from "@/features/courses/types";
import { CourseCover, CoursePrice } from "@/features/courses/course-ui";

/* ════════════════════════════════════════════════════════════
   بنّاء الدورة — معالج من خمس خطوات

   الخطوات ليست زينة: بناء دورة كاملة في نموذج واحد يعني شاشة مرعبة
   على الهاتف وأستاذاً يتركها في منتصفها. كل خطوة تسأل سؤالاً واحداً،
   والتقدّم محفوظ في المسوّدة فلا يضيع شيء.

   وما **لا** يستطيعه الأستاذ هنا مقصود: لا نشر، ولا تغيير حالة، ولا
   منح وصول. القاعدة تمنعه أصلاً، والواجهة لا تعده بما سيُرفض.
════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 1, label: "المعلومات" },
  { id: 2, label: "النوع والسعر" },
  { id: 3, label: "المحتوى" },
  { id: 4, label: "المعاينة" },
  { id: 5, label: "الإرسال" },
] as const;

export interface BuilderProps {
  /** التعديل: الدورة الحالية ومحتواها */
  course?: Course;
  content?: Record<string, LessonContent>;
  teacher: { uid: string; name: string };
}

type Draft = Omit<CourseDraftInput, "content"> & { content: Record<string, LessonContent> };

function emptyDraft(): Draft {
  const sid = newId("s");
  return {
    title: "",
    shortDesc: "",
    fullDesc: "",
    coverUrl: "",
    subject: "",
    branches: { all: true },
    outcomes: [],
    type: "free",
    price: undefined,
    oldPrice: undefined,
    sections: [{ id: sid, title: "القسم الأوّل", lessons: [] }],
    content: {},
  };
}

function draftFrom(course: Course, content: Record<string, LessonContent>): Draft {
  return {
    title: course.title,
    shortDesc: course.shortDesc ?? "",
    fullDesc: course.fullDesc ?? "",
    coverUrl: course.coverUrl ?? "",
    subject: course.subject,
    branches: course.branches ?? { all: true },
    outcomes: course.outcomes ?? [],
    type: course.type,
    price: course.price,
    oldPrice: course.oldPrice,
    sections: (course.sections ?? []).map((s) => ({ ...s, lessons: s.lessons ?? [] })),
    content,
  };
}

export function CourseBuilder({ course, content, teacher }: BuilderProps) {
  const router = useRouter();
  const subjects = useSiteSubjects();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => (course ? draftFrom(course, content ?? {}) : emptyDraft()));
  const [courseId, setCourseId] = useState<string | undefined>(course?.id);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const locked = Boolean(course && !canTeacherEdit(course.status));

  useEffect(() => {
    if (!draft.subject && subjects.length) setDraft((d) => (d.subject ? d : { ...d, subject: subjects[0].id }));
  }, [subjects, draft.subject]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  /* ── التحقّق ── */
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!draft.title.trim()) e.title = "اسم الدورة مطلوب.";
    else if (draft.title.trim().length < 5) e.title = "اسم الدورة قصير جدّاً.";
    if (!draft.shortDesc?.trim()) e.shortDesc = "الوصف المختصر يظهر في بطاقة الدورة — لا تتركه فارغاً.";
    if (!draft.subject) e.subject = "اختر المادة.";
    if (!isAllBranches(draft.branches) && branchIds(draft.branches).length === 0) {
      e.branches = "اختر شعبة واحدة على الأقلّ، أو «كل الشعب».";
    }
    if (draft.type === "paid") {
      const p = Number(draft.price) || 0;
      if (p < 75) e.price = "الحدّ الأدنى للدفع الإلكتروني 75 دج.";
      if (draft.oldPrice && Number(draft.oldPrice) <= p) e.oldPrice = "السعر السابق يجب أن يكون أعلى من السعر الحالي.";
    }
    if (countLessons(draft.sections) === 0) e.lessons = "أضف درساً واحداً على الأقلّ.";
    for (const s of draft.sections) {
      if (!s.title.trim()) e.sections = "كل قسم يحتاج عنواناً.";
      for (const l of s.lessons ?? []) {
        if (!l.title.trim()) { e.lessons = "كل درس يحتاج عنواناً."; continue; }
        const u = draft.content[l.id]?.url ?? "";
        const v = validateLessonUrl(l.kind, u);
        if (v) e[`lesson-${l.id}`] = `«${l.title}»: ${v}`;
        if (l.kind === "text" && !(draft.content[l.id]?.text ?? "").trim()) {
          e[`lesson-${l.id}`] = `«${l.title}»: نصّ الدرس فارغ.`;
        }
      }
    }
    return e;
  }, [draft]);

  const lessonErrors = Object.entries(errors).filter(([k]) => k.startsWith("lesson-")).map(([, v]) => v);
  const valid = Object.keys(errors).length === 0;

  /* ── حفظ ── */
  async function persist(silent = false): Promise<string | null> {
    if (locked) return null;
    setSaving(true);
    setErr("");
    try {
      const input: CourseDraftInput = { ...draft, content: draft.content };
      if (courseId) {
        await saveCourse(courseId, input, teacher);
      } else {
        const id = await createCourse(input, teacher);
        setCourseId(id);
        // نُبدّل الرابط إلى صفحة التعديل: تحديث الصفحة بعدها لا يُنشئ نسخة ثانية
        window.history.replaceState(null, "", `/courses/${id}/edit`);
        if (!silent) setMsg("حُفظت المسوّدة.");
        return id;
      }
      if (!silent) setMsg("حُفظت التعديلات.");
      return courseId;
    } catch {
      setErr("تعذّر الحفظ — تحقّق من اتصالك ومن صلاحياتك.");
      return null;
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  }

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setErr("");
    try {
      const id = (await persist(true)) ?? courseId;
      if (!id) { setErr("احفظ المسوّدة أوّلاً."); return; }
      await submitForReview({
        ...(course ?? ({} as Course)),
        id,
        title: draft.title,
        teacherId: teacher.uid,
        teacherName: teacher.name,
      } as Course);
      router.push("/courses/teach?submitted=1");
    } catch {
      setErr("تعذّر الإرسال للمراجعة.");
    } finally { setSubmitting(false); }
  }

  /* ── عمليات الأقسام والدروس ── */
  function updateSections(fn: (s: CourseSection[]) => CourseSection[]) {
    setDraft((d) => ({ ...d, sections: fn(d.sections) }));
  }

  function addSection() {
    updateSections((s) => [...s, { id: newId("s"), title: `القسم ${s.length + 1}`, lessons: [] }]);
  }

  function moveSection(i: number, dir: -1 | 1) {
    updateSections((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  function addLesson(sid: string) {
    const id = newId("l");
    updateSections((s) => s.map((x) => x.id === sid
      ? { ...x, lessons: [...(x.lessons ?? []), { id, title: "", kind: "video" as LessonKind, preview: false }] }
      : x));
    setDraft((d) => ({ ...d, content: { ...d.content, [id]: {} } }));
  }

  function patchLesson(sid: string, lid: string, patch: Partial<CourseLesson>) {
    updateSections((s) => s.map((x) => x.id === sid
      ? { ...x, lessons: (x.lessons ?? []).map((l) => (l.id === lid ? { ...l, ...patch } : l)) }
      : x));
  }

  function patchContent(lid: string, patch: Partial<LessonContent>) {
    setDraft((d) => ({ ...d, content: { ...d.content, [lid]: { ...(d.content[lid] ?? {}), ...patch } } }));
  }

  function removeLesson(sid: string, lid: string) {
    updateSections((s) => s.map((x) => x.id === sid ? { ...x, lessons: (x.lessons ?? []).filter((l) => l.id !== lid) } : x));
  }

  function moveLesson(sid: string, i: number, dir: -1 | 1) {
    updateSections((s) => s.map((x) => {
      if (x.id !== sid) return x;
      const ls = [...(x.lessons ?? [])];
      const j = i + dir;
      if (j < 0 || j >= ls.length) return x;
      [ls[i], ls[j]] = [ls[j], ls[i]];
      return { ...x, lessons: ls };
    }));
  }

  /* ── الشُّعب ── */
  const allBranches = isAllBranches(draft.branches);
  const selected = branchIds(draft.branches);

  function toggleBranch(id: string) {
    setDraft((d) => {
      const cur = isAllBranches(d.branches) ? [] : branchIds(d.branches);
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (!next.length) return { ...d, branches: { all: true } };
      const map: Record<string, true> = {};
      next.forEach((x) => { map[x] = true; });
      return { ...d, branches: map };
    });
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-400/40 bg-amber-400/10 p-6 text-center">
        <FontAwesomeIcon icon={faTriangleExclamation} className="h-8 w-8 text-amber-500" />
        <h2 className="mt-3 font-display text-lg font-extrabold text-text-primary">
          الدورة في حالة «{COURSE_STATUS_LABEL[course!.status]}»
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-text-muted">
          لا يمكن تعديلها الآن. الدورة المرسَلة أو المنشورة تُعدَّل بعد أن تطلب الإدارة
          تعديلات عليها — كي لا يتغيّر محتواها بعد الموافقة دون مراجعة.
        </p>
        <Link href="/courses/teach"
          className="mt-4 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-[13px] font-extrabold text-white">
          دوراتي التعليمية
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* شريط الخطوات */}
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="خطوات إنشاء الدورة">
        {STEPS.map((s) => (
          <li key={s.id} className="shrink-0">
            <button
              onClick={() => setStep(s.id)}
              aria-current={step === s.id ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition ${
                step === s.id
                  ? "bg-gradient-primary text-white"
                  : step > s.id
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                    : "border border-border bg-surface text-text-muted hover:text-primary"
              }`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                step === s.id ? "bg-white/25" : step > s.id ? "bg-emerald-500/20" : "bg-border"
              }`}>
                {step > s.id ? <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" /> : s.id}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {/* ══ الخطوة ١ — المعلومات ══ */}
      {step === 1 && (
        <Panel title="المعلومات الأساسية" hint="ما يراه الطالب أوّلاً في بطاقة الدورة.">
          <Field label="اسم الدورة" error={errors.title} required>
            <input value={draft.title} onChange={(e) => set("title", e.target.value)}
              maxLength={160} placeholder="مثال: الدوال العددية — من الصفر إلى البكالوريا"
              className={inputCls(errors.title)} />
          </Field>

          <Field label="وصف مختصر" error={errors.shortDesc} required
            hint="سطر أو سطران يظهران في البطاقة ونتائج البحث.">
            <textarea value={draft.shortDesc} onChange={(e) => set("shortDesc", e.target.value)}
              rows={2} maxLength={300} className={inputCls(errors.shortDesc, true)} />
          </Field>

          <Field label="وصف كامل" hint="اشرح ما تغطّيه الدورة ومنهجك فيها.">
            <textarea value={draft.fullDesc} onChange={(e) => set("fullDesc", e.target.value)}
              rows={5} maxLength={4000} className={inputCls(undefined, true)} />
          </Field>

          <Field label="رابط صورة الغلاف" hint="رابط صورة مباشر (يفضَّل 16:9). اتركه فارغاً لغلاف افتراضي أنيق.">
            <input value={draft.coverUrl} onChange={(e) => set("coverUrl", e.target.value)}
              dir="ltr" placeholder="https://…" className={`${inputCls()} font-mono text-xs`} />
            {draft.coverUrl && (
              <div className="mt-2 overflow-hidden rounded-2xl border border-border">
                <CourseCover course={{ title: draft.title, coverUrl: draft.coverUrl, subject: draft.subject }}
                  className="aspect-[16/7] object-cover" rounded="" />
              </div>
            )}
          </Field>

          <Field label="المادة" error={errors.subject} required>
            <select value={draft.subject} onChange={(e) => set("subject", e.target.value)} className={inputCls(errors.subject)}>
              <option value="">اختر المادة</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>

          {/* الشُّعب — اختيار متعدّد حقيقي */}
          <Field
            label={`الشُّعب المستهدَفة${allBranches ? " — الجميع" : ` — ${selected.length} ${selected.length === 1 ? "شعبة" : "شعب"}`}`}
            error={errors.branches}
            required
            hint="اضغط على كل شعبة تريدها — يمكنك اختيار شعبتين أو ثلاث أو أكثر، أو «كل الشعب».">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set("branches", { all: true })}
                aria-pressed={allBranches}
                className={chipCls(allBranches)}
              >
                {allBranches && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />} كل الشعب
              </button>
              {COURSE_BRANCHES.map((b) => {
                const on = !allBranches && selected.includes(b.id);
                return (
                  <button key={b.id} type="button" onClick={() => toggleBranch(b.id)} aria-pressed={on} className={chipCls(on)}>
                    {on && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />} {b.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="ماذا سيتعلّم الطالب؟" hint="نقاط قصيرة تظهر في صفحة الدورة (حتى ١٠).">
            <OutcomesEditor value={draft.outcomes ?? []} onChange={(v) => set("outcomes", v)} />
          </Field>

          <div className="rounded-2xl border border-border bg-background p-3 text-[11.5px] leading-relaxed text-text-muted">
            <FontAwesomeIcon icon={faCircleInfo} className="me-1.5 h-3 w-3 text-primary" />
            الأستاذ صاحب الدورة هو <b className="text-text-primary">{teacher.name}</b> — يُسجَّل تلقائياً ولا يُعدَّل.
          </div>
        </Panel>
      )}

      {/* ══ الخطوة ٢ — النوع والسعر ══ */}
      {step === 2 && (
        <Panel title="نوع الدورة" hint="مجّانية تُفتح بالتسجيل، ومدفوعة تحتاج شراءً.">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["free", "paid"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                aria-pressed={draft.type === t}
                className={`rounded-2xl border p-4 text-right transition ${
                  draft.type === t ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-surface hover:border-primary/40"
                }`}
              >
                <p className="text-[14px] font-extrabold text-text-primary">
                  {t === "free" ? "دورة مجّانية" : "دورة مدفوعة"}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-text-muted">
                  {t === "free"
                    ? "يسجّل الطالب فوراً ويبدأ التعلّم. مناسبة لبناء ثقة الطلبة بك."
                    : "يدفع الطالب إلكترونياً أو عبر الإدارة، وتصلك حصّتك بعد خصم عمولة المنصّة."}
                </p>
              </button>
            ))}
          </div>

          {draft.type === "paid" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="السعر (دج)" error={errors.price} required>
                <input type="number" min={75} inputMode="numeric"
                  value={draft.price ?? ""} onChange={(e) => set("price", Number(e.target.value) || undefined)}
                  placeholder="1500" className={inputCls(errors.price)} />
              </Field>
              <Field label="السعر السابق (اختياري)" error={errors.oldPrice}
                hint="يظهر مشطوباً بجانب السعر الحالي.">
                <input type="number" min={0} inputMode="numeric"
                  value={draft.oldPrice ?? ""} onChange={(e) => set("oldPrice", Number(e.target.value) || undefined)}
                  placeholder="2500" className={inputCls(errors.oldPrice)} />
              </Field>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-border bg-background p-3.5 text-[11.5px] leading-relaxed text-text-muted">
            <FontAwesomeIcon icon={faCircleInfo} className="me-1.5 h-3 w-3 text-primary" />
            طرق الدفع وإدارة الوصول تُدار من المنصّة والإدارة. الأستاذ لا يمنح وصولاً ولا يُعدّل
            حالة دفع — وهذا ما يحمي الطرفين.
          </div>
        </Panel>
      )}

      {/* ══ الخطوة ٣ — المحتوى ══ */}
      {step === 3 && (
        <Panel title="محتوى الدورة" hint="أقسام، وداخل كل قسم دروس. رتّبها كما يتعلّمها الطالب.">
          {errors.lessons && <Alert text={errors.lessons} />}
          {errors.sections && <Alert text={errors.sections} />}

          <div className="space-y-3">
            {draft.sections.map((s, si) => (
              <div key={s.id} className="rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-[11px] font-extrabold text-primary">
                    {si + 1}
                  </span>
                  <input
                    value={s.title}
                    onChange={(e) => updateSections((all) => all.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                    maxLength={120}
                    aria-label={`عنوان القسم ${si + 1}`}
                    placeholder="عنوان القسم"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-[13.5px] font-bold outline-none focus:border-primary"
                  />
                  <IconBtn label="أعلى" icon={faChevronUp} onClick={() => moveSection(si, -1)} disabled={si === 0} />
                  <IconBtn label="أسفل" icon={faChevronDown} onClick={() => moveSection(si, 1)} disabled={si === draft.sections.length - 1} />
                  <IconBtn label="حذف القسم" icon={faTrash} danger
                    onClick={() => { if (confirm("حذف هذا القسم وكل دروسه؟")) updateSections((all) => all.filter((x) => x.id !== s.id)); }} />
                </div>

                <ul className="mt-2.5 space-y-2">
                  {(s.lessons ?? []).map((l, li) => (
                    <LessonEditor
                      key={l.id}
                      lesson={l}
                      index={li}
                      total={(s.lessons ?? []).length}
                      content={draft.content[l.id] ?? {}}
                      error={errors[`lesson-${l.id}`]}
                      onPatch={(p) => patchLesson(s.id, l.id, p)}
                      onContent={(p) => patchContent(l.id, p)}
                      onMove={(d) => moveLesson(s.id, li, d)}
                      onRemove={() => removeLesson(s.id, l.id)}
                    />
                  ))}
                </ul>

                <button type="button" onClick={() => addLesson(s.id)}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary">
                  <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> إضافة درس
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addSection}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-[13px] font-extrabold text-primary transition hover:bg-primary/10">
            <FontAwesomeIcon icon={faLayerGroup} className="h-3.5 w-3.5" /> إضافة قسم جديد
          </button>

          <div className="mt-3 rounded-2xl border border-border bg-background p-3.5 text-[11.5px] leading-relaxed text-text-muted">
            <FontAwesomeIcon icon={faCircleInfo} className="me-1.5 h-3 w-3 text-primary" />
            <b className="text-text-primary">تنبيه مهمّ للروابط:</b> إن استعملت Google Drive فاجعل صلاحية
            الملفّ «أي شخص لديه الرابط — مُشاهِد»، وإلّا رأى الطالب صفحة طلب إذن بدل الدرس.
            المنصّة تعرض المحتوى داخلها ولا تُظهر الرابط للطالب.
          </div>
        </Panel>
      )}

      {/* ══ الخطوة ٤ — المعاينة ══ */}
      {step === 4 && (
        <Panel title="هكذا سيراها الطالب" hint="معاينة مطابقة لصفحة الدورة الحقيقية.">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <CourseCover course={{ title: draft.title, coverUrl: draft.coverUrl, subject: draft.subject }}
              className="aspect-[16/7] object-cover" rounded="" />
            <div className="space-y-2.5 p-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary">
                  {subjects.find((x) => x.id === draft.subject)?.name ?? "—"}
                </span>
                <span className="rounded-full bg-border px-2.5 py-1 text-[11px] font-bold text-text-muted">
                  {allBranches ? "كل الشعب" : selected.map((id) => COURSE_BRANCHES.find((b) => b.id === id)?.name).join(" + ")}
                </span>
              </div>
              <h2 className="font-display text-xl font-extrabold text-text-primary">{draft.title || "بلا عنوان"}</h2>
              {draft.shortDesc && <p className="text-[13px] leading-relaxed text-text-muted">{draft.shortDesc}</p>}
              <p className="text-[12px] font-bold text-text-muted">{teacher.name}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                <span className="text-[11.5px] text-text-muted">
                  {countLessons(draft.sections)} درساً · {formatDuration(sumDuration(draft.sections))}
                </span>
                <CoursePrice course={{ type: draft.type, price: draft.price, oldPrice: draft.oldPrice }} />
              </div>
            </div>
          </div>

          {(draft.outcomes?.length ?? 0) > 0 && (
            <div className="mt-3 rounded-2xl border border-border bg-background p-3.5">
              <p className="text-[13px] font-extrabold text-text-primary">ماذا ستتعلّم؟</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {draft.outcomes!.map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-text-primary">
                    <FontAwesomeIcon icon={faCheck} className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {draft.sections.map((s, si) => (
              <div key={s.id} className="rounded-2xl border border-border">
                <p className="bg-background px-3.5 py-2.5 text-[12.5px] font-extrabold text-text-primary">
                  {si + 1}. {s.title || "قسم بلا عنوان"}
                </p>
                <ul className="divide-y divide-border">
                  {(s.lessons ?? []).map((l) => (
                    <li key={l.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                      <span className="text-[12.5px] font-bold text-text-primary">{l.title || "درس بلا عنوان"}</span>
                      <span className="text-[10.5px] text-text-muted">
                        {LESSON_KIND_LABEL[l.kind]}{l.duration ? ` · ${formatDuration(l.duration)}` : ""}
                      </span>
                      {l.preview && (
                        <span className="ms-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-600">معاينة</span>
                      )}
                    </li>
                  ))}
                  {!(s.lessons ?? []).length && <li className="px-3.5 py-2.5 text-[11.5px] text-text-muted">لا دروس في هذا القسم.</li>}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ══ الخطوة ٥ — الإرسال ══ */}
      {step === 5 && (
        <Panel title="إرسال الدورة للمراجعة" hint="الإدارة تراجع ثمّ تنشر. لا نشر مباشر.">
          {valid ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-emerald-700">
                <FontAwesomeIcon icon={faCheck} className="h-4 w-4" /> الدورة جاهزة للإرسال
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-emerald-800/80">
                {countLessons(draft.sections)} درساً في {draft.sections.length} أقسام ·{" "}
                {formatDuration(sumDuration(draft.sections))}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-extrabold text-danger">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4" /> أكمل ما يلي قبل الإرسال
              </p>
              <ul className="mt-2 space-y-1 text-[12px] text-danger">
                {[errors.title, errors.shortDesc, errors.subject, errors.branches, errors.price, errors.oldPrice, errors.sections, errors.lessons]
                  .filter(Boolean).map((e, i) => <li key={i}>• {e}</li>)}
                {lessonErrors.map((e, i) => <li key={`l${i}`}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-border bg-background p-3.5 text-[12px] leading-relaxed text-text-muted">
            بعد الإرسال تصبح الحالة <b className="text-text-primary">«بانتظار المراجعة»</b>، ويصل إشعار
            للإدارة. قد تطلب الإدارة تعديلات — وستجد ملاحظاتها في صفحة «دوراتي التعليمية»
            وتستطيع الردّ عليها هناك.
          </div>

          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-[14px] font-extrabold text-white shadow-glow transition disabled:opacity-50"
          >
            <FontAwesomeIcon icon={submitting ? faSpinner : faPaperPlane} className={`h-4 w-4 ${submitting ? "animate-spin" : ""}`} />
            {submitting ? "جارٍ الإرسال…" : "إرسال للمراجعة"}
          </button>
        </Panel>
      )}

      {/* شريط الإجراءات */}
      <div className="sticky bottom-[76px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2.5 backdrop-blur lg:bottom-3">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" /> السابق
        </button>

        <button
          onClick={() => void persist()}
          disabled={saving || !draft.title.trim()}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <FontAwesomeIcon icon={saving ? faSpinner : faFloppyDisk} className={`h-3 w-3 ${saving ? "animate-spin" : ""}`} />
          حفظ المسوّدة
        </button>

        {courseId && (
          <Link href={`/courses/${courseId}`} target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary">
            <FontAwesomeIcon icon={faEye} className="h-3 w-3" /> فتح الصفحة
          </Link>
        )}

        <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold">
          {err ? <span className="text-danger">{err}</span> : msg ? <span className="text-emerald-600">{msg}</span> : null}
        </span>

        <button
          onClick={() => setStep((s) => Math.min(5, s + 1))}
          disabled={step === 5}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white transition disabled:opacity-40"
        >
          التالي <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ── محرّر الدرس ── */
function LessonEditor({
  lesson, index, total, content, error, onPatch, onContent, onMove, onRemove,
}: {
  lesson: CourseLesson;
  index: number;
  total: number;
  content: LessonContent;
  error?: string;
  onPatch: (p: Partial<CourseLesson>) => void;
  onContent: (p: Partial<LessonContent>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!lesson.title);
  const provider = providerOf(content.url);

  return (
    <li className={`rounded-2xl border bg-surface ${error ? "border-danger/50" : "border-border"}`}>
      <div className="flex items-center gap-2 p-2.5">
        <FontAwesomeIcon icon={faGripLines} className="h-3 w-3 shrink-0 text-text-muted opacity-50" />
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-right">
          <span className="block truncate text-[12.5px] font-bold text-text-primary">
            {index + 1}. {lesson.title || "درس جديد"}
          </span>
          <span className="block text-[10.5px] text-text-muted">
            {LESSON_KIND_LABEL[lesson.kind]}{lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ""}
            {lesson.preview ? " · معاينة مجّانية" : ""}
          </span>
        </button>
        <IconBtn label="أعلى" icon={faChevronUp} onClick={() => onMove(-1)} disabled={index === 0} />
        <IconBtn label="أسفل" icon={faChevronDown} onClick={() => onMove(1)} disabled={index === total - 1} />
        <IconBtn label="حذف الدرس" icon={faTrash} danger onClick={() => { if (confirm("حذف هذا الدرس؟")) onRemove(); }} />
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border p-3">
          <input value={lesson.title} onChange={(e) => onPatch({ title: e.target.value })}
            maxLength={160} placeholder="عنوان الدرس" aria-label="عنوان الدرس"
            className={inputCls()} />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-muted">نوع الدرس</span>
              <select value={lesson.kind} onChange={(e) => onPatch({ kind: e.target.value as LessonKind })} className={inputCls()}>
                {(Object.keys(LESSON_KIND_LABEL) as LessonKind[]).map((k) => (
                  <option key={k} value={k}>{LESSON_KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-muted">المدّة التقريبية (دقيقة)</span>
              <input type="number" min={0} inputMode="numeric" value={lesson.duration ?? ""}
                onChange={(e) => onPatch({ duration: Number(e.target.value) || undefined })}
                placeholder="12" className={inputCls()} />
            </label>
          </div>

          {lesson.kind === "text" ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-muted">نصّ الدرس</span>
              <textarea value={content.text ?? ""} onChange={(e) => onContent({ text: e.target.value })}
                rows={6} maxLength={20000} className={inputCls(undefined, true)} />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-muted">
                {lesson.kind === "video" ? "رابط الفيديو (YouTube / Google Drive / MP4)"
                  : lesson.kind === "pdf" ? "رابط الملفّ (Google Drive / PDF)"
                  : "رابط المصدر الخارجي"}
              </span>
              <input value={content.url ?? ""} onChange={(e) => onContent({ url: e.target.value })}
                dir="ltr" placeholder="https://…" className={`${inputCls()} font-mono text-xs`} />
              {content.url && (
                <span className="mt-1 block text-[10.5px] font-bold text-text-muted">
                  المزوّد المكتشَف:{" "}
                  <span className="text-primary">
                    {provider === "youtube" ? "YouTube" : provider === "drive" ? "Google Drive" : provider === "direct" ? "رابط مباشر" : "غير معروف"}
                  </span>
                </span>
              )}
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-text-muted">وصف الدرس (اختياري)</span>
            <textarea value={lesson.description ?? ""} onChange={(e) => onPatch({ description: e.target.value })}
              rows={2} maxLength={600} className={inputCls(undefined, true)} />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-text-muted">مرفق إضافي (اختياري)</span>
            <input value={content.resourceUrl ?? ""} onChange={(e) => onContent({ resourceUrl: e.target.value })}
              dir="ltr" placeholder="https://… (تمارين، ملخّص…)" className={`${inputCls()} font-mono text-xs`} />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
            <span className="text-[12px] font-bold text-text-primary">
              معاينة مجّانية
              <span className="block text-[10.5px] font-normal text-text-muted">يفتحه أي زائر قبل الشراء.</span>
            </span>
            <input type="checkbox" checked={Boolean(lesson.preview)}
              onChange={(e) => onPatch({ preview: e.target.checked })}
              className="h-5 w-5 accent-[rgb(var(--bz-primary))]" />
          </label>

          {error && <p className="text-[11px] font-bold text-danger">{error}</p>}
        </div>
      )}
    </li>
  );
}

/* ── محرّر «ماذا ستتعلّم» ── */
function OutcomesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) { e.preventDefault(); onChange([...value, text.trim()].slice(0, 10)); setText(""); }
          }}
          maxLength={200}
          placeholder="مثال: حلّ تمارين الدوال في البكالوريا بثقة"
          aria-label="نقطة تعلّم جديدة"
          className={inputCls()}
        />
        <button type="button" disabled={!text.trim() || value.length >= 10}
          onClick={() => { onChange([...value, text.trim()].slice(0, 10)); setText(""); }}
          className="shrink-0 rounded-xl bg-primary/10 px-4 text-[12px] font-extrabold text-primary disabled:opacity-40">
          <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
        </button>
      </div>
      {value.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {value.map((o, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <FontAwesomeIcon icon={faCheck} className="h-3 w-3 shrink-0 text-emerald-500" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-primary">{o}</span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="حذف" className="shrink-0 text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── عناصر صغيرة مشتركة ── */

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="font-display text-lg font-extrabold text-text-primary">{title}</h2>
      {hint && <p className="mt-0.5 text-[12px] text-text-muted">{hint}</p>}
      <div className="mt-4 space-y-3.5">{children}</div>
    </section>
  );
}

function Field({
  label, hint, error, required, children,
}: { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-extrabold text-text-primary">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {hint && <span className="mb-1.5 block text-[11px] leading-relaxed text-text-muted">{hint}</span>}
      {children}
      {error && <span className="mt-1 block text-[11px] font-bold text-danger">{error}</span>}
    </label>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] font-bold text-danger">
      <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" /> {text}
    </p>
  );
}

function IconBtn({
  icon, label, onClick, disabled, danger,
}: { icon: typeof faTrash; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border transition disabled:opacity-30 ${
        danger ? "text-text-muted hover:border-danger hover:text-danger" : "text-text-muted hover:border-primary hover:text-primary"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="h-3 w-3" />
    </button>
  );
}

function inputCls(error?: string, area = false) {
  return `w-full rounded-xl border bg-background px-3 text-[13.5px] outline-none transition ${
    area ? "resize-y py-2.5" : "h-11"
  } ${error ? "border-danger/60 focus:border-danger" : "border-border focus:border-primary"}`;
}

function chipCls(on: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-extrabold transition ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:border-primary/50 hover:text-primary"
  }`;
}
