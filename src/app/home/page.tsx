"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faGlobe, faRobot, faClipboardCheck, faCalendarCheck,
  faUpRightFromSquare, faBrain, faTrophy, faGraduationCap, faFire,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";

const QUICK = [
  { href: "/rooms", label: "غرف الدراسة", desc: "ادرس وراجع جماعياً", icon: faUsers },
  { href: "/groups", label: "المجموعات", desc: "تعاون مع زملائك", icon: faGlobe },
  { href: "/omibot", label: "Bothelper", desc: "رفيقتك الذكية — معدّل 18 ✨", icon: faRobot },
  { href: "/tools/pomodoro", label: "مؤقّت بومودورو", desc: "راجع بتركيز واحترافية", icon: faBrain },
  { href: "/leaderboard", label: "لوحة الترتيب", desc: "نافس زملاءك على القمّة", icon: faTrophy },
];

const EXTERNAL = [
  { href: "https://www.baczonedz.com/p/blog-page_81.html", label: "محاكاة البكالوريا", desc: "عِش تجربة الامتحان الحقيقي", icon: faClipboardCheck },
  { href: "https://www.baczonedz.com/p/blog-page_5.html", label: "إنشاء برنامج مراجعة", desc: "خطّة مراجعة منظّمة لك", icon: faCalendarCheck },
];

function useBacCountdown() {
  const [days, setDays] = useState(0);
  useEffect(() => {
    function calc() {
      const now = new Date();
      // تاريخ البكالوريا التقريبي (يُحدَّث سنوياً)
      let exam = new Date(now.getFullYear(), 5, 15); // 15 يونيو
      if (exam <= now) exam = new Date(now.getFullYear() + 1, 5, 15);
      setDays(Math.ceil((exam.getTime() - now.getTime()) / 86400000));
    }
    calc();
    const t = setInterval(calc, 3600000); // تحديث كل ساعة
    return () => clearInterval(t);
  }, []);
  return days;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const days = useBacCountdown();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const urgency = days <= 30 ? "text-danger" : days <= 90 ? "text-warning" : "text-secondary";

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold">
          مرحباً، <span className="bz-gradient-text">{profile?.name || user.displayName || "طالب"}</span> 👋
        </h1>
        <p className="mt-1 text-text-muted">ماذا تريد أن تفعل اليوم؟</p>

        {/* عدّاد البكالوريا */}
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white">
              <FontAwesomeIcon icon={faGraduationCap} className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <span className="text-sm text-text-muted">العد التنازلي للبكالوريا</span>
              <div className="mt-0.5 flex items-end gap-2">
                <span className={`font-display text-4xl font-extrabold tabular-nums ${urgency}`}>{days}</span>
                <span className="mb-1 text-lg font-bold text-text-muted">يوم</span>
                {days <= 30 && <FontAwesomeIcon icon={faFire} className="mb-1 h-5 w-5 text-danger animate-pulse" />}
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <span className="block text-xs text-text-muted">
                {days <= 30 ? "⚡ لا تضيّع الوقت!" : days <= 90 ? "💪 تسارع المراجعة" : "📚 وقت كافٍ، ابدأ الآن"}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-border">
            <div
              className={`h-full transition-all ${days <= 30 ? "bg-danger" : days <= 90 ? "bg-warning" : "bg-secondary"}`}
              style={{ width: `${Math.max(2, Math.min(100, 100 - (days / 365) * 100))}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 transition hover:-translate-y-1 hover:shadow-glass">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
                <FontAwesomeIcon icon={q.icon} className="h-5 w-5" />
              </span>
              <div>
                <span className="block font-bold">{q.label}</span>
                <span className="text-sm text-text-muted">{q.desc}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {EXTERNAL.map((q) => (
            <a key={q.href} href={q.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-lg border border-border bg-gradient-to-l from-primary/10 to-transparent p-5 transition hover:-translate-y-1 hover:shadow-glass">
              <span className="grid h-12 w-12 place-items-center rounded-md bg-gradient-primary text-white">
                <FontAwesomeIcon icon={q.icon} className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <span className="flex items-center gap-1.5 font-bold">
                  {q.label}
                  <FontAwesomeIcon icon={faUpRightFromSquare} className="h-3 w-3 text-text-muted" />
                </span>
                <span className="text-sm text-text-muted">{q.desc}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

