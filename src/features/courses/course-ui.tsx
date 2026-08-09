"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay, faLayerGroup, faClock, faLock, faBolt, faGraduationCap,
  faComments, faKey, faCheck, faSpinner, faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { StarRow } from "@/features/community/content-rating";
import { ChargilyPayButton } from "@/features/paid/chargily-button";
import { SupportChatSheet } from "@/features/support/support-chat";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { redeemCode } from "@/features/paid/paid-access";
import { useCourseReviews } from "@/features/courses/reviews";
import {
  type Course, type CourseStatus, COURSE_STATUS_LABEL, COURSE_STATUS_TONE,
  branchLabel, formatDuration, matchesTrack, levelName,
} from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   عناصر واجهة الدورات المشتركة

   بطاقة واحدة يستعملها السوق والرئيسية و«دوراتي» — ثلاث بطاقات
   متشابهة تعني ثلاثة أماكن تُنسى إحداها عند كل تعديل.

   والهويّة هي هويّة BacZoneDZ نفسها: الأزرق/السماوي، الحوافّ 16px،
   `bg-surface` و`border-border` — لا لغة بصرية جديدة.
════════════════════════════════════════════════════════════ */

/* غلاف الدورة — بديل أنيق حين لا صورة، لا مربّع رمادي فارغ */
export function CourseCover({
  course, className = "", rounded = "rounded-t-2xl",
}: { course: Pick<Course, "title" | "coverUrl" | "subject">; className?: string; rounded?: string }) {
  if (course.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={course.coverUrl}
        alt={course.title}
        loading="lazy"
        className={`w-full object-cover ${rounded} ${className}`}
      />
    );
  }
  return (
    <div className={`grid w-full place-items-center bg-gradient-primary ${rounded} ${className}`}>
      <FontAwesomeIcon icon={faGraduationCap} className="h-8 w-8 text-white/85" />
    </div>
  );
}

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${COURSE_STATUS_TONE[status] ?? "bg-border text-text-muted"}`}>
      {COURSE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** سعر الدورة — يُبرز التخفيض دون خداع: السعر السابق مشطوب بجانبه */
export function CoursePrice({ course, size = "sm" }: { course: Pick<Course, "type" | "price" | "oldPrice">; size?: "sm" | "lg" }) {
  if (course.type === "free") {
    return (
      <span className={`font-extrabold text-emerald-600 ${size === "lg" ? "text-2xl" : "text-sm"}`}>
        مجّانية
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`font-extrabold text-text-primary ${size === "lg" ? "text-2xl" : "text-sm"}`}>
        {(course.price ?? 0).toLocaleString("en-US")} دج
      </span>
      {Boolean(course.oldPrice) && (course.oldPrice ?? 0) > (course.price ?? 0) && (
        <span className={`text-text-muted line-through ${size === "lg" ? "text-sm" : "text-[11px]"}`}>
          {(course.oldPrice ?? 0).toLocaleString("en-US")} دج
        </span>
      )}
    </span>
  );
}

/** تقييم الدورة — يختفي إن لم يُقيَّم أحد بدل عرض «0.0» مُحبِط */
export function CourseRating({ courseId, size = "sm" }: { courseId: string; size?: "sm" | "md" }) {
  const { count, avg } = useCourseReviews(courseId);
  if (!count) return <span className="text-[11px] text-text-muted">دورة جديدة</span>;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <StarRow value={avg} size={size} />
      <span className={`font-extrabold text-amber-600 ${size === "md" ? "text-sm" : "text-[11px]"}`}>{avg.toFixed(1)}</span>
      <span className={`text-text-muted ${size === "md" ? "text-xs" : "text-[10px]"}`}>({count})</span>
    </span>
  );
}

/* بطاقة الدورة في السوق */
export function CourseCard({
  course, track, progress, subjectLabel,
}: {
  course: Course;
  /** شعبة الطالب — لإظهار شارة «مناسب لشعبتك» */
  track?: string | null;
  /** نسبة التقدّم إن كان الطالب مسجّلاً */
  progress?: number;
  subjectLabel?: string;
}) {
  const relevant = matchesTrack(course, track);
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative">
        <CourseCover course={course} className="h-36 sm:h-40" />
        <span className="absolute right-2 top-2 flex flex-wrap gap-1.5">
          {course.type === "free" ? (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow">مجّانية</span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur">
              <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" /> مدفوعة
            </span>
          )}
          {relevant && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
              <FontAwesomeIcon icon={faBolt} className="h-2.5 w-2.5" /> مناسب لشعبتك
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {subjectLabel && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{subjectLabel}</span>
          )}
          <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-text-muted">
            {branchLabel(course.branches)}
          </span>
        </div>

        <h3 className="line-clamp-2 font-display text-[15px] font-extrabold leading-snug text-text-primary group-hover:text-primary">
          {course.title}
        </h3>

        {course.shortDesc && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-text-muted">{course.shortDesc}</p>
        )}

        <p className="text-[11.5px] font-semibold text-text-muted">{course.teacherName}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" /> {course.lessonCount ?? 0} درساً
          </span>
          <span className="inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faClock} className="h-3 w-3" /> {formatDuration(course.totalDuration)}
          </span>
        </div>

        {typeof progress === "number" && (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-bold text-primary">{progress}% مكتمل</p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <CourseRating courseId={course.id} />
          <CoursePrice course={course} />
        </div>
      </div>
    </Link>
  );
}

/* بطاقة هيكلية أثناء التحميل — تمنع «قفزة» التخطيط */
export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-36 w-full animate-pulse bg-border sm:h-40" />
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-border" />
        <div className="h-3 w-full animate-pulse rounded bg-border" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   لوح الحصول على الدورة

   طريقتان لا واحدة: البطاقة الذهبية/CIB عبر Chargily لمن يملكها،
   والتواصل مع الإدارة لمن لا يملكها — وهم كثر بين طلبة البكالوريا.
   إغلاق أحد البابين يخسر قسماً منهم.

   ولا خطوات زائدة: اللوح يعرض السعر ثمّ الخيارين مباشرة.
════════════════════════════════════════════════════════════ */
export function CoursePurchaseSheet({
  course, uid, open, onClose,
}: { course: Course; uid: string; open: boolean; onClose: () => void }) {
  const [showSupport, setShowSupport] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function activate() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr("");
    const e = await redeemCode(code, uid, "");
    setBusy(false);
    if (e) { setErr(e); return; }
    setDone(true);
    setCode("");
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="احصل على الدورة" maxHeight="88vh">
      <div className="space-y-3.5 pb-2">
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-sm font-extrabold text-text-primary">{course.title}</p>
          <p className="mt-0.5 text-[11.5px] text-text-muted">{course.teacherName}</p>
          <div className="mt-2"><CoursePrice course={course} size="lg" /></div>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-text-muted">
            <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            بعد إتمام الدفع يُفتح لك محتوى الدورة كاملاً مدى الحياة، ويصلك إشعار بذلك.
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <FontAwesomeIcon icon={faCheck} className="h-6 w-6 text-emerald-600" />
            <p className="mt-2 text-sm font-extrabold text-emerald-700">تمّ تفعيل وصولك — ابدأ التعلّم الآن.</p>
          </div>
        ) : (
          <>
            {/* الخيار الأوّل: الدفع الفوري */}
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="mb-2 text-[12px] font-extrabold text-text-primary">١ · الدفع الإلكتروني</p>
              <ChargilyPayButton itemType="course" itemId={course.id} price={course.price ?? 0} uid={uid} />
            </div>

            {/* الخيار الثاني: التواصل مع الإدارة */}
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="mb-1.5 text-[12px] font-extrabold text-text-primary">٢ · الدفع عبر التواصل مع الإدارة</p>
              <p className="mb-2.5 text-[11px] leading-relaxed text-text-muted">
                راسل الإدارة، اتّفق على طريقة الدفع المناسبة، وبعد التأكّد من الدفع تمنحك
                الإدارة كود وصول تُفعّله هنا — أو تفتح لك الدورة مباشرة.
              </p>
              <button
                onClick={() => setShowSupport(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 py-2.5 text-[12.5px] font-extrabold text-primary transition hover:bg-primary/10 active:scale-[0.98]"
              >
                <FontAwesomeIcon icon={faComments} className="h-3.5 w-3.5" />
                تواصل مع الإدارة
              </button>

              <div className="mt-3">
                <label htmlFor="bz-course-code" className="mb-1 block text-[11px] font-bold text-text-muted">
                  عندك كود وصول؟
                </label>
                <div className="flex gap-2">
                  <input
                    id="bz-course-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="BZ-XXXX-XXXX"
                    dir="ltr"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={activate}
                    disabled={busy || !code.trim()}
                    className="shrink-0 rounded-xl bg-gradient-primary px-4 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    {busy ? <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" /> : <><FontAwesomeIcon icon={faKey} className="me-1 h-3 w-3" />تفعيل</>}
                  </button>
                </div>
                {err && <p className="mt-1.5 text-[11px] font-bold text-danger">{err}</p>}
              </div>
            </div>
          </>
        )}
      </div>
      <SupportChatSheet open={showSupport} onClose={() => setShowSupport(false)} initialKind="payment" />
    </BottomSheet>
  );
}

/* زرّ الدعوة الرئيسي — نصّه يقول للطالب أين هو بالضبط */
export function CourseCta({
  course, hasAccess, onGet, onStart, busy, href,
}: {
  course: Course;
  hasAccess: boolean;
  onGet?: () => void;
  onStart?: () => void;
  busy?: boolean;
  href?: string;
}) {
  const label = hasAccess
    ? "متابعة التعلّم"
    : course.type === "free"
      ? "ابدأ الدورة"
      : "احصل على الدورة";
  const icon = hasAccess ? faPlay : course.type === "free" ? faPlay : faLock;

  const cls =
    "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3.5 text-[14px] font-extrabold text-white shadow-glow transition hover:opacity-95 active:scale-[0.99] disabled:opacity-60";

  if (hasAccess && href) {
    return (
      <Link href={href} className={cls}>
        <FontAwesomeIcon icon={icon} className="h-4 w-4" /> {label}
      </Link>
    );
  }
  return (
    <button onClick={hasAccess ? onStart : onGet} disabled={busy} className={cls}>
      {busy ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> : <FontAwesomeIcon icon={icon} className="h-4 w-4" />}
      {busy ? "لحظة…" : label}
    </button>
  );
}

/** سطر معلومة صغير مكرّر في صفحة التفاصيل */
export function CourseMeta({ course }: { course: Course }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <FontAwesomeIcon icon={faLayerGroup} className="h-3.5 w-3.5 text-primary" />
        {course.lessonCount ?? 0} درساً
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5 text-primary" />
        {formatDuration(course.totalDuration)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FontAwesomeIcon icon={faGraduationCap} className="h-3.5 w-3.5 text-primary" />
        {levelName(course.level)}
      </span>
    </div>
  );
}
