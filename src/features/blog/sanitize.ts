/* ════════════════════════════════════════════════════════════
   تنقية HTML المقال قبل عرضه

   كاتب المقال هو الأدمن — مالك الموقع نفسه — وقواعد RTDB تحصر الكتابة
   به. فلماذا التنقية إذن؟

   لأنّ الثقة في الكاتب لا تكفي حين يعيش النصّ **طويلاً وعلناً**:

   ١) حساب أدمن واحد مخترَق يعني سكربتاً مزروعاً في صفحة مفهرسة يقرأها
      آلاف الطلبة — لا في لوحة إدارة يراها شخص واحد.
   ٢) المقال يُلصق فيه محتوى من مصادر أخرى (Word، مواقع)، وهي تحمل
      وسوماً وسمات لم يقصدها الكاتب.
   ٣) Google يُعاقب الصفحات التي تحقن سكربتات أو إطارات غريبة.

   والقاعدة قائمة بيضاء لا سوداء: نسمح بما نعرفه ونحذف ما سواه. القائمة
   السوداء تُنسى دائماً حالةٌ واحدة، والقائمة البيضاء تفشل آمنةً.

   وتقع على **الخادم** قبل الإرسال — فلا يصل المتصفّحَ وسمٌ خطر أصلاً.
   ════════════════════════════════════════════════════════════ */

/** وسوم مسموحة — كل ما يحتاجه مقال حقيقي، ولا شيء أكثر */
const ALLOWED = new Set([
  "p", "br", "hr", "div", "span",
  "h2", "h3", "h4", "h5",
  "strong", "b", "em", "i", "u", "s", "del", "mark", "sub", "sup", "small",
  "ul", "ol", "li",
  "blockquote", "figure", "figcaption",
  "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "code", "pre", "kbd",
]);

/** سمات مسموحة لكل وسم */
const ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding", "sizes"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  "*": new Set(["class", "dir", "id"]),
};

const VOID = new Set(["br", "hr", "img"]);

function safeUrl(raw: string): string | null {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\/[^/]/.test(v) || v === "/") return v;   // داخليّ
  if (/^#[\w-]+$/.test(v)) return v;              // مرساة
  if (/^mailto:[^\s]+@[^\s]+$/i.test(v)) return v;
  return null;                                     // javascript: · data: · vbscript:
}

function cleanAttrs(tag: string, attrText: string): string {
  const allowed = ATTRS[tag];
  const global = ATTRS["*"];
  const out: string[] = [];

  const re = /([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrText))) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";

    /* `on*` تُرفض قبل أيّ اعتبار آخر — وهي طريق XSS الأوّل */
    if (name.startsWith("on")) continue;
    if (name === "style") continue; // يُغني عنه `class`، ويحمل `expression()` في متصفّحات قديمة
    if (!(allowed?.has(name) || global.has(name))) continue;

    if (name === "href" || name === "src") {
      const url = safeUrl(value);
      if (!url) continue;
      out.push(`${name}="${escapeAttr(url)}"`);
      continue;
    }
    out.push(`${name}="${escapeAttr(value)}"`);
  }

  /* الروابط الخارجية تُفتح في تبويب جديد بأمان، والداخلية في مكانها */
  if (tag === "a") {
    const href = out.find((a) => a.startsWith("href="));
    if (href && /href="https?:/i.test(href)) {
      if (!out.some((a) => a.startsWith("target="))) out.push('target="_blank"');
      out.push('rel="noopener noreferrer"');
    }
  }
  /* الصور: تحميل كسول وأبعاد — شرطُ ألّا تُزحزح الصورةُ النصَّ (CLS) */
  if (tag === "img") {
    if (!out.some((a) => a.startsWith("loading="))) out.push('loading="lazy"');
    if (!out.some((a) => a.startsWith("decoding="))) out.push('decoding="async"');
  }

  return out.length ? " " + out.join(" ") : "";
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** ينقّي HTML المقال — يُنادى على الخادم قبل العرض */
export function sanitizeArticle(html: string): string {
  if (!html) return "";

  let out = html;

  /* الوسوم ذات المحتوى الخطر تُحذف **بمحتواها**: حذف الوسم وحده يترك
     شيفرة السكربت نصّاً معروضاً على الصفحة. */
  out = out.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<(script|style|iframe|object|embed|form|input|link|meta|base)\b[^>]*\/?>/gi, "");
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  out = out.replace(/<\/?([a-zA-Z][\w-]*)((?:\s+[^>]*)?)\/?>/g, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED.has(tag)) return "";           // الوسم غير المعروف يُحذف ويبقى نصّه
    if (full.startsWith("</")) return `</${tag}>`;
    if (VOID.has(tag)) return `<${tag}${cleanAttrs(tag, attrs)} />`;
    return `<${tag}${cleanAttrs(tag, attrs)}>`;
  });

  return out;
}

/** نصّ خالص من HTML — للمقتطف ووصف السيو */
export function htmlToText(html: string, limit = 300): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, "") + "…";
}
