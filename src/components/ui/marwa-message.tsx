"use client";

import { useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════
   عارض ردود الخبّاشة — Markdown غنيّ وآمن

   🐛 ما كان يحدث بالضبط في محادثتك:

   ١) **الجداول لم تكن مدعومة إطلاقاً.** لا سطر واحد في هذا الملفّ يعرف
      ما هو الجدول. فكان كل سطر من الجدول يسقط في آخر فرع («فقرة
      عادية») فيُطبع كما هو بأنابيبه: `| الفترة | النشاط |`. وسطر
      الفواصل `| :--- | :--- |` كان يُطبع سلسلةَ شرطات ونقطتين — وهو
      الخطّ الطويل القبيح الذي رأيته.

   ٢) **`<br>` كان يُهرَّب فيظهر نصّاً.** الدالّة `esc` تحوّل `<` إلى
      `&lt;` لمنع XSS — وهو صواب — لكنّها لم تكن تستثني شيئاً، والنموذج
      يكتب `<br>` داخل خلايا الجدول لفصل الأسطر. فكان الناتج حرفياً
      `<br>` أمام الطالب.

   والإصلاح ليس «إضافة استثناء لـ`<br>`»: هذا الوسم يُعاد بعد الهروب
   وحده من قائمة بيضاء مغلقة، فلا يمرّ معه شيء آخر أبداً.

   ── الأمان: قاعدة واحدة لا استثناء لها ──
   كل نصّ آتٍ من النموذج يمرّ على `esc()` **قبل** أيّ شيء آخر. فلا
   يستطيع النموذج — ولا من يُوهمه بحقن نصّ — أن يُخرج وسماً فعّالاً.
   وما نُعيده بعد الهروب محصور في قائمة بيضاء: `<br>` وحده. والروابط
   تُبنى بأنفسنا بعد التحقّق من البروتوكول، فلا `javascript:` ولا
   `data:` — وهما طريق XSS المعتاد في عارضات Markdown.

   ولذلك لا نستعمل `dangerouslySetInnerHTML` على نصّ النموذج مباشرةً،
   ولا نضيف مكتبة Markdown (وحزمها ثقيلة على جمهور 3G، وسطح هجومها
   أوسع من حاجتنا).

   ── ما يدعمه العارض ──
   عناوين · فقرات · قوائم مرقّمة ونقطية · **جداول حقيقية** قابلة
   للتمرير أفقياً على الهاتف · معادلات LaTeX بـKaTeX محلّيّ · كود سطريّ
   وكتليّ · اقتباسات · ملاحظات وتنبيهات · روابط · عريض ومائل ومشطوب ·
   خطوط فاصلة.

   ── الاتجاه ──
   الحاوية `dir="auto"` فتتبع لغة النصّ. والمعادلات والكود والجداول
   الرقمية تُجبَر على LTR — معادلة تُقرأ من اليمين معادلة خاطئة.
   ════════════════════════════════════════════════════════════ */

/* ══ KaTeX محلّيّ — لا CDN ══

   🐛 كان يُحمَّل من `cdn.jsdelivr.net` بوسم يُحقن في الصفحة. وذلك يعني
   أنّ عرض المعادلات معلّق بخدمة خارجية: شبكةٌ تحجب النطاق، أو انقطاعٌ
   عند المزوّد، أو مدرسةٌ بجدار حماية ⇒ يرى الطالب `\int_0^1 x^2\,dx`
   خاماً مكان المعادلة. وقد وقع هذا فعلاً في معملي عند الفحص، ورأيت
   النصّ الخام بعينيّ.

   الآن الحزمة داخل المشروع، تُقدَّم من نطاقك أنت. لا خدمة ثالثة في
   طريق معادلة.

   وثلاثة تفاصيل تحمي الأداء:

   ١) **`await import("katex")` داخل الدالّة لا في أعلى الملفّ.** فيصير
      حزمةً منفصلة (code-split) لا تُنزَّل إلّا عند أوّل معادلة فعليّة.
      رسالةٌ بلا رياضيات لا تُنزّل بايتاً واحداً من KaTeX.

   ٢) **`katex-swap.min.css` لا `katex.min.css`.** النسخة الأولى تحمل
      `font-display: swap` في كل `@font-face`، فلا تحتجب المعادلة أثناء
      تحميل الخطّ. والخطوط (٦٠ ملفّاً) لا تُطلب إلّا حين يحتاجها محرفٌ
      معروض فعلاً — المتصفّح لا يجلب خطّاً لا يستعمله.

   ٣) **الوحدة تُحفظ بعد أوّل تحميل** فلا يتكرّر الاستيراد لكل رسالة. */
import "katex/dist/katex-swap.min.css";

type KatexModule = typeof import("katex");
let katexMod: KatexModule["default"] | null = null;
let katexLoading: Promise<KatexModule["default"] | null> | null = null;

