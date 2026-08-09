"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight, faCheck, faChevronDown, faPlay, faLock, faFilePdf,
  faFileLines, faLink, faUsers, faCircleCheck, faPen, faStar, faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { AppShell } from "@/components/app-shell";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { ShareButton } from "@/components/ui/share-sheet";
import { StarRow } from "@/features/community/content-rating";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { listenPublicCourse, listenCourse } from "@/features/courses/courses";
import {
  useCourseAccess, enrollFree, listenEnrollCount, useProgress, percentOf,
  isReviewEligible,
} from "@/features/courses/enrollment";
import {
  useCourseReviews, saveCourseReview, deleteCourseReview,
} from "@/features/courses/reviews";
import {
  CourseCover, CoursePrice, CourseCta, CourseMeta, CoursePurchaseSheet, CourseStatusBadge,
} from "@/features/courses/course-ui";
import {
  type Course, type CourseLesson, LESSON_KIND_LABEL, branchLabel, formatDuration,
  matchesTrack, levelName,
} from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   صفحة الدورة

   مصدر البيانات يتبع الدور: الزائر والطالب يقرآن النسخة العامّة
   (`coursesPublic`)، وصاحب الدورة والأدمن يقرآن السجلّ الكامل — كي
   يستطيع الأستاذ فتح رابط دورته قبل النشر ويرى ما سيراه الطالب.

   الحالة الأهمّ هنا سؤال واحد: **هل أملك هذه الدورة؟** فالجواب في
   أعلى الصفحة وفي الزرّ وفي المنهج — ثلاث مرّات، لأنّ الالتباس فيه
   يعني طالباً يدفع مرّتين أو لا يدفع أصلاً.
════════════════════════════════════════════════════════════ */

const KIND_ICON = { video: faPlay, pdf: faFilePdf, text: faFileLines, external: faLink } as const;

