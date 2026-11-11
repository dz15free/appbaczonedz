"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/ui/site-footer";

const APP_SHELL_PREFIXES = [
  "/admin",
  "/aibot",
  "/community",
  "/courses",
  "/groups",
  "/help",
  "/home",
  "/leaderboard",
  "/library",
  "/messages",
  "/notifications",
  "/profile",
  "/rooms",
  "/tools/flashcards",
  "/tools/planner",
  "/tools/pomodoro",
  "/tools/tasks",
  "/tools/tracker",
  "/u",
];

const OWN_FOOTER_PREFIXES = ["/blog", "/features", "/author"];

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function shouldRender(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return false;
  /* 🐛 صفحات ترسم `<SiteFooter />` بنفسها (من الخادم): إن رسمناه هنا
     أيضاً ظهر الفوتر مرّتين. `/features` و`/author` كانتا غائبتين. */
  if (OWN_FOOTER_PREFIXES.some((prefix) => hasPrefix(pathname, prefix))) return false;
  if (["/about", "/contact", "/privacy", "/terms"].includes(pathname)) return false;
  return !APP_SHELL_PREFIXES.some((prefix) => hasPrefix(pathname, prefix));
}

/** فوتر الصفحات العامة التي لا تملك غلافاً محلياً أو فوتر AppShell. */
export function PublicSiteFooter() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // لا نرسم الفوتر العام أثناء أول رسم أو على Landing؛ ذلك يمنع ظهوره
  // أعلى الصفحة أثناء انتظار بوابة الجلسة قبل ظهور محتوى Landing.
  if (!mounted || pathname === "/") return null;
  return shouldRender(pathname) ? <SiteFooter /> : null;
}
