"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faArrowLeft, faBolt } from "@fortawesome/free-solid-svg-icons";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { listenPublicCourses } from "@/features/courses/courses";
import { CourseCard, CourseCardSkeleton } from "@/features/courses/course-ui";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { matchesTrack, type Course } from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   قسم الدورات في الرئيسية

   ستّ بطاقات لا أكثر: الرئيسية مزدحمة أصلاً، وقسم يبتلع الشاشة يدفع
   الطالب إلى التمرير السريع بدل القراءة. الباقي خلف «استكشف الدورات».

   وتبويب «مناسبة لشعبتك» لا يظهر لمن لا شعبة له — تبويب فارغ يبدو
   عطباً لا خياراً.
════════════════════════════════════════════════════════════ */

type Tab = "all" | "free" | "top" | "new" | "mine";

export function HomeCourses({ track }: { track?: string | null }) {
  const subjects = useSiteSubjects();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [avgs, setAvgs] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>(track ? "mine" : "all");

  useEffect(() => {
    const unsub = listenPublicCourses((l) => setCourses(l), 40);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, "courseReviews"), (snap) => {
      const val = (snap.val() as Record<string, Record<string, { stars?: number }>> | null) ?? {};
      const out: Record<string, number> = {};
      for (const [cid, rows] of Object.entries(val)) {
        const list = Object.values(rows ?? {});
        if (list.length) out[cid] = list.reduce((a, r) => a + (r.stars ?? 0), 0) / list.length;
      }
      setAvgs(out);
    }, () => setAvgs({}));
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const TABS: { id: Tab; label: string }[] = useMemo(() => ([
    ...(track ? [{ id: "mine" as Tab, label: "مناسبة لشعبتك" }] : []),
    { id: "all", label: "الكلّ" },
    { id: "free", label: "مجّانية" },
    { id: "top", label: "الأعلى تقييماً" },
    { id: "new", label: "الأحدث" },
  ]), [track]);

  const list = useMemo(() => {
    let l = [...(courses ?? [])];
    if (tab === "free") l = l.filter((c) => c.type === "free");
    if (tab === "mine") l = l.filter((c) => matchesTrack(c, track));
    if (tab === "top") l.sort((a, b) => (avgs[b.id] ?? 0) - (avgs[a.id] ?? 0));
    else l.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    return l.slice(0, 6);
  }, [courses, tab, track, avgs]);

  // لا نعرض قسماً فارغاً في الرئيسية
  if (courses !== null && courses.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-text-primary sm:text-xl">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faGraduationCap} className="h-4 w-4" />
            </span>
            دورات تساعدك على التفوّق
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            دورات مراجَعة من الإدارة، بإشراف أساتذة، ومصمّمة لبرنامج البكالوريا.
          </p>
        </div>
        <Link href="/courses"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-[12px] font-extrabold text-primary transition hover:bg-primary/5">
          استكشف جميع الدورات <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        </Link>
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-extrabold transition ${
              tab === t.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:border-primary hover:text-primary"
            }`}>
            {t.id === "mine" && <FontAwesomeIcon icon={faBolt} className="h-2.5 w-2.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {courses === null ? (
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border py-8 text-center text-[12.5px] text-text-muted">
          لا دورات في هذا التبويب بعد.
        </p>
      ) : (
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              track={track}
              subjectLabel={subjects.find((s) => s.id === c.subject)?.name ?? c.subject}
            />
          ))}
        </div>
      )}
    </section>
  );
}
