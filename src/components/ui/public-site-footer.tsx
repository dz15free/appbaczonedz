"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/ui/site-footer";

const APP_SHELL_PREFIXES = [
  "/admin",
  "/aibot",
  "/community",
  "/courses",
  "/groups",
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

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function shouldRender(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return false;
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return false;
  if (["/about", "/contact", "/privacy", "/terms"].includes(pathname)) return false;
  return !APP_SHELL_PREFIXES.some((prefix) => hasPrefix(pathname, prefix));
}

/** فوتر الصفحات العامة التي لا تملك غلافاً محلياً أو فوتر AppShell. */
export function PublicSiteFooter() {
  const pathname = usePathname();
  return shouldRender(pathname) ? <SiteFooter /> : null;
}
