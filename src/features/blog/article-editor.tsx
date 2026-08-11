"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold, faItalic, faUnderline, faStrikethrough, faHeading, faListUl, faListOl,
  faQuoteRight, faLink, faImage, faTable, faCode, faEraser, faRulerHorizontal,
  faAlignRight, faAlignCenter, faHighlighter, faRotateLeft, faRotateRight, faFileCode,
} from "@fortawesome/free-solid-svg-icons";

/* ════════════════════════════════════════════════════════════
   محرّر المقالات — مستقلّ تماماً عن محرّر الغرف

   ⚠️ **`room-notes.tsx` لا يُمسّ ولا يُستورَد منه شيء.** هو ملكُ ميزة
   الغرف، وأيّ استخراج مشترك منه يجعل تعديلاً في المدوّنة قادراً على
   كسر حصّة مباشرة. فهذا الملفّ مكتوب من جديد ويعيش في `features/blog`
   وحده. التشابه في الفكرة لا في الشيفرة — وهو ثمن مقبول مقابل عزلٍ
   تامّ بين ميزتين لا علاقة بينهما.

   ── لماذا `contentEditable` و`execCommand` ──
   `execCommand` مهجورة رسمياً لكنّها مدعومة في كل المتصفّحات ولا بديل
   لها بلا مكتبة. والبديل الحقيقي محرّر كامل (TipTap/Lexical) يزن
   ١٥٠–٣٠٠KB — ويُحمَّل في لوحة الإدارة وحدها، لكنّه تبعيّة جديدة
   وسطح صيانة كامل. المطلوب هنا محرّر مقالات لا محرّر تعاونيّ.

   ── الأمان ──
   المخرَج يُنقّى **على الخادم** قبل العرض (`sanitize.ts`)، فما يخرج من
   هنا ليس موضع ثقة نهائية بحال. واللصق يُنقّى هنا أيضاً لسبب مختلف:
   اللصق من Word يحمل أطناناً من `<span style="mso-...">` تُشوّه المقال
   وتُضخّم حجمه في قاعدة البيانات.
   ════════════════════════════════════════════════════════════ */

type Cmd = { icon: typeof faBold; title: string; run: () => void; active?: string };

