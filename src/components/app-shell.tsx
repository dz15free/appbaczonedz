"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faUsers, faGlobe, faBell, faUser } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV = [
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
              <FontAwesomeIcon icon={n.icon} className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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

      <div>{children}</div>

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
            <FontAwesomeIcon icon={n.icon} className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
