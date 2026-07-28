/* ════════════════════════════════════════════════════════════
   نقطة حالة الأستاذ

   كانت الحالة تُعرض برموز تعبيرية (🟢🔴🟡). الرمز التعبيري يُرسم بخطّ
   النظام، فيختلف حجمه ولونه وحوافّه بين أندرويد و iOS وويندوز، ولا
   يمكن ضبط مقاسه مع بقيّة السطر. النقطة هنا عنصر حقيقي بألوان نظام
   تصميم BacZone، متطابقة على كل جهاز.

   اللون وحده لا يكفي لمن لا يميّز الألوان، فتحمل النقطة دائماً
   aria-label نصّياً، ويمكن إظهار التسمية بجانبها.
════════════════════════════════════════════════════════════ */

export type DotStatus = "available" | "busy" | "brb";

const DOT: Record<DotStatus, { color: string; label: string }> = {
  available: { color: "#1E8A5F", label: "متفرّغ" },
  busy: { color: "#D2453C", label: "مشغول" },
  brb: { color: "#D08217", label: "سيعود قريباً" },
};

export interface StatusDotProps {
  status: DotStatus;
  /** قطر النقطة بالبكسل — الافتراضي 8 */
  size?: number;
  /** إظهار التسمية نصّاً بجانب النقطة */
  showLabel?: boolean;
  className?: string;
}

export function StatusDot({ status, size = 8, showLabel = false, className = "" }: StatusDotProps) {
  const info = DOT[status] ?? DOT.available;
  const dot = (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: info.color,
        // هالة خفيفة تفصل النقطة عن الخلفية أيّاً كان لونها
        boxShadow: `0 0 0 ${Math.max(1, size / 8)}px ${info.color}33`,
      }}
      role="img"
      aria-label={info.label}
    />
  );
  if (!showLabel) return <span className={className}>{dot}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {dot}
      <span style={{ color: info.color }}>{info.label}</span>
    </span>
  );
}

/** التسمية النصّية وحدها — للأماكن التي تحتاج نصّاً لا عنصراً */
export function statusLabel(status: DotStatus): string {
  return (DOT[status] ?? DOT.available).label;
}
