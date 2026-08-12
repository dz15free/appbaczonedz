"use client";

import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/features/settings/use-site-settings";

/* مواضع الإعلانات المتاحة في الموقع */
export const AD_PLACEMENTS: { id: string; label: string; desc: string }[] = [
  { id: "header", label: "أسفل الهيدر", desc: "يظهر أعلى الصفحات العامة تحت الشريط العلوي" },
  { id: "article-top", label: "أعلى المقال", desc: "بعد عنوان المقال أو قبل محتوى الأداة" },
  { id: "article-middle", label: "وسط المقال", desc: "بين المحتوى الرئيسي والأقسام اللاحقة" },
  { id: "article-bottom", label: "أسفل المقال", desc: "بعد المحتوى وقبل الروابط ذات الصلة" },
  { id: "home", label: "الصفحة الرئيسية", desc: "بين أقسام الصفحة الرئيسية" },
  { id: "room", label: "داخل الغرفة", desc: "يظهر عند الانضمام للغرفة" },
  { id: "library", label: "صفحة المكتبة", desc: "أعلى قائمة الملخّصات" },
  { id: "community", label: "صفحة المجتمع", desc: "أعلى المنشورات" },
];

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

function AdHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!html.includes("adsbygoogle")) return;
    const existing = document.querySelector('script[data-bz-adsense="true"]');
    if (!existing) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      script.dataset.bzAdsense = "true";
      document.head.appendChild(script);
    }
    const timer = window.setTimeout(() => {
      const slots = ref.current?.querySelectorAll(".adsbygoogle") ?? [];
      slots.forEach(() => {
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
        } catch {
          // الإعلان اختياري ولا ينبغي أن يؤثر في الصفحة عند حظره.
        }
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  const { settings } = useSiteSettings();
  const ad = settings.ads?.[placement];
  if (!ad || !ad.enabled) return null;

  if (ad.type === "image" && ad.imageUrl) {
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ad.imageUrl} alt="إعلان" width={1200} height={250} loading="lazy" decoding="async" className="mx-auto max-h-32 w-full rounded-xl object-contain" />
    );
    return (
      <div className={`bz-ad-slot relative ${className}`} data-ad-placement={placement} aria-label="إعلان">
        <span className="absolute right-2 top-1 z-10 rounded bg-black/40 px-1.5 text-[9px] font-bold text-white">إعلان</span>
        {ad.linkUrl ? <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer sponsored">{image}</a> : image}
      </div>
    );
  }

  if (ad.type === "html" && ad.html) {
    return (
      <div className={`bz-ad-slot relative ${className}`} data-ad-placement={placement} aria-label="إعلان">
        <span className="absolute right-2 top-1 z-10 rounded bg-black/40 px-1.5 text-[9px] font-bold text-white">إعلان</span>
        <AdHtml html={ad.html} />
      </div>
    );
  }

  return null;
}
