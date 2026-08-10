"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf, faNoteSticky, faBold, faItalic, faUnderline, faStrikethrough,
  faListUl, faListOl, faAlignRight, faAlignCenter, faAlignLeft, faAlignJustify,
  faQuoteRight, faMinus, faTable, faLink, faSquareRootVariable, faEye, faPen,
  faRotateLeft, faRotateRight, faEraser, faFileWord, faSpinner, faPalette,
  faHighlighter, faCircleInfo, faXmark, faIndent, faOutdent, faCheck,
  faPlus, faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { saveRoomNotes, listenRoomNotes } from "@/features/rooms/rooms";
import { useKatex } from "@/features/rooms/use-katex";

/* ════════════════════════════════════════════════════════════
   الملاحظات المشتركة — محرّر بأسلوب Word

   ما كان قبل هذا: مربّع نصّ Markdown، والأستاذ يكتب `**عريض**` ثمّ
   يبدّل إلى «معاينة» ليرى ما فعل. أي أنّه يكتب **شيفرة** لا مستنداً،
   ولا يرى ما يكتب وهو يكتبه، ولصق مستند Word فيه يُلقي نصّاً عارياً
   بلا عنوان ولا قائمة ولا جدول.

   الآن تحرير مباشر على المستند نفسه (WYSIWYG):
     • شريط أدوات كامل: عناوين، عريض/مائل/تسطير/شطب، لون وتظليل،
       محاذاة، قوائم، إزاحة، اقتباس، فاصل، جدول، رابط.
     • **لصق من Word** يحفظ التنسيق ويُنظّف فضلات Word (`mso-*`
       و`<o:p>` وأصناف Word) — بلا هذا التنظيف يجرّ اللصق أنماطاً
       تفسد المستند كلّه.
     • **رفع ملفّ .docx** يُفتح داخل المحرّر منسّقاً.
     • **معادلات**: تُدرَج كعنصر غير قابل للتحرير يعرض المعادلة
       مرسومة (KaTeX) ويحفظ أصلها في `data-tex` — فتبقى قابلة
       للتعديل وإعادة الرسم بلا أن يتحوّل النصّ إلى فوضى.
     • معاينة بشكل ورقة، وتصدير PDF كما كان.

   التوافق الخلفي: الملاحظات المحفوظة سابقاً نصّ Markdown. أي محتوى
   لا يبدأ بوسم HTML يُحوَّل عند القراءة — فلا تضيع ملاحظة قديمة.
   ════════════════════════════════════════════════════════════ */

const MAX_CHARS = 180_000;   // حدّ عمليّ: ما بعده يُثقل التزامن الحيّ

