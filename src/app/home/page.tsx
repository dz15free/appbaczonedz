"use client";

import { useEffect, useState, memo } from "react";
import { useStudyNudge, markActiveToday } from "@/features/notifications/study-nudge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faRobot, faComments, faChalkboardUser,
  faClipboardCheck, faBookOpen, faTrophy, faCalendarCheck,
  faUpRightFromSquare, faLayerGroup, faListCheck,
  faArrowUp, faArrowDown, faComment, faCrown, faCalendarDays, faPeopleGroup, faGraduationCap, faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { AppShell } from "@/components/app-shell";
import { HomeHeroSlider } from "@/components/ui/home-hero-slider";
import { InstallAppBanner } from "@/components/ui/install-app-banner";
import { SocialLinks, AdvertiseCard, YoutubeSourceCard, NotificationToggle } from "@/components/ui/home-feature-sections";
import { QuickAccess } from "@/components/ui/quick-access";
import { AdSlot } from "@/components/ui/ad-slot";
import { HomeCourses } from "@/components/ui/home-courses";
import { TeacherTools } from "@/components/ui/teacher-tools";
import { StudyFeed } from "@/features/feed/study-feed";
import { DailyPanel } from "@/features/daily/daily-panel";
import { RoomDiscovery, useSessionReminders } from "@/features/rooms/room-discovery";
import { listenPosts, votePost, type Post } from "@/features/community/social";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { ref, query, orderByChild, limitToLast, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { loginHrefFor } from "@/features/auth/use-require-auth";

/* أقسام الموقع */
const SECTIONS = [
  { href: "/rooms", label: "غرف الدراسة", icon: faChalkboardUser, color: "bg-indigo-500/10 text-indigo-500" },
  { href: "/courses", label: "الدورات", icon: faGraduationCap, color: "bg-primary/10 text-primary" },
  { href: "/library", label: "المكتبة", icon: faBookOpen, color: "bg-emerald-500/10 text-emerald-500" },
  { href: "/aibot", label: "الخباشة", icon: faRobot, color: "bg-violet-500/10 text-violet-500" },
  { href: "/community", label: "المجتمع", icon: faUsers, color: "bg-sky-500/10 text-sky-500" },
  { href: "/groups", label: "المجموعات", icon: faPeopleGroup, color: "bg-teal-500/10 text-teal-500" },
];

const TOOLS = [
  { href: "/tools/tasks", label: "مهامي الدراسية", desc: "خطط الخباشة كمهام", icon: faListCheck, color: "bg-violet-500/10 text-violet-500" },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", desc: "احفظ بالتكرار المتباعد", icon: faLayerGroup, color: "bg-amber-500/10 text-amber-500" },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", desc: "تتبّع مراجعتك", icon: faListCheck, color: "bg-sky-500/10 text-sky-500" },
];

/* 🐛 حُذفت `EXTERNAL` و`ExternalGrid`: بطاقتاهما («إنشاء برنامج
   مراجعة» و«مخطّط البكالوريا») صارتا ضمن الشبكة الموحّدة، فكانتا
   تظهران **مرّتين في القسم نفسه** — وهو التكرار الذي رآه. */

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "الآن";
  const m = Math.floor(s / 60); if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60); if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24); return `منذ ${d} يوم`;
}

/* بطاقة منشور */
const PostCard = memo(function PostCard({ p, uid }: { p: Post; uid: string }) {
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
});

/* الوصول السريع صار مكوّناً مستقلاًّ في `components/ui/quick-access.tsx`:
   يجمع أقسام المنصّة وبطاقة المحاكاة وكل وجهات البكالوريا في كتلة
   واحدة يستعملها الحاسوب والهاتف بلا اختلاف. */

/* بطاقات الأدوات */
const ToolsGrid = memo(function ToolsGrid() {
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
});


