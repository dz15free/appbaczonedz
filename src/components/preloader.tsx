"use client";

import { useEffect, useState } from "react";

export function Preloader() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const minTime = setTimeout(() => setHide(true), 1100);
    const onLoad = () => setTimeout(() => setHide(true), 600);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => {
      clearTimeout(minTime);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  useEffect(() => {
    if (!hide) return;
    const t = setTimeout(() => setGone(true), 500);
    return () => clearTimeout(t);
  }, [hide]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        hide ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-primary opacity-40 blur-2xl" />
        <div className="absolute -inset-3 animate-spin rounded-3xl border-2 border-primary/20 border-t-primary" />
        <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-primary text-4xl font-extrabold text-white shadow-glow">
          BZ
        </div>
      </div>

      <h1 className="mt-7 font-display text-2xl font-extrabold">
        BacZone <span className="bz-gradient-text">DZ</span>
      </h1>
      <p className="mt-1 text-sm text-text-muted">منصّتك للنجاح في البكالوريا</p>

      <div className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-surface">
        <div className="bz-loadbar h-full w-1/3 rounded-full bg-gradient-primary" />
      </div>
    </div>
  );
}
