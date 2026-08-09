"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavLinks } from "@/features/admin/nav-store";
import { BetaBadge } from "@/components/ui/beta-badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faHouse, faUsers, faGlobe, faBell, faLayerGroup, faMagnifyingGlass, faBullhorn, faXmark, faBookOpen, faBars, faPlus, faRobot, faTrophy, faClipboardCheck, faCalendarCheck, faListCheck, faEllipsis, faChevronDown, faUpRightFromSquare, faScaleBalanced, faFileLines, faCalendarDays, faCalculator, faGraduationCap, faClone, faChartLine, faLink, faChalkboardUser } from "@fortawesome/free-solid-svg-icons";
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
import { BottomSheet, SheetAction } from "@/components/ui/bottom-sheet";

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

const NAV = [
  { href: "/home", label: "الرئيسية", icon: faHouse },
  { href: "/courses", label: "الدورات", icon: faGraduationCap },
  { href: "/rooms", label: "الغرف", icon: faUsers },
  { href: "/community", label: "المجتمع", icon: faGlobe },
  { href: "/library", label: "المكتبة", icon: faBookOpen },
  { href: "/leaderboard", label: "الترتيب", icon: faTrophy },
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

// قائمة "المزيد" المنسدلة (حاسوب) — مصادر خارجية (الروابط الثابتة؛ تُدمج مع روابط قابلة للتعديل من الأدمن داخل المكوّن)
/* أيقونات القائمة: الأدمن يختار اسماً، ونحوّله إلى أيقونة FontAwesome
   المستعملة في الشريط. اسم غير معروف يرجع إلى أيقونة رابط عامّة بدل
   أن يكسر العرض. */
const NAV_FA: Record<string, typeof faLink> = {
  book: faBookOpen, poll: faCalculator, file: faFileLines, target: faScaleBalanced,
  check: faClipboardCheck, timer: faCalendarCheck, users: faUsers, home: faHouse,
  graduation: faGraduationCap, calendar: faCalendarDays,
};

const MORE_DROPDOWN_BASE = [
  /* التخصّصات أوّلاً: قرار يخصّ مستقبل الطالب لا أداة مراجعة، ورابط
     داخلي وسط روابط خارجية. */
  { href: "/specialties", label: "التخصصات الجامعية", icon: faGraduationCap, external: false },
  { href: "/calculate", label: "حساب معدل البكالوريا", icon: faCalculator, external: false },
  { href: "https://www.baczonedz.com/p/blog-page_81.html", label: "محاكاة البكالوريا", icon: faClipboardCheck, external: true },
  { href: "https://www.baczonedz.com/p/blog-page_5.html", label: "إنشاء برنامج مراجعة", icon: faCalendarCheck, external: true },
];

/* شريط الهاتف السفلي.

   كان يحمل **ستّة** أهداف في ٣٦٠ بكسل: أربعة روابط + زرّ عائم + «المزيد».
   نصيب التبويب الواحد ٥٧px عرضاً و٣٨px ارتفاعاً — دون أي حدّ لمس مقبول،
   ونصّه ١٠px عربيّ أي على حافّة القراءة. صار أربعة أهداف + الزرّ العائم:
   العرض ٧٠px والارتفاع ٥٦px والنصّ ١١px. «المكتبة» لم تختفِ — هي في
   الدرج وفي الرئيسية، وهي أقلّ تكراراً من المجتمع والغرف. */
const MOBILE_NAV_LEFT = [
  { href: "/home", label: "الرئيسية", icon: faHouse },
  { href: "/rooms", label: "الغرف", icon: faUsers },
];
const MOBILE_NAV_RIGHT = [
  { href: "/community", label: "المجتمع", icon: faGlobe },
];

// عناصر قائمة المزيد (الدرج الجانبي) — كل الأقسام بما فيها الخارجية
const MENU_ITEMS_BASE = [
  { href: "/rooms", label: "غرف الدراسة", icon: faUsers, external: false },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/aibot", label: "الخباشة — مساعدتك الآلية", icon: faRobot, external: false },
  { href: "/library", label: "مكتبة البكالوريا", icon: faBookOpen, external: false },
  { href: "/specialties", label: "التخصصات الجامعية", icon: faGraduationCap, external: false },
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
];
// روابط خارجية ثابتة تُضاف بعد الروابط القابلة للتعديل من الأدمن
const MENU_ITEMS_EXTERNAL = [
  { href: "https://www.baczonedz.com/p/blog-page_81.html", label: "محاكاة البكالوريا", icon: faClipboardCheck, external: true },
  { href: "https://www.baczonedz.com/p/blog-page_5.html", label: "إنشاء برنامج مراجعة", icon: faCalendarCheck, external: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /* القوائم المنسدلة على الحاسوب كانت تفتح بـ `group-hover` وحده: لا
     نقر، ولا لوحة مفاتيح، ولا `aria-expanded`. على حاسوب لمسيّ كانت
     ميّتة تماماً. صارت بالنقر مع إغلاق بـ Esc وبالنقر خارجها. */
  const [openMenu, setOpenMenu] = useState<null | "tools" | "more">(null);
  const navRef = useRef<HTMLElement | null>(null);
  const banner = useSiteBanner();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { settings } = useSiteSettings();

  /* 🐛 كانت هنا ثلاث قوائم تُدمج بطريقتين مختلفتين للحاسوب والهاتف،
     فتكرّر «حساب معدل البكالوريا» على الحاسوب وظهر بالرابط القديم وحده
     على الهاتف. **مصدر واحد** الآن، يقرؤه السطحان — فيستحيل اختلافهما.
     والأدمن يتحكّم به من لوحته. */
  const navLinks = useNavLinks();
  const dynamicLinks = navLinks.map((l) => ({
    href: l.href,
    label: l.label,
    icon: NAV_FA[l.icon ?? ""] ?? faLink,
    external: Boolean(l.external),
  }));
  const moreDropdown = dynamicLinks;
  const isTeacher = profile?.role === "teacher";
  const courseLinks = courseLinksFor(profile?.role);
  /* القائمة تتبع الدور: أدوات مراجعة للطالب، وأدوات تدريس للأستاذ.
     الأدمن يرى قائمة الطالب لأنّه يحتاج معاينة ما يراه الطلبة. */
  const menuItems = [
    ...courseLinks,
    ...(isTeacher ? MENU_ITEMS_TEACHER : MENU_ITEMS_BASE),
    ...dynamicLinks,
  ];
  const toolsMenu = isTeacher ? TEACH_DROPDOWN : TOOLS_DROPDOWN;
  const toolsLabel = isTeacher ? "أدوات التدريس" : "أدوات الدراسة";

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

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenNotifications(user.uid, (list) => setUnread(list.filter((n) => !n.read).length));
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user?.uid]);

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

  /* الانتقال إلى صفحة أخرى يُغلق كل ما هو مفتوح */
  useEffect(() => { setOpenMenu(null); setMenuOpen(false); setCreateOpen(false); }, [pathname]);

  /* الدرج: كان بلا قفل تمرير وبلا Escape — الصفحة تتحرّك خلف الإصبع،
     ولا مخرج بلوحة المفاتيح. `BottomSheet` كان يفعل الثلاثة والدرج لا. */
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const go = useCallback((href: string) => { setCreateOpen(false); window.location.assign(href); }, []);

  return (
    <div className="min-h-[100dvh]" style={{ paddingBottom: "var(--pb-shell, 0px)" }}>
      {/* ═══════ الشريط العلوي ═══════ */}
      <header
        className="bz-header-bar sticky top-0 flex items-center gap-1.5 px-3 sm:px-4"
        style={{ zIndex: "var(--z-nav)", minHeight: "var(--h-header)" }}
      >
        {/* ── الهاتف: قائمة + علامة داخل التدفّق ──
            كانت العلامة طبقةً `absolute` مُوسَّطة بعرض ~١٥٥px فوق صفّ
            أزرار يستهلك ~١٨٥px في شاشة ٣٦٠px. فكانت تُرسَم **تحت**
            الأزرار متى طال اسم الموقع، لأنّ العنصر المطلق لا يشارك في
            التدفّق ولا يُقصَّر. الآن هي عنصر عادي بـ `truncate`. */}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="القائمة"
          aria-expanded={menuOpen}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-text-primary transition hover:bg-primary/10 lg:hidden"
        >
          <FontAwesomeIcon icon={faBars} className="h-[18px] w-[18px]" />
        </button>

        <Link href="/home" className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.logoUrl || "/icon.svg"}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-item object-contain lg:h-9 lg:w-9"
          />
          <span className="inline-flex min-w-0 items-start gap-1">
            <span className="bz-brand truncate text-[17px] sm:text-lg lg:text-xl">
              {settings.siteName ?? "BacZone"}
            </span>
            <span className="hidden shrink-0 sm:inline"><BetaBadge /></span>
          </span>
        </Link>

        {/* تنقّل الحاسوب */}
        <nav ref={navRef} className="mx-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? "page" : undefined}
              className={`bz-nav-link flex items-center gap-2 rounded-control px-3 py-2 text-[13.5px] font-bold transition ${
                pathname === n.href ? "bz-nav-active" : "hover:bg-primary/10"
              }`}
            >
              <FontAwesomeIcon icon={n.icon} className="h-4 w-4" />
              {n.label}
            </Link>
          ))}

          <DesktopMenu
            id="tools"
            label={toolsLabel}
            icon={isTeacher ? faChalkboardUser : faLayerGroup}
            open={openMenu === "tools"}
            onToggle={() => setOpenMenu((v) => (v === "tools" ? null : "tools"))}
            items={[...courseLinks.slice(1), ...toolsMenu]}
          />
          <DesktopMenu
            id="more"
            label="المزيد"
            icon={faEllipsis}
            open={openMenu === "more"}
            onToggle={() => setOpenMenu((v) => (v === "more" ? null : "more"))}
            items={moreDropdown}
          />
        </nav>

        {/* يمين: بحث + إشعارات + صورة الحساب */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
            className="grid h-11 w-11 place-items-center rounded-control text-text-muted transition hover:bg-primary/10 hover:text-primary lg:h-10 lg:w-10"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-[18px] w-[18px]" />
          </button>

          {/* روابط التواصل (حاسوب) */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {settings.telegramUrl && (
              <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="تيليغرام"
                className="grid h-10 w-10 place-items-center rounded-control text-sky-500 transition hover:bg-sky-500/10">
                <DrawerTelegramIcon className="h-[17px] w-[17px]" />
              </a>
            )}
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"
                className="grid h-10 w-10 place-items-center rounded-control text-pink-500 transition hover:bg-pink-500/10">
                <DrawerInstagramIcon className="h-[17px] w-[17px]" />
              </a>
            )}
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"
                className="grid h-10 w-10 place-items-center rounded-control text-blue-600 transition hover:bg-blue-600/10">
                <DrawerFacebookIcon className="h-[17px] w-[17px]" />
              </a>
            )}
            <div className="mx-1 h-5 w-px bg-border" />
          </div>

          <Link href="/notifications" aria-label={unread > 0 ? `الإشعارات — ${unread} غير مقروء` : "الإشعارات"}
            className="relative grid h-11 w-11 place-items-center rounded-control text-text-primary transition hover:bg-primary/10 lg:h-10 lg:w-10">
            <FontAwesomeIcon icon={faBell} className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white ring-2 ring-surface">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/profile" aria-label="حسابي"
            className="ms-0.5 shrink-0 rounded-full ring-2 ring-primary/15 transition hover:ring-primary/35">
            <LiveAvatar uid={user?.uid} name={profile?.name || user?.displayName || "ط"} size="sm" className="h-9 w-9" />
          </Link>
        </div>
      </header>

      {/* ═══════ درج القائمة الجانبي (هاتف) ═══════ */}
      {menuOpen && (
        <div
          className="fixed inset-0 lg:hidden"
          style={{ zIndex: "var(--z-drawer)" }}
          onClick={() => setMenuOpen(false)}
        >
          <div className="bz-bs-fade absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="القائمة"
            /* كان يستعمل `bz-fade-slide` وهي حركة **رأسية** ٨px، فيظهر
               الدرج كأنّه ومض لا كأنّه انزلق من الحافّة. الآن ينزلق فعلاً. */
            className="bz-drawer-in absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-e3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس الدرج */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <LiveAvatar uid={user?.uid} name={profile?.name || "ط"} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-extrabold text-text-primary">{profile?.name || "طالب"}</p>
                <Link href="/profile" onClick={() => setMenuOpen(false)}
                  className="text-[12px] font-bold text-primary hover:underline">عرض الملف الشخصي</Link>
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-control text-text-muted transition hover:bg-danger/10 hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* عناصر القائمة */}
            <nav className="flex-1 overflow-y-auto p-2.5">
              {menuItems.map((m) =>
                m.external ? (
                  <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer"
                    className="flex min-h-12 items-center gap-3 rounded-control px-3 text-[13.5px] font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                    <FontAwesomeIcon icon={m.icon} className="h-[18px] w-[18px] text-primary" />
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 shrink-0 opacity-45" />
                  </a>
                ) : (
                  <Link key={m.href} href={m.href} onClick={() => setMenuOpen(false)}
                    aria-current={pathname === m.href ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-[13.5px] font-bold transition ${
                      pathname === m.href
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-primary/10 hover:text-primary"
                    }`}>
                    <FontAwesomeIcon icon={m.icon} className="h-[18px] w-[18px] text-primary" />
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                  </Link>
                )
              )}
            </nav>

            {/* روابط التواصل */}
            {(settings.telegramUrl || settings.instagramUrl || settings.facebookUrl) && (
              <div className="border-t border-border px-4 py-3">
                <p className="mb-2 text-[11.5px] font-extrabold text-text-muted">تابعنا على</p>
                <div className="flex items-center gap-2.5">
                  {settings.telegramUrl && (
                    <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="تيليغرام"
                      className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white transition hover:scale-105">
                      <DrawerTelegramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {settings.instagramUrl && (
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"
                      className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 text-white transition hover:scale-105">
                      <DrawerInstagramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {settings.facebookUrl && (
                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"
                      className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white transition hover:scale-105">
                      <DrawerFacebookIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* تذييل الدرج */}
            <div
              className="flex items-center justify-between gap-2 border-t border-border p-3"
              style={{ paddingBottom: "calc(0.75rem + var(--safe-b))" }}
            >
              <ThemeToggle />
              <button onClick={() => { setMenuOpen(false); setSearchOpen(true); }}
                className="flex min-h-11 items-center gap-2 rounded-control bg-primary/10 px-4 text-[13px] font-extrabold text-primary transition hover:bg-primary/15">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" /> بحث في المنصّة
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

      {/* الفوتر */}
      {settings.footerText && (
        <footer className="border-t border-border bg-surface px-4 py-5 text-center text-xs text-text-muted">
          <p>{settings.footerText}</p>
          {(settings.footerLinks?.length ?? 0) > 0 && (
            <div className="mt-1.5 flex flex-wrap justify-center gap-3">
              {settings.footerLinks?.map((l, i) => (
                <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"
                  className="hover:text-primary hover:underline">{l.label}</a>
              ))}
            </div>
          )}
        </footer>
      )}

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* زر الخباشة العائم مع نص منبثق (كل الصفحات) */}
      {pathname !== "/aibot" && <FloatingDock />}

      {/* ═══════ شريط التنقّل السفلي (هاتف) ═══════ */}
      <nav
        className="fixed inset-x-0 bottom-0 lg:hidden"
        style={{ zIndex: "var(--z-nav)", paddingBottom: "var(--safe-b)" }}
        aria-label="التنقّل السريع"
      >
        <div className="bz-bottom-bar flex items-stretch justify-around px-1">
          {MOBILE_NAV_LEFT.map((n) => <BottomTab key={n.href} {...n} active={pathname === n.href} />)}

          {/* زرّ الإنشاء.
              كان يحمل علامة «+» ويحمل `aria-label="إنشاء"` ثمّ **ينتقل
              إلى قائمة الغرف** — وعدٌ بصريّ لا يفي به. صار يفتح ورقة
              إنشاء حقيقية: منشور، غرفة، مصدر. */}
          <button
            onClick={() => setCreateOpen(true)}
            aria-label="إنشاء جديد"
            className="bz-fab relative -mt-5 grid h-14 w-14 shrink-0 place-items-center self-start rounded-full bg-gradient-primary shadow-brand transition active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} className="h-6 w-6" style={{ color: "#ffffff" }} />
          </button>

          {MOBILE_NAV_RIGHT.map((n) => <BottomTab key={n.href} {...n} active={pathname === n.href} />)}

          <BottomTab label="المزيد" icon={faEllipsis} onClick={() => setMenuOpen(true)} />
        </div>
      </nav>

      {/* ورقة الإنشاء السريع */}
      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} title="ماذا تريد أن تنشئ؟">
        <div className="space-y-2 pb-2">
          <SheetAction icon={faGlobe} label="منشور جديد" hint="شارك سؤالاً أو ملخّصاً مع المجتمع"
            tone="primary" onClick={() => go("/community?compose=1")} />
          <SheetAction icon={faUsers} label="غرفة دراسة" hint="راجع مع زملائك مباشرةً"
            onClick={() => go("/rooms")} />
          <SheetAction icon={faBookOpen} label="مصدر للمكتبة" hint="أضف ملخّصاً أو موضوعاً سابقاً"
            onClick={() => go("/library")} />
          {(profile?.role === "teacher" || profile?.role === "admin") && (
            <SheetAction icon={faGraduationCap} label="دورة تعليمية" hint="ابنِ دورة بدروس وفيديوهات"
              onClick={() => go("/courses/new")} />
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

/* ── تبويب الشريط السفلي ──
   ٥٦px ارتفاعاً ونصّ ١١px: كان ٣٨px ونصّ ١٠px، وهو دون أي حدّ لمس
   معقول — والحرف العربي أشدّ تضرّراً من اللاتيني بهذا الحجم. */
function BottomTab({
  href, label, icon, active, onClick,
}: {
  href?: string;
  label: string;
  icon: IconDefinition;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="relative grid h-6 place-items-center">
        <FontAwesomeIcon icon={icon} className="h-[19px] w-[19px]" />
      </span>
      <span className="text-[11px] font-extrabold leading-none">{label}</span>
    </>
  );
  const cls = `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-item px-1 transition duration-fast ${
    active ? "bz-bottom-active" : ""
  }`;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return (
    <Link href={href!} aria-current={active ? "page" : undefined} className={cls}>
      {inner}
    </Link>
  );
}

/* ── قائمة منسدلة على الحاسوب ──
   بالنقر لا بالتحويم: `group-hover` وحده يعني أنّها غير موجودة لمن
   يستعمل لوحة المفاتيح، وميّتة على الشاشات اللمسيّة. */
function DesktopMenu({
  id, label, icon, open, onToggle, items,
}: {
  id: string;
  label: string;
  icon: IconDefinition;
  open: boolean;
  onToggle: () => void;
  items: { href: string; label: string; icon: IconDefinition; external?: boolean }[];
}) {
  if (!items.length) return null;
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`bz-menu-${id}`}
        className={`bz-nav-link flex items-center gap-2 rounded-control px-3 py-2 text-[13.5px] font-bold transition ${
          open ? "bg-primary/10 text-primary" : "hover:bg-primary/10"
        }`}
      >
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        {label}
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`h-3 w-3 transition-transform duration-fast ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={`bz-menu-${id}`}
          role="menu"
          className="bz-radial-in absolute right-0 top-full mt-1.5 w-60 rounded-card border border-border bg-surface p-1.5 shadow-e3"
          style={{ zIndex: "var(--z-drawer)" }}
        >
          {items.map((m) =>
            m.external ? (
              <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer" role="menuitem"
                className="flex items-center gap-3 rounded-control px-3 py-2.5 text-[13px] font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                <FontAwesomeIcon icon={m.icon} className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5 opacity-50" />
              </a>
            ) : (
              <Link key={m.href} href={m.href} role="menuitem"
                className="flex items-center gap-3 rounded-control px-3 py-2.5 text-[13px] font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                <FontAwesomeIcon icon={m.icon} className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
