"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faArrowRight, faPen, faTrash, faUsers, faStar, faLayerGroup,
  faComments, faShieldHalved, faEye,
} from "@fortawesome/free-solid-svg-icons";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { useRole, useProfile } from "@/features/auth/use-profile";
import { loginHrefFor, useQueryParam } from "@/features/auth/use-require-auth";
import { listenTeacherCourses, deleteCourse, canTeacherEdit } from "@/features/courses/courses";
import { CourseReviewThread } from "@/features/courses/review-thread";
import { CourseCover, CourseStatusBadge, CoursePrice } from "@/features/courses/course-ui";
import { useCourseReviews } from "@/features/courses/reviews";
import { listenEnrollCount } from "@/features/courses/enrollment";
import { COURSE_STATUS_LABEL, formatDuration, type Course, type CourseStatus } from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   دوراتي التعليمية — لوحة الأستاذ

   الحالة أوّل ما يُقرأ في كل بطاقة: الأستاذ الذي لا يعرف أين وصلت
   دورته يراسل الإدارة بلا داعٍ. وملاحظات المراجعة تُفتح من البطاقة
   نفسها، لا في مكان آخر.

   ولا أزرار إدارية هنا: لا نشر ولا موافقة. ما لا يستطيعه لا يُعرض.
════════════════════════════════════════════════════════════ */

const FILTERS: { id: "all" | CourseStatus; label: string }[] = [
  { id: "all", label: "الكلّ" },
  { id: "draft", label: "مسوّدات" },
  { id: "submitted", label: "بانتظار المراجعة" },
  { id: "review", label: "قيد المراجعة" },
  { id: "changes", label: "تعديلات مطلوبة" },
  { id: "published", label: "منشورة" },
  { id: "rejected", label: "مرفوضة" },
];

