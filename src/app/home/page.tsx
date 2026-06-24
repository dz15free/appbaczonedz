"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faRobot, faComments, faChalkboardUser,
  faClipboardCheck, faBookOpen, faTrophy, faCalendarCheck,
  faUpRightFromSquare, faLayerGroup, faListCheck,
  faArrowUp, faArrowDown, faComment, faCrown,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { AppShell } from "@/components/app-shell";
import { HomeHeroSlider } from "@/components/ui/home-hero-slider";
import { listenPosts, votePost, type Post } from "@/features/community/social";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { ref, query, orderByChild, limitToLast, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* أقسام الموقع */
const SECTIONS = [
  { href: "/rooms", label: "غرف الدراسة", icon: faChalkboardUser, color: "bg-indigo-500/10 text-indigo-500" },
  { href: "/library", label: "المكتبة", icon: faBookOpen, color: "bg-emerald-500/10 text-emerald-500" },
  { href: "/omibot", label: "الخباشة", icon: faRobot, color: "bg-violet-500/10 text-violet-500" },
  { href: "/community", label: "المجتمع", icon: faUsers, color: "bg-sky-500/10 text-sky-500" },
  { href: "/leaderboard", label: "الترتيب", icon: faTrophy, color: "bg-amber-500/10 text-amber-500" },
];

const TOOLS = [
  { href: "/tools/tasks", label: "مهامي الدراسية", desc: "خطط الخباشة كمهام", icon: faListCheck, color: "bg-violet-500/10 text-violet-500" },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", desc: "احفظ بالتكرار المتباعد", icon: faLayerGroup, color: "bg-amber-500/10 text-amber-500" },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", desc: "تتبّع مراجعتك", icon: faListCheck, color: "bg-sky-500/10 text-sky-500" },
];

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

/* بطاقة منشور */
function PostCard({ p, uid }: { p: Post; uid: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-glass">
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
      {p.text && (
        <Link href={`/community/${p.id}`} className="mt-3 block line-clamp-3 text-sm leading-relaxed">{p.text}</Link>
      )}
      {p.attachmentKind === "file" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-muted">
          <FontAwesomeIcon icon={faClipboardCheck} className="h-4 w-4 text-primary" />
          {p.fileName || "ملف مرفق"}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-sm">
        <div className="flex items-center gap-1 rounded-full bg-background px-1">
          <button onClick={() => votePost(p.id, uid, 1, p.myVote)}
            className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === 1 ? "text-secondary" : "text-text-muted hover:text-secondary"}`} aria-label="رفع">
            <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
          </button>
          <span className={`min-w-4 text-center text-sm font-bold ${p.score > 0 ? "text-secondary" : p.score < 0 ? "text-danger" : "text-text-muted"}`}>{p.score}</span>
          <button onClick={() => votePost(p.id, uid, -1, p.myVote)}
            className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === -1 ? "text-danger" : "text-text-muted hover:text-danger"}`} aria-label="خفض">
            <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
          </button>
        </div>
        <Link href={`/community/${p.id}`} className="flex items-center gap-1.5 text-text-muted hover:text-primary">
          <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
          {p.commentCount > 0 ? `${p.commentCount} تعليق` : "تعليق"}
        </Link>
      </div>
    </div>
  );
}

/* قسم الأقسام */
function SectionsRow() {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {SECTIONS.map((s) => (
        <Link key={s.href} href={s.href} className="group flex flex-col items-center gap-2">
          <span className={`grid h-14 w-14 place-items-center rounded-2xl transition group-hover:scale-105 sm:h-16 sm:w-16 ${s.color}`}>
            <FontAwesomeIcon icon={s.icon} className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <span className="text-center text-[11px] font-semibold leading-tight text-text-muted sm:text-xs">{s.label}</span>
        </Link>
      ))}
    </div>
  );
}

/* بطاقات الأدوات */
function ToolsGrid() {
  return (
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
  );
}

/* مصادر خارجية */
function ExternalGrid() {
  return (
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
  );
}

