"use client";

import { useEffect, useState } from "react";

/* 🐛 **شاشة التحميل كانت تعرض الشعار القديم** — وهي أوّل ما يراه كل
   زائر، على كل جهاز. كان الرابط مكتوباً بيده هنا نسخةً ثالثة من شعار
   على خادم Blogger، فلم يمسّه أيّ تغيير في بقيّة الموقع.

   ويُقرأ من الملفّ المحلّي لا من الإعدادات عن قصد: هذه الشاشة تظهر
   **قبل** أن تتّصل قاعدة البيانات، فربطها بالإعدادات يعني شعاراً
   فارغاً في أوّل ثانية — وهي الثانية الوحيدة التي تُرى فيها. */
import { DEFAULT_LOGO } from "@/lib/brand-assets";

const LOGO_URL = DEFAULT_LOGO;

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
