"use client";

import { useEffect, useRef, useState } from "react";
import { listenBroadcasts } from "@/features/notifications/broadcast";
import { useNavLinks } from "@/features/admin/nav-store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faHouse, faUsers, faGlobe, faBell, faLayerGroup, faMagnifyingGlass, faBullhorn, faXmark, faBookOpen, faBars, faPlus, faRobot, faTrophy, faClipboardCheck, faCalendarCheck, faListCheck, faEllipsis, faChevronDown, faUpRightFromSquare, faScaleBalanced, faFileLines, faCalendarDays, faCalculator, faGraduationCap, faClone, faChartLine, faLink, faChalkboardUser, faRightToBracket, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { SearchModal } from "@/components/search-modal";
import { recordDailyVisit } from "@/features/gamification/points";
import { ensureNameInRTDB } from "@/lib/firebase/auth";
import { useSiteBanner } from "@/features/settings/use-bac-date";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { listenNotifications } from "@/features/community/social";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AdSlot } from "@/components/ui/ad-slot";
import { FloatingDock } from "@/components/ui/floating-dock";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { Brand } from "@/components/ui/brand";
import { SiteFooter } from "@/components/ui/site-footer";

/* أيقونات التواصل (SVG مضمّن) */
function DrawerTelegramIcon({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;
}
function DrawerInstagramIcon({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>;
}
function DrawerFacebookIcon({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}

/* `wide`: يظهر من `2xl` (١٥٣٦px) فصاعداً فقط.
   ستّة روابط + قائمتان + الشعار + أزرار الحساب لا تتّسع حتى في
   ١٢٨٠px فتتراكب. «المكتبة» و«الترتيب» موجودان في الوصول السريع
   وفي الدرج أيضاً، فتأخيرهما إلى الشاشات الأعرض لا يُفقد شيئاً. */
const NAV = [
  { href: "/home", label: "الرئيسية", icon: faHouse, wide: false },
  { href: "/courses", label: "الدورات", icon: faGraduationCap, wide: false },
  { href: "/rooms", label: "الغرف", icon: faUsers, wide: false },
  { href: "/community", label: "المجتمع", icon: faGlobe, wide: false },
  { href: "/library", label: "المكتبة", icon: faBookOpen, wide: true },
  { href: "/leaderboard", label: "الترتيب", icon: faTrophy, wide: true },
];

/* روابط الدورات حسب الدور — الطالب لا يرى «إنشاء دورة»، والأستاذ لا
   يرى أدوات الإدارة. عرض ما لا يُسمح به يُنتج نقرة تنتهي برفض. */
function courseLinksFor(role?: string) {
  if (role === "admin") {
    return [
      { href: "/courses", label: "الدورات", icon: faGraduationCap, external: false },
      { href: "/courses/teach", label: "دوراتي التعليمية", icon: faChalkboardUser, external: false },
      { href: "/admin?tab=courses", label: "إدارة الدورات", icon: faClipboardCheck, external: false },
    ];
  }
  if (role === "teacher") {
    return [
      { href: "/courses", label: "الدورات", icon: faGraduationCap, external: false },
      { href: "/courses/teach", label: "دوراتي التعليمية", icon: faChalkboardUser, external: false },
      { href: "/courses/new", label: "إنشاء دورة", icon: faPlus, external: false },
    ];
  }
  return [
    { href: "/courses", label: "الدورات", icon: faGraduationCap, external: false },
    { href: "/courses/mine", label: "دوراتي", icon: faClone, external: false },
  ];
}

/* قائمة "أدوات الدراسة" المنسدلة (حاسوب) — أدوات **الطالب** */
const TOOLS_DROPDOWN = [
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/aibot", label: "الخباشة — المساعدة الآلية", icon: faRobot, external: false },
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faClone, external: false },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faChartLine, external: false },
];

/* أدوات **الأستاذ** — تحلّ محلّ أدوات الدراسة لا تُضاف إليها.
   «تقدّمي الدراسي» و«بطاقات المراجعة» و«مهامي» أدوات مراجعة طالب،
   ووجودها في قائمة أستاذ ازدحامٌ بلا فائدة. */
const TEACH_DROPDOWN = [
  { href: "/courses/new", label: "أنشئ دورة", icon: faGraduationCap, external: false },
  { href: "/courses/teach", label: "دوراتي التعليمية", icon: faChalkboardUser, external: false },
  { href: "/library", label: "أضف ملخّصاً", icon: faBookOpen, external: false },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/aibot", label: "الخباشة — المساعدة الآلية", icon: faRobot, external: false },
];

/* روابط الأدوات العامة — نقطة وصول واحدة خارج قوائم الدراسة والتدريس. */
const BAC_TOOLS_DROPDOWN = [
  { href: "/calculate", label: "حساب معدل البكالوريا", icon: faCalculator, external: false, desc: "اعرف معدلك حسب شعبتك" },
  { href: "/tools/weighted-average", label: "حساب المعدل الموزون", icon: faScaleBalanced, external: false, desc: "قارن فرصك في الميادين" },
  { href: "/tools/exam-simulator", label: "محاكاة البكالوريا", icon: faClipboardCheck, external: false, desc: "تدرّب في توقيت الامتحان" },
  { href: "/tools/study-planner", label: "إنشاء برنامج مراجعة", icon: faCalendarCheck, external: false, desc: "حوّل أسبوعك إلى خطة" },
  { href: "/tools/planner", label: "مخطط البكالوريا", icon: faCalendarDays, external: false, desc: "خطط قابلة للطباعة" },
  { href: "/tools/youtube-channels", label: "قنوات يوتيوب للمراجعة", icon: faBookOpen, external: false, desc: "مصادر مرتبة حسب المادة" },
  { href: "/tools/pomodoro", label: "مؤقت التركيز", icon: faCalendarCheck, external: false, desc: "جلسات قصيرة بتركيز" },
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false, desc: "قائمة يومية بسيطة" },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faClone, external: false, desc: "راجع بالاسترجاع النشط" },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faChartLine, external: false, desc: "تابع ما أنجزته" },
];

