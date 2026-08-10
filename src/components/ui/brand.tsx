"use client";

import Link from "next/link";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { BetaBadge } from "@/components/ui/beta-badge";

/* ════════════════════════════════════════════════════════════
   الشعار والاسم — قِفل واحد (brand lock)

   🐛 ما كان يحدث:

   ١. **الشعار يبدو مقصوصاً.** الصورة كانت تحمل `rounded-xl` مباشرةً،
      فيُقصّ ٱثنا عشر بكسلاً من كل زاوية. وشعارك حرفٌ يملأ مربّعه حتى
      الحافّة، فذهبت قوس الـ`b` مع الزاوية. الصورة الآن **داخل** إطار
      يحمل الاستدارة، وهي مصغَّرة قليلاً داخله — فلا يُقصّ منها شيء.

   ٢. **الاسم والشعار لا يبدوان وحدة.** الاسم كان ١٧px بجانب شعار
      ٣٦px — نسبة ٠٫٤٧، والعين تقرأ ذلك عنصرين لا شيئاً واحداً. النسبة
      الطباعية المعتادة في قفل العلامة ٠٫٥٥–٠٫٦٥ من ارتفاع العلامة،
      فصار الاسم ٢٠–٢٢px مع الشعار ٣٦px.

   ٣. **المحاذاة كانت بالصندوق لا بالحرف.** `items-center` يُوسّط
      صندوق النصّ، وصندوق الحرف اللاتيني فيه فراغ سفليّ (descender)
      فيبدو الاسم مرفوعاً عن مركز الشعار. نُصحّحها بإزاحة بصريّة
      صغيرة على الحرف نفسه.

   وحدة واحدة يستعملها هيدر المنصّة وهيدر الصفحات العامّة — فيستحيل
   أن يختلف الشعار بين صفحة وأخرى.
   ════════════════════════════════════════════════════════════ */

export function Brand({
  size = "md",
  href = "/home",
  beta = true,
  className = "",
}: {
  /** `sm` للهاتف · `md` للحاسوب */
  size?: "sm" | "md";
  href?: string;
  beta?: boolean;
  className?: string;
}) {
  const { settings } = useSiteSettings();
  const name = settings.siteName ?? "BacZone";

  return (
    <Link
      href={href}
      aria-label={name}
      className={`bz-lock ${size === "sm" ? "is-sm" : ""} ${className}`}
    >
      <span className="bz-lock-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={settings.logoUrl || "/icon.svg"} alt="" width={40} height={40} />
      </span>
      <span className="bz-lock-name">{name}</span>
      {beta && <span className="bz-lock-beta"><BetaBadge /></span>}
    </Link>
  );
}
