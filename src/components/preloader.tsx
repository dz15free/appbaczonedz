"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

const MIN_VISIBLE_MS = 620;
const EXIT_MS = 260;
const SAFETY_MS = 5000;

type PreloaderState = "visible" | "leaving" | "gone";

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function Preloader() {
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
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      settled = true;
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      if (wait > 0) {
        leaveTimer = window.setTimeout(remove, wait);
      } else {
        remove();
      }
    };

    const appReady = async () => {
      try {
        if ("fonts" in document) await document.fonts.ready;
      } catch {
        // الخطوط ليست شرطاً لحجب التطبيق.
      }
      await nextPaint();
      leaveWhenReady();
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
  }, []);

  if (state === "gone") return null;

  return (
    <div
      className={`bz-preloader-v2 ${state === "leaving" ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="جارٍ فتح BacZone"
      data-state={state}
    >
      <div className="bz-preloader-v2-grid" aria-hidden="true" />
      <div className="bz-preloader-v2-orbit orbit-a" aria-hidden="true" />
      <div className="bz-preloader-v2-orbit orbit-b" aria-hidden="true" />
      <div className="bz-preloader-v2-shell">
        <div className="bz-preloader-v2-emblem" aria-hidden="true">
          <span className="bz-preloader-v2-sun" />
          <span className="bz-preloader-v2-line line-a" />
          <span className="bz-preloader-v2-line line-b" />
          <span className="bz-preloader-v2-logo-plate">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_LOGO} alt="" width={58} height={58} />
          </span>
        </div>
        <div className="bz-preloader-v2-wordmark">Bac<span>Zone</span></div>
        <p className="bz-preloader-v2-copy">نفتح لك مساحة دراسة أهدأ</p>
        <div className="bz-preloader-v2-track" aria-hidden="true"><span /></div>
        <div className="bz-preloader-v2-status"><i /> <span>نجهّز الواجهة</span><b>استعد</b></div>
      </div>
      <div className="bz-preloader-v2-footer" aria-hidden="true"><span>BACZONE</span><span>مساحة الطالب</span></div>
    </div>
  );
}
