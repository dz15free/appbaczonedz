"use client";

import { useEffect, useState, memo } from "react";
import { useStudyNudge, markActiveToday } from "@/features/notifications/study-nudge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faRobot, faComments, faChalkboardUser, faBookOpen, faTrophy,
  faCalendarCheck, faLayerGroup, faListCheck, faCrown, faCalendarDays,
  faPeopleGroup, faGraduationCap, faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { AppShell } from "@/components/app-shell";
import { HomeHeroSlider } from "@/components/ui/home-hero-slider";
import { InstallAppBanner } from "@/components/ui/install-app-banner";
import { FeatureCards, SocialLinks, AdvertiseCard, HomeExternalHighlights, NotificationToggle } from "@/components/ui/home-feature-sections";
import { AdSlot } from "@/components/ui/ad-slot";
import { HomeCourses } from "@/components/ui/home-courses";
import { TeacherTools } from "@/components/ui/teacher-tools";
import { StudyFeed } from "@/features/feed/study-feed";
import { DailyPanel } from "@/features/daily/daily-panel";
import { RoomDiscovery, useSessionReminders } from "@/features/rooms/room-discovery";
import { listenPosts, type Post } from "@/features/community/social";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { PostPreviewCard } from "@/features/community/post-preview-card";
import { EmptyState, SkeletonList, SeeAll, Skeleton, Card } from "@/components/ui/kit";
import { Button } from "@/components/ui/field";
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

/* بطاقة منشور — تستدعي البطاقة المشتركة نفسها التي يستعملها المجتمع.
   كانت الرئيسية تملك **نسخة ثانية** من بطاقة المنشور: صورة ٤٠px بدل
   ٣٢px، وشريط تصويت مختلف، وصيغة وقت مختلفة («منذ ٥ دقيقة» مقابل
   «٥ د»). نسختان تعنيان أنّ كل تحسين يجب أن يُكتب مرّتين. */

/* الوصول السريع — رفّ أفقي على الهاتف، شبكة على الشاشات الأوسع.
   ٦ مربّعات ٥٦px في شبكة ٣×٢ كانت تأكل ~١٩٠px من ارتفاع شاشة ٦٤٠px
   لتعرض ما يعرفه المستخدم أصلاً. الرفّ يعرضها كلّها في سطر واحد. */
