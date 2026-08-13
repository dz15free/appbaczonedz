"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

const FADE_OUT_MS = 180;
const SAFETY_TIMEOUT_MS = 900;

export function Preloader() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let removeTimer: number | undefined;
    let safetyTimer: number | undefined;
    let frame: number | undefined;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      frame = window.requestAnimationFrame(() => {
        setLeaving(true);
        removeTimer = window.setTimeout(() => setGone(true), FADE_OUT_MS);
      });
    };

    if (document.readyState !== "loading") {
      finish();
    } else {
      document.addEventListener("DOMContentLoaded", finish, { once: true });
      window.addEventListener("load", finish, { once: true });
      safetyTimer = window.setTimeout(finish, SAFETY_TIMEOUT_MS);
    }

    return () => {
      document.removeEventListener("DOMContentLoaded", finish);
      window.removeEventListener("load", finish);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`bz-preloader ${leaving ? "is-leaving" : ""}`} role="status" aria-live="polite" aria-label="جارٍ فتح BacZone">
      <div className="bz-preloader-panel">
        <div className="bz-preloader-brand">
          <span className="bz-preloader-orbit orbit-a" aria-hidden="true" />
          <span className="bz-preloader-orbit orbit-b" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEFAULT_LOGO} alt="BacZone" width={58} height={58} className="bz-preloader-logo" />
        </div>
        <div className="bz-preloader-copy">
          <strong>BacZone</strong>
          <span>نفتح لك مساحة دراسة هادئة</span>
        </div>
        <div className="bz-preloader-track" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
