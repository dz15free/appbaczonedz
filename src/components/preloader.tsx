"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

const EXIT_MS = 160;
const SAFETY_MS = 1200;

type PreloaderState = "visible" | "leaving" | "gone";

export function Preloader() {
  const [state, setState] = useState<PreloaderState>("visible");

  useEffect(() => {
    let finished = false;
    let frameOne: number | undefined;
    let frameTwo: number | undefined;
    let removeTimer: number | undefined;
    let safetyTimer: number | undefined;

    const reveal = () => {
      if (finished) return;
      finished = true;
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(() => {
          setState("leaving");
          removeTimer = window.setTimeout(() => setState("gone"), EXIT_MS);
        });
      });
    };

    const onReady = () => reveal();
    const scheduleReady = () => reveal();

    if (document.readyState === "complete" || document.readyState === "interactive") {
      scheduleReady();
    } else {
      document.addEventListener("DOMContentLoaded", onReady, { once: true });
      window.addEventListener("load", onReady, { once: true });
      safetyTimer = window.setTimeout(reveal, SAFETY_MS);
    }

    return () => {
      document.removeEventListener("DOMContentLoaded", onReady);
      window.removeEventListener("load", onReady);
      if (frameOne !== undefined) window.cancelAnimationFrame(frameOne);
      if (frameTwo !== undefined) window.cancelAnimationFrame(frameTwo);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div className={`bz-preloader-shell ${state === "leaving" ? "is-leaving" : ""}`} role="status" aria-live="polite" aria-label="جارٍ فتح BacZone">
      <div className="bz-preloader-aura aura-one" aria-hidden="true" />
      <div className="bz-preloader-aura aura-two" aria-hidden="true" />
      <div className="bz-preloader-stage">
        <div className="bz-preloader-logo-wrap">
          <span className="bz-preloader-ring ring-one" aria-hidden="true" />
          <span className="bz-preloader-ring ring-two" aria-hidden="true" />
          <span className="bz-preloader-logo-plate">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_LOGO} alt="BacZone" width={54} height={54} className="bz-preloader-logo-new" />
          </span>
          <span className="bz-preloader-spark" aria-hidden="true" />
        </div>
        <div className="bz-preloader-wordmark">Bac<span>Zone</span></div>
        <p className="bz-preloader-message">نفتح لك مساحة دراسة هادئة</p>
        <div className="bz-preloader-meter" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
