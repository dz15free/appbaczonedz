"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faGlobe, faRobot, faClipboardCheck, faCalendarCheck,
  faUpRightFromSquare, faTrophy, faGraduationCap, faFire, faListCheck,
  faLayerGroup, faArrowLeft, faChalkboardUser, faComments, faBolt, faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { useBacCountdown } from "@/features/settings/use-bac-date";

const QUICK = [
  { href: "/rooms", label: "غرف الدراسة", desc: "بثّ مباشر بالصوت والسبورة", icon: faUsers, color: "indigo" },
  { href: "/groups", label: "المجموعات", desc: "تعاون مع زملائك في شعبتك", icon: faGlobe, color: "emerald" },
  { href: "/omibot", label: "مروة", desc: "رفيقتك الذكية — معدّل 18 ✨", icon: faRobot, color: "violet" },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", desc: "احفظ بالتكرار المتباعد", icon: faLayerGroup, color: "amber" },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", desc: "تتبّع مراجعتك موضوعاً بموضوع", icon: faListCheck, color: "sky" },
  { href: "/leaderboard", label: "لوحة الترتيب", desc: "نافس زملاءك على القمّة", icon: faTrophy, color: "rose" },
  { href: "/library", label: "مكتبة البكالوريا", desc: "ملخصات وملفات لكل المواد", icon: faBookOpen, color: "emerald" },
] as const;

const COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-500/10 text-indigo-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  violet: "bg-violet-500/10 text-violet-500",
  amber: "bg-amber-500/10 text-amber-500",
  sky: "bg-sky-500/10 text-sky-500",
  rose: "bg-rose-500/10 text-rose-500",
};

const EXTERNAL = [
  { href: "https://www.baczonedz.com/p/blog-page_81.html", label: "محاكاة البكالوريا", desc: "عِش تجربة الامتحان الحقيقي", icon: faClipboardCheck },
  { href: "https://www.baczonedz.com/p/blog-page_5.html", label: "إنشاء برنامج مراجعة", desc: "خطّة مراجعة منظّمة لك", icon: faCalendarCheck },
];

const FEATURES = [
  { icon: faChalkboardUser, label: "غرف بصوت وسبورة مباشرة" },
  { icon: faRobot, label: "مساعدة ذكية بالعربية" },
  { icon: faComments, label: "مجتمع طلابي نشط" },
  { icon: faBolt, label: "نقاط ومستويات وإنجازات" },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const days = useBacCountdown();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const name = profile?.name || user.displayName || "طالب";
  const urgency = days <= 30 ? "text-danger" : days <= 90 ? "text-warning" : "text-secondary";
  const urgencyBg = days <= 30 ? "bg-danger" : days <= 90 ? "bg-warning" : "bg-secondary";

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-5 sm:py-8">

        {/* ═══════ هيرو ترحيبي ═══════ */}
        <div className="bz-cosmic-bg relative overflow-hidden rounded-2xl border border-border p-5 sm:rounded-3xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
                <FontAwesomeIcon icon={faGraduationCap} className="h-4 w-4" />
                مرحباً بعودتك
              </p>
              <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                أهلاً، <span className="bz-gradient-text">{name}</span> 👋
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
                <span className="font-bold text-text-primary">BacZoneDZ</span> منصّتك الشاملة لمراجعة البكالوريا:
                غرف دراسة مباشرة بالصوت والسبورة الذكية، مساعدتك مروة، بطاقات مراجعة،
                ومجتمع طلابي نشط — كل ما تحتاجه في مكان واحد.
              </p>

              {/* رقاقات الميزات */}
              <div className="mt-4 flex flex-wrap gap-2">
                {FEATURES.map((f) => (
                  <span key={f.label} className="flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs font-semibold text-text-muted backdrop-blur-sm">
                    <FontAwesomeIcon icon={f.icon} className="h-3 w-3 text-primary" />
                    {f.label}
                  </span>
                ))}
              </div>

              {/* سلسلة الأيام المتتالية */}
              {(profile?.streak ?? 0) >= 2 && (
                <div className="mt-4">
                  <span className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                    (profile?.streak ?? 0) >= 7 ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                  }`}>
                    <FontAwesomeIcon icon={faFire} className="h-3.5 w-3.5" />
                    {profile?.streak} أيام متتالية من النشاط 🔥
                  </span>
                </div>
              )}
            </div>

            {/* عدّاد البكالوريا */}
            <div className="shrink-0 rounded-2xl border border-border bg-surface/80 p-5 text-center backdrop-blur-sm sm:w-48">
              <p className="text-xs font-semibold text-text-muted">العدّ التنازلي للبكالوريا</p>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className={`font-display text-5xl font-extrabold tabular-nums ${urgency}`}>{days}</span>
                {days <= 30 && <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-danger animate-pulse" />}
              </div>
              <p className="mt-0.5 text-sm font-bold text-text-muted">يوم متبقّي</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full transition-all ${urgencyBg}`}
                  style={{ width: `${Math.max(2, Math.min(100, 100 - (days / 365) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-text-muted">
                {days <= 30 ? "⚡ لا تضيّع الوقت!" : days <= 90 ? "💪 تسارع المراجعة" : "📚 وقت كافٍ، ابدأ الآن"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════ أدواتك ═══════ */}
        <div className="mt-7">
          <h2 className="mb-3 font-display text-base font-extrabold">أدواتك</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glass sm:p-5"
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg ${COLOR_MAP[q.color]}`}>
                  <FontAwesomeIcon icon={q.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-bold">{q.label}</span>
                  <span className="text-sm text-text-muted">{q.desc}</span>
                </div>
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition group-hover:opacity-100 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════ مصادر خارجية ═══════ */}
        <div className="mt-7">
          <h2 className="mb-3 font-display text-base font-extrabold">مصادر إضافية</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXTERNAL.map((q) => (
              <a key={q.href} href={q.href} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-l from-primary/10 to-transparent p-4 transition hover:-translate-y-0.5 hover:shadow-glass sm:p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white">
                  <FontAwesomeIcon icon={q.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    {q.label}
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="h-3 w-3 text-text-muted" />
                  </span>
                  <span className="text-sm text-text-muted">{q.desc}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
