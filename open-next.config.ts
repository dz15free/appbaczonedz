// إعداد OpenNext لـ Cloudflare Workers
// https://opennext.js.org/cloudflare/caching
//
// - incrementalCache (R2): يخزّن صفحات ISR المولّدة (revalidate = 600 / 1800 …).
// - queue (Durable Object): يعيد توليد الصفحة في الخلفية عند انتهاء مدّة revalidate.
// - tagCache (D1): مطلوب لكي يعمل revalidatePath في /api/blog/revalidate و/api/public/revalidate.
//   (جدول revalidations يُنشأ تلقائياً عبر populateCache أثناء preview/deploy.)
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  tagCache: d1NextTagCache,
});
