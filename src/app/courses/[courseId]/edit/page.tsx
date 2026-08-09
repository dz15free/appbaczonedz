"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { useRole, useProfile } from "@/features/auth/use-profile";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { listenCourse, listenCourseContent } from "@/features/courses/courses";
import { CourseBuilder } from "@/features/courses/course-builder";
import { CourseStatusBadge } from "@/features/courses/course-ui";
import type { Course, LessonContent } from "@/features/courses/types";

/* تعديل دورة — لصاحبها والأدمن. غيرهما ترفضه القاعدة قبل الواجهة. */
export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId as string;
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isAdmin, ready } = useRole(user?.uid);
  const profile = useProfile(user?.uid);

  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [content, setContent] = useState<Record<string, LessonContent> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(`/courses/${courseId}/edit`));
  }, [loading, user, courseId, router]);

  useEffect(() => {
    if (!courseId || !user) return;
    const unsub = listenCourse(courseId, setCourse);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, user]);

  useEffect(() => {
    if (!courseId || !user) return;
    const unsub = listenCourseContent(courseId, setContent);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [courseId, user]);

  if (loading || !user || !ready || course === undefined || content === null) {
    return <AppShell><div className="p-10 text-center text-text-muted">جارٍ التحميل…</div></AppShell>;
  }

  const allowed = Boolean(course && (course.teacherId === user.uid || isAdmin));

  if (!course || !allowed) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-xl font-extrabold">لا تملك صلاحية تعديل هذه الدورة</h1>
          <Link href="/courses/teach" className="mt-5 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-white">
            دوراتي التعليمية
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-4 pb-32">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/courses/teach" aria-label="رجوع"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-text-muted transition hover:bg-primary/10 hover:text-primary">
            <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-extrabold">{course.title || "تعديل الدورة"}</h1>
            <span className="mt-0.5 inline-block"><CourseStatusBadge status={course.status} /></span>
          </div>
        </div>

        <CourseBuilder
          course={course}
          content={content}
          teacher={{
            uid: course.teacherId,
            name: course.teacherName || profile?.name || "أستاذ",
          }}
        />
      </section>
    </AppShell>
  );
}