// قائمة "المزيد" المنسدلة (حاسوب) — مصادر خارجية (الروابط الثابتة؛ تُدمج مع روابط قابلة للتعديل من الأدمن داخل المكوّن)
/* أيقونات القائمة: الأدمن يختار اسماً، ونحوّله إلى أيقونة FontAwesome
   المستعملة في الشريط. اسم غير معروف يرجع إلى أيقونة رابط عامّة بدل
   أن يكسر العرض. */
const NAV_FA: Record<string, typeof faLink> = {
  book: faBookOpen, poll: faCalculator, file: faFileLines, target: faScaleBalanced,
  check: faClipboardCheck, timer: faCalendarCheck, users: faUsers, home: faHouse,
  graduation: faGraduationCap, calendar: faCalendarDays,
  // `grid` لأدوات الموقع — بلا تعريفها ترجع إلى أيقونة رابط عامّة
  grid: faLayerGroup,
};

const MORE_DROPDOWN_BASE = [
  { href: "/specialties", label: "التخصصات الجامعية", icon: faGraduationCap, external: false },
  { href: "/blog", label: "مقالات BacZone", icon: faFileLines, external: false },
  { href: "/guides", label: "أدلة المراجعة", icon: faBookOpen, external: false },
];

// شريط الهاتف السفلي — مع زر إضافة مركزي بارز
const MOBILE_NAV_LEFT = [
  { href: "/home", label: "الرئيسية", icon: faHouse },
  { href: "/rooms", label: "غرف", icon: faUsers },
];
const MOBILE_NAV_RIGHT = [
  { href: "/library", label: "المكتبة", icon: faBookOpen },
  { href: "/community", label: "المجتمع", icon: faGlobe },
];

