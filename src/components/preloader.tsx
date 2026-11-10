"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_FAVICON } from "@/lib/brand-assets";
import { useAuth } from "@/features/auth/auth-provider";

/* كانت 1500: ثانية ونصف فوق صفحة جاهزة، عند كل دخول. تُبطئ القارئ
   وتُسيء لمؤشّر LCP الذي يقيسه Google. */
const MIN_VISIBLE_MS = 350;

/* صفحات المحتوى العامّة لا شاشة تحميل فيها إطلاقاً: هي مُصيَّرة على
   الخادم وجاهزة فوراً، وشاشة تغطّيها لا تحمي شيئاً — بل تجعل أوّل ما
   يراه الزائر (والزاحف) «مرحباً بك…» بدل المقال. */
const CONTENT_PREFIXES = [
  "/blog", "/specialties", "/guides", "/tools", "/calculate", "/features",
  "/author", "/about", "/contact", "/privacy", "/terms", "/voice-check",
  /* تُعرض من الكاش بلا JavaScript — شاشة التحميل لن تختفي فيها أبداً */
  "/offline",
];
function isContentPath(p: string | null) {
  return !!p && CONTENT_PREFIXES.some((x) => p === x || p.startsWith(x + "/"));
}
const EXIT_MS = 280;
const SAFETY_MS = 8000;

type PreloaderState = "visible" | "leaving" | "gone";

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function Preloader() {
  const pathname = usePathname();
  const { loading: authLoading } = useAuth();
  const waitForLandingAuth = pathname === "/";
  const skip = isContentPath(pathname);
  const [state, setState] = useState<PreloaderState>(skip ? "gone" : "visible");
  const authLoadingRef = useRef(authLoading);
  const finishCheckRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    authLoadingRef.current = authLoading;
    finishCheckRef.current?.();
  }, [authLoading]);

  useEffect(() => {
    if (skip) return;
    const startedAt = performance.now();
    let settled = false;
    let paintReady = false;
    let leaveTimer: number | undefined;
    let removeTimer: number | undefined;
    let safetyTimer: number | undefined;

    const remove = () => {
      setState("leaving");
      removeTimer = window.setTimeout(() => setState("gone"), EXIT_MS);
    };

    const leaveWhenReady = () => {
      if (settled) return;
      settled = true;
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      leaveTimer = window.setTimeout(remove, wait);
    };

    const maybeLeave = () => {
      if (!paintReady) return;
      if (waitForLandingAuth && authLoadingRef.current) return;
      leaveWhenReady();
    };

    finishCheckRef.current = maybeLeave;

    const appReady = async () => {
      try {
        if ("fonts" in document) await document.fonts.ready;
      } catch {
        // جاهزية الخطوط تحسين بصري وليست شرطاً لفتح المنصة.
      }
      await nextPaint();
      paintReady = true;
      maybeLeave();
    };

    const onDomReady = () => { void appReady(); };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
      window.addEventListener("load", onDomReady, { once: true });
    } else {
      void appReady();
    }
    safetyTimer = window.setTimeout(leaveWhenReady, SAFETY_MS);

    return () => {
      if (finishCheckRef.current === maybeLeave) finishCheckRef.current = null;
      document.removeEventListener("DOMContentLoaded", onDomReady);
      window.removeEventListener("load", onDomReady);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, [waitForLandingAuth, skip]);

  if (state === "gone") return null;

  return (
    <div
      className={`bz-pl ${state === "leaving" ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="جارٍ فتح BacZone"
      data-state={state}
      data-auth-pending={waitForLandingAuth && authLoading ? "true" : "false"}
    >
      {/* شاشة الافتتاح v9: الشعار داخل حلقة متدرّجة تدور، والاسم، وشريط رفيع.
          لا ضبابية ولا طبقات كبيرة — حركات transform/opacity وحدها، فتبقى
          خفيفة على الهواتف الضعيفة. والوضع الليلي من أوّل إطار (صنف `dark`
          يُضاف في <head> قبل الرسم). */}
      <div className="bz-pl-mark" aria-hidden="true">
        <svg className="bz-pl-ring" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="bz-pl-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6D5BFF" />
              <stop offset=".55" stopColor="#3044E0" />
              <stop offset="1" stopColor="#2F7BFF" />
            </linearGradient>
          </defs>
          <circle className="bz-pl-track" cx="60" cy="60" r="54" />
          <circle className="bz-pl-arc" cx="60" cy="60" r="54" stroke="url(#bz-pl-g)" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_FAVICON} alt="" className="bz-pl-logo" width={64} height={64} />
      </div>
      <p className="bz-pl-name" aria-hidden="true">BacZone</p>
      <span className="bz-pl-bar" aria-hidden="true"><i /></span>
    </div>
  );
}
