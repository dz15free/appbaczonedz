"use client";

/* ════════════════════════════════════════════════════════════
   الكونسول — الشريط الواحد

   يستبدل: صفّي الأدوات العلويّين + اللوحتين العائمتين + شريط الصفحات.
   ثلاث مناطق: المراحل (ثابت) · الأدوات (يتبدّل بالسياق) · الغرفة (ثابت).

   الطرفان لا يتحرّكان أبدًا — فالعين تتعلّم مكانهما مرّة واحدة،
   والوسط وحده يتبدّل حسب الأداة أو العنصر المحدَّد.

   يخفت تلقائيًّا بعد ٣ ثوانٍ سكون ويعود بأوّل حركة.
════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

/* ─────────── الغلاف ─────────── */

export function Console({
  children,
  idleDim = true,
  className = "",
}: {
  children: ReactNode;
  /** يخفت بعد سكون — يُعطَّل في الأوضاع التي تتطلّب حضورًا دائمًا */
  idleDim?: boolean;
  className?: string;
}) {
  const [dim, setDim] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!idleDim) return;
    const wake = () => {
      setDim(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDim(true), 3000);
    };
    wake();
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [idleDim]);

  return (
    <div
      onPointerEnter={() => setDim(false)}
      className={`pointer-events-auto flex items-center gap-0.5 rounded-[13px] border p-[5px]
        transition-opacity duration-200 ${dim ? "opacity-45" : "opacity-100"} ${className}`}
      style={{
        background: "rgba(255,255,255,.98)",
        borderColor: "var(--bz-line-2)",
        boxShadow: "0 2px 4px rgba(19,23,34,.05), 0 14px 34px rgba(19,23,34,.12)",
      }}
    >
      {children}
    </div>
  );
}

/** الكونسول عائمًا فوق اللوح — الوضع الافتراضي على الحاسوب */
export function FloatingConsole({ children, idleDim }: { children: ReactNode; idleDim?: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 max-w-[calc(100%-16px)] -translate-x-1/2">
      <Console idleDim={idleDim}>{children}</Console>
    </div>
  );
}

/* ─────────── المناطق ─────────── */

