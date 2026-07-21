"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faUsers, faGlobe, faBell, faLayerGroup, faMagnifyingGlass, faBullhorn, faXmark, faBookOpen, faBars, faPlus, faRobot, faTrophy, faClipboardCheck, faCalendarCheck, faListCheck, faEllipsis, faChevronDown, faUpRightFromSquare, faScaleBalanced, faFileLines, faCalendarDays, faCalculator } from "@fortawesome/free-solid-svg-icons";
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
  { href: "/rooms", label: "الغرف", icon: faUsers },
  { href: "/community", label: "المجتمع", icon: faGlobe },
  { href: "/library", label: "المكتبة", icon: faBookOpen },
  { href: "/leaderboard", label: "الترتيب", icon: faTrophy },
];

// قائمة "أدوات الدراسة" المنسدلة (حاسوب)
const TOOLS_DROPDOWN = [
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/aibot", label: "الخباشة — المساعدة الآلية", icon: faRobot, external: false },
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faLayerGroup, external: false },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faListCheck, external: false },
];

// قائمة "المزيد" المنسدلة (حاسوب) — مصادر خارجية (الروابط الثابتة؛ تُدمج مع روابط قابلة للتعديل من الأدمن داخل المكوّن)
const MORE_DROPDOWN_BASE = [
  { href: "https://www.baczonedz.com/p/blog-page_81.html", label: "محاكاة البكالوريا", icon: faClipboardCheck, external: true },
  { href: "https://www.baczonedz.com/p/blog-page_5.html", label: "إنشاء برنامج مراجعة", icon: faCalendarCheck, external: true },
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
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faLayerGroup, external: false },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faListCheck, external: false },
  { href: "/leaderboard", label: "لوحة الترتيب", icon: faTrophy, external: false },
  { href: "/community", label: "المجتمع", icon: faGlobe, external: false },
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
  const banner = useSiteBanner();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { settings } = useSiteSettings();

  // عناصر ديناميكية (روابط قابلة للتعديل من الأدمن) تُدمج مع القوائم الثابتة
  const dynamicLinks = [
    { href: "/tools/planner", label: "مخطّط البكالوريا للطباعة", icon: faCalendarDays, external: false },
    { href: settings.weightedCalcUrl || "https://www.baczonedz.com/p/2026.html", label: "حساب المعدّل الموزون", icon: faScaleBalanced, external: true },
    { href: settings.pastExamsUrl || "https://www.baczonedz.com/p/blog-page_9.html", label: "بكالوريات سابقة", icon: faFileLines, external: true },
    { href: settings.averageCalcUrl || "https://www.baczonedz.com/p/blog-page_14.html", label: "حساب معدّل البكالوريا", icon: faCalculator, external: true },
  ];
  const moreDropdown = [...dynamicLinks, ...MORE_DROPDOWN_BASE];
  const menuItems = [...MENU_ITEMS_BASE, ...dynamicLinks, ...MENU_ITEMS_EXTERNAL];

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
    return listenNotifications(user.uid, (list) => setUnread(list.filter((n) => !n.read).length));
  }, [user?.uid]);

  return (
    <div className="min-h-[100dvh] pb-24 lg:pb-0">
      {/* ═══════ الشريط العلوي ═══════ */}
      <header className="bz-header-bar sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 relative">
        {/* يسار: بحث + زر القائمة (هاتف) + شعار (حاسوب) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
            className="grid h-10 w-10 place-items-center rounded-xl text-text transition hover:bg-primary/10 lg:hidden"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
            className="grid h-10 w-10 place-items-center rounded-xl text-text transition hover:bg-primary/10 lg:hidden"
          >
            <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
          </button>
          <Link href="/home" className="hidden items-center gap-2 lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logoUrl || "/icon.svg"} alt={settings.siteName ?? "BacZone"} className="h-9 w-9 shrink-0 rounded-xl object-contain" />
            <span className="bz-brand text-xl">{settings.siteName ?? "BacZone"}</span>
          </Link>
        </div>

        {/* وسط: الشعار (هاتف فقط) — مُوسَّط تماماً عبر طبقة بعرض كامل */}
        <div className="pointer-events-none absolute inset-x-0 flex justify-center lg:hidden">
          <Link href="/home" className="pointer-events-auto flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logoUrl || "/icon.svg"} alt={settings.siteName ?? "BacZone"} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            <span className="bz-brand text-xl">{settings.siteName ?? "BacZone"}</span>
          </Link>
        </div>

        {/* تنقّل الحاسوب */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`bz-nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === n.href ? "bz-nav-active" : "hover:bg-primary/10"
              }`}
            >
              <FontAwesomeIcon icon={n.icon} className="h-4 w-4" />
              {n.label}
            </Link>
          ))}

          {/* أدوات الدراسة (منسدلة) */}
          <div className="group relative">
            <button className="bz-nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-primary/10">
              <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4" />
              أدوات الدراسة
              <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-2xl border border-border bg-surface p-2 opacity-0 shadow-glass transition-all group-hover:visible group-hover:opacity-100">
              {TOOLS_DROPDOWN.map((m) => (
                <Link key={m.href} href={m.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                  <FontAwesomeIcon icon={m.icon} className="h-4 w-4 text-primary" />
                  {m.label}
                </Link>
              ))}
            </div>
          </div>

          {/* المزيد (منسدلة) */}
          <div className="group relative">
            <button className="bz-nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-primary/10">
              <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4" />
              المزيد
              <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-2xl border border-border bg-surface p-2 opacity-0 shadow-glass transition-all group-hover:visible group-hover:opacity-100">
              {moreDropdown.map((m) => (
                <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                  <FontAwesomeIcon icon={m.icon} className="h-4 w-4 text-primary" />
                  {m.label}
                  <FontAwesomeIcon icon={faUpRightFromSquare} className="ms-auto h-2.5 w-2.5 opacity-50" />
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* يمين: بحث + إشعارات + صورة الحساب */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
            className="hidden h-9 w-9 place-items-center rounded-xl text-text-muted transition hover:bg-primary/10 hover:text-primary lg:grid"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
          </button>

          {/* روابط التواصل (حاسوب) */}
          <div className="hidden items-center gap-1 lg:flex">
            {settings.telegramUrl && (
              <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="تيليغرام"
                className="grid h-9 w-9 place-items-center rounded-xl text-sky-500 transition hover:bg-sky-500/10">
                <DrawerTelegramIcon className="h-4 w-4" />
              </a>
            )}
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"
                className="grid h-9 w-9 place-items-center rounded-xl text-pink-500 transition hover:bg-pink-500/10">
                <DrawerInstagramIcon className="h-4 w-4" />
              </a>
            )}
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"
                className="grid h-9 w-9 place-items-center rounded-xl text-blue-600 transition hover:bg-blue-600/10">
                <DrawerFacebookIcon className="h-4 w-4" />
              </a>
            )}
            <div className="mx-1 h-5 w-px bg-border" />
          </div>
          <Link href="/notifications" aria-label="الإشعارات" className="relative grid h-10 w-10 place-items-center rounded-xl text-text transition hover:bg-primary/10">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/profile" aria-label="حسابي" className="shrink-0 rounded-full ring-2 ring-primary/15 transition hover:ring-primary/30">
            <LiveAvatar uid={user?.uid} name={profile?.name || user?.displayName || "ط"} size="sm" className="h-9 w-9" />
          </Link>
        </div>
      </header>

      {/* ═══════ درج القائمة الجانبي (هاتف) ═══════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 right-0 flex w-80 max-w-[85%] flex-col bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "bz-fade-slide 0.25s ease-out" }}
          >
            {/* رأس الدرج */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <LiveAvatar uid={user?.uid} name={profile?.name || "ط"} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{profile?.name || "طالب"}</p>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-xs text-primary hover:underline">عرض الملف الشخصي</Link>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            {/* عناصر القائمة */}
            <nav className="flex-1 overflow-y-auto p-3">
              {menuItems.map((m) =>
                m.external ? (
                  <a key={m.href} href={m.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text-muted transition hover:bg-primary/10 hover:text-primary">
                    <FontAwesomeIcon icon={m.icon} className="h-5 w-5 text-primary" />
                    {m.label}
                  </a>
                ) : (
                  <Link key={m.href} href={m.href} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      pathname === m.href ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-primary/10 hover:text-primary"
                    }`}>
                    <FontAwesomeIcon icon={m.icon} className="h-5 w-5 text-primary" />
                    {m.label}
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
            <div className="flex items-center justify-between border-t border-border p-4">
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

      {/* الفوتر */}
      {settings.footerText && (
        <footer className="border-t border-border bg-surface px-4 py-4 pb-24 text-center text-xs text-text-muted lg:pb-4">
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
