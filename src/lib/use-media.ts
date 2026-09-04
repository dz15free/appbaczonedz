"use client";

import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════════════
   استعلام وسائط تفاعليّ

   🐛 ما يعالجه:
   كانت الغرفة تقرأ المقاس في `useRef` مع مستمع `resize`:

       const isDesktop = useRef(false);
       useEffect(() => { const check = () => { isDesktop.current = … } … });

   وهذا لا يُعيد التصيير، فالواجهة لا تعرف أنّ المقاس تغيّر: يُدير
   المستخدم اللوح من العمودي إلى الأفقي فتبقى الحسابات على المقاس
   القديم حتى يلمس شيئاً. والأسوأ أنّ العدّاد كان يُصفَّر عند أيّ
   تغيير حجم.

   الخطّاف يستعمل `matchMedia` مع مستمع `change` (لا `resize`)، فلا
   يُنبَّه إلّا عند تجاوز الحدّ فعلاً — أرخص وأدقّ. ويبدأ بـ`false`
   على الخادم فلا يختلف ناتج التصيير الأوّل بين الخادم والمتصفّح.
   ════════════════════════════════════════════════════════════ */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    /* Safari < 14 لا يعرف `addEventListener` على MediaQueryList */
    if (mq.addEventListener) mq.addEventListener("change", on);
    else mq.addListener(on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", on);
      else mq.removeListener(on);
    };
  }, [query]);

  return match;
}

/**
 * هل يوجد متّسع لرصيف جانبي؟
 *
 * العرض وحده لا يكفي: هاتف في الوضع الأفقي عرضه 844px — أوسع من
 * iPad العموديّ — لكن ارتفاعه 390px فقط. فتحُ رصيف بعرض 240px عليه
 * يأكل ثلث الشاشة ويعرض قائمةً لا يظهر منها سطران. الشرط شرطان:
 * عرض ≥768px **وارتفاع** ≥600px، وهو ما يستثني الهاتف الأفقي
 * ويُدخل كل الألواح والحواسيب.
 */
export const useHasSideDock = () =>
  useMediaQuery("(min-width: 768px) and (min-height: 600px)");
