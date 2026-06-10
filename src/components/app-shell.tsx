"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faUsers, faGlobe, faBell, faUser, faRobot, faLayerGroup, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { SearchModal } from "@/components/search-modal";
import { recordDailyVisit } from "@/features/gamification/points";
import { ensureNameInRTDB } from "@/lib/firebase/auth";
import { listenNotifications } from "@/features/community/social";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV = [
  { href: "/home", label: "الرئيسية", icon: faHouse },
  { href: "/rooms", label: "الغرف", icon: faUsers },
  { href: "/groups", label: "المجموعات", icon: faLayerGroup },
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
    <div className="min-h-[100dvh] pb-20 lg:pb-0">
      {/* الشريط العلوي (هاتف + حاسوب) */}
      <header className="bz-glass sticky top-0 z-40 flex items-center justify-between px-4 py-2.5">
        <Link href="/home" className="font-display text-lg font-extrabold">
          BacZone <span className="bz-gradient-text">DZ</span>
        </Link>

        {/* تنقّل الحاسوب */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                pathname === n.href ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-primary/10"
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="بحث"
            className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <Link
            href="/profile"
            aria-label="حسابي"
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary font-bold text-white"
          >
            {initial}
          </Link>
        </div>
      </header>

      <div>
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-danger px-4 py-2 text-center text-sm font-semibold text-white">
            ⚠️ أنت غير متصل بالإنترنت — بعض الميزات لن تعمل حتى يعود الاتصال.
          </div>
        )}
        {children}
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* زر Bothelper العائم (كل الصفحات) */}
      {pathname !== "/omibot" && (
        <Link
          href="/omibot"
          aria-label="Bothelper"
          className="fixed bottom-24 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow transition hover:scale-105 lg:bottom-6"
        >
          <FontAwesomeIcon icon={faRobot} className="h-6 w-6" />
        </Link>
      )}

      {/* شريط التنقّل السفلي (هاتف فقط) */}
      <nav
        className="bz-glass fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border py-2 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center gap-0.5 px-2 text-[11px] ${
              pathname === n.href ? "text-primary" : "text-text-muted"
            }`}
          >
            <span className="relative">
              <FontAwesomeIcon icon={n.icon} className="h-5 w-5" />
              {n.href === "/notifications" && unread > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
