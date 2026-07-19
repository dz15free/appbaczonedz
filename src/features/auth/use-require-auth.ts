"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";

/* ════════════════════════════════════════════════════════════
   حفظ الوجهة عبر تسجيل الدخول

   من يفتح رابط منشور أو ملخّص وهو غير مسجّل، كان يُرمى إلى
   /home بعد الدخول فيضيع الرابط. الآن نحمل الوجهة في ?next=
   ونعيده إليها بعد الدخول أو التسجيل.

   لماذا لا نستعمل useSearchParams؟
   لأنها تُجبر Next على تعطيل التوليد المسبق للصفحة ما لم تُغلَّف
   بـ <Suspense>، وهذا يكسر البناء في /login و/register.
   القراءة من window.location تعطي النتيجة نفسها بلا هذا القيد.

   الأمان: نقبل المسارات الداخلية فقط (تبدأ بـ / ولا بـ //)،
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

/** قراءة معامل من الرابط بعد التركيب — آمنة أثناء التوليد على الخادم */
export function useQueryParam(key: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setValue(new URLSearchParams(window.location.search).get(key));
  }, [key]);
  return value;
}

/**
 * يستبدل النمط المتكرّر: if (!loading && !user) router.replace("/login")
 * مع الاحتفاظ بالوجهة.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || user || typeof window === "undefined") return;
    router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  return { user, loading };
}

/** الوجهة بعد نجاح الدخول أو التسجيل */
export function useNextDestination(fallback = "/home") {
  const raw = useQueryParam("next");
  return safeNext(raw) ?? fallback;
}
