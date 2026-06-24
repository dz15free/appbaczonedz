"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faRobot, faFire, faChalkboardUser, faComments,
  faClipboardCheck, faBookOpen, faTrophy, faCalendarCheck,
  faUpRightFromSquare, faLayerGroup, faListCheck,
  faArrowUp, faArrowDown, faComment, faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { AppShell } from "@/components/app-shell";
import { useBacCountdownFull } from "@/features/settings/use-bac-date";
import { listenPosts, votePost, type Post } from "@/features/community/social";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { RoleBadge } from "@/components/ui/role-badge";

/* أقسام الموقع (صف الأيقونات) */
const SECTIONS = [
  { href: "/rooms", label: "غرف الدراسة", icon: faChalkboardUser, color: "bg-indigo-500/10 text-indigo-500" },
  { href: "/library", label: "المكتبة", icon: faBookOpen, color: "bg-emerald-500/10 text-emerald-500" },
  { href: "/omibot", label: "الخباشة", icon: faRobot, color: "bg-violet-500/10 text-violet-500" },
  { href: "/community", label: "المجتمع", icon: faUsers, color: "bg-sky-500/10 text-sky-500" },
  { href: "/leaderboard", label: "الترتيب", icon: faTrophy, color: "bg-amber-500/10 text-amber-500" },
];

/* أدوات إضافية */
const TOOLS = [
  { href: "/tools/flashcards", label: "بطاقات المراجعة", desc: "احفظ بالتكرار المتباعد", icon: faLayerGroup, color: "bg-amber-500/10 text-amber-500" },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", desc: "تتبّع مراجعتك", icon: faListCheck, color: "bg-sky-500/10 text-sky-500" },
];

/* مصادر خارجية */
const EXTERNAL = [
  { href: "https://www.baczonedz.com/p/blog-page_81.html", label: "محاكاة البكالوريا", desc: "عِش تجربة الامتحان الحقيقي", icon: faClipboardCheck },
  { href: "https://www.baczonedz.com/p/blog-page_5.html", label: "إنشاء برنامج مراجعة", desc: "خطّة مراجعة منظّمة لك", icon: faCalendarCheck },
];

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "الآن";
  const m = Math.floor(s / 60); if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60); if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24); return `منذ ${d} يوم`;
}

function CounterCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[11px] font-semibold text-white/60">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const { settings: siteSettings } = useSiteSettings();
  const { days, hours, minutes, seconds } = useBacCountdownFull();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return listenPosts(user.uid, (all) => setPosts(all.slice(0, 5)));
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const name = profile?.name || user.displayName || "طالب";

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4 sm:px-5 sm:py-6">

        {/* ═══════ عدّاد البكالوريا (مدمج) ═══════ */}
        <div className="relative overflow-hidden rounded-2xl border border-border p-4 sm:p-5"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)" }}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -left-6 -bottom-10 h-32 w-32 rounded-full bg-secondary/10 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/70">{siteSettings.homeWelcomeTitle || "مرحباً"}، {name} 👋</p>
              <h1 className="mt-0.5 font-display text-xl font-extrabold text-white sm:text-2xl">عدّاد البكالوريا</h1>

              {days > 0 ? (
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="font-display text-5xl font-extrabold tabular-nums text-white sm:text-6xl">{days}</span>
                  <span className="mb-1.5 text-sm font-bold text-white/70">يوم متبقّي</span>
                  {days <= 30 && <FontAwesomeIcon icon={faFire} className="mb-2 h-4 w-4 text-red-400 animate-pulse" />}
                </div>
              ) : (
                /* اليوم الأخير: عدّ تنازلي بالساعات/الدقائق/الثواني */
                <div className="mt-2 flex items-center gap-2.5">
                  <CounterCell value={hours} label="ساعة" />
                  <span className="mb-3 text-xl font-bold text-white/40">:</span>
                  <CounterCell value={minutes} label="دقيقة" />
                  <span className="mb-3 text-xl font-bold text-white/40">:</span>
                  <CounterCell value={seconds} label="ثانية" />
                  <span className="ms-2 flex items-center gap-1 self-end rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300">
                    <FontAwesomeIcon icon={faFire} className="h-3 w-3 animate-pulse" /> اليوم الأخير!
                  </span>
                </div>
              )}
              <p className="mt-2 text-xs text-white/50">
                {days > 30 ? "📚 وقت كافٍ — نظّم مراجعتك من الآن" : days > 0 ? "💪 المراجعة تتسارع، ركّز!" : "🎯 بالتوفيق في امتحانك!"}
              </p>
            </div>

            {/* عنصر بصري احترافي: شارة تخرّج */}
            {days > 0 && (
              <div className="hidden shrink-0 sm:block">
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm">
                  <FontAwesomeIcon icon={faGraduationCap} className="h-12 w-12 text-white/80" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ أقسام الموقع ═══════ */}
        <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-3">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="group flex flex-col items-center gap-2">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl transition group-hover:scale-105 sm:h-16 sm:w-16 ${s.color}`}>
                <FontAwesomeIcon icon={s.icon} className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <span className="text-center text-[11px] font-semibold leading-tight text-text-muted sm:text-xs">{s.label}</span>
            </Link>
          ))}
        </div>

        {/* ═══════ آخر المنشورات ═══════ */}
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">آخر المنشورات</h2>
            <Link href="/community" className="text-sm font-semibold text-primary hover:underline">عرض الكل</Link>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface py-10 text-center text-text-muted">
              <FontAwesomeIcon icon={faComments} className="h-8 w-8 opacity-40" />
              <p className="mt-3 text-sm">لا منشورات بعد. كن أوّل من يشارك في المجتمع!</p>
              <Link href="/community" className="mt-3 inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary">اذهب للمجتمع</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <div key={p.id}
                  className="rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-glass">
                  {/* رأس المنشور */}
                  <Link href={`/community/${p.id}`} className="flex items-center gap-2.5">
                    <LiveAvatar uid={p.authorId} name={p.authorName} size="md" />
                    <div className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="truncate font-bold">{p.authorName}</span>
                        <RoleBadge uid={p.authorId} role={p.authorRole} />
                      </span>
                      <span className="text-xs text-text-muted">{timeAgo(p.createdAt)}</span>
                    </div>
                  </Link>

                  {/* نص المنشور */}
                  {p.text && (
                    <Link href={`/community/${p.id}`} className="mt-3 block line-clamp-3 text-sm leading-relaxed">
                      {p.text}
                    </Link>
                  )}

                  {/* مؤشّر مرفق */}
                  {p.attachmentKind === "file" && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-muted">
                      <FontAwesomeIcon icon={faClipboardCheck} className="h-4 w-4 text-primary" />
                      {p.fileName || "ملف مرفق"}
                    </div>
                  )}

                  {/* شريط التفاعل — نظام تصويت مثل المجتمع */}
                  <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-sm">
                    <div className="flex items-center gap-1 rounded-full bg-background px-1">
                      <button
                        onClick={() => votePost(p.id, user.uid, 1, p.myVote)}
                        className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === 1 ? "text-secondary" : "text-text-muted hover:text-secondary"}`}
                        aria-label="رفع"
                      >
                        <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
                      </button>
                      <span className={`min-w-4 text-center text-sm font-bold ${p.score > 0 ? "text-secondary" : p.score < 0 ? "text-danger" : "text-text-muted"}`}>
                        {p.score}
                      </span>
                      <button
                        onClick={() => votePost(p.id, user.uid, -1, p.myVote)}
                        className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === -1 ? "text-danger" : "text-text-muted hover:text-danger"}`}
                        aria-label="خفض"
                      >
                        <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
                      </button>
                    </div>
                    <Link href={`/community/${p.id}`} className="flex items-center gap-1.5 text-text-muted hover:text-primary">
                      <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
                      {p.commentCount > 0 ? `${p.commentCount} تعليق` : "تعليق"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════ أدوات إضافية ═══════ */}
        <div className="mt-7">
          <h2 className="mb-3 font-display text-base font-extrabold">أدوات الدراسة</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glass">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${t.color}`}>
                  <FontAwesomeIcon icon={t.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block font-bold">{t.label}</span>
                  <span className="text-sm text-text-muted">{t.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════ مصادر إضافية ═══════ */}
        <div className="mt-7">
          <h2 className="mb-3 font-display text-base font-extrabold">مصادر إضافية</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXTERNAL.map((q) => (
              <a key={q.href} href={q.href} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-l from-primary/10 to-transparent p-4 transition hover:-translate-y-0.5 hover:shadow-glass">
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
