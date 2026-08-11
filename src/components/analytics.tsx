import Script from "next/script";

/* ════════════════════════════════════════════════════════════
   Google Analytics 4 — بأقلّ ثمن ممكن على الأداء

   ثلاثة قرارات، كلّ واحد منها له بديل أسوأ:

   ١) **`next/script` بـ`lazyOnload`، لا وسم `<script>` في `<head>`.**
      وسمٌ يدويّ في الترويسة يُحمَّل قبل أن تصير الصفحة تفاعلية، فيدخل
      المسار الحَرِج للرسم ويؤذي LCP وTTFB.

      وقِستُ الفرق ولم أفترضه: `afterInteractive` — وهي الوصفة الشائعة —
      تجعل Next يُصدر في الترويسة

        <link rel="preload" href="…gtag/js?id=…" as="script"/>

      فيُنزَّل السكربت **بأولويّة عالية مع موارد الرسم الأولى** ويزاحمها
      على النطاق. وجمهور هذه المنصّة على 3G و4G بنصّها هي، فالمزاحمة على
      النطاق هناك ليست نظريّة: هي تأخير LCP مباشر.

      و`lazyOnload` تنتظر `load` ثم تُحمّله في وقت خمول المتصفّح، فلا
      preload ولا مزاحمة ولا أيّ أثر على LCP أو CLS أو TTFB.

      والثمن معلوم ومقبول: زائرٌ يغادر في أوّل ثانية قد لا تُسجَّل
      مشاهدته. إن رجّحتَ دقّة القياس على السرعة فالتغيير كلمة واحدة —
      `lazyOnload` ← `afterInteractive` في السطرين أدناه.

   ٢) **بلا أيّ مكتبة.** لا `@next/third-parties` ولا مكتبة تحليلات ولا
      Google Tag Manager. المطلوب GA4 وحده، و`gtag.js` يكفي —
      وGTM طبقة إضافية ثقيلة لا حاجة لها. صفر تبعيّات جديدة، أي صفر
      زيادة في حجم الحزمة من عندنا.

   ٣) **لا نتبع تغيّر المسار بأنفسنا — وهذا مقصود لا نقص.**
      GA4 يتتبّع مشاهدات SPA تلقائياً عبر «القياس المحسّن»
      (Enhanced measurement ← "Page changes based on browser history
      events")، وهو مُفعَّل افتراضياً. فلو أضفنا مستمعاً لـ`usePathname`
      يُرسل `page_view` عند كل تنقّل، لأُرسلت **كل مشاهدة مرّتين** —
      وهو عين ما طُلب تجنّبه. ولا مؤقّتات ولا `setInterval` ولا استقصاء.

   وفُحص المشروع كلّه قبل الإضافة: لا `gtag` ولا `googletagmanager` ولا
   `dataLayer` ولا GTM ولا أيّ حزمة تحليلات. هذه أوّل نسخة وحيدة، فلا
   خطر ازدواج من نسخة قديمة.

   ولا يُحمَّل في التطوير: `localhost` كان سيُلوّث تقاريرك ببيانات ليست
   من طلبتك.
   ════════════════════════════════════════════════════════════ */

/* المعرّف علنيّ بطبعه — يُرى في مصدر أيّ صفحة، فليس سرّاً ولا يُخفى.
   ويبقى قابلاً للتجاوز بمتغيّر بيئة لمن أراد حساباً آخر بلا تعديل شيفرة. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-8LXY3YV9W4";

export function Analytics() {
  if (process.env.NODE_ENV !== "production" || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-init" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
