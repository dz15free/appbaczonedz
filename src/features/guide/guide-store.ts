"use client";

import { ref, onValue, set, remove, update, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
// إعادة تصدير: المستوردون القدامى لا ينكسرون، والمصدر ملفّ محايد
export { absUrl, SITE_URL } from "@/features/guide/site-url";

/* ════════════════════════════════════════════════════════════
   محتوى دليل التخصّصات — تكتبه أنت

   الفهرس في الشيفرة يحمل **الأسماء فقط**. أمّا الشرح فيُكتب من لوحة
   الإدارة ويُخزَّن هنا، فيتغيّر بلا إعادة نشر للموقع.

   **الرابط (permalink) منفصل عن المعرّف** عمداً: المعرّف مفتاح داخلي
   ثابت يربط المحتوى بالفهرس، والرابط هو ما يظهر في المتصفّح وتفهرسه
   Google. فصلهما يتيح لك تحسين الرابط دون أن ينكسر الربط الداخلي.

   ⚠️ لكنّ تغيير رابط منشور يُلغي ترتيبه في Google ويكسر كل مشاركة —
   لذلك تُحذّرك الواجهة قبل التغيير، ونحتفظ بالروابط القديمة في
   `aliases` فتظلّ تعمل بدل أن تعطي 404.
════════════════════════════════════════════════════════════ */

const PATH = "guide/specialities";


/* الأنواع والدمج انتقلت إلى `guide-merge.ts` (وحدة محايدة): كانت
   تجرّ ١٫١٩MB من البذرة إلى حزمة المتصفّح عبر `"use client"` أعلاه.
   نعيد تصديرها هنا فلا ينكسر أي مستورد قديم. */
export { mergeGuide, linkOf, normalizePermalink } from "@/features/guide/guide-merge";
export type { SpecContent, SpecFull } from "@/features/guide/guide-merge";
import { mergeGuide, normalizePermalink, type SpecContent, type SpecFull } from "@/features/guide/guide-merge";

export function listenGuide(cb: (rows: SpecFull[]) => void) {
  return onValue(ref(rtdb, PATH), (snap) => {
    cb(mergeGuide((snap.val() as Record<string, SpecContent> | null) ?? {}));
  });
}


export async function saveSpec(slug: string, patch: SpecContent) {
  /* 🐛 التخصّص الجديد يُنشأ بـ`draft: true`، ولم يكن هناك أي سبيل
     لإلغائها — فيُحفظ المقال ولا يُنشر أبداً مهما كتبت.
     الحفظ مع مقدّمة يعني نيّة النشر، فنرفع المسودّة صراحةً. */
  const clean: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.intro?.trim()) clean.draft = false;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") continue;   // القاعدة ترفض undefined
    clean[k] = v;
  }
  await update(ref(rtdb, `${PATH}/${slug}`), clean);
}

/** تغيير الرابط مع حفظ القديم فلا تنكسر الروابط المنشورة */
export async function changePermalink(slug: string, next: string) {
  const link = normalizePermalink(next);
  if (!link) return null;
  const snap = await get(ref(rtdb, `${PATH}/${slug}`));
  const cur = (snap.val() as SpecContent | null) ?? {};
  const old = (cur.permalink ?? slug).trim();
  const aliases = new Set([...(cur.aliases ?? []), old].filter((x) => x && x !== link));
  await update(ref(rtdb, `${PATH}/${slug}`), {
    permalink: link,
    aliases: [...aliases].slice(-8),   // نحتفظ بآخر ثمانية فقط
    updatedAt: Date.now(),
  });
  return link;
}

/** حذف المحتوى — الاسم يبقى في الفهرس، فتُعيد الكتابة متى شئت */
export async function clearSpec(slug: string) {
  await remove(ref(rtdb, `${PATH}/${slug}`));
}

/** تخصّص جديد لا يوجد في الفهرس */
export async function addSpec(slug: string, data: SpecContent) {
  const key = normalizePermalink(slug);
  if (!key) return null;
  await set(ref(rtdb, `${PATH}/${key}`), { ...data, permalink: key, updatedAt: Date.now() });
  return key;
}