export function ConsoleZone({
  children,
  scroll = false,
  className = "",
}: {
  children: ReactNode;
  /** يسمح بالتمرير الأفقي — لازم لمنطقة الأدوات على الهاتف */
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-0.5 px-1 ${
        scroll ? "bz-hide-scrollbar min-w-0 overflow-x-auto" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function ConsoleDivider() {
  return <span className="mx-1 h-[22px] w-px shrink-0" style={{ background: "var(--bz-line)" }} />;
}

/* ─────────── الأزرار ─────────── */

type BtnTone = "default" | "primary" | "amber" | "red";

const TONE: Record<BtnTone, string> = {
  default: "",
  primary: "bg-[var(--bz-blue)] text-white",
  amber: "bg-[var(--bz-amber)] text-white",
  red: "bg-[var(--bz-red)] text-white",
};

export function ConsoleButton({
  icon,
  label,
  active,
  tone = "default",
  badge,
  big,
  disabled,
  onClick,
  children,
}: {
  icon?: IconName;
  /** يظهر كـ tooltip وكوصف للقارئ الصوتي */
  label: string;
  active?: boolean;
  tone?: BtnTone;
  /** رقم صغير أعلى الزرّ (رسائل غير مقروءة مثلًا) */
  badge?: number;
  /** حجم أكبر — للفعل الأساسي مثل «التقط» */
  big?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** بديل عن الأيقونة: رمز رياضي أو نصّ قصير */
  children?: ReactNode;
}) {
  const size = big ? "h-[34px] w-[34px]" : "h-[30px] w-[30px]";
  const toneCls = active ? TONE.primary : TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`relative grid ${size} shrink-0 place-items-center rounded-lg transition
        active:scale-95 disabled:opacity-35 disabled:active:scale-100
        ${toneCls || "text-[var(--bz-ink-2)] hover:bg-[var(--bz-blue-050)] hover:text-[var(--bz-blue)]"}`}
    >
      {icon ? <Icon name={icon} size={big ? 20 : 18} /> : children}
      {badge != null && badge > 0 && (
        <span
          className="absolute -left-0.5 -top-0.5 grid min-w-[15px] place-items-center rounded-full
            px-1 text-[9px] font-bold leading-[15px] text-white"
          style={{ background: "var(--bz-red)", border: "1.5px solid #fff" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/** نصّ صغير داخل الكونسول (عدّاد، تسمية) */
export function ConsoleLabel({ children, tone }: { children: ReactNode; tone?: "amber" | "muted" }) {
  const color =
    tone === "amber" ? "var(--bz-amber-ink)" : tone === "muted" ? "var(--bz-ink-3)" : "var(--bz-ink-2)";
  return (
    <span className="shrink-0 px-1 text-[10.5px] font-semibold tabular-nums" style={{ color }}>
      {children}
    </span>
  );
}

/* ─────────── اللون ─────────── */

export function ConsoleSwatch({
  color,
  active,
  onClick,
  label,
}: {
  color: string;
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="grid h-[26px] w-[22px] shrink-0 place-items-center"
    >
      <span
        className="block h-[15px] w-[15px] rounded-full transition"
        style={{
          background: color,
          border: "1px solid rgba(19,23,34,.12)",
          boxShadow: active ? `0 0 0 1.5px #fff, 0 0 0 3px ${color}` : undefined,
        }}
      />
    </button>
  );
}

/* ─────────── مؤشّر المراحل ───────────
   يستبدل شريط تقدّم الدرس المحذوف: شرائح صغيرة، الحالية أعرض وزرقاء. */

export function StageIndicator({
  count,
  current,
  onSelect,
}: {
  count: number;
  current: number;
  onSelect?: (i: number) => void;
}) {
  const MAX = 9; // أكثر من ذلك يصبح مزدحمًا — نعرض نافذة حول الحالية
  let from = 0;
  let to = count;
  if (count > MAX) {
    from = Math.max(0, Math.min(current - Math.floor(MAX / 2), count - MAX));
    to = from + MAX;
  }
  return (
    <span className="flex shrink-0 items-center gap-[3px] px-1.5" role="group" aria-label="مراحل الدرس">
      {Array.from({ length: to - from }, (_, k) => {
        const i = from + k;
        const isNow = i === current;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect?.(i)}
            title={`المرحلة ${i + 1}`}
            aria-label={`المرحلة ${i + 1}`}
            aria-current={isNow}
            className="h-[13px] py-[4.5px] transition-all"
            style={{ width: isNow ? 19 : 13 }}
          >
            <span
              className="block h-[4px] w-full rounded-full transition-colors"
              style={{
                background: isNow
                  ? "var(--bz-blue)"
                  : i < current
                  ? "var(--bz-blue-100)"
                  : "var(--bz-line-2)",
              }}
            />
          </button>
        );
      })}
    </span>
  );
}

/* ─────────── صور المشاركين ─────────── */

export function ConsoleAvatars({
  people,
  extra,
  onClick,
}: {
  people: { id: string; name: string; color?: string; speaking?: boolean }[];
  extra?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="المشاركون"
      aria-label="المشاركون"
      className="flex shrink-0 items-center pl-1"
    >
      {people.map((p) => (
        <span
          key={p.id}
          className="grid h-[22px] w-[22px] place-items-center rounded-full text-[8.5px] font-bold text-white
            first:ml-0 [&:not(:first-child)]:-mr-[7px]"
          style={{
            background: p.color || "var(--bz-blue)",
            border: "1.5px solid #fff",
            boxShadow: p.speaking ? "0 0 0 2px var(--bz-green)" : undefined,
          }}
        >
          {p.name.slice(0, 1)}
        </span>
      ))}
      {extra != null && extra > 0 && (
        <span
          className="-mr-[7px] grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[7.5px] font-bold"
          style={{ background: "#DDE2EA", color: "var(--bz-ink-2)", border: "1.5px solid #fff" }}
        >
          +{extra}
        </span>
      )}
    </button>
  );
}