const SectionsRow = memo(function SectionsRow() {
  return (
    <div className="bz-rail sm:!mx-0 sm:!grid sm:grid-cols-6 sm:!px-0">
      {SECTIONS.map((s) => (
        <Link key={s.href} href={s.href}
          className="group flex w-[74px] shrink-0 flex-col items-center gap-1.5 sm:w-auto">
          <span className={`grid h-14 w-14 place-items-center rounded-card transition duration-fast group-hover:scale-105 ${s.color}`}>
            <FontAwesomeIcon icon={s.icon} className="h-[22px] w-[22px]" />
          </span>
          <span className="text-center text-[11.5px] font-bold leading-tight text-text-muted">{s.label}</span>
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
    <Card>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="bz-h-section flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 text-amber-500" /> أبطال المنصّة
        </h2>
        <SeeAll href="/leaderboard" label="الترتيب الكامل" />
      </div>
      <div className="space-y-2">
        {top.map((p, i) => (
          <Link key={p.uid} href={`/u/${p.uid}?name=${encodeURIComponent(p.name)}`}
            className="flex min-h-12 items-center gap-3 rounded-item px-2 transition hover:bg-primary/[0.06]">
            <span className={`w-5 text-center font-display text-sm font-extrabold ${i < 3 ? medals[i] : "text-text-muted"}`}>
              {i < 3 ? <FontAwesomeIcon icon={faCrown} className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <LiveAvatar uid={p.uid} name={p.name} size="sm" className="h-9 w-9" />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-text-primary">{p.name}</span>
            <span className="shrink-0 rounded-chip bg-primary/10 px-2.5 py-1 text-[11.5px] font-extrabold text-primary">{p.points} ن</span>
          </Link>
        ))}
      </div>
    </Card>
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
  /* حالة تحميل صريحة: كانت `posts` تبدأ `[]` فيومض «لا منشورات بعد»
     في كل زيارة قبل وصول البيانات — أسوأ انطباع أوّل ممكن. */
  const [postsLoading, setPostsLoading] = useState(true);

  /* الواجهة تتبع الدور: الأستاذ لا يراجع للبكالوريا، فأدوات الطالب
     تملأ شاشته بما لا يستعمله. */
  const isTeacher = profile?.role === "teacher";
  const track = profile?.track ?? null;

  // تذكير الجلسات المجدولة التي طلبها الطالب وحان وقتها
  useSessionReminders(isTeacher ? undefined : user?.uid);

  useEffect(() => { if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search)); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    const unsub = listenPosts(user.uid, (all) => { setPosts(all.slice(0, 5)); setPostsLoading(false); });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  /* التحميل داخل الغلاف لا خارجه: كان يُرجع نصّاً عارياً بلا هيدر ولا
     شريط سفلي، فتومض الصفحة بيضاء تماماً عند كل تحقّق من الجلسة. */
  if (loading || !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
          <Skeleton className="h-44 w-full rounded-panel" />
          <Skeleton className="h-28 w-full rounded-card" />
          <SkeletonList count={2} lines={2} />
        </div>
      </AppShell>
    );
  }
  const name = profile?.name || user.displayName || "طالب";

  return (
    <AppShell>
      {/* ══════════════════════════════════════════════════════════
          شجرة واحدة متجاوبة

          كانت الرئيسية مكتوبة **مرّتين**: نسخة `lg:grid` ونسخة
          `lg:hidden`، كلتاهما تُركَّبان معاً في كل زيارة. فكان
          `HomeHeroSlider` يشغّل مؤقّتَي شرائح، و`StudyFeed`
          و`RoomDiscovery` و`HomeCourses` تفتح مستمعي Firebase
          مضاعفين، ثمّ يُخفى نصف ذلك بـ CSS. وقد تباعدت النسختان
          فعلاً: «أبطال المنصّة» لم تكن تظهر على الهاتف إطلاقاً.

          الترتيب هنا مقصود: ما يفعله الطالب **الآن** أوّلاً (تحيّته
          وعدّه التنازلي، مهمّة اليوم، وصوله السريع)، ثمّ ما يكتشفه،
          ثمّ ما يقرؤه، وأخيراً ما هو خدميّ. لافتة التثبيت وتفعيل
          الإشعارات نزلتا إلى الأسفل: لا يجوز أن يكون أوّل ما يراه
          مَن فتح المنصّة للمذاكرة طلبَين منّا.
          ══════════════════════════════════════════════════════════ */}
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-4 sm:px-5 lg:grid-cols-3 lg:gap-6 lg:py-6">

        {/* ── العمود الرئيسي ── */}
        <div className="space-y-5 lg:col-span-2 lg:space-y-6">
          <HomeHeroSlider name={name} welcomeTitle={settings.homeWelcomeTitle} />

          {/* مهمّة اليوم للطالب · أدوات التدريس للأستاذ */}
          {isTeacher ? <TeacherTools uid={user.uid} /> : <DailyPanel uid={user.uid} track={track} />}

          {/* الوصول السريع */}
          <section aria-labelledby="h-quick">
            <h2 id="h-quick" className="bz-h-section mb-2.5">الوصول السريع</h2>
            <SectionsRow />
          </section>

          {/* مساحة الدراسة — محتوى يفعله الطالب لا يقرؤه فقط */}
          {!isTeacher && <StudyFeed uid={user.uid} track={track} limit={4} />}

          {/* من يراجع الآن؟ */}
          <RoomDiscovery uid={user.uid} track={track} subject={profile?.teachSubject ?? null} />

          {/* الدورات */}
          <HomeCourses track={profile?.track} />

          {/* آخر المنشورات */}
          <section aria-labelledby="h-posts">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="h-posts" className="bz-h-section">آخر المنشورات</h2>
              <SeeAll href="/community" label="كل المنشورات" />
            </div>
            {postsLoading ? (
              <SkeletonList count={2} lines={2} />
            ) : posts.length === 0 ? (
              <EmptyState
                icon={faComments}
                title="لا منشورات بعد"
                hint="اسأل عمّا يصعب عليك، أو شارك ملخّصاً أفادك — أوّل منشور يفتح النقاش."
                action={<Link href="/community?compose=1"><Button size="md">اكتب أوّل منشور</Button></Link>}
                compact
              />
            ) : (
              <div className="space-y-3">
                {posts.map((p) => <PostPreviewCard key={p.id} p={p} uid={user.uid} />)}
              </div>
            )}
          </section>

          {/* وجهات مفيدة */}
          <HomeExternalHighlights />
          <FeatureCards />
          <AdSlot placement="home" />
        </div>

        {/* ── العمود الجانبي ──
            على الهاتف يتدفّق أسفل العمود الرئيسي طبيعياً، فيصل الطالب
            إلى «أبطال المنصّة» — التي لم تكن تصله أبداً قبل الدمج. */}
        <aside className="space-y-5 lg:space-y-6">
          <MiniLeaderboard />

          {/* أدوات الباكلوريا — للطالب: مراجعته لا تدريس الأستاذ */}
          {!isTeacher && (
            <section aria-labelledby="h-tools">
              <h2 id="h-tools" className="bz-h-section mb-2.5">أدوات الباكلوريا</h2>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {TOOLS.map((t) => (
                  <Link key={t.href} href={t.href}
                    className="bz-surface-1 bz-lift group flex items-center gap-3 rounded-card p-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-item ${t.color}`}>
                      <FontAwesomeIcon icon={t.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-extrabold text-text-primary">{t.label}</span>
                      <span className="block truncate text-[11.5px] text-text-muted">{t.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* مصادر إضافية */}
          <section aria-labelledby="h-res">
            <h2 id="h-res" className="bz-h-section mb-2.5">مصادر إضافية</h2>
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
          </section>

          {/* خدميّات: أسفل الصفحة عمداً */}
          <NotificationToggle />
          <InstallAppBanner />
          <SocialLinks />
          <AdvertiseCard />
        </aside>
      </div>
    </AppShell>
  );
}