/* لوحة الترتيب المصغّرة */
interface MiniPlayer { uid: string; name: string; points: number }
function MiniLeaderboard() {
  const [top, setTop] = useState<MiniPlayer[]>([]);
  useEffect(() => {
    const q = query(ref(rtdb, "users"), orderByChild("points"), limitToLast(20));
    const unsub = onValue(q, (snap) => {
      const val = (snap.val() as Record<string, any>) ?? {};
      const list = Object.entries(val)
        .filter(([, u]: [string, any]) => u.role !== "teacher" && u.role !== "admin")
        .map(([uid, u]: [string, any]) => ({ uid, name: u.name ?? "طالب", points: u.points ?? 0 }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      setTop(list);
    });
    return () => { if (typeof unsub === "function") unsub(); };
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

  /* تذكير المراجعة — قيوده داخل الخطّاف نفسه (مرّة/يوم · 16–21 ·
     للطالب · لا لمن درس اليوم · يتوقّف بعد 3 تجاهلات). */
  useStudyNudge(user?.uid, profile?.role);

  // نُسجّل نشاط اليوم: من يفتح المنصّة اليوم لا يُذكَّر مساءً
  useEffect(() => {
    if (user?.uid) void markActiveToday(user.uid);
  }, [user?.uid]);
  const { settings } = useSiteSettings();
  const [posts, setPosts] = useState<Post[]>([]);

  /* الواجهة تتبع الدور: الأستاذ لا يراجع للبكالوريا، فأدوات الطالب
     تملأ شاشته بما لا يستعمله. */
  const isTeacher = profile?.role === "teacher";
  const track = profile?.track ?? null;

  // تذكير الجلسات المجدولة التي طلبها الطالب وحان وقتها
  useSessionReminders(isTeacher ? undefined : user?.uid);

  useEffect(() => { if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search)); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    const unsub = listenPosts(user.uid, (all) => setPosts(all.slice(0, 6)));
    return () => { if (typeof unsub === "function") unsub(); };
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


          {/* الإشعارات — بارزة ليراها الجميع */}
          <NotificationToggle />

          {/* أدوات التدريس للأستاذ · مهمّة اليوم للطالب */}
          {isTeacher ? <TeacherTools uid={user.uid} /> : <DailyPanel uid={user.uid} track={track} />}

          {/* الوصول السريع */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-[17px] font-extrabold">الوصول السريع</h2>
            <QuickAccess isTeacher={isTeacher} />
          </div>

          {/* مساحة الدراسة — محتوى يفعله الطالب لا يقرؤه فقط */}
          {!isTeacher && <StudyFeed uid={user.uid} track={track} limit={4} />}

          {/* من يراجع الآن؟ */}
          <RoomDiscovery uid={user.uid} track={track} subject={profile?.teachSubject ?? null} />

          {/* الدورات — قسم مستقلّ يسبق بقيّة المصادر */}
          <HomeCourses track={profile?.track} />

          {/* «وجهات مهمّة» و«بطاقات المزايا» انتقلتا بالكامل إلى
              «الوصول السريع» أعلى الصفحة: كانتا قسمين منفصلين بتصميمين
              مختلفين لشيء واحد، وفي موضع لا يصله الطالب بعد أن تكثر
              المنشورات. */}
          <AdSlot placement="home" />
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
          <SocialLinks />
          {settings.advertiseEnabled !== false && <AdvertiseCard />}
          {/* أدوات الباكلوريا — للطالب: مراجعته لا تدريس الأستاذ */}
          {!isTeacher && (
          <div>
            <h3 className="mb-3 font-display text-base font-extrabold">أدوات الباكلوريا</h3>
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
          )}
          <div>
            <h3 className="mb-3 font-display text-base font-extrabold">مصادر إضافية</h3>

            {/* التخصّصات: أهمّ مصدر خارج المذاكرة — يقرّر مستقبله لا درجته */}
            <div className="bz-res-grid is-stack">
                            <a href="https://www.baczonedz.com/p/blog-page_5.html" target="_blank" rel="noreferrer" className="bz-res-card is-green">
                <span className="bz-res-bg" aria-hidden />
                <span className="bz-res-in">
                  <span className="bz-res-icon"><FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5" /></span>
                  <span className="bz-res-txt">
                    <span className="bz-res-t">نظّم مراجعتك من اليوم</span>
                    <span className="bz-res-d">أنشئ برنامج مراجعة يناسب وقتك ومستواك.</span>
                  </span>
                  <span className="bz-res-cta">ابدأ<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                </span>
              </a>

              <Link href="/tools/planner" className="bz-res-card is-amber">
                <span className="bz-res-bg" aria-hidden />
                <span className="bz-res-in">
                  <span className="bz-res-icon"><FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5" /></span>
                  <span className="bz-res-txt">
                    <span className="bz-res-t">مخطّط البكالوريا للطباعة</span>
                    <span className="bz-res-d">صمّمه، حمّله صورة، أو خذ بلانر PDF جاهزاً.</span>
                  </span>
                  <span className="bz-res-cta">جهّزه<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                </span>
              </Link>

              <YoutubeSourceCard />

              <Link href="/specialties" className="bz-res-card is-blue">
                <span className="bz-res-bg" aria-hidden />
                <span className="bz-res-in">
                  <span className="bz-res-icon"><FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5" /></span>
                  <span className="bz-res-txt">
                    <span className="bz-res-t">ماذا ستدرس بعد البكالوريا؟</span>
                    <span className="bz-res-d">تعرّف على التخصّصات الجامعية قبل أن تملأ رغباتك.</span>
                  </span>
                  <span className="bz-res-cta">اكتشف<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
                </span>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ══════════ نسخة الهاتف ══════════ */}
      <section className="mx-auto max-w-2xl space-y-6 px-4 py-4 lg:hidden">
        <InstallAppBanner />
        <HomeHeroSlider name={name} welcomeTitle={settings.homeWelcomeTitle} />

        {/* الإشعارات — فوق الوصول السريع ليراها الجميع */}
        <NotificationToggle />

        {/* أدوات التدريس للأستاذ · مهمّة اليوم للطالب */}
        {isTeacher ? <TeacherTools uid={user.uid} /> : <DailyPanel uid={user.uid} track={track} />}

        {/* الوصول السريع */}
        <div>
          <h2 className="mb-3 font-display text-[17px] font-extrabold">الوصول السريع</h2>
          <QuickAccess isTeacher={isTeacher} />
        </div>

        {/* مساحة الدراسة */}
        {!isTeacher && <StudyFeed uid={user.uid} track={track} limit={4} />}

        {/* من يراجع الآن؟ */}
        <RoomDiscovery uid={user.uid} track={track} />

        {/* الدورات */}
        <HomeCourses track={profile?.track} />

        {/* «وجهات مهمّة» و«بطاقات المزايا» صارتا داخل «الوصول السريع» */}

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

        {/* ══ أقسام الذيل ══
            تبقى في آخر الصفحة كما هي، لكنّها لم تعد مدفونة: أزرار
            القفز في «الوصول السريع» تُنزل إليها مباشرةً، والمعرّفات
            هنا هي هدف تلك الأزرار. و`scroll-margin-top` يمنع الهيدر
            اللاصق من تغطية العنوان بعد القفز. */}

        {/* مصادر إضافية */}
        <div id="bz-res" className="bz-anchor">
          <h2 className="mb-3 font-display text-[17px] font-extrabold">مصادر إضافية</h2>

          {/* التخصّصات: أهمّ مصدر خارج المذاكرة — يقرّر مستقبله لا درجته */}
          <div className="bz-res-grid is-stack">
            <a href="https://www.baczonedz.com/p/blog-page_5.html" target="_blank" rel="noreferrer" className="bz-res-card is-green">
              <span className="bz-res-bg" aria-hidden />
              <span className="bz-res-in">
                <span className="bz-res-icon"><FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5" /></span>
                <span className="bz-res-txt">
                  <span className="bz-res-t">نظّم مراجعتك من اليوم</span>
                  <span className="bz-res-d">أنشئ برنامج مراجعة يناسب وقتك ومستواك.</span>
                </span>
                <span className="bz-res-cta">ابدأ<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
              </span>
            </a>

            <Link href="/tools/planner" className="bz-res-card is-amber">
              <span className="bz-res-bg" aria-hidden />
              <span className="bz-res-in">
                <span className="bz-res-icon"><FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5" /></span>
                <span className="bz-res-txt">
                  <span className="bz-res-t">مخطّط البكالوريا للطباعة</span>
                  <span className="bz-res-d">صمّمه، حمّله صورة، أو خذ بلانر PDF جاهزاً.</span>
                </span>
                <span className="bz-res-cta">جهّزه<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
              </span>
            </Link>

            <YoutubeSourceCard />

            <Link href="/specialties" className="bz-res-card is-blue">
              <span className="bz-res-bg" aria-hidden />
              <span className="bz-res-in">
                <span className="bz-res-icon"><FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5" /></span>
                <span className="bz-res-txt">
                  <span className="bz-res-t">ماذا ستدرس بعد البكالوريا؟</span>
                  <span className="bz-res-d">تعرّف على التخصّصات الجامعية قبل أن تملأ رغباتك.</span>
                </span>
                <span className="bz-res-cta">اكتشف<FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></span>
              </span>
            </Link>
          </div>
        </div>

        {/* أدوات الباكلوريا — للطالب وحده (كما على الحاسوب) */}
        {!isTeacher && (
          <div id="bz-tools" className="bz-anchor">
            <h2 className="mb-3 font-display text-[17px] font-extrabold">أدوات الباكلوريا</h2>
            <ToolsGrid />
          </div>
        )}

        {/* تابعنا */}
        <div id="bz-social" className="bz-anchor"><SocialLinks /></div>

        {/* أعلن معنا — لا تُرسم المرساة ولا المساحة عند التعطيل */}
        {settings.advertiseEnabled !== false && <div id="bz-ads" className="bz-anchor"><AdvertiseCard /></div>}
      </section>
    </AppShell>
  );
}