export default function TeacherCoursesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isStaff, isAdmin, ready } = useRole(user?.uid);
  const profile = useProfile(user?.uid);
  const submitted = useQueryParam("submitted");
  const focusCourse = useQueryParam("course");

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [filter, setFilter] = useState<"all" | CourseStatus>("all");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(loginHrefFor("/courses/teach")); return; }
    if (ready && !isStaff) router.replace("/courses");
  }, [loading, user, ready, isStaff, router]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenTeacherCourses(user.uid, setCourses);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user?.uid]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of courses ?? []) c[x.status] = (c[x.status] ?? 0) + 1;
    return c;
  }, [courses]);

  if (loading || !user || !ready) {
    return <AppShell><div className="p-10 text-center text-text-muted">جارٍ التحميل…</div></AppShell>;
  }
  if (!isStaff) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <FontAwesomeIcon icon={faShieldHalved} className="h-10 w-10 text-text-muted opacity-30" />
          <h1 className="mt-3 font-display text-xl font-extrabold">هذه الصفحة للأساتذة</h1>
        </section>
      </AppShell>
    );
  }

  const list = (courses ?? []).filter((c) => filter === "all" || c.status === filter);

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} aria-label="رجوع"
              className="grid h-10 w-10 place-items-center rounded-xl text-text-muted transition hover:bg-primary/10 hover:text-primary">
              <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-xl font-extrabold">دوراتي التعليمية</h1>
              <p className="text-[11.5px] text-text-muted">
                {(courses ?? []).length} دورة · {counts.published ?? 0} منشورة
              </p>
            </div>
          </div>
          <Link href="/courses/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white transition hover:opacity-95">
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> إنشاء دورة
          </Link>
        </div>

        {submitted && (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
            <p className="text-[13px] font-extrabold text-emerald-700">
              أُرسلت دورتك للمراجعة ✓
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-800/80">
              وصل إشعار للإدارة. ستصلك ملاحظاتها هنا، ويصلك إشعار عند النشر.
            </p>
          </div>
        )}

        <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition ${
                filter === f.id ? "bg-gradient-primary text-white" : "border border-border bg-surface text-text-muted hover:border-primary hover:text-primary"
              }`}>
              {f.label}
              {f.id !== "all" && counts[f.id] ? (
                <span className={`rounded-full px-1.5 text-[10px] ${filter === f.id ? "bg-white/25" : "bg-border"}`}>{counts[f.id]}</span>
              ) : null}
            </button>
          ))}
        </div>

        {courses === null ? (
          <p className="py-14 text-center text-sm text-text-muted">جارٍ التحميل…</p>
        ) : list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <FontAwesomeIcon icon={faLayerGroup} className="h-11 w-11 text-text-muted opacity-20" />
            <p className="mt-3 text-sm font-bold text-text-primary">
              {filter === "all" ? "لم تُنشئ دورة بعد" : `لا دورات في «${COURSE_STATUS_LABEL[filter as CourseStatus]}»`}
            </p>
            {filter === "all" && (
              <Link href="/courses/new" className="mt-4 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-[13px] font-extrabold text-white">
                ابدأ دورتك الأولى
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <TeacherCourseCard
                key={c.id}
                course={c}
                defaultOpen={focusCourse === c.id}
                me={{ uid: user.uid, name: profile?.name || user.displayName || "أستاذ", role: isAdmin ? "admin" : "teacher" }}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function TeacherCourseCard({
  course, me, defaultOpen,
}: {
  course: Course;
  me: { uid: string; name: string; role: "admin" | "teacher" };
  defaultOpen?: boolean;
}) {
  const [students, setStudents] = useState(0);
  const [threadOpen, setThreadOpen] = useState(Boolean(defaultOpen));
  const { count, avg } = useCourseReviews(course.id);

  useEffect(() => {
    const unsub = listenEnrollCount(course.id, setStudents);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [course.id]);

  const editable = canTeacherEdit(course.status);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex gap-3 p-3">
        <div className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-32">
          <CourseCover course={course} className="aspect-[16/10] object-cover" rounded="" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CourseStatusBadge status={course.status} />
            <CoursePrice course={course} />
          </div>
          <h2 className="mt-1 line-clamp-2 text-[14px] font-extrabold leading-snug text-text-primary">{course.title || "بلا عنوان"}</h2>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1"><FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" /> {course.lessonCount ?? 0} درساً</span>
            <span className="inline-flex items-center gap-1"><FontAwesomeIcon icon={faUsers} className="h-3 w-3" /> {students} طالباً</span>
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-amber-500" />
              {count ? `${avg.toFixed(1)} (${count})` : "لا تقييم"}
            </span>
            <span>{formatDuration(course.totalDuration)}</span>
          </div>

          {course.status === "rejected" && course.rejectReason && (
            <p className="mt-2 rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger">
              سبب الرفض: {course.rejectReason}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border p-2.5">
        {editable ? (
          <Link href={`/courses/${course.id}/edit`}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-[12px] font-extrabold text-primary transition hover:bg-primary/15">
            <FontAwesomeIcon icon={faPen} className="h-3 w-3" /> تعديل
          </Link>
        ) : (
          <span className="rounded-xl bg-border px-3.5 py-2 text-[12px] font-bold text-text-muted">
            التعديل مغلق أثناء «{COURSE_STATUS_LABEL[course.status]}»
          </span>
        )}

        <Link href={`/courses/${course.id}`}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[12px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary">
          <FontAwesomeIcon icon={faEye} className="h-3 w-3" /> عرض
        </Link>

        <button onClick={() => setThreadOpen((v) => !v)}
          aria-expanded={threadOpen}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[12px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary">
          <FontAwesomeIcon icon={faComments} className="h-3 w-3" /> ملاحظات المراجعة
        </button>

        {course.status === "draft" && (
          <button
            onClick={() => { if (confirm("حذف هذه المسوّدة نهائياً؟")) void deleteCourse(course.id, course.teacherId); }}
            className="ms-auto flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-extrabold text-text-muted transition hover:border-danger hover:text-danger">
            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" /> حذف
          </button>
        )}
      </div>

      {threadOpen && (
        <div className="border-t border-border bg-background p-3">
          <CourseReviewThread course={course} me={me} compact />
        </div>
      )}
    </article>
  );
}
