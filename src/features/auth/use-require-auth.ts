"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

/* ════════════════════════════════════════════════════════════
   حفظ الوجهة عبر تسجيل الدخول

   من يفتح رابط منشور أو ملخّص وهو غير مسجّل، كان يُرمى إلى
   /home بعد الدخول فيضيع الرابط. الآن نحمل الوجهة في ?next=
   ونعيده إليها بعد الدخول أو التسجيل.

   الأمان: نقبل المسارات الداخلية فقط (تبدأ بـ / ولا تبدأ بـ //)،
   وإلا صار الرابط أداة تحويل إلى مواقع خارجية (Open Redirect).
════════════════════════════════════════════════════════════ */

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;   // //evil.com يُقرأ كنطاق خارجي
  if (raw.startsWith("/login") || raw.startsWith("/register")) return null;
  return raw;
}

/** يبني رابط الدخول محتفظاً بالوجهة الحالية */
export function loginHrefFor(pathname: string, search?: string) {
  const dest = `${pathname}${search && search !== "?" ? search : ""}`;
  const safe = safeNext(dest);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

/**
 * يستبدل النمط المتكرّر: if (!loading && !user) router.replace("/login")
 * مع الاحتفاظ بالوجهة.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (loading || user) return;
    const qs = params?.toString();
    router.replace(loginHrefFor(pathname ?? "/", qs ? `?${qs}` : ""));
  }, [loading, user, router, pathname, params]);

  return { user, loading };
}

/** الوجهة بعد نجاح الدخول أو التسجيل */
export function useNextDestination(fallback = "/home") {
  const params = useSearchParams();
  return safeNext(params?.get("next")) ?? fallback;
}
