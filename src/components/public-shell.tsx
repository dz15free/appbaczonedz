"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCalculator,
  faGraduationCap,
  faHouse,
  faMessage,
  faArrowLeft,
  faBars,
  faXmark,
  faRightToBracket,
  faUserPlus,
  faCheckCircle,
  faChevronDown,
  faCalendarCheck,
  faCalendarDays,
  faFileLines,
  faListCheck,
  faPlay,
  faScaleBalanced,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { Brand } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const PUBLIC_NAV = [
  { href: "/", label: "الرئيسية", icon: faHouse },
  { href: "/tools", label: "أدوات البكالوريا", icon: faCalculator },
  { href: "/guides", label: "الأدلّة", icon: faBookOpen },
  { href: "/specialties", label: "التخصّصات", icon: faGraduationCap },
  { href: "/blog", label: "المدونة", icon: faMessage },
] as const;

const BAC_TOOLS = [
  { href: "/calculate", label: "حساب معدل البكالوريا", desc: "اعرف معدلك حسب شعبتك", icon: faCalculator },
  { href: "/tools/weighted-average", label: "حساب المعدل الموزون", desc: "قارن فرصك في الميادين", icon: faScaleBalanced },
  { href: "/tools/exam-simulator", label: "محاكاة البكالوريا", desc: "تدرّب في توقيت الامتحان", icon: faVideo },
  { href: "/tools/study-planner", label: "إنشاء برنامج مراجعة", desc: "حوّل أسبوعك إلى خطة", icon: faCalendarCheck },
  { href: "/tools/planner", label: "مخطط البكالوريا", desc: "خطط قابلة للطباعة", icon: faCalendarDays },
  { href: "/tools/youtube-channels", label: "قنوات يوتيوب للمراجعة", desc: "مصادر مرتبة حسب المادة", icon: faPlay },
  { href: "/tools/pomodoro", label: "مؤقت التركيز", desc: "جلسات قصيرة بتركيز", icon: faListCheck },
] as const;

function isActivePath(pathname: string | null, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname?.startsWith(`${href}/`) || false;
}

function PublicAuthActions({ mobile = false }: { mobile?: boolean }) {
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);

  if (loading) {
    return <span className={mobile ? "h-11 w-full animate-pulse rounded-xl bg-border/60" : "h-10 w-24 animate-pulse rounded-xl bg-border/60"} aria-label="جارٍ التحقق من الجلسة" />;
  }

  if (user) {
    return mobile ? (
      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/home" className="bz-pubmenu-auth-primary">
          <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5" /> منصّتي
        </Link>
        <Link href="/profile" className="bz-pubmenu-auth-secondary">
          <LiveAvatar uid={user.uid} name={profile?.name || user.displayName || "ط"} size="sm" className="h-7 w-7" /> حسابي
        </Link>
      </div>
    ) : (
      <>
        <Link href="/home" className="bz-hcta-ghost inline-flex">
          <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5" />
          <span>منصّتي</span>
        </Link>
        <Link href="/profile" aria-label="حسابي" className="shrink-0 rounded-full ring-2 ring-primary/20 transition hover:ring-primary/45">
          <LiveAvatar uid={user.uid} name={profile?.name || user.displayName || "ط"} size="sm" className="h-9 w-9" />
        </Link>
      </>
    );
  }

  return mobile ? (
    <div className="grid gap-2 sm:grid-cols-2">
      <Link href="/login" className="bz-pubmenu-auth-secondary">
        <FontAwesomeIcon icon={faRightToBracket} className="h-3.5 w-3.5 -scale-x-100" /> تسجيل الدخول
      </Link>
      <Link href="/register" className="bz-pubmenu-auth-primary">
        <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" /> إنشاء حساب
      </Link>
    </div>
  ) : (
    <>
      <Link href="/login" className="bz-hcta-ghost inline-flex">
        <FontAwesomeIcon icon={faRightToBracket} className="h-3.5 w-3.5 -scale-x-100" />
        <span>دخول</span>
      </Link>
      <Link href="/register" className="bz-hcta inline-flex">
        <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
        <span>إنشاء حساب</span>
      </Link>
    </>
  );
}

