"use client";

import { useEffect, useState } from "react";

const LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJkmGMz82JN543z5uysVeFEY71uvdHDH_Qq25wvcVlY_M0xyuSzDC2RfXwXovZ-2JYkNdQGsrES5QSWnvVxf7zb0h-2TezVm6aUJgtVfLIc0TLCVESOixhNH1VucRv76rVu1Cy9p52DyOgHQRxCtQkH8PmHrhxN5uHDFKa4XUlibN4pOzDIZJxCHq9Uxs/s320/BACZONEDZ%20(2).png";

export function Preloader() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const minTime = setTimeout(() => setHide(true), 1000);
    const onLoad = () => setTimeout(() => setHide(true), 500);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => {
      clearTimeout(minTime);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  useEffect(() => {
    if (!hide) return;
    const t = setTimeout(() => setGone(true), 450);
    return () => clearTimeout(t);
  }, [hide]);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        hide ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* الشعار مع توهّج ناعم */}
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="BacZoneDZ"
          className="relative h-20 w-20 animate-bz-logo-in rounded-2xl object-contain"
        />
      </div>

      {/* مؤشّر تحميل بسيط: ثلاث نقاط */}
      <div className="mt-8 flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
