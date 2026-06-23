"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faRobot, faFire, faChalkboardUser, faComments,
  faThumbsUp, faBookmark, faClipboardCheck, faEllipsis,
  faBookOpen, faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { AppShell } from "@/components/app-shell";
import { useBacCountdownFull } from "@/features/settings/use-bac-date";
import { listenPosts, type Post } from "@/features/community/social";
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

        {/* ═══════ عدّاد البكالوريا ═══════ */}
        <div className="relative overflow-hidden rounded-3xl border border-border p-5 sm:p-7"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)" }}>
          {/* توهّج خلفي */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="relative">
            <p className="text-sm font-bold text-white/70">{siteSettings.homeWelcomeTitle || "مرحباً"}، {name} 👋</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl">عدّاد البكالوريا</h1>
            <p className="mt-1 text-sm text-white/60">باقي على الامتحان</p>

            {/* الرقم الكبير للأيام */}
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display text-6xl font-extrabold tabular-nums text-white sm:text-7xl">{days}</span>
              <span className="mb-2 text-lg font-bold text-white/80">يوم</span>
            </div>

            {/* خط فاصل */}
            <div className="my-4 h-px w-full bg-white/15" />

            {/* ساعات/دقائق/ثوانٍ */}
            <div className="flex items-center gap-5">
              <CounterCell value={hours} label="ساعة" />
              <div className="h-8 w-px bg-white/15" />
              <CounterCell value={minutes} label="دقيقة" />
              <div className="h-8 w-px bg-white/15" />
              <CounterCell value={seconds} label="ثانية" />
              {days <= 30 && (
                <span className="ms-auto flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300">
                  <FontAwesomeIcon icon={faFire} className="h-3.5 w-3.5 animate-pulse" />
                  لا تضيّع الوقت!
                </span>
              )}
            </div>

            {/* سلسلة الأيام */}
            {(profile?.streak ?? 0) >= 2 && (
              <div className="mt-4">
                <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                  <FontAwesomeIcon icon={faFire} className="h-3.5 w-3.5" />
                  {profile?.streak} أيام متتالية 🔥
                </span>
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

        {/* ═══════ نشاط المجتمع ═══════ */}
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">نشاط المجتمع</h2>
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
                <Link key={p.id} href={`/community/${p.id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-glass">
                  {/* رأس المنشور */}
                  <div className="flex items-center gap-2.5">
                    <LiveAvatar uid={p.authorId} name={p.authorName} size="md" />
                    <div className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="truncate font-bold">{p.authorName}</span>
                        <RoleBadge uid={p.authorId} role={p.authorRole} />
                      </span>
                      <span className="text-xs text-text-muted">{timeAgo(p.createdAt)}</span>
                    </div>
                    <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4 text-text-muted" />
                  </div>

                  {/* نص المنشور */}
                  {p.text && <p className="mt-3 line-clamp-3 text-sm leading-relaxed">{p.text}</p>}

                  {/* مؤشّر مرفق */}
                  {p.attachmentKind === "file" && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-muted">
                      <FontAwesomeIcon icon={faClipboardCheck} className="h-4 w-4 text-primary" />
                      {p.fileName || "ملف مرفق"}
                    </div>
                  )}

                  {/* شريط التفاعل */}
                  <div className="mt-3 flex items-center gap-5 border-t border-border pt-3 text-sm text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faThumbsUp} className="h-4 w-4 text-secondary" />
                      {p.score}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faComments} className="h-4 w-4" />
                      {p.commentCount}
                    </span>
                    <FontAwesomeIcon icon={faBookmark} className="ms-auto h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </section>
    </AppShell>
  );
}
