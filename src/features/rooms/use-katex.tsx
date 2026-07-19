"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════
   KaTeX مشترك — يُحمّل مرة واحدة من CDN ويُعاد استعماله

   الصيغة المدعومة:  $x^2$  للمعادلة داخل السطر
                     $$\int_0^1 f(x)dx$$  للمعادلة في سطر مستقل

   التحميل كسول: لا يُنزَّل شيء إلا عند أول استعمال فعلي،
   فلا يثقل صفحات لا تحتاج معادلات.
════════════════════════════════════════════════════════════ */

// نفس التعريف الموجود في room-notes.tsx — يجب أن يتطابق النوع وإلا رفضه TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { katex?: any; renderMathInElement?: any }
}

const KATEX_VER = "0.16.11";
let loading: Promise<boolean> | null = null;

function loadKatex(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.katex && window.renderMathInElement) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist/katex.min.css`;
      document.head.appendChild(link);
    }
    const script = (src: string) =>
      new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej();
        document.body.appendChild(s);
      });

    script(`https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist/katex.min.js`)
      .then(() => script(`https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist/contrib/auto-render.min.js`))
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
  return loading;
}

export function useKatex(): boolean {
  const [ready, setReady] = useState(
    typeof window !== "undefined" && !!window.katex && !!window.renderMathInElement
  );
  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadKatex().then((ok) => { if (alive) setReady(ok); });
    return () => { alive = false; };
  }, [ready]);
  return ready;
}

/* نص يُعرض كما هو، مع تحويل ما بين $...$ إلى معادلات منسّقة.
   يبقى النص مقروءاً حتى لو فشل تحميل KaTeX (شبكة ضعيفة). */
export function MathText({ text, className, dir = "auto" }: {
  text: string; className?: string; dir?: "auto" | "rtl" | "ltr";
}) {
  const ready = useKatex();
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !el.current || !window.renderMathInElement) return;
    // النص يُكتب عبر textContent (لا innerHTML) → لا مجال لحقن HTML
    try {
      window.renderMathInElement(el.current, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
        errorColor: "#dc2626",
      });
    } catch { /* يبقى النص الخام ظاهراً */ }
  }, [ready, text]);

  return (
    <div ref={el} className={className} dir={dir} style={{ whiteSpace: "pre-wrap" }}>
      {text}
    </div>
  );
}

/* رموز جاهزة للإدراج — رياضيات وفيزياء وكيمياء */
export const MATH_SNIPPETS: { label: string; insert: string; caret?: number }[] = [
  { label: "√", insert: "$\\sqrt{}$", caret: -2 },
  { label: "x²", insert: "$x^{2}$", caret: -2 },
  { label: "xₙ", insert: "$x_{n}$", caret: -2 },
  { label: "a/b", insert: "$\\frac{a}{b}$", caret: -6 },
  { label: "∫", insert: "$\\int_{0}^{1}$", caret: -2 },
  { label: "Σ", insert: "$\\sum_{i=1}^{n}$", caret: -2 },
  { label: "lim", insert: "$\\lim_{x \\to 0}$", caret: -2 },
  { label: "π", insert: "$\\pi$" },
  { label: "θ", insert: "$\\theta$" },
  { label: "α", insert: "$\\alpha$" },
  { label: "Δ", insert: "$\\Delta$" },
  { label: "∞", insert: "$\\infty$" },
  { label: "≤", insert: "$\\leq$" },
  { label: "≥", insert: "$\\geq$" },
  { label: "≠", insert: "$\\neq$" },
  { label: "→", insert: "$\\rightarrow$" },
  { label: "⇌", insert: "$\\rightleftharpoons$" },
  { label: "×10ⁿ", insert: "$\\times 10^{n}$", caret: -2 },
];

/* إدراج نص في موضع المؤشّر داخل textarea مع الحفاظ على التراجع */
export function insertAtCursor(
  ta: HTMLTextAreaElement,
  snippet: { insert: string; caret?: number },
  onChange: (v: string) => void
) {
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? start;
  const next = ta.value.slice(0, start) + snippet.insert + ta.value.slice(end);
  onChange(next);
  const pos = start + snippet.insert.length + (snippet.caret ?? 0);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(pos, pos);
  });
}
