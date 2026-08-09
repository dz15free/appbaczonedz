"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight, faArrowLeft, faBars, faCheck, faCircleCheck, faLock,
  faPlay, faFilePdf, faFileLines, faLink, faUpRightFromSquare, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { loginHrefFor, useQueryParam } from "@/features/auth/use-require-auth";
import { listenPublicCourse, listenCourse, listenCourseContent } from "@/features/courses/courses";
import {
  useCourseAccess, useProgress, percentOf, setLessonDone, markLastLesson,
} from "@/features/courses/enrollment";
import {
  type Course, type CourseLesson, type LessonContent,
  LESSON_KIND_LABEL, embedUrl, providerOf, formatDuration, flatLessons,
} from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   مساحة التعلّم

   ليست «صفحة فيديو»: الطالب يجب أن يعرف في كل لحظة أين هو، وما
   أنهاه، وما التالي، وكم بقي. لذلك المنهج حاضر دائماً — عمود جانبي
   على الحاسوب، ودرج سفلي على الهاتف لا يقتطع من الشاشة الصغيرة.

   والمزوّد الخارجي **لا يظهر للطالب**: نُحوّل رابط Drive أو YouTube
   إلى إطار عرض داخل واجهة المنصّة. الرابط ناقل لا واجهة.

   دروس المعاينة تُفتح بلا تسجيل — من `coursesPublic` — أمّا بقيّة
   الروابط فمن `courseContent` التي تمنع قواعدها غير المشترك.
════════════════════════════════════════════════════════════ */

const KIND_ICON = { video: faPlay, pdf: faFilePdf, text: faFileLines, external: faLink } as const;

