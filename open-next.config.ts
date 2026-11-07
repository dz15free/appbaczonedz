// إعداد OpenNext لـ Cloudflare Workers
// https://opennext.js.org/cloudflare/caching
//
// - incrementalCache (R2): يخزّن صفحات ISR المولّدة (revalidate = 600 / 1800 …).
//   مغلَّف بذاكرة إقليمية (Cache API في مركز Cloudflare الأقرب للزائر) كي لا
//   يذهب كلّ طلب إلى R2. وضع long-lived: تُعاد الصفحة من الذاكرة حتى 30 دقيقة،
//   وتُحدَّث في الخلفية. لا نتجاوز tag cache عند الإصابة، فيبقى revalidatePath فورياً.
// - queue (Durable Object): يعيد توليد الصفحة في الخلفية عند انتهاء مدّة revalidate.
// - tagCache (D1): مطلوب لكي يعمل revalidatePath في /api/blog/revalidate و/api/public/revalidate.
//   (جدول revalidations يُنشأ تلقائياً عبر populateCache أثناء preview/deploy.)
// - enableCacheInterception: الصفحات الجاهزة في الكاش تُقدَّم دون تحميل خادم Next.js
//   كاملاً — أسرع بكثير، خاصّةً عند الإقلاع البارد. (لا يتوافق مع PPR، وهو غير مستعمل.)
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
  tagCache: d1NextTagCache,
  enableCacheInterception: true,
});
