"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FAVICON } from "@/lib/brand-assets";

const MIN_VISIBLE_MS = 1620;
const EXIT_MS = 280;
const SAFETY_MS = 6000;

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
      className={`bz-preloader-v3 ${state === "leaving" ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="جارٍ فتح BacZone"
      data-state={state}
    >
      <div className="bz-preloader-v3-aura bz-preloader-v3-aura-a" aria-hidden="true" />
      <div className="bz-preloader-v3-aura bz-preloader-v3-aura-b" aria-hidden="true" />
      <section className="bz-preloader-v3-card">
        <div className="bz-preloader-v3-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_FAVICON} alt="" className="bz-preloader-v3-logo" width={96} height={96} />
        </div>
        <div className="bz-preloader-v3-brand">Bac<span>Zone</span></div>
        <p className="bz-preloader-v3-tag">منصّة البكالوريا والدراسة الذكية في الجزائر</p>
        <div className="bz-preloader-v3-rule" aria-hidden="true" />
        <h1>نجهّز لك مساحة الدراسة</h1>
        <p className="bz-preloader-v3-copy">لحظات قليلة ونفتح لك أدواتك وملاحظاتك وغرفتك.</p>
        <div className="bz-preloader-v3-progress" aria-hidden="true"><span /></div>
        <div className="bz-preloader-v3-status"><b>جارٍ التجهيز</b><span>استعد</span></div>
      </section>
    </div>
  );
}
