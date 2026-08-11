import type { MetadataRoute } from "next";
import { getPublishedEntries } from "@/features/blog/blog-server";
import { SITE_URL } from "@/lib/site-url";

/* ════════════════════════════════════════════════════════════
   خريطة موقع المدوّنة — ديناميكية

   ملفّ منفصل تحت `/blog` عمداً، فيُولّد Next العنوان
   `/blog/sitemap.xml` تلقائياً. ولماذا لا نضيفها إلى `sitemap.ts`
   الجذر؟ لسببين:

   ١) الجذر ثابت المحتوى تقريباً، وهذه تتغيّر مع كل مقال. فصلُهما
      يعني أنّ نشر مقال يُبطل خريطة المدوّنة وحدها.
   ٢) خرائط المواقع المنفصلة أوضح في Search Console: ترى «كم من مقالاتي
      فُهرس» مستقلّاً عن بقيّة الصفحات.

   والمسودّات لا تدخلها إطلاقاً: خريطة تُعلن رابطاً يُرجع 404 تُضعف
   ثقة الزاحف بالخريطة كلّها.
   ════════════════════════════════════════════════════════════ */

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedEntries();

  const index: MetadataRoute.Sitemap = [{
    url: `${SITE_URL}/blog`,
    lastModified: posts[0]?.updatedAt ? new Date(posts[0].updatedAt) : new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }];

  const articles: MetadataRoute.Sitemap = posts
    /* المقال الممنوع فهرسته لا يُعلَن في الخريطة — إعلانُه ثمّ منعُه
       إشارتان متناقضتان إلى Google. */
    .filter((p) => !p.noindex)
    .map((p) => ({
      url: `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: new Date(p.updatedAt || p.publishedAt || Date.now()),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...index, ...articles];
}
