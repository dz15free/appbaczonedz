"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const search = useSearchParams();

  /* 🐛 **سبب ظهور بعض الصفحات دون غيرها في Analytics.**

     `gtag('config')` يُرسل زيارة **مرّة واحدة عند تحميل المستند**.
     ومسيّر Next لا يُعيد تحميل المستند عند التنقّل الداخلي — يُبدّل
     المحتوى فقط. فتُسجَّل صفحة الدخول وحدها، وكل ما يزوره الطالب بعدها
     بالضغط على الروابط **لا يُسجَّل إطلاقاً**.

     ولهذا تبدو صفحات «موضوعاً فيها الكود» وأخرى لا — والكود واحد في
     كلّها؛ الفرق أنّ الأولى دخلها الزائر مباشرة من Google.

     الحلّ: نُرسل `page_view` صراحةً عند كل تغيّر مسار. */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !GA_ID) return;
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (typeof w.gtag !== "function") return;   // السكربت لم يصل بعد
    const qs = search?.toString();
    w.gtag("event", "page_view", {
      page_path: pathname + (qs ? `?${qs}` : ""),
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  if (process.env.NODE_ENV !== "production" || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        /* `afterInteractive` لا `lazyOnload`: الأخيرة تنتظر خمول
           المتصفّح، فمن يغادر بسرعة لا يُحتسب أصلاً. وهي لا تحجب
           الرسم الأوّل فلا تضرّ Core Web Vitals. */
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {/* `send_page_view:false` يمنع ازدواج أوّل زيارة: الخطّاف أعلاه
            يرسلها، ولولا ذلك لعُدّت مرّتين. */}
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
      </Script>
    </>
  );
}
