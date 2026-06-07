"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faGlobe, faRobot, faClipboardCheck, faCalendarCheck, faUpRightFromSquare, faBrain, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";

const QUICK = [
  { href: "/rooms", label: "غرف الدراسة", desc: "ادرس وراجع جماعياً", icon: faUsers },
  { href: "/groups", label: "المجموعات", desc: "تعاون مع زملائك", icon: faGlobe },
  { href: "/omibot", label: "Omibot", desc: "مساعدك الذكي للدراسة", icon: faRobot },
  { href: "/tools/pomodoro", label: "مؤقّت بومودورو", desc: "راجع بتركيز واحترافية", icon: faBrain },
  { href: "/leaderboard", label: "لوحة الترتيب", desc: "نافس زملاءك على القمّة", icon: faTrophy },
];

// روابط لميزات الموقع الرئيسي
const EXTERNAL = [
  {
    href: "https://www.baczonedz.com/p/blog-page_81.html",
    label: "محاكاة البكالوريا",
    desc: "عِش تجربة الامتحان الحقيقي",
    icon: faClipboardCheck,
  },
  {
    href: "https://www.baczonedz.com/p/blog-page_5.html",
    label: "إنشاء برنامج مراجعة",
    desc: "خطّة مراجعة منظّمة لك",
    icon: faCalendarCheck,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold">
          مرحباً، <span className="bz-gradient-text">{profile?.name || user.displayName || "طالب"}</span> 👋
        </h1>
        <p className="mt-1 text-text-muted">ماذا تريد أن تفعل اليوم؟</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5 transition hover:-translate-y-1 hover:shadow-glass"
            >
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
            <a
              key={q.href}
              href={q.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-lg border border-border bg-gradient-to-l from-primary/10 to-transparent p-5 transition hover:-translate-y-1 hover:shadow-glass"
            >
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
