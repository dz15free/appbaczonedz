"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faGraduationCap, faPlus, faShieldHalved, faBookOpen,
  faFilter, faXmark, faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { AppShell } from "@/components/app-shell";
import { AdSlot } from "@/components/ui/ad-slot";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { listenPublicCourses } from "@/features/courses/courses";
import { CourseCard, CourseCardSkeleton } from "@/features/courses/course-ui";
import { COURSE_BRANCHES, matchesTrack, type Course } from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   سوق الدورات

   يقرأ `coursesPublic` وحدها — عقدة المنشور. فالصفحة تعمل قبل تسجيل
   الدخول، ولا تُحمّل المسوّدات ولا روابط الدروس أصلاً.

   والتصفية على الجهاز لا على الخادم: الكتالوج بمئات لا بملايين،
   وقاعدة Realtime لا تجمع شرطين في استعلام واحد — فتصفية محلّية على
   قائمة محدودة أسرع وأبسط من ثلاثة استعلامات متعاقبة.
════════════════════════════════════════════════════════════ */

type SortKey = "relevant" | "newest" | "top" | "free";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "relevant", label: "مناسبة لشعبتك" },
  { id: "newest", label: "الأحدث" },
  { id: "top", label: "الأعلى تقييماً" },
  { id: "free", label: "مجّانية" },
];

/**
 * متوسّطات التقييم لكل الدورات في استماع واحد.
 * مستمع لكل بطاقة يعني عشرات الاتصالات على صفحة واحدة — والمتوسّط
 * يُحسب هنا من السطور نفسها، فلا رقم مخزَّن يمكن التلاعب به.
 */
function useAverages() {
  const [map, setMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const unsub = onValue(ref(rtdb, "courseReviews"), (snap) => {
      const val = (snap.val() as Record<string, Record<string, { stars?: number }>> | null) ?? {};
      const out: Record<string, number> = {};
      for (const [cid, rows] of Object.entries(val)) {
        const list = Object.values(rows ?? {});
        if (list.length) out[cid] = list.reduce((a, r) => a + (r.stars ?? 0), 0) / list.length;
      }
      setMap(out);
    }, () => setMap({}));
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);
  return map;
}

export default function CoursesPage() {
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const subjects = useSiteSubjects();

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [branch, setBranch] = useState("all");
  const [sort, setSort] = useState<SortKey>("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const track = profile?.track ?? null;
  const isStaff = profile?.role === "teacher" || profile?.role === "admin";

  useEffect(() => {
    const unsub = listenPublicCourses(setCourses);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const avgs = useAverages();

  const subjectLabel = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    let list = courses ?? [];
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((c) =>
        c.title.includes(q) || c.shortDesc?.includes(q) || c.teacherName?.includes(q));
    }
    if (subject !== "all") list = list.filter((c) => c.subject === subject);
    if (branch !== "all") list = list.filter((c) => matchesTrack(c, branch));
    if (sort === "free") list = list.filter((c) => c.type === "free");

    const sorted = [...list];
    if (sort === "top") sorted.sort((a, b) => (avgs[b.id] ?? 0) - (avgs[a.id] ?? 0));
    else if (sort === "newest") sorted.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    else if (sort === "relevant") {
      sorted.sort((a, b) => {
        const ra = matchesTrack(a, track) ? 1 : 0;
        const rb = matchesTrack(b, track) ? 1 : 0;
        return rb - ra || (b.publishedAt ?? 0) - (a.publishedAt ?? 0);
      });
    }
    return sorted;
  }, [courses, search, subject, branch, sort, avgs, track]);

  const activeFilters = (subject !== "all" ? 1 : 0) + (branch !== "all" ? 1 : 0);

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-4">
        <AdSlot placement="library" className="mb-4" />

        {/* ترويسة القسم */}
        <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-gradient-to-bl from-primary/10 via-surface to-secondary/10 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-extrabold text-primary">
                <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" /> دورات BacZoneDZ
              </span>
              <h1 className="mt-2.5 font-display text-2xl font-extrabold leading-tight text-text-primary sm:text-3xl">
                دورات تساعدك على التفوّق
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-text-muted">
                دورات يُعدّها أساتذة، تُراجعها إدارة المنصّة قبل النشر، ومصمّمة لبرنامج
                البكالوريا الجزائري وشعبتك بالتحديد.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {user && (
                <Link href="/courses/mine"
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[12.5px] font-extrabold text-text-primary transition hover:border-primary hover:text-primary">
                  <FontAwesomeIcon icon={faBookOpen} className="h-3.5 w-3.5" /> دوراتي
                </Link>
              )}
              {isStaff && (
                <Link href="/courses/teach"
                  className="flex items-center gap-2 rounded-xl bg-gradient-primary px-3.5 py-2.5 text-[12.5px] font-extrabold text-white transition hover:opacity-95">
                  <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> إنشاء دورة
                </Link>
              )}
            </div>
          </div>

          <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-surface/70 px-3 py-1.5 text-[11px] font-semibold text-text-muted">
            <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-emerald-500" />
            كل دورة منشورة مرّت بمراجعة الإدارة
          </p>
        </header>

        {/* البحث والتصفية */}
        <div className="mb-4 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن دورة أو أستاذ…"
                aria-label="بحث في الدورات"
                className="h-11 w-full rounded-xl border border-border bg-surface pr-10 pl-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[12.5px] font-extrabold transition ${
                activeFilters ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:text-primary"
              }`}
            >
              <FontAwesomeIcon icon={faFilter} className="h-3.5 w-3.5" />
              تصفية{activeFilters ? ` (${activeFilters})` : ""}
            </button>
          </div>

          {/* التبويبات السريعة */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {SORTS.map((s) => {
              if (s.id === "relevant" && !track) return null;
              return (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition ${
                    sort === s.id ? "bg-gradient-primary text-white" : "border border-border bg-surface text-text-muted hover:border-primary hover:text-primary"
                  }`}
                >
                  {s.id === "relevant" && <FontAwesomeIcon icon={faBolt} className="h-3 w-3" />}
                  {s.label}
                </button>
              );
            })}
          </div>

          {filtersOpen && (
            <div className="rounded-2xl border border-border bg-surface p-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-bold text-text-muted">المادة</span>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                    <option value="all">كل المواد</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-bold text-text-muted">الشعبة</span>
                  <select value={branch} onChange={(e) => setBranch(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                    <option value="all">كل الشعب</option>
                    {COURSE_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
              </div>
              {activeFilters > 0 && (
                <button onClick={() => { setSubject("all"); setBranch("all"); }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-danger">
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" /> مسح التصفية
                </button>
              )}
            </div>
          )}
        </div>

        {/* الشبكة */}
        {courses === null ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <FontAwesomeIcon icon={faGraduationCap} className="h-12 w-12 text-text-muted opacity-20" />
            <p className="mt-3 text-sm font-bold text-text-primary">
              {search ? `لا نتائج لـ «${search}»` : "لا دورات منشورة بعد"}
            </p>
            <p className="mt-1 text-[12px] text-text-muted">
              {search ? "جرّب كلمة أعمّ أو امسح التصفية." : "الدورات تظهر هنا فور موافقة الإدارة عليها."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2.5 text-[12px] font-semibold text-text-muted">{filtered.length} دورة</p>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  track={track}
                  subjectLabel={subjectLabel(c.subject)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
