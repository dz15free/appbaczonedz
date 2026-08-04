"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import type { ChallengeAttachment } from "@/features/rooms/challenge";

/* ════════════════════════════════════════════════════════════
   عارض مرفقات التحدّي

   الصورة **معاينة مضبوطة** لا صورة خام: صورة هاتف حديث 4000 بكسل عرضاً
   داخل بطاقة تكسر التخطيط وتُبطئ الصفحة. نحدّ الارتفاع ونملأ العرض،
   والضغط يفتحها بحجمها الكامل.

   والمستند **لا يُحمَّل داخل البطاقة**: عارض PDF في مساحة صغيرة على
   الهاتف عبء بلا فائدة — بطاقة واضحة تفتحه في تبويب أنفع.
════════════════════════════════════════════════════════════ */

export function AttachmentView({
  att, compact = false,
}: {
  att: ChallengeAttachment;
  /** داخل قائمة الأستاذ: ارتفاع أقلّ حتى تبقى الحلول قابلة للمسح بالعين */
  compact?: boolean;
}) {
  const [zoom, setZoom] = useState(false);

  // Escape يغلق — أسرع من البحث عن زرّ الإغلاق
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    window.addEventListener("keydown", onKey);
    // نمنع تمرير الصفحة خلف الصورة المكبّرة
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom]);

  if (att.kind !== "image") {
    return (
      <a href={att.url} target="_blank" rel="noreferrer" className="bz-att-file">
        <span className="bz-att-file-icon"><Icon name="file" size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-bold">{att.name}</span>
          <span className="block text-[10.5px] text-[var(--bz-ink-3)]">اضغط للفتح في تبويب جديد</span>
        </span>
        <Icon name="download" size={14} className="shrink-0 text-[var(--bz-ink-3)]" />
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setZoom(true)}
        className={`bz-att-img ${compact ? "is-compact" : ""}`}
        aria-label={`تكبير ${att.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={att.url} alt={att.name} loading="lazy" />
        <span className="bz-att-zoom"><Icon name="expand" size={13} /> تكبير</span>
      </button>

      {zoom && typeof document !== "undefined" && createPortal(
        <div className="bz-att-lightbox" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <button className="bz-att-close" onClick={() => setZoom(false)} aria-label="إغلاق">
            <Icon name="close" size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={att.url} alt={att.name} onClick={(e) => e.stopPropagation()} />
          <a href={att.url} target="_blank" rel="noreferrer" className="bz-att-open"
            onClick={(e) => e.stopPropagation()}>
            فتح الأصل
          </a>
        </div>,
        document.body,
      )}
    </>
  );
}