// عناصر قائمة المزيد (الدرج الجانبي) — كل الأقسام بما فيها الخارجية
const MENU_ITEMS_BASE = [
  { href: "/rooms", label: "غرف الدراسة", icon: faUsers, external: false },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/aibot", label: "الخباشة — مساعدتك الآلية", icon: faRobot, external: false },
  { href: "/library", label: "مكتبة البكالوريا", icon: faBookOpen, external: false },
  { href: "/specialties", label: "التخصصات الجامعية", icon: faGraduationCap, external: false },
  { href: "/blog", label: "مقالات BacZone", icon: faFileLines, external: false },
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faClone, external: false },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faChartLine, external: false },
  { href: "/leaderboard", label: "لوحة الترتيب", icon: faTrophy, external: false },
  { href: "/community", label: "المجتمع", icon: faGlobe, external: false },
];

/* درج الهاتف للأستاذ — بلا أي أداة مراجعة طالب.
   الدرج على الهاتف هو القائمة الرئيسية فعلياً، فبقاء «تقدّمي الدراسي»
   فيه يعني أنّ أوّل ما يراه الأستاذ شيءٌ لا يخصّه. */
const MENU_ITEMS_TEACHER = [
  { href: "/rooms", label: "غرف الدراسة", icon: faUsers, external: false },
  { href: "/library", label: "مكتبة البكالوريا", icon: faBookOpen, external: false },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/aibot", label: "الخباشة — مساعدتك الآلية", icon: faRobot, external: false },
  { href: "/community", label: "المجتمع", icon: faGlobe, external: false },
  { href: "/specialties", label: "التخصصات الجامعية", icon: faGraduationCap, external: false },
  { href: "/blog", label: "مقالات BacZone", icon: faFileLines, external: false },
];
const PLATFORM_PUBLIC_LINK = { href: "/tools", label: "الأدوات العامة", icon: faLayerGroup, external: false };


interface ShellLink {
  href: string;
  label: string;
  icon: IconDefinition;
  external?: boolean;
  /** سطر وصف قصير — يظهر في القوائم المنسدلة على الحاسوب */
  desc?: string;
}

/* ════════════════════════════════════════════════════════════
   🐛 إزالة التكرار — سبب عطل الهيدر

   قائمة أدوات الأستاذ كانت تُبنى هكذا:

       [...courseLinks.slice(1), ...TEACH_DROPDOWN]

   و`courseLinksFor("teacher")` تُرجع [الدورات، دوراتي التعليمية،
   إنشاء دورة]، فـ`slice(1)` = [دوراتي التعليمية، إنشاء دورة].
   و`TEACH_DROPDOWN` تحوي الاثنين مرّة أخرى. فظهر الرابطان مرّتين،
   **و`key={m.href}` صار مفتاحاً مكرّراً في React** — وهو ما ينتج
   تحذيراً في الكونسول وسلوك رسم غير مستقرّ. هذا هو عطل الهيدر.

   والتكرار نفسه في درج الهاتف: `MENU_ITEMS_BASE` تحوي
   `/specialties`، و`DEFAULT_NAV` في `nav-store` تحوي «التخصصات
   الجامعية → /specialties» أيضاً، والاثنتان تُدمجان معاً.

   الحلّ ليس ترتيب القوائم يدوياً في كل مرّة — بل **حارس واحد** يمنع
   الصنف كلّه: أوّل ظهور للرابط يفوز، وما بعده يسقط.
   ════════════════════════════════════════════════════════════ */
