"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faUsers, faGlobe, faBell, faLayerGroup, faMagnifyingGlass, faBullhorn, faXmark, faBookOpen, faBars, faPlus, faRobot, faTrophy, faClipboardCheck, faCalendarCheck, faListCheck, faEllipsis, faChevronDown, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { SearchModal } from "@/components/search-modal";
import { recordDailyVisit } from "@/features/gamification/points";
import { ensureNameInRTDB } from "@/lib/firebase/auth";
import { useSiteBanner } from "@/features/settings/use-bac-date";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { listenNotifications } from "@/features/community/social";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KhabbashaFloatingButton } from "@/components/ui/khabbasha-floating-button";
import { LiveAvatar } from "@/components/ui/live-avatar";

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
  { href: "/omibot", label: "الخباشة — المساعدة الآلية", icon: faRobot, external: false },
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faLayerGroup, external: false },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faListCheck, external: false },
];

// قائمة "المزيد" المنسدلة (حاسوب) — مصادر خارجية
const MORE_DROPDOWN = [
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
const MENU_ITEMS = [
  { href: "/rooms", label: "غرف الدراسة", icon: faUsers, external: false },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup, external: false },
  { href: "/omibot", label: "الخباشة — مساعدتك الآلية", icon: faRobot, external: false },
  { href: "/library", label: "مكتبة البكالوريا", icon: faBookOpen, external: false },
  { href: "/tools/tasks", label: "مهامي الدراسية", icon: faListCheck, external: false },
  { href: "/tools/flashcards", label: "بطاقات المراجعة", icon: faLayerGroup, external: false },
  { href: "/tools/tracker", label: "تقدّمي الدراسي", icon: faListCheck, external: false },
  { href: "/leaderboard", label: "لوحة الترتيب", icon: faTrophy, external: false },
  { href: "/community", label: "المجتمع", icon: faGlobe, external: false },
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
        {/* يسار: زر القائمة (هاتف) + شعار (حاسوب) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
            className="grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/15 lg:hidden"
          >
            <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
          </button>
          <Link href="/home" className="hidden items-center gap-2 lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logoUrl || "/icon.svg"} alt={settings.siteName ?? "BacZoneDZ"} className="h-9 w-9 shrink-0 rounded-xl bg-white/15 object-contain p-0.5" />
            <span className="bz-brand text-xl">{settings.siteName ?? "BacZoneDZ"}</span>
          </Link>
        </div>

        {/* وسط: الشعار (هاتف فقط) — مُوسَّط بصرياً */}
        <Link href="/home" className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-2 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.logoUrl || "/icon.svg"} alt={settings.siteName ?? "BacZoneDZ"} className="h-8 w-8 shrink-0 rounded-lg bg-white/15 object-contain p-0.5" />
          <span className="bz-brand text-xl">{settings.siteName ?? "BacZoneDZ"}</span>
        </Link>

        {/* تنقّل الحاسوب */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`bz-nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === n.href ? "bz-nav-active" : "hover:bg-white/12"
              }`}
            >
              <FontAwesomeIcon icon={n.icon} className="h-4 w-4" />
              {n.label}
            </Link>
          ))}

          {/* أدوات الدراسة (منسدلة) */}
          <div className="group relative">
            <button className="bz-nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-white/12">
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
            <button className="bz-nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-white/12">
              <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4" />
              المزيد
              <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-2xl border border-border bg-surface p-2 opacity-0 shadow-glass transition-all group-hover:visible group-hover:opacity-100">
              {MORE_DROPDOWN.map((m) => (
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
            className="hidden h-9 w-9 place-items-center rounded-xl transition hover:bg-white/15 lg:grid"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
          </button>
          <Link href="/notifications" aria-label="الإشعارات" className="relative grid h-10 w-10 place-items-center rounded-xl transition hover:bg-white/15">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-indigo-900">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/profile" aria-label="حسابي" className="shrink-0 rounded-full ring-2 ring-white/30 transition hover:ring-white/50">
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
              {MENU_ITEMS.map((m) =>
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
            {children}
          </>
        )}
      </div>

      {/* الفوتر */}
      {settings.footerText && (
        <footer className="border-t border-border bg-surface/50 px-4 py-4 pb-24 text-center text-xs text-text-muted lg:pb-4">
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
      {pathname !== "/omibot" && <KhabbashaFloatingButton />}

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
            className="relative -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-glow ring-4 ring-white/30 transition hover:scale-105">
            <FontAwesomeIcon icon={faPlus} className="h-6 w-6" />
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
