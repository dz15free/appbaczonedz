"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO } from "@/lib/brand-assets";

const LOGO_URL = DEFAULT_LOGO;
const FADE_OUT_MS = 220;
const SAFETY_TIMEOUT_MS = 900;

export function Preloader() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let safetyTimer: number | undefined;
    let removeTimer: number | undefined;
    let frame: number | undefined;

    const finish = () => {
      setLeaving(true);
      removeTimer = window.setTimeout(() => setGone(true), FADE_OUT_MS);
    };

    const onLoad = () => {
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      frame = window.requestAnimationFrame(finish);
    };

    if (document.readyState === "complete") {
      frame = window.requestAnimationFrame(finish);
    } else {
      window.addEventListener("load", onLoad, { once: true });
      safetyTimer = window.setTimeout(onLoad, SAFETY_TIMEOUT_MS);
    }

    return () => {
      window.removeEventListener("load", onLoad);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`bz-preloader ${leaving ? "is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="جارٍ فتح BacZone"
    >
      <div className="bz-preloader-mark">
        <span className="bz-preloader-halo" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} alt="BacZone" className="bz-preloader-logo" />
      </div>
      <div className="bz-preloader-progress" aria-hidden="true"><span /></div>
      <span className="bz-preloader-label">نجهّز مساحتك للدراسة</span>
    </div>
  );
}