export function PublicHeader({ variant = "default" }: { variant?: "default" | "landing" }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopToolsOpen, setDesktopToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const desktopToolsMenuRef = useRef<HTMLDivElement>(null);
  const mobileToolsMenuRef = useRef<HTMLDivElement>(null);
  const menuId = "bz-public-menu";

  useEffect(() => {
    setMenuOpen(false);
    setDesktopToolsOpen(false);
    setMobileToolsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!desktopToolsOpen && !mobileToolsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const insideDesktop = desktopToolsMenuRef.current?.contains(target) ?? false;
      const insideMobile = mobileToolsMenuRef.current?.contains(target) ?? false;
      if (!insideDesktop && !insideMobile) {
        setDesktopToolsOpen(false);
        setMobileToolsOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopToolsOpen(false);
        setMobileToolsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [desktopToolsOpen, mobileToolsOpen]);

  useEffect(() => {
    if (variant !== "landing") return;
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  return (
    <header className={`bz-pubheader ${variant === "landing" ? "is-landing" : ""} ${scrolled ? "is-scrolled" : ""}`} data-variant={variant} data-scrolled={scrolled ? "true" : "false"}>
      <div className="bz-pubheader-inner mx-auto flex min-h-[58px] max-w-6xl items-center gap-2 px-3 sm:min-h-16 sm:px-4">
        <Brand href="/" size="sm" beta={false} className="bz-public-brand" />

        <nav aria-label="التنقّل العام" className="mx-auto hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => {
            const resolvedHref = item.href === "/" && !authLoading && user ? "/home" : item.href;
            const isHomeActive = item.href === "/" && (pathname === "/" || pathname === "/home");
            const active = item.href === "/" ? isHomeActive : isActivePath(pathname, item.href);
            if (item.href === "/tools") return (
              <div key={item.href} ref={desktopToolsMenuRef} className="bz-public-tools-menu">
                <button type="button" className={`bz-pubnav bz-public-tools-trigger ${desktopToolsOpen || pathname?.startsWith("/tools") || pathname === "/calculate" ? "is-active" : ""}`} aria-expanded={desktopToolsOpen} aria-haspopup="menu" aria-controls="bz-public-tools-menu" onClick={() => setDesktopToolsOpen((open) => !open)}>
                  <FontAwesomeIcon icon={item.icon} className="h-[14px] w-[14px]" />
                  {item.label}
                  <FontAwesomeIcon icon={faChevronDown} className={`h-2.5 w-2.5 opacity-60 transition-transform ${desktopToolsOpen ? "rotate-180" : ""}`} />
                </button>
                {desktopToolsOpen && <div id="bz-public-tools-menu" role="menu" className="bz-public-tools-dropdown">
                  <Link href="/tools" role="menuitem" className="bz-public-tools-all" onClick={() => setDesktopToolsOpen(false)}><span className="bz-public-tools-all-icon"><FontAwesomeIcon icon={faCalculator} /></span><span><b>كل أدوات البكالوريا</b><small>اختر الأداة التي تناسب خطوتك الآن</small></span><FontAwesomeIcon icon={faArrowLeft} /></Link>
                  {BAC_TOOLS.map((tool) => <Link key={tool.href} href={tool.href} role="menuitem" className="bz-public-tool-item" onClick={() => setDesktopToolsOpen(false)}><span className="bz-public-tool-icon"><FontAwesomeIcon icon={tool.icon} /></span><span><b>{tool.label}</b><small>{tool.desc}</small></span></Link>)}
                </div>}
              </div>
            );
            return (
              <Link key={item.href} href={authLoading && item.href === "/" ? "#" : resolvedHref} aria-current={active ? "page" : undefined} onClick={(event) => { if (authLoading && item.href === "/") event.preventDefault(); }} className={`bz-pubnav ${active ? "is-active" : ""}`}>
                <FontAwesomeIcon icon={item.icon} className="h-[14px] w-[14px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="bz-pub-actions ms-auto flex min-w-0 shrink-0 items-center gap-1.5">
          <ThemeToggle compact />
          <div className="bz-pub-auth-desktop hidden items-center gap-1.5 md:flex">
            <PublicAuthActions />
          </div>
          <button
            type="button"
            className="bz-pubmenu-toggle md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div id={menuId} className={`bz-pubmenu md:hidden ${menuOpen ? "is-open" : ""}`} hidden={!menuOpen}>
        <nav aria-label="قائمة الموقع العامة" className="grid gap-1 p-3">
          {PUBLIC_NAV.map((item) => {
            const resolvedHref = item.href === "/" && !authLoading && user ? "/home" : item.href;
            const active = item.href === "/" ? pathname === "/" || pathname === "/home" : isActivePath(pathname, item.href);
            if (item.href === "/tools") return (
              <div key={item.href} ref={mobileToolsMenuRef} className="bz-public-mobile-tools">
                <button type="button" className={`bz-pubmenu-link bz-public-mobile-tools-trigger ${mobileToolsOpen || pathname?.startsWith("/tools") || pathname === "/calculate" ? "is-active" : ""}`} aria-expanded={mobileToolsOpen} aria-controls="bz-public-mobile-tools-list" onClick={() => setMobileToolsOpen((open) => !open)}><FontAwesomeIcon icon={item.icon} className="h-4 w-4" /><span>{item.label}</span><FontAwesomeIcon icon={faChevronDown} className={`ms-auto h-3 w-3 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`} /></button>
                {mobileToolsOpen && <div id="bz-public-mobile-tools-list" className="bz-public-mobile-tools-list"><Link href="/tools" onClick={() => { setMobileToolsOpen(false); setMenuOpen(false); }}><b>كل أدوات البكالوريا</b><small>فهرس الأدوات</small></Link>{BAC_TOOLS.map((tool) => <Link key={tool.href} href={tool.href} onClick={() => { setMobileToolsOpen(false); setMenuOpen(false); }}><FontAwesomeIcon icon={tool.icon} /><span><b>{tool.label}</b><small>{tool.desc}</small></span></Link>)}</div>}
              </div>
            );
            return (
              <Link key={item.href} href={authLoading && item.href === "/" ? "#" : resolvedHref} aria-current={active ? "page" : undefined} onClick={(event) => { if (authLoading && item.href === "/") event.preventDefault(); setMenuOpen(false); }} className={`bz-pubmenu-link ${active ? "is-active" : ""}`}>
                <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-2 border-t border-border/70 pt-3">
            <PublicAuthActions mobile />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function PublicCta({
  title = "أنت الآن على بعد خطوة من منصّة كاملة",
  hint = "غرف مراجعة مباشرة، دورات من أساتذة، ملخّصات ومواضيع، وحاسبة معدّل — مجّاناً.",
}: { title?: string; hint?: string }) {
  const { user, loading } = useAuth();
  if (loading || user) return null;

  return (
    <section className="bz-pubcta">
      <div className="bz-pubcta-in">
        <div className="min-w-0 flex-1">
          <h2 className="bz-pubcta-t">{title}</h2>
          <p className="bz-pubcta-d">{hint}</p>
          <ul className="bz-pubcta-list">
            <li><FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> بلا رسوم اشتراك</li>
            <li><FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> يعمل على الهاتف</li>
            <li><FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> محتوى جزائري ١٠٠٪</li>
          </ul>
        </div>
        <div className="bz-pubcta-act">
          <Link href="/register" className="bz-pubcta-btn">
            أنشئ حسابك مجّاناً
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
          </Link>
          <Link href="/login" className="bz-pubcta-alt">لديّ حساب — دخول</Link>
        </div>
      </div>
    </section>
  );
}
