"use client";

import { useEffect, useRef } from "react";

/**
 * عارض احترافي لرسائل الخباشة:
 * - يدعم Markdown (عناوين، عريض، مائل، قوائم، كود، اقتباس)
 * - يدعم معادلات LaTeX عبر KaTeX (يُحمَّل من CDN عند الحاجة)
 *   - داخل السطر: $...$
 *   - سطر مستقل: $$...$$
 *
 * بدون أي مكتبات npm — KaTeX يُحقن من CDN مرة واحدة فقط.
 */

// تحميل KaTeX من CDN (مرة واحدة)
let katexPromise: Promise<void> | null = null;
function loadKatex(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).katex) return Promise.resolve();
  if (katexPromise) return katexPromise;

  katexPromise = new Promise<void>((resolve) => {
    // CSS
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
      document.head.appendChild(link);
    }
    // JS
    if ((window as any).katex) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
    script.onload = () => resolve();
    script.onerror = () => resolve(); // نفشل بهدوء، يبقى النص الخام
    document.head.appendChild(script);
  });
  return katexPromise;
}

// هروب HTML
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// تنسيق inline: عريض، مائل، كود
function inlineFormat(text: string): string {
  let t = esc(text);
  // كود inline `code`
  t = t.replace(/`([^`]+)`/g, '<code class="bz-code">$1</code>');
  // عريض **text**
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // مائل *text* (تجنّب ** بالفعل مُعالَجة)
  t = t.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, "$1<em>$2</em>$3");
  return t;
}

/**
 * يحوّل نص Markdown إلى HTML مع علامات نائبة للمعادلات.
 * نعزل المعادلات أولاً حتى لا يفسدها معالج الـ Markdown.
 */
function markdownToHtml(src: string): { html: string; math: { id: string; tex: string; display: boolean }[] } {
  const math: { id: string; tex: string; display: boolean }[] = [];
  let text = src;

  // 1) عزل معادلات display $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    const id = `__MATH_BLOCK_${math.length}__`;
    math.push({ id, tex: tex.trim(), display: true });
    return id;
  });
  // 2) عزل معادلات inline $...$
  text = text.replace(/\$([^$\n]+?)\$/g, (_m, tex) => {
    const id = `__MATH_INLINE_${math.length}__`;
    math.push({ id, tex: tex.trim(), display: false });
    return id;
  });

  // 3) كتل الكود ```...```
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
    const id = `__CODE_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="bz-pre"><code>${esc(code.replace(/\n$/, ""))}</code></pre>`);
    return id;
  });

  // 4) معالجة سطراً سطراً
  const lines = text.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function closeList() {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  }

  for (let raw of lines) {
    const line = raw.trimEnd();

    // كتلة كود نائبة
    if (/^__CODE_\d+__$/.test(line.trim())) {
      closeList();
      out.push(codeBlocks[parseInt(line.trim().match(/\d+/)![0])]);
      continue;
    }

    // عناوين
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      const sizes = ["", "bz-h1", "bz-h2", "bz-h3", "bz-h4"];
      out.push(`<div class="${sizes[lvl]}">${inlineFormat(h[2])}</div>`);
      continue;
    }

    // اقتباس
    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote class="bz-quote">${inlineFormat(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    // قائمة مرقّمة
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") { closeList(); out.push('<ol class="bz-ol">'); listType = "ol"; }
      out.push(`<li>${inlineFormat(ol[2])}</li>`);
      continue;
    }

    // قائمة نقطية
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") { closeList(); out.push('<ul class="bz-ul">'); listType = "ul"; }
      out.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    // فاصل
    if (/^---+$/.test(line.trim())) {
      closeList();
      out.push('<hr class="bz-hr" />');
      continue;
    }

    // سطر فارغ
    if (line.trim() === "") {
      closeList();
      out.push('<div class="bz-gap"></div>');
      continue;
    }

    // فقرة عادية
    closeList();
    out.push(`<p class="bz-p">${inlineFormat(line)}</p>`);
  }
  closeList();

  return { html: out.join(""), math };
}

export function MarwaMessage({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const { html, math } = markdownToHtml(text);
      el.innerHTML = html;

      if (math.length === 0) return;

      // استبدل علامات المعادلات النائبة بعد تحميل KaTeX
      loadKatex().then(() => {
        try {
          const katex = (window as any).katex;
          math.forEach((m) => {
            // ابحث عن النص النائب في كل العقد
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const nodes: Text[] = [];
            let n: Node | null;
            while ((n = walker.nextNode())) {
              if (n.nodeValue?.includes(m.id)) nodes.push(n as Text);
            }
            nodes.forEach((node) => {
              const parts = node.nodeValue!.split(m.id);
              if (parts.length < 2) return;
              const frag = document.createDocumentFragment();
              parts.forEach((part, i) => {
                if (part) frag.appendChild(document.createTextNode(part));
                if (i < parts.length - 1) {
                  const span = document.createElement("span");
                  span.className = m.display ? "bz-math-block" : "bz-math-inline";
                  try {
                    if (katex) {
                      katex.render(m.tex, span, {
                        displayMode: m.display,
                        throwOnError: false,
                        output: "html",
                      });
                    } else {
                      span.textContent = m.display ? `$$${m.tex}$$` : `$${m.tex}$`;
                    }
                  } catch {
                    span.textContent = m.tex;
                  }
                  frag.appendChild(span);
                }
              });
              node.parentNode?.replaceChild(frag, node);
            });
          });
        } catch {
          /* تجاهل أخطاء معالجة المعادلات */
        }
      }).catch(() => { /* تجاهل فشل تحميل KaTeX */ });
    } catch {
      // في حال فشل التحويل، اعرض النص الخام بأمان
      if (el) el.textContent = text;
    }
  }, [text]);

  return <div ref={ref} className="bz-marwa-content" dir="auto" />;
}