function dedupe(links: ShellLink[]): ShellLink[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = (l.href || "").replace(/\/+$/, "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /* القوائم المنسدلة كانت تعمل بـ`group-hover` وحده: بلا نقر، بلا
     لوحة مفاتيح، بلا `aria-expanded` — وميّتة تماماً على أي شاشة
     لمسيّة. وبين الزرّ واللوحة فجوة `mt-1` ليست جزءاً من أي عنصر،
     فيكفي مرور الفأر قطرياً لتُغلق القائمة قبل الوصول إليها. */
  const [openMenu, setOpenMenu] = useState<null | "tools" | "more">(null);
  const navRef = useRef<HTMLElement | null>(null);
  /* ظلّ خفيف يظهر عند التمرير — يفصل الهيدر عن المحتوى بلا خطّ ثقيل */
  const [scrolled, setScrolled] = useState(false);
  const banner = useSiteBanner();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { settings } = useSiteSettings();

  /* 🐛 كانت هنا ثلاث قوائم تُدمج بطريقتين مختلفتين للحاسوب والهاتف،
     فتكرّر «حساب معدل البكالوريا» على الحاسوب وظهر بالرابط القديم وحده
     على الهاتف. **مصدر واحد** الآن، يقرؤه السطحان — فيستحيل اختلافهما.
     والأدمن يتحكّم به من لوحته. */
  const navLinks = useNavLinks();
  const publicToolHrefs = new Set(BAC_TOOLS_DROPDOWN.map((item) => item.href));
  const dynamicLinks = navLinks.filter((l) => !publicToolHrefs.has(l.href)).map((l) => ({
    href: l.href,
    label: l.label,
    icon: NAV_FA[l.icon ?? ""] ?? faLink,
    external: Boolean(l.external),
  }));
  /* «المزيد»: تسقط إلى القائمة المدمجة إن لم يحفظ الأدمن شيئاً —
     كانت `MORE_DROPDOWN_BASE` مُعرَّفة ولا تُستعمل إطلاقاً، فلو أخفى
     الأدمن روابطه صارت القائمة **صندوقاً أبيض فارغاً**. */
  const moreDropdown = dedupe([
    ...MORE_DROPDOWN_BASE,
    ...dynamicLinks,
    PLATFORM_PUBLIC_LINK,
  ]);
  const isTeacher = profile?.role === "teacher";
  const courseLinks = courseLinksFor(profile?.role);
  /* القائمة تتبع الدور: الطالب يرى أدوات المراجعة، والأستاذ يرى أدوات التدريس.
     أدوات الحساب والمحاكاة العامة لا تدخل أيّاً من القائمتين، ولها نقطة وصول
     مستقلة باسم «الأدوات العامة» في المزيد والدرج. */
  const menuItems = dedupe([
    ...courseLinks,
    ...(isTeacher ? MENU_ITEMS_TEACHER : MENU_ITEMS_BASE),
    PLATFORM_PUBLIC_LINK,
    ...dynamicLinks,
  ]);
  const toolsMenu = dedupe(isTeacher ? TEACH_DROPDOWN : [...courseLinks.slice(1), ...TOOLS_DROPDOWN]);
  const toolsLabel = isTeacher ? "أدوات التدريس" : "أدوات الدراسة";
  const toolsIcon = isTeacher ? faChalkboardUser : faLayerGroup;
  const isGuest = !user;

  // تطبيق لون التمييز المخصَّص من إعدادات الإدارة
  useEffect(() => {
    const color = settings.accentColor;
    if (!color || color.length < 7) return;
    // تحويل hex → قنوات RGB المطلوبة لـ Tailwind (--bz-primary)
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return;
    document.documentElement.style.setProperty("--bz-primary", `${r} ${g} ${b}`);
  }, [settings.accentColor]);

  // تطبيق favicon المخصّص على تبويب المتصفّح
  useEffect(() => {
    if (!settings.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.faviconUrl;
  }, [settings.faviconUrl]);

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      recordDailyVisit(user.uid);
      ensureNameInRTDB(user); // يصلح الأسماء المفقودة من الحسابات القديمة
    }
  }, [user?.uid]);

  /* 🐛 كانت الشارة تقرأ الإشعارات الشخصية وحدها، فلا تظهر أبداً لبثّ
     `@all` — والبثّ سجلّ واحد مشترك لا إشعار في صندوق كل مستخدم.
     نجمع العدّادين، فيرى المستخدم الرقم الصحيح. */
  const [unreadOwn, setUnreadOwn] = useState(0);
  const [unreadCast, setUnreadCast] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenNotifications(user.uid, (list) => setUnreadOwn(list.filter((n) => !n.read).length));
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenBroadcasts(user.uid, [], (list) => setUnreadCast(list.filter((n) => !n.read).length));
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user?.uid]);

  useEffect(() => { setUnread(unreadOwn + unreadCast); }, [unreadOwn, unreadCast]);

  /* القوائم المنسدلة: تُغلق بالنقر خارجها وبـ Escape */
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenu(null); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  /* أي انتقال يُغلق كل ما هو مفتوح — وإلّا بقيت القائمة معلّقة فوق
     الصفحة الجديدة. */
  useEffect(() => { setOpenMenu(null); setMenuOpen(false); }, [pathname]);

  /* درج الهاتف: قفل تمرير الخلفية + الخروج بـ Escape (كان بلا الاثنين،
     فتتحرّك الصفحة خلف الإصبع ولا مخرج بلوحة المفاتيح). */
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] pb-24 lg:pb-0">
      {/* ═══════ الشريط العلوي ═══════ */}
      <header
        className={`bz-header sticky top-0 z-40 ${scrolled ? "is-scrolled" : ""}`}
      >
        {/* ثلاثة أعمدة: [أدوات] [العلامة] [حساب].
            العمود الأوسط `1fr` والعلامة مُوسَّطة داخله مع `truncate`،
            فتقع في **منتصف الشاشة تماماً** ويستحيل أن تتراكب مع
            الأزرار مهما طال اسم الموقع — وهو ما كان يحدث حين كانت
            طبقةً مطلقة خارج التدفّق. */}
        <div className="mx-auto grid h-[58px] max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-2 sm:px-4 lg:h-16 lg:gap-2">

          {/* ── يمين: القائمة ثمّ البحث (هاتف) · الشعار (حاسوب) ── */}
          <div className="flex items-center gap-0.5 justify-self-start">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="القائمة"
              aria-expanded={menuOpen}
              className="bz-hbtn grid lg:hidden"
            >
              <FontAwesomeIcon icon={faBars} className="h-[18px] w-[18px]" />
            </button>
            <button onClick={() => setSearchOpen(true)} aria-label="بحث" className="bz-hbtn grid lg:hidden">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-[18px] w-[18px]" />
            </button>

            {/* على الحاسوب: الشعار في مكانه الطبيعي أوّل الشريط */}
            <span className="hidden lg:inline-flex">
              <Brand href="/home" />
            </span>
          </div>

          {/* ── الوسط: العلامة (هاتف) · التنقّل (حاسوب) ── */}
          <div className="flex min-w-0 items-center justify-center">
            <span className="inline-flex min-w-0 lg:hidden">
              <Brand href="/home" size="sm" beta={false} />
            </span>

            <nav ref={navRef} className="hidden min-w-0 items-center lg:flex">
              <div className="bz-navpill">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={pathname === n.href ? "page" : undefined}
                    className={`bz-navlink ${n.wide ? "hidden 2xl:inline-flex" : "inline-flex"} ${pathname === n.href ? "is-active" : ""}`}
                  >
                    <FontAwesomeIcon icon={n.icon} className="h-[15px] w-[15px]" />
                    <span>{n.label}</span>
                  </Link>
                ))}

                <span className="mx-1 h-5 w-px shrink-0 bg-border" />

                <HeaderMenu
                  id="tools"
                  label={toolsLabel}
                  icon={toolsIcon}
                  open={openMenu === "tools"}
                  onToggle={() => setOpenMenu((v) => (v === "tools" ? null : "tools"))}
                  items={toolsMenu}
                  pathname={pathname}
                />
                <HeaderMenu
                  id="more"
                  label="المزيد"
                  icon={faEllipsis}
                  open={openMenu === "more"}
                  onToggle={() => setOpenMenu((v) => (v === "more" ? null : "more"))}
                  items={moreDropdown}
                  pathname={pathname}
                />
              </div>
            </nav>
          </div>

          {/* ── يسار: بحث (حاسوب) + تواصل + الوضع الداكن + حساب ── */}
          <div className="flex shrink-0 items-center gap-0.5 justify-self-end sm:gap-1">
            <button onClick={() => setSearchOpen(true)} aria-label="بحث" className="bz-hbtn hidden lg:grid">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-[18px] w-[18px]" />
            </button>

            {/* روابط التواصل (شاشات عريضة) */}
            <span className="hidden items-center gap-0.5 min-[1700px]:flex">
              {settings.telegramUrl && (
                <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="تيليغرام"
                  className="bz-hbtn grid text-sky-500 hover:!bg-sky-500/10">
                  <DrawerTelegramIcon className="h-[17px] w-[17px]" />
                </a>
              )}
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"
                  className="bz-hbtn grid text-pink-500 hover:!bg-pink-500/10">
                  <DrawerInstagramIcon className="h-[17px] w-[17px]" />
                </a>
              )}
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"
                  className="bz-hbtn grid text-blue-600 hover:!bg-blue-600/10">
                  <DrawerFacebookIcon className="h-[17px] w-[17px]" />
                </a>
              )}
            </span>

            {/* 🐛 الوضع الداكن كان في **درج الهاتف وحده**، فمستخدم
                الحاسوب لا يملك أي طريقة لتفعيله إطلاقاً. */}
            <span className="hidden lg:inline-flex">
              <ThemeToggle compact />
            </span>

            {/* 🐛 الزائر كان يرى هيدر مستخدم مسجّل: جرس إشعارات وصورة
                حساب فارغة، بلا أي طريق إلى التسجيل. */}
            {isGuest ? (
              <span className="flex items-center gap-1.5">
                {/* «دخول» يختفي بين ٣٨٠px و١٢٨٠px: في الأولى لا تتّسع
                    الشاشة لزرّين، وفي الثانية يزاحم شريط التنقّل.
                    و«إنشاء حساب» يبقى دائماً — والتسجيل هو الهدف. */}
                <Link href="/login" className="bz-hcta-ghost hidden xl:inline-flex min-[381px]:max-lg:inline-flex">
                  <FontAwesomeIcon icon={faRightToBracket} className="h-3.5 w-3.5 -scale-x-100" />
                  <span>دخول</span>
                </Link>
                <Link href="/register" className="bz-hcta inline-flex">
                  <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">إنشاء حساب</span>
                  <span className="sm:hidden">حساب</span>
                </Link>
              </span>
            ) : (
              <>
                <Link
                  href="/notifications"
                  aria-label={unread > 0 ? `الإشعارات — ${unread} غير مقروء` : "الإشعارات"}
                  className="bz-hbtn relative grid"
                >
                  <FontAwesomeIcon icon={faBell} className="h-[18px] w-[18px]" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white ring-2 ring-surface">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <Link href="/profile" aria-label="حسابي"
                  className="ms-0.5 shrink-0 rounded-full ring-2 ring-primary/20 transition hover:ring-primary/45">
                  <LiveAvatar uid={user?.uid} name={profile?.name || user?.displayName || "ط"} size="sm" className="h-9 w-9" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════ درج القائمة الجانبي (هاتف) ═══════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="القائمة"
            /* كان يستعمل `bz-fade-slide` — وهي حركة **رأسية** بـ٨px،
               فيبدو الدرج كأنّه ومض لا كأنّه انزلق من الحافّة. */
            className="bz-drawer absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس الدرج */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              {isGuest ? (
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-text-primary">مرحباً بك في BacZone</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-text-muted">
                    سجّل مجّاناً لتتابع تقدّمك وتنضمّ للغرف.
                  </p>
                </div>
              ) : (
                <>
                  <LiveAvatar uid={user?.uid} name={profile?.name || "ط"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold text-text-primary">{profile?.name || "طالب"}</p>
                    <Link href="/profile" onClick={() => setMenuOpen(false)}
                      className="text-[12px] font-bold text-primary hover:underline">عرض الملف الشخصي</Link>
                  </div>
                </>
              )}
              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-text-muted transition hover:bg-danger/10 hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* دعوة التسجيل للزائر — أوّل ما يراه في الدرج */}
            {isGuest && (
              <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
                <Link href="/register" onClick={() => setMenuOpen(false)} className="bz-hcta inline-flex justify-center !h-11">
                  <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" /> إنشاء حساب
                </Link>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="bz-hcta-ghost inline-flex justify-center !h-11">
                  <FontAwesomeIcon icon={faRightToBracket} className="h-3.5 w-3.5 -scale-x-100" /> دخول
                </Link>
              </div>
            )}

            {/* عناصر القائمة */}
            <nav className="flex-1 overflow-y-auto p-3">
              {menuItems.map((m) =>
                m.external ? (
                  <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer"
                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[13.5px] font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                    <span className="bz-menu-ic"><FontAwesomeIcon icon={m.icon} className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 shrink-0 opacity-45" />
                  </a>
                ) : (
                  <Link key={m.href} href={m.href} onClick={() => setMenuOpen(false)}
                    aria-current={pathname === m.href ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[13.5px] font-bold transition ${
                      pathname === m.href ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-primary/10 hover:text-primary"
                    }`}>
                    <span className="bz-menu-ic"><FontAwesomeIcon icon={m.icon} className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                  </Link>
                )
              )}
            </nav>

            {/* روابط التواصل */}
            {(settings.telegramUrl || settings.instagramUrl || settings.facebookUrl) && (
              <div className="border-t border-border px-4 py-3">
                <p className="mb-2 text-xs font-bold text-text-muted">تابعنا على</p>
                <div className="flex items-center gap-2.5">
                  {settings.telegramUrl && (
                    <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="تيليغرام"
                      className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white transition hover:scale-110">
                      <DrawerTelegramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {settings.instagramUrl && (
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"
                      className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 text-white transition hover:scale-110">
                      <DrawerInstagramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {settings.facebookUrl && (
                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"
                      className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white transition hover:scale-110">
                      <DrawerFacebookIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* تذييل الدرج */}
            <div className="flex items-center justify-between gap-2 border-t border-border p-3"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
              <ThemeToggle />
              <button onClick={() => { setMenuOpen(false); setSearchOpen(true); }}
                className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" /> بحث
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {/* وضع الصيانة — يحجب المحتوى لغير الأدمن */}
        {settings.maintenanceMode && profile?.role !== "admin" ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="font-display text-2xl font-extrabold mb-2">الموقع تحت الصيانة</h2>
            <p className="text-text-muted max-w-sm">{settings.maintenanceMsg || "نعمل على تحسين المنصة. نعود قريباً!"}</p>
          </div>
        ) : (
          <>
            {!isOnline && (
              <div className="flex items-center justify-center gap-2 bg-danger px-4 py-2 text-center text-sm font-semibold text-white">
                ⚠️ أنت غير متصل بالإنترنت — بعض الميزات لن تعمل حتى يعود الاتصال.
              </div>
            )}
            {banner?.active && banner.text && !bannerDismissed && (
              <div className="flex items-center justify-between gap-3 bg-gradient-primary px-4 py-2 text-sm font-semibold text-white">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faBullhorn} className="h-4 w-4 shrink-0" />
                  <span>{banner.text}</span>
                </span>
                <button onClick={() => setBannerDismissed(true)} aria-label="إغلاق" className="shrink-0 opacity-80 hover:opacity-100">
                  <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                </button>
              </div>
            )}
            <AdSlot placement="header" className="mx-auto mb-3 max-w-5xl px-4 pt-3" />
            {children}
          </>
        )}
      </div>

      {/* الفوتر — مكوّن واحد للموقع كلّه (كان نسخةً محلّية تتفرّق عن
          نسخة صفحة الهبوط، وكانت تفتح الروابط الداخلية في تبويب جديد).
          ولا يُشترط `footerText` بعد الآن: الروابط القانونية يجب أن
          تظهر دائماً وإن أفرغ الأدمن نصّ الفوتر. */}
      <SiteFooter />

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* زر الخباشة العائم مع نص منبثق (كل الصفحات) */}
      {pathname !== "/aibot" && <FloatingDock />}

      {/* ═══════ شريط التنقّل السفلي (هاتف) ═══════ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="bz-bottom-bar flex items-center justify-around px-2 pb-1 pt-2">
          {MOBILE_NAV_LEFT.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition ${active ? "bz-bottom-active" : ""}`}>
                <FontAwesomeIcon icon={n.icon} className="h-5 w-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}

          {/* زر الإضافة المركزي البارز */}
          <Link href="/rooms" aria-label="إنشاء"
            className="bz-fab relative -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition hover:scale-105">
            <FontAwesomeIcon icon={faPlus} className="h-6 w-6" style={{ color: "#ffffff" }} />
          </Link>

          {MOBILE_NAV_RIGHT.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition ${active ? "bz-bottom-active" : ""}`}>
                <FontAwesomeIcon icon={n.icon} className="h-5 w-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}

          {/* المزيد → يفتح الدرج */}
          <button onClick={() => setMenuOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition">
            <FontAwesomeIcon icon={faEllipsis} className="h-5 w-5" />
            <span>المزيد</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   قائمة الهيدر المنسدلة

   ثلاثة أشياء كانت مكسورة فيها:

   ١. تفتح بالتحويم وحده — فهي غير موجودة لمن يستعمل لوحة المفاتيح،
      وميّتة على الشاشات اللمسيّة.
   ٢. **كل** عناصرها تُرسم `<a target="_blank">` بأيقونة «رابط خارجي»،
      بينما «التخصصات الجامعية» و«حساب معدل البكالوريا» صفحتان
      **داخليتان** — فالنقر يفتح تبويباً جديداً ويُعيد تحميل التطبيق
      كاملاً بدل تنقّل فوري.
   ٣. فجوة `mt-1` بين الزرّ واللوحة ليست جزءاً من أي عنصر، فتُغلق
      القائمة إن مرّ الفأر قطرياً.

   وهنا يُميَّز الداخلي من الخارجي بحقل `external` نفسه الذي يضبطه
   الأدمن — والذي يُشتقّ تلقائياً من شكل الرابط في `nav-store`.
   ════════════════════════════════════════════════════════════ */
function HeaderMenu({
  id, label, icon, open, onToggle, items, pathname,
}: {
  id: string;
  label: string;
  icon: IconDefinition;
  open: boolean;
  onToggle: () => void;
  items: ShellLink[];
  pathname: string;
}) {
  if (!items.length) return null;
  const hasActive = items.some((m) => m.href === pathname);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`bz-menu-${id}`}
        className={`bz-navlink inline-flex ${open || hasActive ? "is-active" : ""}`}
      >
        <FontAwesomeIcon icon={icon} className="h-[15px] w-[15px]" />
        <span>{label}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`h-2.5 w-2.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={`bz-menu-${id}`}
          role="menu"
          /* بلا `mt-*`: اللوحة ملتصقة بالزرّ ثمّ تُزاح بـ`padding` داخلي،
             فلا تبقى فجوة ميّتة بينهما. */
          className="bz-menu"
        >
          {items.map((m) =>
            m.external ? (
              <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer" role="menuitem"
                className="bz-menu-item">
                <span className="bz-menu-ic"><FontAwesomeIcon icon={m.icon} className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 shrink-0 opacity-45" />
              </a>
            ) : (
              <Link key={m.href} href={m.href} role="menuitem"
                aria-current={pathname === m.href ? "page" : undefined}
                className={`bz-menu-item ${pathname === m.href ? "is-on" : ""}`}>
                <span className="bz-menu-ic"><FontAwesomeIcon icon={m.icon} className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
