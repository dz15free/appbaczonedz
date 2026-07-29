/* ════════════════════════════════════════════════════════════
   شارة النسخة التجريبية

   الغرض ليس الزينة: الطالب الذي يرى «beta» يفهم أنّ عطباً محتمل ويُبلغ
   عنه بدل أن يترك المنصّة صامتاً. وهي أيضاً وعد ضمني بأنّ العمل جارٍ.

   مقاسها صغير ووزنها خفيف عمداً: شارة تنافس الشعار في الحجم تجعل
   المنتج يبدو غير جاهز أكثر ممّا هو.
════════════════════════════════════════════════════════════ */

export function BetaBadge({
  size = "sm",
  className = "",
}: {
  size?: "xs" | "sm";
  className?: string;
}) {
  const dims = size === "xs" ? "px-1 py-[1px] text-[8px]" : "px-1.5 py-[2px] text-[9px]";
  return (
    <span
      // العنوان يشرح المعنى لمن لا يعرف الكلمة — وأغلب طلابنا كذلك
      title="نسخة تجريبية — نطوّرها باستمرار، وملاحظاتك تصنع الفرق"
      className={`inline-flex shrink-0 items-center rounded-md font-extrabold uppercase leading-none tracking-wide ${dims} ${className}`}
      style={{
        background: "var(--bz-blue-050)",
        color: "var(--bz-blue-700)",
        border: "1px solid var(--bz-blue-100)",
        // لا تنزل مع خطّ الأساس: تُحاذى أعلى الاسم كما في المنتجات المعروفة
        verticalAlign: "super",
      }}
    >
      beta
    </span>
  );
}
