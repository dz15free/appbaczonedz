"use client";

import { useSiteSettings } from "@/features/settings/use-site-settings";

/* مواضع الإعلانات المتاحة في الموقع */
export const AD_PLACEMENTS: { id: string; label: string; desc: string }[] = [
  { id: "header", label: "أسفل الهيدر", desc: "يظهر أعلى كل الصفحات تحت الشريط العلوي" },
  { id: "home", label: "الصفحة الرئيسية", desc: "بين أقسام الصفحة الرئيسية" },
  { id: "room", label: "داخل الغرفة", desc: "يظهر عند الانضمام للغرفة" },
  { id: "library", label: "صفحة المكتبة", desc: "أعلى قائمة الملخّصات" },
  { id: "community", label: "صفحة المجتمع", desc: "أعلى المنشورات" },
];

export function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  const { settings } = useSiteSettings();
  const ad = settings.ads?.[placement];
  if (!ad || !ad.enabled) return null;

  if (ad.type === "image" && ad.imageUrl) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ad.imageUrl} alt="إعلان" loading="lazy" className="mx-auto max-h-32 w-full rounded-xl object-contain" />
    );
    return (
      <div className={`bz-ad-slot relative ${className}`}>
        <span className="absolute right-2 top-1 z-10 rounded bg-black/40 px-1.5 text-[9px] font-bold text-white">إعلان</span>
        {ad.linkUrl ? (
          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer sponsored">{img}</a>
        ) : img}
      </div>
    );
  }

  if (ad.type === "html" && ad.html) {
    return (
      <div className={`bz-ad-slot relative ${className}`}>
        <span className="absolute right-2 top-1 z-10 rounded bg-black/40 px-1.5 text-[9px] font-bold text-white">إعلان</span>
        <div dangerouslySetInnerHTML={{ __html: ad.html }} />
      </div>
    );
  }

  return null;
}
