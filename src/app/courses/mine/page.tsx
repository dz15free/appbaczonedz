"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPlay, faGraduationCap, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { listenPublicCourse } from "@/features/courses/courses";
import { listenMyCourseIds, listenAllProgress, percentOf, type CourseProgress } from "@/features/courses/enrollment";
import { CourseCover } from "@/features/courses/course-ui";
import { flatLessons, formatDuration, type Course } from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   دوراتي

   ما يريده الطالب هنا سؤال واحد: **أين توقّفت؟** لذلك الزرّ الرئيسي
   «متابعة» يفتح آخر درس مباشرة لا صفحة الدورة، والنسبة أمامه.

   القائمة تُبنى من معرّفات دوراته (تسجيل مجّاني + وصول مدفوع) ثمّ
   يُقرأ سجلّ كل دورة من النسخة العامّة — وهي العقدة الوحيدة التي
   تحوي ما نحتاج عرضه.
════════════════════════════════════════════════════════════ */

export default function MyCoursesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [ids, setIds] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor("/courses/mine"));
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.uid) return;
    const u1 = listenMyCourseIds(user.uid, setIds);
    const u2 = listenAllProgress(user.uid, setProgress);
    return () => { u1(); if (typeof u2 === "function") u2(); };
  }, [user?.uid]);

  if (loading || !user) {
    return <AppShell><div className="p-10 text-center text-text-muted">جارٍ التحميل…</div></AppShell>;
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="رجوع"
            className="grid h-10 w-10 place-items-center rounded-xl text-text-muted transition hover:bg-primary/10 hover:text-primary">
            <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-extrabold">دوراتي 🎓</h1>
            <p className="text-[11.5px] text-text-muted">{ids?.length ?? 0} دورة · تابع من حيث توقّفت</p>
          </div>
        </div>

        {ids === null ? (
          <p className="py-14 text-center text-sm text-text-muted">جارٍ التحميل…</p>
        ) : ids.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <FontAwesomeIcon icon={faGraduationCap} className="h-11 w-11 text-text-muted opacity-20" />
            <p className="mt-3 text-sm font-bold text-text-primary">لم تسجّل في أي دورة بعد</p>
            <p className="mt-1 text-[12px] text-text-muted">ابدأ بدورة مجّانية — لا تحتاج شيئاً سوى الضغط.</p>
            <Link href="/courses" className="mt-4 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-[13px] font-extrabold text-white">
              استكشف الدورات
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ids.map((id) => (
              <MyCourseRow key={id} courseId={id} progress={progress[id] ?? {}} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MyCourseRow({ courseId, progress }: { courseId: string; progress: CourseProgress }) {
  const [course, setCourse] = useState<Course | null | undefined>(undefined);

  useEffect(() => {
    const unsub = listenPublicCourse(courseId, setCourse);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId]);

  if (course === undefined) {
    return <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />;
  }
  if (!course) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-3.5">
        <p className="text-[12.5px] font-bold text-text-muted">
          دورة لم تعد منشورة — وصولك محفوظ وستظهر فور عودتها.
        </p>
      </div>
    );
  }

  const pct = percentOf(course, progress);
  const lessons = flatLessons(course.sections);
  const last = lessons.find((l) => l.id === progress.lastLesson) ?? lessons[0];
  const finished = pct >= 100;
  const href = last ? `/courses/${courseId}/learn?lesson=${last.id}` : `/courses/${courseId}/learn`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/40">
      <div className="flex gap-3 p-3">
        <Link href={`/courses/${courseId}`} className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-32">
          <CourseCover course={course} className="aspect-[16/10] object-cover" rounded="" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/courses/${courseId}`}>
            <h2 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-text-primary hover:text-primary">
              {course.title}
            </h2>
          </Link>
          <p className="mt-0.5 text-[11px] text-text-muted">{course.teacherName}</p>

          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full transition-all ${finished ? "bg-emerald-500" : "bg-gradient-primary"}`}
                style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
              {finished
                ? <><FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3 text-emerald-500" /> أكملت الدورة</>
                : <>{pct}% مكتمل · {formatDuration(course.totalDuration)}</>}
            </p>
          </div>

          {last && !finished && (
            <p className="mt-1 truncate text-[11px] text-text-muted">
              التالي: <span className="font-bold text-text-primary">{last.title}</span>
            </p>
          )}
        </div>
      </div>

      <Link href={href}
        className="flex items-center justify-center gap-2 border-t border-border py-2.5 text-[12.5px] font-extrabold text-primary transition hover:bg-primary/5">
        <FontAwesomeIcon icon={faPlay} className="h-3 w-3" />
        {finished ? "مراجعة الدورة" : pct > 0 ? "متابعة" : "ابدأ التعلّم"}
      </Link>
    </article>
  );
}