export default function CoursePlayerPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId as string;
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const wantedLesson = useQueryParam("lesson");

  const [pub, setPub] = useState<Course | null | undefined>(undefined);
  const [full, setFull] = useState<Course | null>(null);
  const [content, setContent] = useState<Record<string, LessonContent>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!courseId) return;
    const unsub = listenPublicCourse(courseId, setPub);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !user) return;
    const unsub = listenCourse(courseId, (c) => setFull(c));
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, user]);

  const course = pub ?? full ?? null;
  const { hasAccess } = useCourseAccess(course, user?.uid, isAdmin);

  /* الروابط الكاملة تُقرأ فقط لمن يملك حقّها — والقاعدة هي الحارس،
     لا هذا الشرط. الشرط هنا يمنع محاولة قراءة محكوم عليها بالفشل. */
  useEffect(() => {
    if (!courseId || !hasAccess) { setContent({}); return; }
    const unsub = listenCourseContent(courseId, setContent);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, hasAccess]);

  const lessons = useMemo(() => flatLessons(course?.sections ?? []), [course]);
  const progress = useProgress(user?.uid, courseId);

  // الدرس المفتوح: المطلوب في الرابط ← آخر درس ← أوّل درس
  useEffect(() => {
    if (currentId || !lessons.length) return;
    const wanted = wantedLesson && lessons.find((l) => l.id === wantedLesson);
    const last = progress.lastLesson && lessons.find((l) => l.id === progress.lastLesson);
    setCurrentId((wanted || last || lessons[0]).id);
  }, [lessons, wantedLesson, progress.lastLesson, currentId]);

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      // دروس المعاينة تُفتح للزائر؛ ما عداها يحتاج حساباً
      const l = lessons.find((x) => x.id === currentId);
      if (l && !l.preview) router.replace(loginHrefFor(`/courses/${courseId}/learn`));
    }
  }, [loading, user, lessons, currentId, courseId, router]);

  useEffect(() => {
    if (user?.uid && courseId && currentId && hasAccess) {
      void markLastLesson(user.uid, courseId, currentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, courseId, currentId, hasAccess]);

  if (pub === undefined && !full) {
    return <div className="grid min-h-[100dvh] place-items-center text-text-muted">جارٍ التحميل…</div>;
  }
  if (!course) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-extrabold">الدورة غير متاحة</h1>
          <Link href="/courses" className="mt-4 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-white">
            تصفّح الدورات
          </Link>
        </div>
      </div>
    );
  }

  const index = lessons.findIndex((l) => l.id === currentId);
  const lesson = index >= 0 ? lessons[index] : null;
  const unlocked = hasAccess || Boolean(lesson?.preview);
  const pct = percentOf(course, progress);
  const done = Boolean(lesson && progress.completed?.[lesson.id]);

  const url = lesson ? (content[lesson.id]?.url ?? lesson.url) : undefined;
  const resourceUrl = lesson ? content[lesson.id]?.resourceUrl : undefined;
  const text = lesson ? (content[lesson.id]?.text ?? lesson.text) : undefined;

  function goTo(id: string) {
    setCurrentId(id);
    setDrawer(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleDone() {
    if (!user?.uid || !lesson || !hasAccess || saving) return;
    setSaving(true);
    try {
      await setLessonDone(user.uid, course!, lesson.id, !done);
      // الانتقال التلقائي إلى التالي عند الإنهاء: هذا ما يتوقّعه الطالب
      if (!done && index >= 0 && index < lessons.length - 1) goTo(lessons[index + 1].id);
    } finally { setSaving(false); }
  }

  const Curriculum = (
    <nav aria-label="محتوى الدورة" className="space-y-2">
      {course.sections.map((s, si) => (
        <div key={s.id} className="overflow-hidden rounded-2xl border border-border">
          <p className="flex items-center gap-2 bg-background px-3 py-2.5 text-[12.5px] font-extrabold text-text-primary">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10.5px] text-primary">{si + 1}</span>
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
          </p>
          <ul className="divide-y divide-border">
            {(s.lessons ?? []).map((l) => {
              const active = l.id === currentId;
              const open = hasAccess || l.preview;
              const isDone = Boolean(progress.completed?.[l.id]);
              return (
                <li key={l.id}>
                  <button
                    onClick={() => open && goTo(l.id)}
                    disabled={!open}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-right transition ${
                      active ? "bg-primary/10" : open ? "hover:bg-primary/5" : "opacity-60"
                    }`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      isDone ? "bg-emerald-500/15 text-emerald-600"
                        : active ? "bg-primary text-white"
                        : open ? "bg-border text-text-muted" : "bg-border text-text-muted"
                    }`}>
                      <FontAwesomeIcon icon={isDone ? faCircleCheck : open ? KIND_ICON[l.kind] : faLock} className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[12.5px] font-bold ${active ? "text-primary" : "text-text-primary"}`}>
                        {l.title}
                      </span>
                      <span className="block text-[10.5px] text-text-muted">
                        {LESSON_KIND_LABEL[l.kind]}{l.duration ? ` · ${formatDuration(l.duration)}` : ""}
                      </span>
                    </span>
                    {!hasAccess && l.preview && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-600">معاينة</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-background pb-24 lg:pb-0">
      {/* ترويسة المشغّل */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-3 py-2.5 sm:px-4">
          <Link href={`/courses/${courseId}`} aria-label="رجوع إلى صفحة الدورة"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-text-muted transition hover:bg-primary/10 hover:text-primary">
            <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-text-primary">{course.title}</p>
            <p className="truncate text-[11px] text-text-muted">{lesson?.title ?? "—"}</p>
          </div>
          <div className="hidden w-40 shrink-0 sm:block">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-0.5 text-end text-[10.5px] font-bold text-primary">{pct}% مكتمل</p>
          </div>
          <button onClick={() => setDrawer(true)} aria-label="فتح محتوى الدورة"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-text-muted transition hover:border-primary hover:text-primary lg:hidden">
            <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 w-full bg-border sm:hidden">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_330px] lg:items-start">
        {/* ── منطقة الدرس ── */}
        <main className="min-w-0 space-y-4">
          {!unlocked ? (
            <div className="rounded-3xl border border-border bg-surface p-8 text-center">
              <FontAwesomeIcon icon={faLock} className="h-9 w-9 text-amber-500" />
              <h2 className="mt-3 font-display text-lg font-extrabold text-text-primary">هذا الدرس مقفل</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-text-muted">
                احصل على الدورة لفتح كل الدروس ومتابعة تقدّمك.
              </p>
              <Link href={`/courses/${courseId}`}
                className="mt-4 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-[13px] font-extrabold text-white">
                عودة إلى صفحة الدورة
              </Link>
            </div>
          ) : (
            <>
              <LessonViewer lesson={lesson} url={url} text={text} />

              <div className="rounded-3xl border border-border bg-surface p-4">
                <h1 className="font-display text-lg font-extrabold text-text-primary">{lesson?.title}</h1>
                <p className="mt-1 text-[11.5px] text-text-muted">
                  {lesson ? LESSON_KIND_LABEL[lesson.kind] : ""}
                  {lesson?.duration ? ` · ${formatDuration(lesson.duration)}` : ""}
                  {index >= 0 ? ` · الدرس ${index + 1} من ${lessons.length}` : ""}
                </p>
                {lesson?.description && (
                  <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-[1.9] text-text-muted">{lesson.description}</p>
                )}

                {resourceUrl && (
                  <a href={resourceUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-[12.5px] font-extrabold text-primary transition hover:bg-primary/5">
                    <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> مرفقات الدرس
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 opacity-60" />
                  </a>
                )}

                {hasAccess && (
                  <button
                    onClick={toggleDone}
                    disabled={saving}
                    className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-extrabold transition disabled:opacity-60 ${
                      done
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "bg-gradient-primary text-white shadow-glow"
                    }`}
                  >
                    <FontAwesomeIcon icon={done ? faCircleCheck : faCheck} className="h-4 w-4" />
                    {done ? "أنهيتَ هذا الدرس — إلغاء" : "تحديد كمُنجَز"}
                  </button>
                )}

                {!hasAccess && (
                  <p className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-[11.5px] font-bold text-amber-700">
                    هذه معاينة مجّانية — احصل على الدورة لحفظ تقدّمك وفتح بقيّة الدروس.
                  </p>
                )}
              </div>

              {/* التنقّل */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => index > 0 && goTo(lessons[index - 1].id)}
                  disabled={index <= 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" /> الدرس السابق
                </button>
                <button
                  onClick={() => index < lessons.length - 1 && goTo(lessons[index + 1].id)}
                  disabled={index >= lessons.length - 1}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  الدرس التالي <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </main>

        {/* ── المنهج (حاسوب) ── */}
        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <div className="rounded-3xl border border-border bg-surface p-3">
            <p className="px-1 pb-2 text-[12.5px] font-extrabold text-text-primary">
              محتوى الدورة · {lessons.length} درساً
            </p>
            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto pe-1">{Curriculum}</div>
          </div>
        </aside>
      </div>

      {/* ── المنهج (هاتف) — درج سفلي ── */}
      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="محتوى الدورة">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-3xl border-t border-border bg-surface"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-text-primary">محتوى الدورة</p>
                <p className="text-[11px] text-text-muted">{lessons.length} درساً · {pct}% مكتمل</p>
              </div>
              <button onClick={() => setDrawer(false)} aria-label="إغلاق"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="max-h-[64dvh] overflow-y-auto p-3">{Curriculum}</div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   عارض الدرس

   كل نوع وعرضه: الفيديو في إطار بنسبة 16:9، والملفّ في عارض Google
   داخل الصفحة، والنصّ بخطّ قراءة مريح. والمصدر الخارجي وحده يخرج من
   الصفحة — لأنّ كثيراً من المواقع تمنع التضمين، وإطار فارغ أسوأ من
   زرّ صريح.
════════════════════════════════════════════════════════════ */
function LessonViewer({
  lesson, url, text,
}: { lesson: CourseLesson | null; url?: string; text?: string }) {
  if (!lesson) return null;

  if (lesson.kind === "text") {
    return (
      <article className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
        <div className="whitespace-pre-wrap text-[15px] leading-[2] text-text-primary">
          {text || "لا يوجد نصّ لهذا الدرس بعد."}
        </div>
      </article>
    );
  }

  const embed = embedUrl(url);
  const provider = providerOf(url);

  if (!embed) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center">
        <FontAwesomeIcon icon={faLink} className="h-8 w-8 text-text-muted opacity-40" />
        <p className="mt-2.5 text-[13px] font-bold text-text-primary">محتوى هذا الدرس غير متاح حالياً</p>
        <p className="mt-1 text-[11.5px] text-text-muted">تواصل مع الأستاذ أو الإدارة إن استمرّت المشكلة.</p>
      </div>
    );
  }

  if (lesson.kind === "external" || provider === "direct" && !/\.(mp4|webm|ogg)(\?|$)/i.test(url ?? "")) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-center">
        <FontAwesomeIcon icon={faUpRightFromSquare} className="h-8 w-8 text-primary" />
        <p className="mt-2.5 text-[13.5px] font-extrabold text-text-primary">مصدر خارجي</p>
        <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-text-muted">
          هذا الدرس يُفتح على موقع المصدر في تبويب جديد.
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-[13px] font-extrabold text-white">
          فتح المصدر <FontAwesomeIcon icon={faUpRightFromSquare} className="h-3 w-3" />
        </a>
      </div>
    );
  }

  // فيديو مباشر (MP4…) — مشغّل المتصفّح أخفّ من أي إطار
  if (lesson.kind === "video" && provider === "direct") {
    return (
      <div className="overflow-hidden rounded-3xl border border-border bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={url} controls playsInline className="aspect-video w-full" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-black">
      <iframe
        src={embed}
        title={lesson.title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className={lesson.kind === "pdf" ? "h-[70dvh] w-full bg-white" : "aspect-video w-full"}
      />
    </div>
  );
}
