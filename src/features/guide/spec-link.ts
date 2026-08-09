/* ════════════════════════════════════════════════════════════
   بناء روابط التخصّصات — وحدة صغيرة بلا أي تبعيّة

   منفصلة عن `guide-merge` عمداً: تلك تستورد محتوى الدليل كاملاً
   (١٫١٩MB)، وبناء رابط لا يحتاج حرفاً واحداً منه.
   ════════════════════════════════════════════════════════════ */

/** الرابط الظاهر لتخصّص */
export function linkOf(s: { permalink?: string; slug: string }): string {
  return (s.permalink?.trim() || s.slug).replace(/^\/+|\/+$/g, "");
}

/** رابط صالح: لاتيني صغير بلا مسافات — ما يظهر في شريط العنوان */
export function normalizePermalink(x: string): string {
  return x
    .trim().toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
