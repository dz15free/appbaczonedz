"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

/* ════════════════════════════════════════════════════════════
   بحث الدليل + فتح القسم المقصود

   الدليل نفسه يُرسَم على الخادم كاملاً (كلّ قسم `<details>` مطويّ)،
   فيُقرأ ويُفهرَس بلا JavaScript. هذا المكوّن يضيف فوقه أمرين فقط:

   ١) البحث: يُخفي الأقسام التي لا تحوي الكلمة، ويفتح ما يطابقها.
      يعمل على النصّ المرسوم نفسه، فلا نسخة ثانية من المحتوى في
      حزمة المتصفّح.
   ٢) الرابط المباشر: `/help#whiteboard` يفتح قسم السبورة ويمرّر إليه —
      بلا هذا يصل القارئ إلى قسم مطويّ لا يرى منه إلّا عنوانه.

   التطبيع يحذف التشكيل ويوحّد الألف والياء والتاء المربوطة: من يكتب
   «السبوره» أو «الخباشة» يجب أن يجد «السبّورة» و«الخبّاشة».
   ════════════════════════════════════════════════════════════ */

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function GuideSearch() {
  const [q, setQ] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const cache = useRef<Map<Element, string>>(new Map());

  /* فتح القسم المقصود بالرابط */
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  /* البحث */
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-guide-section]"));
    const chapters = Array.from(document.querySelectorAll<HTMLElement>("[data-guide-chapter]"));
    const needle = norm(q.trim());

    if (!needle) {
      sections.forEach((s) => { s.hidden = false; });
      chapters.forEach((c) => { c.hidden = false; });
      setCount(null);
      return;
    }
    let found = 0;
    for (const s of sections) {
      let text = cache.current.get(s);
      if (text === undefined) { text = norm(s.textContent ?? ""); cache.current.set(s, text); }
      const hit = text.includes(needle);
      s.hidden = !hit;
      if (hit) { s.open = true; found++; }
    }
    for (const c of chapters) {
      c.hidden = !c.querySelector("[data-guide-section]:not([hidden])");
    }
    setCount(found);
  }, [q]);

  return (
    <div className="bz-help-search" role="search">
      <Icon name="search" size={17} aria-hidden="true" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث في الدليل: السبورة، الميكروفون، الدفع…"
        aria-label="ابحث في دليل المنصّة"
        enterKeyHint="search"
      />
      {count !== null && (
        <span className="bz-help-search-count" aria-live="polite">
          {count === 0 ? "لا نتيجة" : `${count} ${count > 10 ? "قسماً" : count > 2 ? "أقسام" : count === 2 ? "قسمان" : "قسم"}`}
        </span>
      )}
    </div>
  );
}
