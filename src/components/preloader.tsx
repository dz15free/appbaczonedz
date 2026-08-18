"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_FAVICON } from "@/lib/brand-assets";
import { useAuth } from "@/features/auth/auth-provider";

const MIN_VISIBLE_MS = 1620;
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
  const [state, setState] = useState<PreloaderState>("visible");

  useEffect(() => {
    const startedAt = performance.now();
    let settled = false;
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

    const appReady = async () => {
      try {
        if ("fonts" in document) await document.fonts.ready;
      } catch {
        // جاهزية الخطوط تحسين بصري وليست شرطاً لفتح المنصة.
      }
      await nextPaint();
      if (!waitForLandingAuth || !authLoading) leaveWhenReady();
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
      document.removeEventListener("DOMContentLoaded", onDomReady);
      window.removeEventListener("load", onDomReady);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      if (leaveTimer !== undefined) window.clearTimeout(leaveTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, [authLoading, waitForLandingAuth]);

  if (state === "gone") return null;

  return (
    <div
      className={`bz-preloader-v4 ${state === "leaving" ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="جارٍ فتح BacZone"
      data-state={state}
      data-auth-pending={waitForLandingAuth && authLoading ? "true" : "false"}
    >
      <div className="bz-preloader-v4-orbit bz-preloader-v4-orbit-a" aria-hidden="true" />
      <div className="bz-preloader-v4-orbit bz-preloader-v4-orbit-b" aria-hidden="true" />
      <div className="bz-preloader-v4-brand-wrapper" aria-hidden="true">
        <div className="bz-preloader-v4-pulse" />
        <div className="bz-preloader-v4-pulse" />
        <div className="bz-preloader-v4-spinner" />
        <div className="bz-preloader-v4-spinner-mask" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_FAVICON} alt="" className="bz-preloader-v4-logo" width={88} height={88} />
      </div>
      <div className="bz-preloader-v4-text">
        مرحباً بك<span>.</span><span>.</span><span>.</span>
      </div>
      <p className="bz-preloader-v4-subtitle">نفتح لك مساحة BacZone</p>
    </div>
  );
}
