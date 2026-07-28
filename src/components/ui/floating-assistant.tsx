"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   المساعد العائم الصغير (Mini Floating Assistant)

   من ملاحظاتك: «زرّ دائري صغير (FAB) في زاوية الشاشة، عند الضغط عليه
   يفتح قائمة تحتوي كل الوظائف الثانوية، فتبقى الشاشة نظيفة جداً وفي
   نفس الوقت لا تفقد أي وظيفة».

   لماذا قائمة عمودية لا شعاعية بالمعنى الدائري:
   القوس الدائري يرمي بعض الأزرار إلى أعلى الشاشة — خارج مدى الإبهام،
   وهو عكس الغرض. هنا تتفتّح صعوداً من الزرّ نفسه فتبقى كلّها في الثلث
   السفلي.

   ملاحظات هذه النسخة (كانت على FontAwesome وألوان ثابتة):
   • انتقلت إلى نظام أيقونات BacZone ورموز التصميم — لا ألوان مكتوبة يدوياً.
   • زرّ الإغلاق لم يعد **أحمر**: الأحمر في نظامنا يعني تصحيحاً أو خطراً،
     وإغلاق قائمة ليس خطراً. صار أزرق مع دوران بسيط.
   • القطر 44px بدل 56px — مقاس اللمس الموصى به دون أن يحجب الشرح.
   • أُضيف Escape، وإغلاق عند الضغط خارجها، وشارة عدد اختيارية.
════════════════════════════════════════════════════════════ */

export interface RadialAction {
  id: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  tone?: "default" | "primary" | "amber" | "danger";
  badge?: number;
}

export function FloatingAssistant({
  actions,
  side = "left",
  label = "الوظائف",
  hidden = false,
  hideOnDesktop = false,
}: {
  actions: RadialAction[];
  side?: "left" | "right";
  label?: string;
  /** يُخفى حين تحتاج الشاشة كلّها — وضع الامتحان مثلاً */
  hidden?: boolean;
  /** يُخفى على الحاسوب (حيث يوجد الشريط الجانبي وشريط الأيقونات).
      لا يكفي لفّ المكوّن بـ lg:hidden: المحتوى يُركَّب على body عبر
      createPortal فيهرب من الغلاف تماماً — يجب أن يحمله هو. */
  hideOnDesktop?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    // نؤجّل دورة حتى لا تُلتقط النقرة نفسها التي فتحت القائمة
    const t = setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  // كل الخطّافات نُفّذت قبل أي خروج مبكّر — شرط قواعد الخطّافات
  if (!mounted || hidden) return null;

  const toneBg = (t?: string) =>
    t === "amber" ? "var(--bz-amber-050)"
    : t === "danger" ? "var(--bz-red-050)"
    : t === "primary" ? "var(--bz-blue-050)"
    : "var(--bz-canvas)";
  const toneFg = (t?: string) =>
    t === "amber" ? "var(--bz-amber)"
    : t === "danger" ? "var(--bz-red)"
    : t === "primary" ? "var(--bz-blue)"
    : "var(--bz-ink-2)";

  return createPortal(
    <>
      {open && (
        <div
          className={`fixed inset-0 z-[10054] bg-[rgba(19,23,34,.22)] ${hideOnDesktop ? "lg:hidden" : ""}`}
          aria-hidden="true"
          onPointerDown={() => setOpen(false)}
        />
      )}

      <div
        ref={rootRef}
        className={`fixed z-[10055] flex-col items-start gap-2 ${hideOnDesktop ? "flex lg:hidden" : "flex"}`}
        style={{
          // يتبع ارتفاع شريط الصوت الحقيقي بدل رقم مخمّن
          bottom:
            "calc(env(safe-area-inset-bottom, 0px) + var(--bz-voicebar-h, 0px) + 14px)",
          [side]: "14px",
        }}
      >
        {open &&
          actions.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { setOpen(false); a.onClick(); }}
              className="bz-fab-item flex items-center gap-2 rounded-full border py-1 pe-3 ps-1 shadow-xl transition active:scale-95"
              style={{
                background: "var(--bz-surface, #fff)",
                borderColor: "var(--bz-line)",
                animationDelay: `${i * 26}ms`,
              }}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={{ background: toneBg(a.tone), color: toneFg(a.tone) }}
              >
                <Icon name={a.icon} size={15} />
              </span>
              <span className="whitespace-nowrap text-[12px] font-bold text-[var(--bz-ink)]">
                {a.label}
              </span>
              {typeof a.badge === "number" && a.badge > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--bz-red)] px-1 text-[8.5px] font-extrabold text-white">
                  {a.badge > 9 ? "9+" : a.badge}
                </span>
              )}
            </button>
          ))}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "إغلاق الوظائف" : label}
          title={open ? "إغلاق" : label}
          className="grid h-11 w-11 place-items-center rounded-full text-white transition active:scale-90"
          style={{
            background: "var(--bz-blue)",
            boxShadow: "0 3px 8px rgba(35,80,217,.30), 0 10px 26px rgba(19,23,34,.18)",
          }}
        >
          <Icon
            name={open ? "close" : "plus"}
            size={19}
            className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        </button>
      </div>
    </>,
    document.body,
  );
}
