"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faUsers, faGlobe, faBell, faUser, faLayerGroup, faMagnifyingGlass, faBullhorn, faXmark, faBookOpen } from "@fortawesome/free-solid-svg-icons";
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

const NAV = [
  { href: "/home", label: "الرئيسية", icon: faHouse },
  { href: "/rooms", label: "الغرف", icon: faUsers },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup },
  { href: "/community", label: "المجتمع", icon: faGlobe },
  { href: "/library", label: "المكتبة", icon: faBookOpen },
  { href: "/notifications", label: "الإشعارات", icon: faBell },
  { href: "/profile", label: "حسابي", icon: faUser },
];

// شريط الهاتف السفلي — 5 عناصر أساسية فقط لتجربة نظيفة
const MOBILE_NAV = [
  { href: "/home", label: "الرئيسية", icon: faHouse },
  { href: "/rooms", label: "الغرف", icon: faUsers },
  { href: "/community", label: "المجتمع", icon: faGlobe },
  { href: "/notifications", label: "الإشعارات", icon: faBell },
  { href: "/profile", label: "حسابي", icon: faUser },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const initial = (profile?.name || user?.displayName || "ط").charAt(0);
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
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
      {/* الشريط العلوي (هاتف + حاسوب) */}
      <header className="bz-glass sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link href="/home" className="flex items-center gap-2">
          {settings.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={settings.logoUrl} alt={settings.siteName ?? "BacZoneDZ"}
              className="h-9 w-9 shrink-0 rounded-xl object-contain" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/icon.svg" alt="BacZoneDZ" className="bz-studio-glow h-9 w-9 shrink-0 rounded-xl" />
          )}
          <span className="hidden font-display text-lg font-extrabold sm:inline">
            {settings.siteName ?? "BacZone"} <span className="bz-gradient-text">DZ</span>
          </span>
        </Link>

        {/* تنقّل الحاسوب */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === n.href ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-primary/5 hover:text-text-primary"
              }`}
            >
              <span className="relative">
                <FontAwesomeIcon icon={n.icon} className="h-4 w-4" />
                {n.href === "/notifications" && unread > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
            className="grid h-9 w-9 place-items-center rounded-xl text-text-muted transition hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <Link
            href="/profile"
            aria-label="حسابي"
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white ring-2 ring-primary/15 transition hover:ring-primary/30"
          >
            {initial}
          </Link>
        </div>
      </header>

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

      {/* شريط التنقّل السفلي (هاتف فقط) */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="bz-glass mx-auto flex max-w-md items-center justify-around rounded-2xl border border-border px-1 py-1.5 shadow-glass">
          {MOBILE_NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition ${
                  active ? "text-primary" : "text-text-muted"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-2 top-0.5 h-7 rounded-lg bg-primary/10" />
                )}
                <span className="relative z-10">
                  <FontAwesomeIcon icon={n.icon} className="h-5 w-5" />
                  {n.href === "/notifications" && unread > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                <span className="relative z-10">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