/* ── تحويل Markdown القديم إلى HTML ── */
function legacyToHtml(src: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<u>$1</u>")
      .replace(/==(.+?)==/g, "<mark>$1</mark>")
      .replace(/-&gt;/g, "→").replace(/=&gt;/g, "⇒").replace(/&lt;-/g, "←");

  let html = "";
  let inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };

  for (const line of src.split("\n")) {
    if (/^###\s+/.test(line)) { closeList(); html += `<h3>${inline(esc(line.replace(/^###\s+/, "")))}</h3>`; continue; }
    if (/^##\s+/.test(line)) { closeList(); html += `<h2>${inline(esc(line.replace(/^##\s+/, "")))}</h2>`; continue; }
    if (/^#\s+/.test(line)) { closeList(); html += `<h1>${inline(esc(line.replace(/^#\s+/, "")))}</h1>`; continue; }
    if (/^&gt;\s+|^>\s+/.test(line)) { closeList(); html += `<blockquote>${inline(esc(line.replace(/^>\s+/, "")))}</blockquote>`; continue; }
    if (/^---\s*$/.test(line)) { closeList(); html += "<hr/>"; continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(esc(line.replace(/^[-*]\s+/, "")))}</li>`;
      continue;
    }
    closeList();
    if (!line.trim()) { html += "<p><br></p>"; continue; }
    html += `<p>${inline(esc(line))}</p>`;
  }
  closeList();

  /* المعادلات القديمة `$…$` تتحوّل إلى عناصر معادلة حقيقية */
  html = html.replace(/\$\$([^$]+)\$\$/g, (_m, tex) => eqnHtml(String(tex).trim(), true));
  html = html.replace(/\$([^$\n]+)\$/g, (_m, tex) => eqnHtml(String(tex).trim(), false));
  return html || "<p><br></p>";
}

/** عنصر المعادلة كما يُخزَّن: الأصل في `data-tex`، والرسم يُبنى عند العرض */
function eqnHtml(tex: string, block: boolean) {
  const safe = tex.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<span class="bz-eqn${block ? " is-block" : ""}" data-tex="${safe}" contenteditable="false"></span>`;
}

/* ── تنظيف HTML ──
   أبيض القوائم لا أسودها: نسمح بما نعرفه ونحذف الباقي. اللصق من Word
   يجرّ `class="MsoNormal"` وأنماط `mso-*` وعناصر `<o:p>` وتعليقات
   شرطية — وكلّها تُفسد المستند لو بقيت. */
const ALLOWED = new Set([
  "P", "BR", "DIV", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL",
  "H1", "H2", "H3", "H4", "UL", "OL", "LI", "BLOCKQUOTE", "HR", "A", "MARK",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "SUB", "SUP", "CODE", "PRE", "IMG",
  "FONT",
]);
const KEEP_STYLE = /^(color|background-color|text-align|font-weight|font-style|text-decoration|font-size)$/;

function sanitize(root: HTMLElement): void {
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) walk(child);

    /* عنصر المعادلة يمرّ كما هو — هو من صناعتنا */
    if (el.classList?.contains("bz-eqn")) return;

    if (!ALLOWED.has(el.tagName)) {
      /* نستبدل العنصر بمحتواه بدل حذفه: حذف `<font>` مثلاً يمحو نصّاً */
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      return;
    }

    for (const attr of Array.from(el.attributes)) {
      const n = attr.name.toLowerCase();
      if (n === "href" && el.tagName === "A") {
        if (!/^(https?:|mailto:|#|\/)/i.test(attr.value)) el.removeAttribute("href");
        continue;
      }
      if (n === "src" && el.tagName === "IMG") {
        if (!/^(https?:|data:image\/)/i.test(attr.value)) el.removeAttribute("src");
        continue;
      }
      if (n === "colspan" || n === "rowspan" || n === "alt") continue;
      if (n === "style") {
        const keep: string[] = [];
        for (const part of attr.value.split(";")) {
          const [k, v] = part.split(":");
          if (!k || !v) continue;
          const key = k.trim().toLowerCase();
          if (KEEP_STYLE.test(key) && !/mso-|expression|url\(/i.test(v)) keep.push(`${key}:${v.trim()}`);
        }
        if (keep.length) el.setAttribute("style", keep.join(";"));
        else el.removeAttribute("style");
        continue;
      }
      el.removeAttribute(attr.name);
    }
  };
  for (const child of Array.from(root.children)) walk(child);
}

/** يحوّل HTML خارجيّاً (لصق أو docx) إلى HTML نظيف */
function cleanExternalHtml(html: string): string {
  const box = document.createElement("div");
  box.innerHTML = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "")
    .replace(/<\/?xml[^>]*>/gi, "")
    .replace(/<(style|script|meta|link)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(style|meta|link)[^>]*>/gi, "");
  sanitize(box);
  /* فراغات Word: أسطر فارغة كثيرة تُفسد إيقاع المستند */
  box.querySelectorAll("p").forEach((p) => {
    if (!p.textContent?.trim() && !p.querySelector("img,.bz-eqn")) p.innerHTML = "<br>";
  });
  return box.innerHTML;
}

/* ── رسم المعادلات داخل عنصر ── */
function renderEqns(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll<HTMLElement>(".bz-eqn").forEach((el) => {
    const tex = el.getAttribute("data-tex") ?? "";
    /* بلا KaTeX (شبكة مقطوعة أو CDN محجوب) نعرض الصيغة الخام لا فراغاً:
       فراغٌ في وسط الجملة يجعل الملاحظة تبدو ناقصة، والصيغة الخام على
       الأقلّ تُقرأ ويفهمها طالب الرياضيات. */
    if (!window.katex) {
      if (!el.textContent) { el.textContent = tex; el.classList.add("is-raw"); }
      return;
    }
    try {
      el.classList.remove("is-raw");
      window.katex.render(tex, el, {
        throwOnError: false,
        displayMode: el.classList.contains("is-block"),
        output: "html",
      });
    } catch {
      el.textContent = tex;
      el.classList.add("is-raw");
    }
  });
}

/** ينزع الرسم ويُبقي `data-tex` — فيُخزَّن المستند صغيراً ويُعاد رسمه */
function serialize(root: HTMLElement): string {
  const copy = root.cloneNode(true) as HTMLElement;
  copy.querySelectorAll<HTMLElement>(".bz-eqn").forEach((el) => { el.innerHTML = ""; });
  return copy.innerHTML;
}

/* ── رموز جاهزة في نافذة المعادلة ── */
const SYMS: { l: string; t: string }[] = [
  { l: "x²", t: "^{2}" }, { l: "xⁿ", t: "^{n}" }, { l: "x₁", t: "_{1}" },
  { l: "√", t: "\\sqrt{}" }, { l: "a/b", t: "\\frac{a}{b}" },
  { l: "∑", t: "\\sum_{i=1}^{n}" }, { l: "∫", t: "\\int_{a}^{b}" },
  { l: "lim", t: "\\lim_{x \\to 0}" }, { l: "≤", t: "\\leq" }, { l: "≥", t: "\\geq" },
  { l: "≠", t: "\\neq" }, { l: "±", t: "\\pm" }, { l: "×", t: "\\times" },
  { l: "π", t: "\\pi" }, { l: "θ", t: "\\theta" }, { l: "Δ", t: "\\Delta" },
  { l: "λ", t: "\\lambda" }, { l: "μ", t: "\\mu" }, { l: "Ω", t: "\\Omega" },
  { l: "→", t: "\\rightarrow" }, { l: "∞", t: "\\infty" }, { l: "∂", t: "\\partial" },
  { l: "°", t: "^{\\circ}" }, { l: "⃗v", t: "\\vec{v}" },
];

const TEXT_COLORS = ["#131722", "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];
const MARK_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

export function RoomNotes({
  roomId, isOwner, roomName, canEdit,
}: {
  roomId: string;
  isOwner: boolean;
  roomName: string;
  /** الأستاذ أو مشرف الغرفة — مَن يملك حقّ الكتابة */
  canEdit?: boolean;
}) {
  const editable = canEdit ?? isOwner;
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [preview, setPreview] = useState(!editable);
  const [eqnOpen, setEqnOpen] = useState<null | { tex: string; block: boolean; el?: HTMLElement }>(null);
  const [docxBusy, setDocxBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tooBig, setTooBig] = useState(false);

  const edRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typing = useRef(false);
  const savedRange = useRef<Range | null>(null);
  const katexReady = useKatex();

  /* ── المزامنة الحيّة ── */
  useEffect(() => {
    const unsub = listenRoomNotes(roomId, (raw) => {
      if (typing.current) return;   // لا نقطع من يكتب الآن
      const next = !raw ? "" : /^\s*</.test(raw) ? raw : legacyToHtml(raw);
      setHtml(next);
      if (edRef.current && edRef.current.innerHTML !== next) edRef.current.innerHTML = next || "<p><br></p>";
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);

  /* أوّل تركيب: نضع المحتوى في سطح التحرير مرّة واحدة */
  useEffect(() => {
    if (edRef.current && !edRef.current.innerHTML) edRef.current.innerHTML = html || "<p><br></p>";
  }, [html]);

  /* الرسم يُستدعى دائماً لا عند جهوز KaTeX فقط: الدالّة نفسها تتولّى
     حالة عدم توفّره (تعرض الصيغة الخام)، ولو انتظرناها بقيت المعادلة
     فراغاً أبيض على شبكة لا تصل إلى CDN. */
  useEffect(() => { renderEqns(edRef.current); }, [katexReady, html, preview]);
  useEffect(() => { if (preview) renderEqns(viewRef.current); }, [katexReady, preview, html]);

  const push = useCallback((next: string) => {
    setHtml(next);
    setTooBig(next.length > MAX_CHARS);
    typing.current = true;
    setSaving("saving");
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      await saveRoomNotes(roomId, next.slice(0, MAX_CHARS));
      setSaving("saved");
      typing.current = false;
    }, 800);
  }, [roomId]);

  const sync = useCallback(() => {
    if (!edRef.current) return;
    push(serialize(edRef.current));
  }, [push]);

  /* ── أوامر التنسيق ──
     `execCommand` مهجور رسمياً لكنّه **الطريق الوحيد** الذي يعمل في
     كل المتصفّحات على `contentEditable` بلا مكتبة محرّر كاملة، ويحفظ
     تاريخ التراجع الأصلي للمتصفّح. بديله كتابة محرّك تحرير من الصفر. */
  function cmd(name: string, value?: string) {
    edRef.current?.focus();
    try { document.execCommand(name, false, value); } catch { /* غير مدعوم */ }
    sync();
  }

  function block(tag: string) { cmd("formatBlock", tag); }

  function rememberRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && edRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function insertNode(node: Node) {
    const ed = edRef.current;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    let range = savedRange.current;
    if (!range && sel && sel.rangeCount && ed.contains(sel.anchorNode)) range = sel.getRangeAt(0);
    if (!range) {
      ed.appendChild(node);
    } else {
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    savedRange.current = null;
    sync();
  }

  /* ── اتجاه النصّ ──
     المستند عربي، لكنّ الملاحظة قد تحمل فقرة معادلات أو مصطلحات
     لاتينية تُقرأ من اليسار. `execCommand` لا يملك أمراً للاتجاه،
     فنضبطه على **الكتلة الحالية** مباشرةً: نجد أقرب كتلة للمؤشّر
     ونضع عليها `dir` والمحاذاة المناسبة. */
  function setDir(dir: "rtl" | "ltr") {
    const ed = edRef.current;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const blocks = new Set<HTMLElement>();
    const range = sel.getRangeAt(0);

    const blockOf = (n: Node | null): HTMLElement | null => {
      let cur: Node | null = n;
      while (cur && cur !== ed) {
        if (cur.nodeType === 1) {
          const el = cur as HTMLElement;
          if (/^(P|H1|H2|H3|H4|LI|BLOCKQUOTE|DIV|TD|TH|PRE)$/.test(el.tagName)) return el;
        }
        cur = cur.parentNode;
      }
      return null;
    };

    /* التحديد قد يمتدّ على عدّة فقرات — نضبطها كلّها */
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_ELEMENT);
    let node: Node | null = walker.currentNode;
    while (node) {
      const el = node as HTMLElement;
      if (el !== ed && range.intersectsNode(el)) {
        const b = blockOf(el);
        if (b) blocks.add(b);
      }
      node = walker.nextNode();
    }
    const anchorBlock = blockOf(sel.anchorNode);
    if (anchorBlock) blocks.add(anchorBlock);

    if (!blocks.size) {
      /* لا كتلة بعد؟ نُغلّف المحتوى في فقرة أوّلاً */
      document.execCommand("formatBlock", false, "P");
      const b = blockOf(window.getSelection()?.anchorNode ?? null);
      if (b) blocks.add(b);
    }

    for (const b of blocks) {
      b.setAttribute("dir", dir);
      b.style.textAlign = dir === "rtl" ? "right" : "left";
    }
    sync();
  }

  /* ── الجداول ──
     كان جدولاً واحداً ٣×٣ ثابتاً. الأستاذ يحتاج جدول معاملات بسطرين،
     أو جدول مقارنة بخمسة أعمدة — فصار المقاس بالاختيار، ومعه إضافة
     صفّ/عمود وحذفهما داخل الجدول القائم. */
  function insertTable(rows: number, cols: number, header: boolean) {
    const t = document.createElement("table");
    const tb = document.createElement("tbody");
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(header && r === 0 ? "th" : "td");
        cell.innerHTML = "<br>";
        tr.appendChild(cell);
      }
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    insertNode(t);
    /* فقرة فارغة بعد الجدول: بلا هذا لا يستطيع الأستاذ الكتابة تحته */
    const after = document.createElement("p");
    after.innerHTML = "<br>";
    t.parentNode?.insertBefore(after, t.nextSibling);
    sync();
  }

  /** الخليّة التي فيها المؤشّر الآن — أساس كل عمليات الجدول */
  function currentCell(): HTMLTableCellElement | null {
    const sel = window.getSelection();
    let n: Node | null = sel?.anchorNode ?? null;
    while (n && n !== edRef.current) {
      if (n.nodeType === 1 && /^(TD|TH)$/.test((n as HTMLElement).tagName)) return n as HTMLTableCellElement;
      n = n.parentNode;
    }
    return null;
  }

  function tableOp(op: "row+" | "row-" | "col+" | "col-" | "del") {
    const cell = currentCell();
    if (!cell) { alert("ضع المؤشّر داخل خليّة في الجدول أوّلاً."); return; }
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table");
    if (!row || !table) return;
    const idx = Array.from(row.cells).indexOf(cell);

    if (op === "del") { table.remove(); sync(); return; }

    if (op === "row+") {
      const tr = row.cloneNode(false) as HTMLTableRowElement;
      for (let i = 0; i < row.cells.length; i++) {
        const c = document.createElement("td");
        c.innerHTML = "<br>";
        tr.appendChild(c);
      }
      row.parentNode?.insertBefore(tr, row.nextSibling);
    }
    if (op === "row-") {
      if (table.rows.length <= 1) { table.remove(); sync(); return; }
      row.remove();
    }
    if (op === "col+") {
      for (const r of Array.from(table.rows)) {
        const proto = r.cells[idx];
        const c = document.createElement(proto?.tagName === "TH" ? "th" : "td");
        c.innerHTML = "<br>";
        r.insertBefore(c, proto?.nextSibling ?? null);
      }
    }
    if (op === "col-") {
      if ((table.rows[0]?.cells.length ?? 0) <= 1) { table.remove(); sync(); return; }
      for (const r of Array.from(table.rows)) r.cells[idx]?.remove();
    }
    sync();
  }

  function insertLink() {
    const url = prompt("رابط:");
    if (!url) return;
    cmd("createLink", url);
  }

  /* ── المعادلات ── */
  function openEqn(block_: boolean) {
    rememberRange();
    setEqnOpen({ tex: "", block: block_ });
  }

  function commitEqn(tex: string, block_: boolean, target?: HTMLElement) {
    const clean = tex.trim();
    if (!clean) { setEqnOpen(null); return; }
    if (target) {
      target.setAttribute("data-tex", clean);
      target.classList.toggle("is-block", block_);
      renderEqns(edRef.current);
      sync();
    } else {
      const box = document.createElement("div");
      box.innerHTML = eqnHtml(clean, block_);
      const node = box.firstChild as HTMLElement;
      insertNode(node);
      /* مسافة بعد المعادلة: بلا هذا يعلق المؤشّر داخل عنصر غير قابل
         للتحرير فلا يستطيع الأستاذ الكتابة بعدها. */
      const sp = document.createTextNode(" ");
      node.parentNode?.insertBefore(sp, node.nextSibling);
      renderEqns(edRef.current);
      sync();
    }
    setEqnOpen(null);
  }

  /* نقر معادلة قائمة يفتحها للتعديل */
  function onEditorClick(e: React.MouseEvent) {
    if (!editable) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>(".bz-eqn");
    if (!el) return;
    e.preventDefault();
    setEqnOpen({ tex: el.getAttribute("data-tex") ?? "", block: el.classList.contains("is-block"), el });
  }

  /* ── اللصق ── */
  function onPaste(e: React.ClipboardEvent) {
    if (!editable) return;
    const dt = e.clipboardData;
    const rich = dt.getData("text/html");
    const plain = dt.getData("text/plain");

    /* لصق معادلة كاملة: نصّ يبدأ وينتهي بـ`$` أو `$$` يُدرَج معادلةً
       مرسومة مباشرةً — وهو ما يفعله من ينسخ معادلة من مصدر آخر. */
    const t = plain.trim();
    const m = /^\$\$([\s\S]+)\$\$$/.exec(t) || /^\$([^$]+)\$$/.exec(t) || /^\\\[([\s\S]+)\\\]$/.exec(t);
    if (m) {
      e.preventDefault();
      commitEqn(m[1].trim(), t.startsWith("$$") || t.startsWith("\\["));
      return;
    }

    if (rich) {
      e.preventDefault();
      const cleaned = cleanExternalHtml(rich);
      document.execCommand("insertHTML", false, cleaned);
      renderEqns(edRef.current);
      sync();
      return;
    }
    /* نصّ عادي: نتركه للمتصفّح لكن نُزامن بعده */
    setTimeout(sync, 0);
  }

  /* ── رفع .docx ── */
  async function onDocx(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setDocxBusy(true);
    try {
      const mammoth = await loadMammoth();
      if (!mammoth) { alert("تعذّر تحميل قارئ Word. تحقّق من الاتصال."); return; }
      const buf = await f.arrayBuffer();
      const out = await mammoth.convertToHtml({ arrayBuffer: buf });
      const cleaned = cleanExternalHtml(out.value || "");
      if (!cleaned.trim()) { alert("الملفّ فارغ أو غير مقروء."); return; }
      const ed = edRef.current;
      if (ed) {
        const keep = ed.innerHTML.replace(/<p><br><\/p>/g, "").trim();
        ed.innerHTML = keep ? `${ed.innerHTML}<hr/>${cleaned}` : cleaned;
        renderEqns(ed);
        sync();
      }
    } catch {
      alert("تعذّرت قراءة الملفّ. تأكّد أنّه بصيغة .docx (لا .doc القديمة).");
    } finally {
      setDocxBusy(false);
    }
  }

  /* ── تصدير PDF ── */
  function exportPDF() {
    const win = window.open("", "_blank");
    if (!win) return;
    const body = html;
    const dateStr = new Date().toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>ملاحظات — ${roomName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\/script>
<style>
*{box-sizing:border-box}
body{font-family:'Tajawal','Segoe UI',Arial,sans-serif;direction:rtl;padding:46px 54px;max-width:850px;margin:0 auto;color:#131722;line-height:1.9}
.head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:14px}
.head h1{color:#2563eb;font-size:1.5rem;margin:0}
.brand{font-weight:800;color:#2563eb;font-size:1.05rem}
.meta{color:#64748b;font-size:.82rem;margin:8px 0 26px}
h1,h2,h3,h4{color:#1e3a8a;margin:1.15em 0 .45em;line-height:1.4}
h1{font-size:1.45rem;border-bottom:2px solid #dbeafe;padding-bottom:6px}
h2{font-size:1.22rem}h3{font-size:1.06rem}h4{font-size:1rem}
p{margin:.5em 0}ul,ol{margin:.5em 1.6em}li{margin:.28em 0}
blockquote{border-inline-start:4px solid #2563eb;background:#f0f7ff;margin:.8em 0;padding:.6em 1em;border-radius:8px}
mark{background:#fef08a;padding:0 3px;border-radius:3px}
hr{border:none;border-top:2px dashed #cbd5e1;margin:1.4em 0}
u{text-decoration-color:#2563eb;text-decoration-thickness:2px}
table{border-collapse:collapse;width:100%;margin:.9em 0}
th,td{border:1px solid #cbd5e1;padding:7px 10px;text-align:right}
th{background:#f1f5f9;font-weight:800}
img{max-width:100%;height:auto;border-radius:8px}
.bz-eqn.is-block{display:block;text-align:center;margin:.8em 0}
.foot{margin-top:36px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:center;color:#94a3b8;font-size:.72rem}
@media print{body{padding:22px}}
</style></head><body>
<div class="head"><h1>ملاحظات الدرس</h1><span class="brand">BacZone</span></div>
<div class="meta">${roomName} · ${dateStr}</div>
<div class="bz-doc">${body}</div>
<div class="foot">تمّ إنشاؤه عبر منصّة BacZone</div>
<script>window.onload=function(){
document.querySelectorAll('.bz-eqn').forEach(function(el){
  try{ katex.render(el.getAttribute('data-tex')||'', el, {throwOnError:false, displayMode: el.classList.contains('is-block')}); }catch(e){ el.textContent=el.getAttribute('data-tex')||''; }
});
setTimeout(function(){window.print();},450);};<\/script>
</body></html>`);
    win.document.close();
  }

  const empty = !html || html === "<p><br></p>";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* ── الترويسة ── */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-surface px-3 py-2">
        <FontAwesomeIcon icon={faNoteSticky} className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-[13.5px] font-extrabold text-text-primary">ملاحظات مشتركة</span>
        {editable && saving === "saving" && <span className="text-[11px] font-bold text-text-muted">جارٍ الحفظ…</span>}
        {editable && saving === "saved" && <span className="text-[11px] font-bold text-secondary">محفوظ ✓</span>}

        <span className="ms-auto flex items-center gap-1">
          <HBtn icon={faCircleInfo} label="كيف أستعمل المحرّر" onClick={() => setHelpOpen(true)} />
          {editable && (
            <button onClick={() => setPreview((p) => !p)}
              className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-extrabold text-primary transition hover:bg-primary/10">
              <FontAwesomeIcon icon={preview ? faPen : faEye} className="h-3.5 w-3.5" />
              {preview ? "تحرير" : "معاينة"}
            </button>
          )}
          {!empty && (
            <button onClick={exportPDF}
              className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-extrabold text-red-500 transition hover:bg-red-500/10">
              <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> PDF
            </button>
          )}
        </span>
      </div>

      {/* ── شريط الأدوات ──
          رفّ أفقي منزلق على الهاتف بدل أن ينكسر إلى أربعة صفوف */}
      {editable && !preview && (
        <div className="bz-wtb">
          <TBtn icon={faRotateRight} t="تراجع" on={() => cmd("undo")} />
          <TBtn icon={faRotateLeft} t="إعادة" on={() => cmd("redo")} />
          <Sep />
          <select
            aria-label="نمط النصّ"
            className="bz-wsel"
            onChange={(e) => { block(e.target.value); e.currentTarget.selectedIndex = 0; }}
            defaultValue=""
          >
            <option value="" disabled>النمط</option>
            <option value="P">نصّ عادي</option>
            <option value="H1">عنوان ١</option>
            <option value="H2">عنوان ٢</option>
            <option value="H3">عنوان ٣</option>
            <option value="H4">عنوان ٤</option>
            <option value="PRE">شيفرة</option>
          </select>
          <Sep />
          <TBtn icon={faBold} t="عريض" on={() => cmd("bold")} />
          <TBtn icon={faItalic} t="مائل" on={() => cmd("italic")} />
          <TBtn icon={faUnderline} t="تسطير" on={() => cmd("underline")} />
          <TBtn icon={faStrikethrough} t="شطب" on={() => cmd("strikeThrough")} />
          <Sep />
          <Swatches icon={faPalette} title="لون النصّ" colors={TEXT_COLORS} onPick={(c) => cmd("foreColor", c)} />
          <Swatches icon={faHighlighter} title="تظليل" colors={MARK_COLORS} onPick={(c) => cmd("hiliteColor", c)} />
          <Sep />
          <TBtn icon={faListUl} t="قائمة نقطية" on={() => cmd("insertUnorderedList")} />
          <TBtn icon={faListOl} t="قائمة مرقّمة" on={() => cmd("insertOrderedList")} />
          <TBtn icon={faIndent} t="زيادة الإزاحة" on={() => cmd("indent")} />
          <TBtn icon={faOutdent} t="تقليل الإزاحة" on={() => cmd("outdent")} />
          <Sep />
          <TBtn icon={faAlignRight} t="لليمين" on={() => cmd("justifyRight")} />
          <TBtn icon={faAlignCenter} t="توسيط" on={() => cmd("justifyCenter")} />
          <TBtn icon={faAlignLeft} t="لليسار" on={() => cmd("justifyLeft")} />
          <TBtn icon={faAlignJustify} t="ضبط" on={() => cmd("justifyFull")} />
          <Sep />
          <Sep />
          {/* اتجاه النصّ — المستند عربي، والفقرة اللاتينية تحتاج LTR */}
          <TBtn label="ع" t="اتجاه عربي (يمين ← يسار)" on={() => setDir("rtl")} />
          <TBtn label="A" t="اتجاه لاتيني (يسار → يمين)" on={() => setDir("ltr")} />
          <Sep />
          <TBtn icon={faQuoteRight} t="اقتباس" on={() => block("BLOCKQUOTE")} />
          <TBtn icon={faMinus} t="خطّ فاصل" on={() => cmd("insertHorizontalRule")} />
          <TablePicker onInsert={insertTable} onOp={tableOp} onOpen={rememberRange} />
          <TBtn icon={faLink} t="رابط" on={insertLink} />
          <Sep />
          <TBtn icon={faSquareRootVariable} t="معادلة داخل السطر" on={() => openEqn(false)} />
          <TBtn label="∑" t="معادلة في سطر مستقلّ" on={() => openEqn(true)} />
          <Sep />
          <TBtn
            icon={docxBusy ? faSpinner : faFileWord}
            t="رفع ملفّ Word (.docx)"
            spin={docxBusy}
            on={() => fileRef.current?.click()}
          />
          <TBtn icon={faEraser} t="إزالة التنسيق" on={() => cmd("removeFormat")} />
          <input ref={fileRef} type="file" accept=".docx" hidden onChange={onDocx} />
        </div>
      )}

      {tooBig && (
        <p className="border-b border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11.5px] font-bold text-amber-700">
          المستند طويل جداً — سيُحفظ أوّل {MAX_CHARS.toLocaleString("ar-DZ")} حرف فقط. جزّئه على غرفتين أو صدّره PDF.
        </p>
      )}

      {/* ── سطح المستند ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {editable && !preview ? (
          <div
            ref={edRef}
            className="bz-doc bz-sheet"
            contentEditable
            suppressContentEditableWarning
            dir="auto"
            role="textbox"
            aria-multiline="true"
            aria-label="محرّر الملاحظات"
            onInput={sync}
            onBlur={sync}
            onPaste={onPaste}
            onClick={onEditorClick}
          />
        ) : empty ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <FontAwesomeIcon icon={faNoteSticky} className="h-10 w-10 text-amber-400 opacity-25" />
              <p className="mt-3 text-[13.5px] font-bold text-text-muted">
                {editable ? "ابدأ الكتابة، أو ارفع ملفّ Word." : "سيكتب الأستاذ ملاحظات الدرس هنا…"}
              </p>
            </div>
          </div>
        ) : (
          <div ref={viewRef} className="bz-doc bz-sheet is-read" dir="auto"
            dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>

      {/* ── نافذة المعادلة ── */}
      {eqnOpen && (
        <EqnDialog
          init={eqnOpen}
          katexReady={katexReady}
          onClose={() => setEqnOpen(null)}
          onSave={(tex, blk) => commitEqn(tex, blk, eqnOpen.el)}
        />
      )}

      {/* ── التعليمات ── */}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} editable={editable} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   نافذة المعادلة — كتابة ومعاينة فوريّة
   ════════════════════════════════════════════════════════════ */
function EqnDialog({
  init, katexReady, onClose, onSave,
}: {
  init: { tex: string; block: boolean };
  katexReady: boolean;
  onClose: () => void;
  onSave: (tex: string, block: boolean) => void;
}) {
  const [tex, setTex] = useState(init.tex);
  const [blk, setBlk] = useState(init.block);
  const prev = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inp.current?.focus(); }, []);

  useEffect(() => {
    if (!prev.current) return;
    if (!window.katex) {
      /* المعاينة لا تبقى فارغة لو تعذّر تحميل KaTeX */
      prev.current.textContent = tex || "…";
      return;
    }
    try {
      window.katex.render(tex || "\\ ", prev.current, { throwOnError: false, displayMode: blk });
    } catch {
      prev.current.textContent = "صيغة غير صحيحة";
    }
  }, [tex, blk, katexReady]);

  function put(t: string) {
    const el = inp.current;
    if (!el) { setTex((v) => v + t); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const next = tex.slice(0, s) + t + tex.slice(e);
    setTex(next);
    /* المؤشّر داخل أوّل `{}` فارغة إن وُجدت — فيكتب الأستاذ فوراً */
    const rel = t.indexOf("{}");
    const at = rel >= 0 ? s + rel + 1 : s + t.length;
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(at, at); });
  }

  return (
    <div className="bz-eqd-back" onClick={onClose} role="dialog" aria-modal="true" aria-label="إدراج معادلة">
      <div className="bz-eqd" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <FontAwesomeIcon icon={faSquareRootVariable} className="h-4 w-4 text-primary" />
          <span className="text-[13.5px] font-extrabold">معادلة</span>
          <button onClick={() => setBlk((b) => !b)}
            className={`ms-auto rounded-lg px-2.5 py-1.5 text-[11.5px] font-extrabold transition ${
              blk ? "bg-primary/12 text-primary" : "text-text-muted hover:bg-primary/8"
            }`}>
            {blk ? "سطر مستقلّ" : "داخل السطر"}
          </button>
          <button onClick={onClose} aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3.5">
          <div ref={prev} className="bz-eqd-prev" dir="ltr" />

          <textarea
            ref={inp}
            value={tex}
            onChange={(e) => setTex(e.target.value)}
            dir="ltr"
            rows={2}
            placeholder="x^{2} + \frac{1}{2} = \sqrt{y}"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-surface p-3 font-mono text-[15px] outline-none focus:border-primary"
          />

          <div className="bz-eqd-syms">
            {SYMS.map((s) => (
              <button key={s.t} onClick={() => put(s.t)} title={s.t} type="button">{s.l}</button>
            ))}
          </div>

          <p className="mt-2.5 text-[11.5px] leading-relaxed text-text-muted">
            الصيغة LaTeX. مثال: <code className="font-mono">x^{"{2}"}</code> للأسّ،
            و<code className="font-mono">a_{"{1}"}</code> للدليل،
            و<code className="font-mono">\frac{"{a}{b}"}</code> للكسر.
          </p>

          <div className="mt-3 flex gap-2">
            <button onClick={() => onSave(tex, blk)} disabled={!tex.trim()}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 text-[13.5px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-50">
              <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> إدراج
            </button>
            <button onClick={onClose}
              className="min-h-11 rounded-xl border border-border px-4 text-[13px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   التعليمات — ما يستطيع الأستاذ فعله فعلاً
   ════════════════════════════════════════════════════════════ */
function HelpDialog({ onClose, editable }: { onClose: () => void; editable: boolean }) {
  return (
    <div className="bz-eqd-back" onClick={onClose} role="dialog" aria-modal="true" aria-label="تعليمات">
      <div className="bz-eqd" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-primary" />
          <span className="text-[13.5px] font-extrabold">كيف تستعمل الملاحظات</span>
          <button onClick={onClose} aria-label="إغلاق"
            className="ms-auto grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-3.5 text-[13px] leading-[1.9] text-text-primary">
          {editable ? (
            <>
              <Help t="اكتب كما تكتب في Word">
                التنسيق مباشر: تختار النصّ وتضغط زرّ التنسيق فيتغيّر أمامك. لا رموز
                ولا أكواد.
              </Help>
              <Help t="انسخ من Word والصق هنا">
                افتح مستندك في Word، انسخ ما تريد (Ctrl+C)، والصقه هنا (Ctrl+V) — تبقى
                العناوين والقوائم والجداول والعريض كما هي.
              </Help>
              <Help t="أو ارفع ملفّ .docx كاملاً">
                زرّ <b>Word</b> في شريط الأدوات يفتح الملفّ داخل المحرّر مباشرةً.
                الصيغة المدعومة <code className="font-mono">.docx</code> (لا
                <code className="font-mono"> .doc</code> القديمة). المعادلات المرسومة
                بمحرّر معادلات Word لا تُنقل — أدرجها هنا بزرّ المعادلة.
              </Help>
              <Help t="المعادلات الرياضية والفيزيائية">
                زرّ <b>√</b> يُدرج معادلة داخل السطر، وزرّ <b>∑</b> يُدرجها في سطر
                مستقلّ. تكتبها بصيغة LaTeX وترى نتيجتها فوراً قبل الإدراج، وتضغط عليها
                لاحقاً لتعديلها. ويمكنك أيضاً <b>لصق معادلة جاهزة</b> بصيغة
                <code className="font-mono"> $…$ </code> أو
                <code className="font-mono"> $$…$$ </code> فتتحوّل تلقائياً.
              </Help>
              <Help t="الحفظ والمشاركة">
                الحفظ تلقائي، والطلبة يرون التعديل لحظةً بلحظة. وزرّ <b>PDF</b> يُخرج
                المستند بترويسة المنصّة جاهزاً للطباعة أو للمشاركة.
              </Help>
            </>
          ) : (
            <>
              <Help t="هذه ملاحظات الدرس">
                يكتبها الأستاذ أو مشرف الغرفة، وتتحدّث أمامك لحظةً بلحظة بلا أن تُحدّث
                الصفحة.
              </Help>
              <Help t="خُذها معك">
                زرّ <b>PDF</b> يُخرج الملاحظات كاملة بترويسة المنصّة — راجعها بعد
                الحصّة أو اطبعها.
              </Help>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Help({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[13px] font-extrabold text-primary">{t}</p>
      <p className="mt-1 text-[12.5px] leading-[1.85] text-text-muted">{children}</p>
    </div>
  );
}

/* ── أزرار الشريط ── */
function TBtn({
  icon, label, t, on, spin,
}: {
  icon?: typeof faBold;
  label?: string;
  t: string;
  on: () => void;
  spin?: boolean;
}) {
  return (
    <button type="button" title={t} aria-label={t}
      /* `onMouseDown` مع `preventDefault`: النقر بـ`onClick` يُفقد
         التحديد داخل سطح التحرير قبل تنفيذ الأمر، فلا يُطبَّق التنسيق
         على ما اخترته. */
      onMouseDown={(e) => { e.preventDefault(); on(); }}
      className="bz-wbtn">
      {icon ? <FontAwesomeIcon icon={icon} className={`h-[15px] w-[15px] ${spin ? "animate-spin" : ""}`} /> : <span>{label}</span>}
    </button>
  );
}

function HBtn({ icon, label, onClick }: { icon: typeof faBold; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary">
      <FontAwesomeIcon icon={icon} className="h-4 w-4" />
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   طبقة القوائم المنسدلة — `Pop`

   🐛 **زرّ الجدول لم يكن يُظهر شيئاً على الإطلاق.**

   السبب ليس في المنطق: شريط الأدوات `.bz-wtb` يحمل `overflow-x: auto`
   ليحوي ثلاثين زرّاً في ٣٦٠px. وبحسب المواصفة، إذا كان أحد محورَي
   `overflow` غير `visible` صار الآخر `auto` أيضاً — فالشريط يقصّ
   عمودياً كذلك. والقائمة موضوعة `position: absolute; top: 100% + 6px`
   أي **أسفل حدّ الشريط تماماً**، فتُقصّ بكاملها. كانت تُبنى في DOM
   وتُقصّ من الشاشة.

   ولنفس السبب كانت لوحتا اللون والتظليل لا تظهران أيضاً.

   الحلّ الصحيح ليس إلغاء انزلاق الشريط (نحتاجه على الهاتف)، بل إخراج
   القائمة من الشريط كلّياً: تُبنى في `document.body` بـ`position: fixed`
   وتُثبَّت مقابل الزرّ بـ`getBoundingClientRect`. لا سلف يقصّها بعد
   الآن، وتُقلَب إلى أعلى الزرّ إن لم يبقَ متّسع أسفله.
   ════════════════════════════════════════════════════════════ */
function Pop({
  anchor, onClose, className, children,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current, b = box.current;
      if (!a || !b) return;
      const r = a.getBoundingClientRect();
      const w = b.offsetWidth || 216;
      const h = b.offsetHeight || 200;
      const vw = window.innerWidth, vh = window.innerHeight;
      /* نُوسّطها تحت الزرّ ثمّ نُدخلها في الشاشة — على ٣٢٠px يكون الزرّ
         قريباً من الحافّة فتخرج القائمة لولا هذا الحصر. */
      const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
      const below = r.bottom + 6;
      const top = below + h > vh - 8 ? Math.max(8, r.top - h - 6) : below;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  useEffect(() => {
    const outside = (e: Event) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={box}
      className={className}
      /* قبل أوّل قياس نُخفيها بـ`visibility` لا بـ`display`: بلا مقاس
         محسوب لا يمكن حساب موضعها، ومع `display:none` تبقى بلا مقاس. */
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
      dir="rtl"
    >
      {children}
    </div>,
    document.body,
  );
}

/* ── منتقي الجدول ──
   شبكة ٦×٦ يمرّ عليها الإصبع/الفأر فيرى المقاس قبل الإدراج — كما في
   Word تماماً. وتحته عمليات الجدول القائم: صفّ، عمود، حذف. */
function TablePicker({
  onInsert, onOp, onOpen,
}: {
  onInsert: (rows: number, cols: number, header: boolean) => void;
  onOp: (op: "row+" | "row-" | "col+" | "col-" | "del") => void;
  /** يُحفظ موضع المؤشّر لحظة الفتح: بلا هذا يُدرَج الجدول في رأس
      المستند لأنّ `focus()` يُعيد المؤشّر إلى البداية. */
  onOpen: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const [header, setHeader] = useState(true);
  const MAX_R = 6, MAX_C = 6;
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button ref={btn} type="button" title="جدول" aria-label="جدول" aria-expanded={open}
        onMouseDown={(e) => { e.preventDefault(); if (!open) onOpen(); setOpen((v) => !v); }}
        className={`bz-wbtn ${open ? "is-on" : ""}`}>
        <FontAwesomeIcon icon={faTable} className="h-[15px] w-[15px]" />
      </button>

      {open && (
        <Pop anchor={btn} onClose={close} className="bz-wtbl">
          <span className="bz-wtbl-h">
            {hover.r > 0 ? `جدول ${hover.r} × ${hover.c}` : "اختر مقاس الجدول"}
          </span>

          <span className="bz-wtbl-grid" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
            {Array.from({ length: MAX_R * MAX_C }).map((_, i) => {
              const r = Math.floor(i / MAX_C) + 1;
              const c = (i % MAX_C) + 1;
              const on = r <= hover.r && c <= hover.c;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`${r} × ${c}`}
                  /* `pointerenter` يعمل للفأر وللقلم، و`pointerdown`
                     يغطّي اللمس حيث لا يوجد تحويم أصلاً. */
                  onPointerEnter={() => setHover({ r, c })}
                  onPointerDown={(e) => { e.preventDefault(); setHover({ r, c }); }}
                  onClick={() => { onInsert(r, c, header); setOpen(false); }}
                  data-on={on ? "1" : undefined}
                />
              );
            })}
          </span>

          <label className="bz-wtbl-chk">
            <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
            صفّ عناوين
          </label>

          <span className="bz-wtbl-ops">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onOp("row+"); }}>
              <FontAwesomeIcon icon={faPlus} className="h-2.5 w-2.5" /> صفّ
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onOp("col+"); }}>
              <FontAwesomeIcon icon={faPlus} className="h-2.5 w-2.5" /> عمود
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onOp("row-"); }}>
              <FontAwesomeIcon icon={faMinus} className="h-2.5 w-2.5" /> صفّ
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); onOp("col-"); }}>
              <FontAwesomeIcon icon={faMinus} className="h-2.5 w-2.5" /> عمود
            </button>
            <button type="button" className="is-del"
              onMouseDown={(e) => { e.preventDefault(); onOp("del"); setOpen(false); }}>
              <FontAwesomeIcon icon={faTrashCan} className="h-2.5 w-2.5" /> حذف الجدول
            </button>
          </span>
        </Pop>
      )}
    </>
  );
}

function Sep() { return <span className="bz-wsep" />; }

/** لوحة ألوان صغيرة تُفتح تحت الزرّ */
function Swatches({
  icon, title, colors, onPick,
}: {
  icon: typeof faBold;
  title: string;
  colors: string[];
  onPick: (c: string) => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button ref={btn} type="button" title={title} aria-label={title} aria-expanded={open}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className={`bz-wbtn ${open ? "is-on" : ""}`}>
        <FontAwesomeIcon icon={icon} className="h-[15px] w-[15px]" />
      </button>
      {open && (
        /* لوحة الألوان كانت مقصوصة بانزلاق الشريط مثل الجدول تماماً */
        <Pop anchor={btn} onClose={close} className="bz-wpal">
          {colors.map((c) => (
            <button key={c} type="button" title={c} aria-label={c}
              onMouseDown={(e) => { e.preventDefault(); onPick(c); setOpen(false); }}
              style={{ background: c }} />
          ))}
        </Pop>
      )}
    </>
  );
}

/* ── قارئ Word: يُحمَّل عند الطلب فقط ── */
interface MammothLike {
  convertToHtml: (opt: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
}
let mammothPromise: Promise<MammothLike | null> | null = null;

function loadMammoth(): Promise<MammothLike | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as unknown as { mammoth?: MammothLike };
  if (w.mammoth) return Promise.resolve(w.mammoth);
  if (mammothPromise) return mammothPromise;

  /* ١٥٠KB تُحمَّل **فقط** حين يرفع الأستاذ ملفّاً — لا في كل غرفة.
     الغرفة تعمل على شبكات بطيئة، ولا يجوز أن يدفع كل طالب ثمن ميزة
     لا يستعملها. */
  mammothPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";
    s.async = true;
    s.onload = () => resolve((window as unknown as { mammoth?: MammothLike }).mammoth ?? null);
    s.onerror = () => { mammothPromise = null; resolve(null); };
    document.body.appendChild(s);
  });
  return mammothPromise;
}
