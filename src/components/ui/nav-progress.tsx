"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* ════════════════════════════════════════════════════════════
   شريط تقدّم رفيع أعلى الشاشة عند التنقّل

   الصفحات المُصيَّرة على الخادم (المقالات، الدليل…) لا تتغيّر قبل أن
   يصل ردّ الخادم، ولا ملفّ loading.tsx في المشروع — فكان النقر على
   رابط يبدو بلا أثر لثوانٍ على شبكة بطيئة. الشريط يبدأ فور النقر
   ويكتمل حين يتغيّر العنوان، فيعرف التلميذ أنّ نقرته وصلت.
   ════════════════════════════════════════════════════════════ */

export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<number[]>([]);

  function clear() { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; }

  /* اكتمل التنقّل */
  useEffect(() => {
    setState((s) => {
      if (s !== "loading") return s;
      clear();
      timers.current.push(window.setTimeout(() => setState("idle"), 350));
      return "done";
    });
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      /* المسار نفسه (مرساة، أو فلتر في العنوان): الإكمال يعتمد على تغيّر المسار، فلا نبدأ */
      if (url.pathname === window.location.pathname) return;
      clear();
      setState("loading");
      /* أمان: لا يبقى الشريط عالقاً إن أُلغي التنقّل */
      timers.current.push(window.setTimeout(() => setState("idle"), 12_000));
    }
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); clear(); };
  }, []);

  if (state === "idle") return null;
  return <div className={`bz-navprogress is-${state}`} role="progressbar" aria-label="جارٍ فتح الصفحة" />;
}