export default function CourseDetailsPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId as string;
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const subjects = useSiteSubjects();

  const [pub, setPub] = useState<Course | null | undefined>(undefined);
  const [full, setFull] = useState<Course | null | undefined>(undefined);
  const [students, setStudents] = useState(0);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollErr, setEnrollErr] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!courseId) return;
    const unsub = listenPublicCourse(courseId, setPub);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId]);

  /* السجلّ الكامل يُقرأ فقط لمن يملك حقّ قراءته — وفشل القراءة عند
     غيره طبيعي ولا يُعطّل الصفحة. */
  useEffect(() => {
    if (!courseId || !user) { setFull(null); return; }
    const unsub = listenCourse(courseId, setFull);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, user]);

  useEffect(() => {
    if (!courseId || !user) return;
    const unsub = listenEnrollCount(courseId, setStudents);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, user]);

  const isOwnerOfFull = Boolean(full && user && (full.teacherId === user.uid || isAdmin));
  const course = pub ?? (isOwnerOfFull ? full : null) ?? null;

  const { hasAccess, staff, isOwner } = useCourseAccess(course, user?.uid, isAdmin);
  const progress = useProgress(user?.uid, courseId);
  const { list: reviews, count, avg } = useCourseReviews(courseId);

  useEffect(() => {
    if (course?.sections?.length && openSection === null) setOpenSection(course.sections[0].id);
  }, [course, openSection]);

  if (pub === undefined && full === undefined) {
    return <AppShell><div className="p-10 text-center text-text-muted">جارٍ التحميل…</div></AppShell>;
  }

  if (!course) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-xl font-extrabold">الدورة غير متاحة</h1>
          <p className="mt-2 text-sm text-text-muted">
            قد تكون غير منشورة بعد أو أُوقف نشرها.
          </p>
          <Link href="/courses" className="mt-5 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-white">
            تصفّح الدورات
          </Link>
        </section>
      </AppShell>
    );
  }

  const subjectLabel = subjects.find((s) => s.id === course.subject)?.name ?? course.subject;
  const relevant = matchesTrack(course, profile?.track);
  const pct = percentOf(course, progress);
  const notPublished = course.status !== "published";

  async function startFree() {
    if (!user) { router.push(loginHrefFor(`/courses/${courseId}`)); return; }
    /* التسجيل مسموح في المنشور وحده — والقاعدة ترفض غيره. صاحب الدورة
       يعاين مسوّدته بلا تسجيل، فنُرسله إلى المشغّل مباشرة بدل كتابة
       محكوم عليها بالرفض. */
    if (notPublished) { router.push(`/courses/${courseId}/learn`); return; }
    setEnrolling(true);
    setEnrollErr("");
    try {
      await enrollFree(courseId, user.uid, profile?.name || user.displayName || "طالب");
      router.push(`/courses/${courseId}/learn`);
    } catch {
      setEnrollErr("تعذّر التسجيل في الدورة — حاول مجدّداً.");
    } finally { setEnrolling(false); }
  }

  function getCourse() {
    if (!user) { router.push(loginHrefFor(`/courses/${courseId}`)); return; }
    if (course!.type === "free") void startFree();
    else setPurchaseOpen(true);
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-4 pb-28 lg:pb-8">
        <button onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 text-[13px] font-bold text-text-muted transition hover:text-primary">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" /> رجوع
        </button>

        {notPublished && staff && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
            <CourseStatusBadge status={course.status} />
            <p className="text-[12px] font-bold text-amber-700">
              معاينة خاصّة — هذه الدورة غير منشورة، ولا يراها الطلبة.
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* ── العمود الرئيسي ── */}
          <div className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <CourseCover course={course} className="aspect-[16/7] object-cover" rounded="" />
              <div className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary">{subjectLabel}</span>
                  <span className="rounded-full bg-border px-2.5 py-1 text-[11px] font-bold text-text-muted">{branchLabel(course.branches)}</span>
                  <span className="rounded-full bg-border px-2.5 py-1 text-[11px] font-bold text-text-muted">{levelName(course.level)}</span>
                  {relevant && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600">مناسب لشعبتك</span>
                  )}
                </div>

                <h1 className="font-display text-2xl font-extrabold leading-tight text-text-primary sm:text-[28px]">
                  {course.title}
                </h1>

                {course.shortDesc && (
                  <p className="text-[13.5px] leading-relaxed text-text-muted">{course.shortDesc}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link href={`/u/${course.teacherId}`} className="flex items-center gap-2">
                    <LiveAvatar uid={course.teacherId} name={course.teacherName} size="sm" />
                    <span className="text-[12.5px] font-extrabold text-text-primary hover:text-primary">{course.teacherName}</span>
                  </Link>
                  {count > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <StarRow value={avg} />
                      <span className="text-[12px] font-extrabold text-amber-600">{avg.toFixed(1)}</span>
                      <span className="text-[11px] text-text-muted">({count} تقييم)</span>
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-text-muted">لم تُقيَّم بعد</span>
                  )}
                  {user && (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-text-muted">
                      <FontAwesomeIcon icon={faUsers} className="h-3 w-3" /> {students} طالباً
                    </span>
                  )}
                </div>

                <CourseMeta course={course} />
              </div>
            </div>

            {/* ماذا ستتعلّم؟ */}
            {(course.outcomes?.length ?? 0) > 0 && (
              <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                <h2 className="font-display text-lg font-extrabold text-text-primary">ماذا ستتعلّم؟</h2>
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {course.outcomes!.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-text-primary">
                      <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* الوصف */}
            {course.fullDesc && (
              <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                <h2 className="font-display text-lg font-extrabold text-text-primary">عن الدورة</h2>
                <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-[1.9] text-text-muted">{course.fullDesc}</p>
              </div>
            )}

            {/* المنهج */}
            <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-extrabold text-text-primary">محتوى الدورة</h2>
                <p className="text-[11.5px] text-text-muted">
                  {course.sections.length} أقسام · {course.lessonCount ?? 0} درساً · {formatDuration(course.totalDuration)}
                </p>
              </div>

              <div className="mt-3 space-y-2">
                {course.sections.map((s, si) => {
                  const open = openSection === s.id;
                  const dur = (s.lessons ?? []).reduce((n, l) => n + (l.duration ?? 0), 0);
                  return (
                    <div key={s.id} className="overflow-hidden rounded-2xl border border-border">
                      <button
                        onClick={() => setOpenSection(open ? null : s.id)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3 bg-background px-3.5 py-3 text-right transition hover:bg-primary/5"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">
                          {si + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-extrabold text-text-primary">{s.title}</span>
                          <span className="block text-[11px] text-text-muted">
                            {(s.lessons ?? []).length} دروس · {formatDuration(dur)}
                          </span>
                        </span>
                        <FontAwesomeIcon icon={faChevronDown}
                          className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>

                      {open && (
                        <ul className="divide-y divide-border">
                          {(s.lessons ?? []).map((l) => (
                            <LessonRow key={l.id} lesson={l} courseId={courseId} unlocked={hasAccess} />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* التقييمات */}
            <ReviewsBlock
              course={course}
              uid={user?.uid}
              name={profile?.name || user?.displayName || "طالب"}
              isAdmin={Boolean(isAdmin)}
              reviews={reviews}
              avg={avg}
              count={count}
            />
          </div>

          {/* ── العمود الجانبي (شراء) ── */}
          <aside className="lg:sticky lg:top-20">
            <div className="hidden rounded-3xl border border-border bg-surface p-4 shadow-glass lg:block">
              <CoursePrice course={course} size="lg" />
              {hasAccess && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/12 px-2.5 py-1 text-[11.5px] font-extrabold text-emerald-600">
                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3" /> أنت تملك هذه الدورة
                </p>
              )}
              <div className="mt-3.5">
                <CourseCta
                  course={course}
                  hasAccess={hasAccess}
                  href={hasAccess ? `/courses/${courseId}/learn` : undefined}
                  onGet={getCourse}
                  busy={enrolling}
                />
              </div>

              {enrollErr && <p className="mt-2 text-[11.5px] font-bold text-danger">{enrollErr}</p>}

              {hasAccess && pct > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11.5px] font-bold text-primary">{pct}% مكتمل</p>
                </div>
              )}

              <div className="mt-4 space-y-2 border-t border-border pt-3 text-[12px] text-text-muted">
                <p className="flex items-center gap-2"><FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-emerald-500" /> وصول مدى الحياة</p>
                <p className="flex items-center gap-2"><FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-emerald-500" /> متابعة تقدّمك عبر أجهزتك</p>
                <p className="flex items-center gap-2"><FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-emerald-500" /> مراجَعة من إدارة المنصّة</p>
              </div>

              <div className="mt-3 flex gap-2">
                <ShareButton
                  target={{ path: `/courses/${courseId}`, title: course.title }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[12px] font-bold text-text-muted transition hover:border-primary hover:text-primary"
                />
                {isOwner && (
                  <Link href={`/courses/${courseId}/edit`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[12px] font-bold text-text-muted transition hover:border-primary hover:text-primary">
                    <FontAwesomeIcon icon={faPen} className="h-3 w-3" /> تعديل
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* شريط الشراء الثابت — الهاتف */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <CoursePrice course={course} />
            {hasAccess && <p className="text-[10.5px] font-extrabold text-emerald-600">تملكها ✓</p>}
          </div>
          <div className="min-w-0 flex-1">
            <CourseCta
              course={course}
              hasAccess={hasAccess}
              href={hasAccess ? `/courses/${courseId}/learn` : undefined}
              onGet={getCourse}
              busy={enrolling}
            />
          </div>
        </div>
      </div>

      {user && (
        <CoursePurchaseSheet
          course={course}
          uid={user.uid}
          open={purchaseOpen}
          onClose={() => setPurchaseOpen(false)}
        />
      )}
    </AppShell>
  );
}

/* صفّ درس في المنهج — يقول بوضوح: مفتوح، معاينة، أم مقفل */
function LessonRow({ lesson, courseId, unlocked }: { lesson: CourseLesson; courseId: string; unlocked: boolean }) {
  const open = unlocked || lesson.preview;
  const Row = (
    <>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${open ? "bg-primary/10 text-primary" : "bg-border text-text-muted"}`}>
        <FontAwesomeIcon icon={open ? KIND_ICON[lesson.kind] : faLock} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-text-primary">{lesson.title}</span>
        <span className="block text-[11px] text-text-muted">
          {LESSON_KIND_LABEL[lesson.kind]}
          {lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ""}
        </span>
      </span>
      {!unlocked && lesson.preview && (
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">
          معاينة مجّانية
        </span>
      )}
    </>
  );

  if (open) {
    return (
      <li>
        <Link href={`/courses/${courseId}/learn?lesson=${lesson.id}`}
          className="flex items-center gap-3 px-3.5 py-2.5 transition hover:bg-primary/5">
          {Row}
        </Link>
      </li>
    );
  }
  return <li className="flex items-center gap-3 px-3.5 py-2.5 opacity-70">{Row}</li>;
}

/* ════════════════════════════════════════════════════════════
   التقييمات — للمؤهَّل وحده

   الأهلية تُفحص هنا لعرض النموذج، وتُفرض في قواعد Firebase عند
   الكتابة. العرض وحده ليس حماية.
════════════════════════════════════════════════════════════ */
function ReviewsBlock({
  course, uid, name, isAdmin, reviews, avg, count,
}: {
  course: Course; uid?: string; name: string; isAdmin: boolean;
  reviews: { uid: string; name: string; stars: number; comment?: string; at: number }[];
  avg: number; count: number;
}) {
  const [eligible, setEligible] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const mine = reviews.find((r) => r.uid === uid);

  useEffect(() => {
    if (!uid) { setEligible(false); return; }
    let alive = true;
    void isReviewEligible(course, uid).then((v) => { if (alive) setEligible(v); });
    return () => { alive = false; };
  }, [course, uid]);

  useEffect(() => {
    if (mine) { setStars(mine.stars); setComment(mine.comment ?? ""); }
  }, [mine]);

  async function submit() {
    if (!uid || !stars || busy) return;
    setBusy(true);
    setErr("");
    try {
      await saveCourseReview(course.id, uid, name, stars, comment, mine?.at);
    } catch {
      setErr("تعذّر حفظ التقييم — تأكّد أنّك مسجّل في الدورة.");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-extrabold text-text-primary">التقييمات والآراء</h2>
        {count > 0 && (
          <span className="inline-flex items-center gap-2">
            <StarRow value={avg} size="md" />
            <span className="text-sm font-extrabold text-amber-600">{avg.toFixed(1)}</span>
            <span className="text-[11.5px] text-text-muted">من {count} تقييم</span>
          </span>
        )}
      </div>

      {eligible && uid && (
        <div className="mt-3.5 rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[12.5px] font-extrabold text-text-primary">
            {mine ? "عدّل تقييمك" : "قيّم هذه الدورة"}
          </p>
          <div className="mt-2 flex items-center gap-1.5" role="radiogroup" aria-label="عدد النجوم">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setStars(n)}
                role="radio"
                aria-checked={stars === n}
                aria-label={`${n} نجوم`}
                className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <FontAwesomeIcon icon={faStar} className={`h-6 w-6 ${n <= stars ? "text-amber-500" : "text-border"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="ما الذي أعجبك؟ (اختياري)"
            aria-label="تعليقك"
            className="mt-2.5 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
          />
          {err && <p className="mt-1.5 text-[11px] font-bold text-danger">{err}</p>}
          <button
            onClick={submit}
            disabled={!stars || busy}
            className="mt-2 rounded-xl bg-gradient-primary px-4 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-50"
          >
            {busy ? "…" : mine ? "تحديث التقييم" : "إرسال التقييم"}
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-text-muted">لا تقييمات بعد — كن أوّل من يشارك رأيه.</p>
      ) : (
        <ul className="mt-3.5 space-y-3">
          {reviews.map((r) => (
            <li key={r.uid} className="rounded-2xl border border-border bg-background p-3">
              <div className="flex items-center gap-2.5">
                <LiveAvatar uid={r.uid} name={r.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-extrabold text-text-primary">{r.name}</p>
                  <StarRow value={r.stars} />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteCourseReview(course.id, r.uid)}
                    aria-label="حذف التقييم"
                    className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {r.comment && <p className="mt-2 text-[12.5px] leading-relaxed text-text-muted">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