export function ArticleEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(false);
  const [srcText, setSrcText] = useState("");

  /* الكتابة إلى `innerHTML` تُفقد موضع المؤشّر، فلا نكتب إلّا حين
     يختلف المحتوى فعلاً عمّا في الصندوق — أي عند التحميل الأوّل أو
     عند العودة من محرّر المصدر. */
  useEffect(() => {
    const el = box.current;
    if (!el || source) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value, source]);

  function emit() {
    const el = box.current;
    if (el) onChange(el.innerHTML);
  }

  function exec(command: string, arg?: string) {
    box.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }

  /** كتلة (عنوان/فقرة/اقتباس) */
  function block(tag: string) {
    exec("formatBlock", tag);
  }

  function addLink() {
    const url = window.prompt("رابط (https:// أو / للداخلي):", "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      window.alert("رابط غير مقبول. استعمل https:// أو مساراً داخلياً يبدأ بـ /");
      return;
    }
    exec("createLink", url);
  }

  function addImage() {
    const url = window.prompt("رابط الصورة (https://):", "https://");
    if (!url || !/^https?:\/\//i.test(url)) return;
    const alt = window.prompt("وصف الصورة (alt) — إلزاميّ للوصولية وللسيو:", "") || "";
    if (!alt.trim()) {
      window.alert("الوصف مطلوب: صورة بلا وصف لا يقرأها قارئ الشاشة ولا Google.");
      return;
    }
    /* أبعاد وتحميل كسول تُضاف هنا لا وقت العرض: بلا أبعاد تقفز الصفحة
       حين تصل الصورة (CLS). */
    exec(
      "insertHTML",
      `<figure><img src="${url}" alt="${alt.replace(/"/g, "&quot;")}" width="1200" height="675" loading="lazy" decoding="async" /><figcaption>${alt}</figcaption></figure>`,
    );
  }

  function addTable() {
    const cols = Number(window.prompt("عدد الأعمدة:", "3") || 0);
    const rows = Number(window.prompt("عدد الصفوف (بلا صفّ العناوين):", "3") || 0);
    if (cols < 1 || rows < 1 || cols > 8 || rows > 30) return;
    const head = `<tr>${Array.from({ length: cols }, (_, i) => `<th>عمود ${i + 1}</th>`).join("")}</tr>`;
    const body = Array.from({ length: rows }, () =>
      `<tr>${Array.from({ length: cols }, () => "<td>—</td>").join("")}</tr>`).join("");
    exec("insertHTML", `<table><thead>${head}</thead><tbody>${body}</tbody></table><p><br></p>`);
  }

  /* ── اللصق ──
     اللصق الافتراضي يُدخل HTML مصدره Word أو موقع آخر: `style`
     و`class` وخطوط وأحجام تكسر شكل المقال وتُضخّمه. نأخذ النصّ
     العادي ونحافظ على الأسطر — والتنسيق يُعاد بأزرار المحرّر. */
  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const html = text
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("");
    document.execCommand("insertHTML", false, html);
    emit();
  }

  const groups: Cmd[][] = [
    [
      { icon: faRotateLeft, title: "تراجع", run: () => exec("undo") },
      { icon: faRotateRight, title: "إعادة", run: () => exec("redo") },
    ],
    [
      { icon: faHeading, title: "عنوان رئيسي (H2)", run: () => block("h2") },
      { icon: faHeading, title: "عنوان فرعي (H3)", run: () => block("h3") },
      { icon: faAlignRight, title: "فقرة عادية", run: () => block("p") },
    ],
    [
      { icon: faBold, title: "عريض", run: () => exec("bold") },
      { icon: faItalic, title: "مائل", run: () => exec("italic") },
      { icon: faUnderline, title: "تحته خطّ", run: () => exec("underline") },
      { icon: faStrikethrough, title: "مشطوب", run: () => exec("strikeThrough") },
      { icon: faHighlighter, title: "تظليل", run: () => exec("insertHTML", `<mark>${window.getSelection()?.toString() || "نصّ"}</mark>`) },
    ],
    [
      { icon: faListUl, title: "قائمة نقطية", run: () => exec("insertUnorderedList") },
      { icon: faListOl, title: "قائمة مرقّمة", run: () => exec("insertOrderedList") },
      { icon: faQuoteRight, title: "اقتباس", run: () => block("blockquote") },
      { icon: faAlignCenter, title: "توسيط", run: () => exec("justifyCenter") },
    ],
    [
      { icon: faLink, title: "رابط", run: addLink },
      { icon: faImage, title: "صورة", run: addImage },
      { icon: faTable, title: "جدول", run: addTable },
      { icon: faCode, title: "كود", run: () => exec("insertHTML", `<pre><code>${window.getSelection()?.toString() || "code"}</code></pre>`) },
      { icon: faRulerHorizontal, title: "خطّ فاصل", run: () => exec("insertHTML", "<hr/>") },
    ],
    [
      { icon: faEraser, title: "إزالة التنسيق", run: () => exec("removeFormat") },
    ],
  ];

  return (
    <div className="rounded-xl border border-border bg-background">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        {groups.map((g, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-5 w-px bg-border" />}
            {g.map((c, i) => (
              <button
                key={i}
                type="button"
                title={c.title}
                aria-label={c.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={c.run}
                disabled={source}
                className="grid h-8 w-8 place-items-center rounded-md text-text-muted transition hover:bg-primary/10 hover:text-primary disabled:opacity-30"
              >
                <FontAwesomeIcon icon={c.icon} className={`h-3.5 w-3.5 ${c.title.includes("H3") ? "scale-75" : ""}`} />
              </button>
            ))}
          </div>
        ))}

        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={() => {
            if (!source) { setSrcText(box.current?.innerHTML ?? value); setSource(true); }
            else { onChange(srcText); setSource(false); }
          }}
          title="تحرير HTML"
          className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-extrabold transition ${
            source ? "bg-primary text-white" : "text-text-muted hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <FontAwesomeIcon icon={faFileCode} className="h-3.5 w-3.5" />
          HTML
        </button>
      </div>

      {source ? (
        <textarea
          value={srcText}
          onChange={(e) => setSrcText(e.target.value)}
          dir="ltr"
          spellCheck={false}
          className="h-[420px] w-full resize-y bg-transparent p-3 font-mono text-[12.5px] outline-none"
          aria-label="مصدر HTML"
        />
      ) : (
        <div
          ref={box}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          dir="auto"
          role="textbox"
          aria-multiline="true"
          aria-label="محتوى المقال"
          className="bz-article min-h-[420px] w-full p-4 outline-none"
        />
      )}
    </div>
  );
}
