"use client";

import { useCallback, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════
   الأشرطة المنزلقة في واجهة عربيّة

   🐛 ما تُظهره لقطات الـiPhone:
   في كل شريط أفقي منزلق داخل الغرفة كان **أوّل عنصر مقصوصاً عند
   الحافّة اليمنى** — زرّ الرجوع في الشريط العلوي، وأوّل صورة رمزية
   في رفّ الصفّ، وزرّ الصوت الأزرق في شريط التحكّم. والثلاثة أوّل
   أبنائها في الـDOM، أي أقصى اليمين في اتجاه RTL. لم يكن هذا
   تراكباً ولا نقص حشوة: الشريط كان **يبدأ مُمرَّراً إلى الطرف
   الخطأ**.

   والسبب اتفاقيّتان تاريخيّتان متضاربتان لـ`scrollLeft` في RTL:

     المعياريّة (Chrome ≥85، Firefox، Safari الحديث):
       المدى [-max, 0]، و`0` هو **البداية** (الحافّة اليمنى).

     القديمة في WebKit:
       المدى [0, max]، و`max` هو **البداية** (الحافّة اليمنى).

   فكتابة `scrollLeft = 0` تُصلح واحدة وتكسر الأخرى. ولأنّ التمييز
   بينهما لا يُعرف من `userAgent` بحال، نستنتجه من المتصفّح نفسه
   بمحاولة كتابة قيمة سالبة: من يقبلها فهو معياريّ.

   هذا فحصٌ واحد لا يُكرَّر، ونتيجته تُحفظ.
   ════════════════════════════════════════════════════════════ */

type RtlConvention = "negative" | "reverse";

let cachedConvention: RtlConvention | null = null;

/** يستنتج اتفاقيّة المتصفّح مرّة واحدة عبر عنصر قياس مؤقّت */
function detectConvention(): RtlConvention {
  if (cachedConvention) return cachedConvention;
  if (typeof document === "undefined") return "negative";

  const probe = document.createElement("div");
  probe.setAttribute("dir", "rtl");
  probe.style.cssText =
    "position:absolute;top:-9999px;width:40px;height:1px;overflow:scroll;visibility:hidden";
  const inner = document.createElement("div");
  inner.style.cssText = "width:200px;height:1px";
  probe.appendChild(inner);
  document.body.appendChild(probe);

  probe.scrollLeft = -1;
  cachedConvention = probe.scrollLeft < 0 ? "negative" : "reverse";

  probe.remove();
  return cachedConvention;
}

/**
 * يُعيد الشريط إلى **بدايته المنطقية** — يمين الشاشة في RTL، ويسارها
 * في LTR — أياً كانت اتفاقيّة المتصفّح.
 */
export function scrollToInlineStart(el: HTMLElement | null): void {
  if (!el) return;
  const rtl = getComputedStyle(el).direction === "rtl";
  if (!rtl) {
    el.scrollLeft = 0;
    return;
  }
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 0) return;
  el.scrollLeft = detectConvention() === "negative" ? 0 : max;
}

/**
 * يربط شريطاً منزلقاً فيبدأ من بدايته الصحيحة، ويبقى كذلك بعد كل
 * تغيّر في المحتوى أو المقاس.
 *
 * `ResizeObserver` ضروري لا زائد: عدد الأزرار في شريط التحكّم يتغيّر
 * مع عرض الشاشة، وعدد البطاقات في رفّ الصفّ يتغيّر مع دخول الطلبة —
 * وكل تغيّر يُعيد حساب `scrollWidth`، فيصير الطرف الصحيح رقماً
 * جديداً.
 *
 * ولا نُعيد الضبط إن كان المستخدم قد مرّر الشريط بنفسه: إعادته إلى
 * البداية تحت إصبعه أسوأ من المشكلة الأصليّة.
 */
export function useInlineStartScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const userScrolled = useRef(false);

  const reset = useCallback(() => {
    if (userScrolled.current) return;
    scrollToInlineStart(ref.current);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // بعد الرسم الأوّل: قبله يكون scrollWidth غير نهائي
    const raf = requestAnimationFrame(() => scrollToInlineStart(el));

    const onScroll = () => {
      /* التمرير القريب جداً من البداية ليس نيّة مستخدم — قد يكون
         ارتداداً مطّاطياً على iOS. */
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const atStart =
        detectConvention() === "negative"
          ? el.scrollLeft > -8
          : el.scrollLeft > max - 8;
      userScrolled.current = !atStart;
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(reset);
    ro.observe(el);
    /* مراقبة الأبناء أيضاً: عرض الشريط قد لا يتغيّر بينما يتغيّر
       مجموع عروض ما فيه (تسمية أطول، شارة عدد جديدة) — وهو ما يقلب
       الشريط من «يتّسع» إلى «يفيض» بلا أن يتحرّك الغلاف. */
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children.item(i);
      if (child) ro.observe(child);
    }

    window.addEventListener("orientationchange", reset);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("orientationchange", reset);
    };
  }, [reset]);

  return ref;
}
