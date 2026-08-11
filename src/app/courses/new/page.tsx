"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/features/auth/auth-provider";
import { useRole, useProfile } from "@/features/auth/use-profile";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { CourseBuilder } from "@/features/courses/course-builder";

/* إنشاء دورة — للأستاذ والأدمن وحدهما.
   الحارس ينتظر `ready`: «لم يصل الدور بعد» ليست «طالب». */
export default function NewCoursePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isStaff, ready, role } = useRole(user?.uid);
  const profile = useProfile(user?.uid);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(loginHrefFor("/courses/new")); return; }
    /* 🛡️ لا نطرد إلّا بدور **معروف** صراحةً. لو غاب الدور لأي سبب
       (قراءة فاشلة، شبكة متقطّعة) فالصواب انتظارٌ لا طرد: طرد أستاذ
       من صفحته خطأٌ لا يُصلحه إلّا هو بإعادة المحاولة. */
    if (ready && role && !isStaff) router.replace("/courses");
  }, [loading, user, ready, role, isStaff, router]);

  if (loading || !user || !ready) {
    return <AppShell><div className="p-10 text-center text-text-muted">جارٍ التحميل…</div></AppShell>;
  }

  if (!isStaff) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <FontAwesomeIcon icon={faShieldHalved} className="h-10 w-10 text-text-muted opacity-30" />
          <h1 className="mt-3 font-display text-xl font-extrabold">هذه الصفحة للأساتذة</h1>
          <p className="mt-2 text-sm text-text-muted">إنشاء الدورات متاح لحسابات الأساتذة والإدارة.</p>
          <Link href="/courses" className="mt-5 inline-block rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-white">
            تصفّح الدورات
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
          <div>
            <h1 className="font-display text-xl font-extrabold">إنشاء دورة جديدة</h1>
            <p className="text-[11.5px] text-text-muted">احفظ مسوّدتك في أي لحظة — لا شيء يضيع.</p>
          </div>
        </div>

        <CourseBuilder teacher={{ uid: user.uid, name: profile?.name || user.displayName || "أستاذ" }} />
      </section>
    </AppShell>
  );
}