/* لوحة الترتيب المصغّرة */
interface MiniPlayer { uid: string; name: string; points: number }
function MiniLeaderboard() {
  const [top, setTop] = useState<MiniPlayer[]>([]);
  useEffect(() => {
    const q = query(ref(rtdb, "users"), orderByChild("points"), limitToLast(20));
    return onValue(q, (snap) => {
      const val = (snap.val() as Record<string, any>) ?? {};
      const list = Object.entries(val)
        .filter(([, u]: [string, any]) => u.role !== "teacher" && u.role !== "admin")
        .map(([uid, u]: [string, any]) => ({ uid, name: u.name ?? "طالب", points: u.points ?? 0 }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      setTop(list);
    });
  }, []);

  if (top.length === 0) return null;
  const medals = ["text-amber-400", "text-slate-400", "text-amber-700"];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-extrabold">
          <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 text-amber-400" /> أبطال المنصّة
        </h3>
        <Link href="/leaderboard" className="text-sm font-semibold text-primary hover:underline">الترتيب الكامل</Link>
      </div>
      <div className="space-y-2">
        {top.map((p, i) => (
          <Link key={p.uid} href={`/u/${p.uid}?name=${encodeURIComponent(p.name)}`}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-background">
            <span className={`w-5 text-center font-display text-sm font-extrabold ${i < 3 ? medals[i] : "text-text-muted"}`}>
              {i < 3 ? <FontAwesomeIcon icon={faCrown} className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <LiveAvatar uid={p.uid} name={p.name} size="sm" className="h-9 w-9" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{p.points} ن</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const { settings } = useSiteSettings();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    return listenPosts(user.uid, (all) => setPosts(all.slice(0, 6)));
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  const name = profile?.name || user.displayName || "طالب";

  return (
    <AppShell>
      {/* ══════════ نسخة الحاسوب ══════════ */}
      <div className="mx-auto hidden max-w-6xl gap-6 px-5 py-6 lg:grid lg:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-6 lg:col-span-2">
          <HomeHeroSlider name={name} welcomeTitle={settings.homeWelcomeTitle} />
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionsRow />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">آخر المنشورات</h2>
              <Link href="/community" className="text-sm font-semibold text-primary hover:underline">عرض الكل</Link>
            </div>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface py-10 text-center text-text-muted">
                <FontAwesomeIcon icon={faComments} className="h-8 w-8 opacity-40" />
                <p className="mt-3 text-sm">لا منشورات بعد. كن أوّل من يشارك!</p>
              </div>
            ) : (
              <div className="space-y-3">{posts.map((p) => <PostCard key={p.id} p={p} uid={user.uid} />)}</div>
            )}
          </div>
        </div>

        {/* العمود الجانبي */}
        <aside className="space-y-6">
          <MiniLeaderboard />
          <div>
            <h3 className="mb-3 font-display text-base font-extrabold">أدوات الدراسة</h3>
            <div className="space-y-3">
              {TOOLS.map((t) => (
                <Link key={t.href} href={t.href}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-primary/30 hover:shadow-glass">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t.color}`}>
                    <FontAwesomeIcon icon={t.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{t.label}</span>
                    <span className="text-xs text-text-muted">{t.desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-display text-base font-extrabold">مصادر إضافية</h3>
            <div className="space-y-3">
              {EXTERNAL.map((q) => (
                <a key={q.href} href={q.href} target="_blank" rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-l from-primary/10 to-transparent p-3 transition hover:shadow-glass">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white">
                    <FontAwesomeIcon icon={q.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-bold">{q.label}<FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 text-text-muted" /></span>
                    <span className="text-xs text-text-muted">{q.desc}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ══════════ نسخة الهاتف ══════════ */}
      <section className="mx-auto max-w-2xl space-y-7 px-4 py-4 lg:hidden">
        <HomeHeroSlider name={name} welcomeTitle={settings.homeWelcomeTitle} />
        <SectionsRow />

        {/* آخر المنشورات */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">آخر المنشورات</h2>
            <Link href="/community" className="text-sm font-semibold text-primary hover:underline">عرض الكل</Link>
          </div>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface py-10 text-center text-text-muted">
              <FontAwesomeIcon icon={faComments} className="h-8 w-8 opacity-40" />
              <p className="mt-3 text-sm">لا منشورات بعد. كن أوّل من يشارك!</p>
            </div>
          ) : (
            <div className="space-y-3">{posts.map((p) => <PostCard key={p.id} p={p} uid={user.uid} />)}</div>
          )}
        </div>

        {/* أدوات الدراسة */}
        <div>
          <h2 className="mb-3 font-display text-base font-extrabold">أدوات الدراسة</h2>
          <ToolsGrid />
        </div>

        {/* مصادر إضافية */}
        <div>
          <h2 className="mb-3 font-display text-base font-extrabold">مصادر إضافية</h2>
          <ExternalGrid />
        </div>

        {/* الترتيب */}
        <MiniLeaderboard />
      </section>
    </AppShell>
  );
}
