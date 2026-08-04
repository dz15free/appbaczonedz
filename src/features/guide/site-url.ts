/* ════════════════════════════════════════════════════════════
   عنوان الموقع — ملفّ محايد بلا "use client"

   🐛 كانت `absUrl` داخل `guide-store.ts` وأعلاه `"use client"`، فصارت
   **دالّة عميل**. وصفحة `/specialties` مكوّن خادم، فانهار البناء:

     Attempted to call absUrl() from the server but absUrl is on the client.

   الحلّ ليس نقل الصفحة إلى العميل — ذلك يُلغي التصيير على الخادم
   ويُضعف الفهرسة. بل إخراج الدالّة إلى ملفّ **بلا توجيه**، فيستوردها
   الطرفان.

   قاعدة عامّة: أي دالّة نقيّة يحتاجها الخادم والعميل معاً لا توضع في
   ملفّ يحمل `"use client"`.
════════════════════════════════════════════════════════════ */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com"
).replace(/\/+$/, "");

/** رابط مطلق — Google يرفض الروابط النسبية في البيانات المنظّمة */
export function absUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