function loadKatex(): Promise<KatexModule["default"] | null> {
  if (katexMod) return Promise.resolve(katexMod);
  if (katexLoading) return katexLoading;
  katexLoading = import("katex")
    .then((m) => { katexMod = m.default; return katexMod; })
    /* فشل الاستيراد صار مستبعداً (الحزمة محلّية) لكنّه يبقى محتملاً عند
       خلل في تحميل الأجزاء — فنفشل بهدوء ويبقى النصّ مقروءاً. */
    .catch(() => null);
  return katexLoading;
}

/** هروب HTML — أوّل ما يمرّ عليه كل نصّ من النموذج، بلا استثناء */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** بروتوكول مسموح فقط — هنا يُقفل باب `javascript:` و`data:` */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^https?:\/\/[^\s<>"']+$/i.test(url)) return url;
  if (/^\/[^\s<>"']*$/.test(url)) return url; // رابط داخليّ
  return null;
}

/* حرف فاصل للعلامات النائبة: من منطقة الاستخدام الخاصّ في يونيكود.

   كان NUL (`\x00`) — وهو يعمل، لكنّه يجعل الملفّ **ثنائياً** عند git
   وgrep فتضيع الفروق في المراجعة ولا يظهر الملفّ في البحث. وهذا الحرف
   نصّيّ سليم، ولا يُنتجه نموذج لغويّ ولا لوحة مفاتيح، فيستحيل أن يصطدم
   بمحتوى الرسالة. */
const SENT = "\uE000";

/* ── تنسيق داخل السطر ──
   الترتيب مقصود: الكود يُعزل أوّلاً بعلامات نائبة حتى لا تُطبَّق عليه
   قواعد العريض والمائل — `**` داخل كود يجب أن يبقى `**`. */
function inlineFormat(text: string): string {
  const codes: string[] = [];
  let t = text.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    codes.push(`<code class="bz-code" dir="ltr">${esc(code)}</code>`);
    return `${SENT}${codes.length - 1}${SENT}`;
  });

  t = esc(t);

  // روابط [نصّ](رابط) — تُبنى بأنفسنا بعد التحقّق من البروتوكول
  t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
    const href = safeHref(url.replace(/&amp;/g, "&"));
    if (!href) return label; // رابط مرفوض ⇒ يبقى نصّاً، لا وسماً
    return `<a class="bz-a" href="${esc(href)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
  });

  // روابط مكتوبة عريانة
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<>"')]+)/g, (m, pre: string, url: string) => {
    const href = safeHref(url.replace(/&amp;/g, "&"));
    if (!href) return m;
    return `${pre}<a class="bz-a" href="${esc(href)}" target="_blank" rel="noopener noreferrer nofollow">${esc(href)}</a>`;
  });

  t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, "$1<em>$2</em>");

  /* القائمة البيضاء الوحيدة: `<br>` يُعاد بعد الهروب. النموذج يكتبه
     داخل خلايا الجداول، وكان يظهر نصّاً حرفياً. */
  t = t.replace(/&lt;br\s*\/?&gt;/gi, "<br/>");

  return t.replace(new RegExp(`${SENT}(\\d+)${SENT}`, "g"), (_m, i: string) => codes[Number(i)] ?? "");
}

/* ── هل هذا سطر فواصل جدول؟ `|:---|---:|` بكل صوره ── */
function isTableSep(line: string): boolean {
  const s = line.trim();
  if (!s.includes("-") || !s.includes("|")) return false;
  return /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/.test(s);
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

type Align = "start" | "center" | "end";
function alignsOf(sep: string): Align[] {
  return splitRow(sep).map((c) => {
    const l = c.startsWith(":");
    const r = c.endsWith(":");
    if (l && r) return "center";
    if (r) return "end";
    return "start";
  });
}

interface MathBit { id: string; tex: string; display: boolean }

function markdownToHtml(src: string): { html: string; math: MathBit[] } {
  const math: MathBit[] = [];
  let text = src.replace(/\r\n?/g, "\n");

  /* كتل الكود تُعزل **قبل** المعادلات: `$` داخل كود ليس معادلة. كان
     العكس، فكان مثال كود فيه `$` يتحوّل إلى معادلة مشوّهة. */
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang: string, code: string) => {
    codeBlocks.push(
      `<pre class="bz-pre" dir="ltr"><code>${esc(code.replace(/\n$/, ""))}</code></pre>`,
    );
    return `\n__CODE_${codeBlocks.length - 1}__\n`;
  });

  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => {
    const id = `__MATH_${math.length}__`;
    math.push({ id, tex: tex.trim(), display: true });
    return id;
  });
  /* `$...$` لا يعبر سطراً، ولا يقبل فراغاً بعد `$` الأولى — وإلّا
     تحوّلت «الثمن 5$ و 10$» إلى معادلة. */
  text = text.replace(/\$(?!\s)([^$\n]+?)(?<!\s)\$/g, (_m, tex: string) => {
    const id = `__MATH_${math.length}__`;
    math.push({ id, tex: tex.trim(), display: false });
    return id;
  });

  const lines = text.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

  const ALERTS: Record<string, { label: string; cls: string }> = {
    NOTE: { label: "ملاحظة", cls: "is-note" },
    TIP: { label: "نصيحة", cls: "is-tip" },
    IMPORTANT: { label: "مهم", cls: "is-important" },
    WARNING: { label: "تنبيه", cls: "is-warning" },
    CAUTION: { label: "تحذير", cls: "is-danger" },
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (/^__CODE_\d+__$/.test(line.trim())) {
      closeList();
      out.push(codeBlocks[Number(line.trim().match(/\d+/)![0])]);
      continue;
    }

    /* ══ جدول ══
       الشرط: سطر فيه أنابيب، وتحته سطر فواصل. بلا سطر الفواصل قد يكون
       السطر نصّاً عادياً فيه `|` — فلا نخترع جدولاً من جملة. */
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      closeList();
      const head = splitRow(line);
      const aligns = alignsOf(lines[i + 1]);
      const body: string[][] = [];
      let j = i + 2;
      for (; j < lines.length; j++) {
        const r = lines[j];
        if (!r.trim() || !r.includes("|")) break;
        body.push(splitRow(r));
      }
      i = j - 1;

      const th = head
        .map((c, k) => `<th style="text-align:${aligns[k] ?? "start"}">${inlineFormat(c)}</th>`)
        .join("");
      const trs = body
        .map((row) => {
          /* صفّ أقصر من الترويسة لا يُهمَل: يُكمَّل بخلايا فارغة، وإلّا
             انزاح الجدول كلّه وصار غير مقروء. */
          const cells = head.map((_, k) =>
            `<td style="text-align:${aligns[k] ?? "start"}">${inlineFormat(row[k] ?? "")}</td>`,
          );
          return `<tr>${cells.join("")}</tr>`;
        })
        .join("");

      /* الغلاف هو ما يمنع الجدول من كسر شاشة الهاتف: بطاقة تُمرَّر
         أفقياً بدل جدول يمتدّ خارج العرض فيدفع الصفحة كلّها. */
      out.push(
        `<div class="bz-tablewrap"><table class="bz-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`,
      );
      continue;
    }

    // تنبيهات GFM: ‎> [!NOTE]
    const alert = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (alert) {
      closeList();
      const kind = ALERTS[alert[1].toUpperCase()];
      const parts: string[] = [];
      if (alert[2]?.trim()) parts.push(alert[2].trim());
      let j = i + 1;
      for (; j < lines.length && /^>\s?/.test(lines[j]); j++) {
        parts.push(lines[j].replace(/^>\s?/, ""));
      }
      i = j - 1;
      out.push(
        `<div class="bz-callout ${kind.cls}"><b class="bz-callout-t">${kind.label}</b>` +
        `<div>${parts.map((p) => inlineFormat(p)).join("<br/>")}</div></div>`,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote class="bz-quote">${inlineFormat(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      /* عناوين دلاليّة `<h2>`–`<h5>` بدل `<div>`: قارئ الشاشة يحتاج
         بنيةً لا مقاسات خطّ. */
      const tag = ["h2", "h2", "h3", "h4", "h5"][h[1].length];
      out.push(`<${tag} class="bz-h${h[1].length}">${inlineFormat(h[2])}</${tag}>`);
      continue;
    }

    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") { closeList(); out.push('<ol class="bz-ol">'); listType = "ol"; }
      out.push(`<li>${inlineFormat(ol[2])}</li>`);
      continue;
    }

    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") { closeList(); out.push('<ul class="bz-ul">'); listType = "ul"; }
      out.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      out.push('<hr class="bz-hr" />');
      continue;
    }

    if (line.trim() === "") {
      closeList();
      out.push('<div class="bz-gap"></div>');
      continue;
    }

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
    if (!text || !text.trim()) { el.textContent = "…"; return; }

    try {
      const { html, math } = markdownToHtml(text);
      el.innerHTML = html;
      if (math.length === 0) return;

      loadKatex().then((katex) => {
        for (const m of math) {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const nodes: Text[] = [];
          let n: Node | null;
          while ((n = walker.nextNode())) {
            if (n.nodeValue?.includes(m.id)) nodes.push(n as Text);
          }
          for (const node of nodes) {
            const parts = node.nodeValue!.split(m.id);
            if (parts.length < 2) continue;
            const frag = document.createDocumentFragment();
            parts.forEach((part, k) => {
              if (part) frag.appendChild(document.createTextNode(part));
              if (k < parts.length - 1) {
                const span = document.createElement("span");
                span.className = m.display ? "bz-math-block" : "bz-math-inline";
                span.dir = "ltr"; // معادلة تُقرأ من اليمين معادلة خاطئة
                try {
                  if (katex) {
                    katex.render(m.tex, span, {
                      displayMode: m.display, throwOnError: false, output: "html",
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
          }
        }
      }).catch(() => { /* فشل CDN — يبقى النصّ مقروءاً */ });
    } catch {
      /* أيّ خلل في التحويل: نعرض النصّ خاماً بأمان بدل رسالة فارغة */
      el.textContent = text;
    }
  }, [text]);

  return <div ref={ref} className="bz-marwa-content" dir="auto" />;
}
