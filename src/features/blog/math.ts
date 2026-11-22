import katex from "katex";

/* ════════════════════════════════════════════════════════════
   معادلات المقالات — KaTeX على الخادم

   كانت الرياضيات تُكتب نصّاً عادياً (`limx→0 ln(1+x)/x = 1`)، فلا كسر
   حقيقيّ ولا نهاية تحتها رمزها. الآن يكتب المحرّر LaTeX:

     \( ... \)   داخل السطر      مثال: \( \ln(ab) = \ln a + \ln b \)
     \[ ... \]   في سطر مستقلّ   مثال: \[ \lim_{x \to 0} \frac{\ln(1+x)}{x} = 1 \]

   وتُحوَّل هنا إلى HTML جاهز (مع MathML لقارئ الشاشة ومحرّكات البحث)
   — لا JavaScript في المتصفّح ولا وميض. تُستدعى **بعد** التعقيم: جسم
   المقال يكتبه الأدمن، وناتج KaTeX موثوق.
   ════════════════════════════════════════════════════════════ */

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const decode = (s: string) => s.replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);

/* ── نسخة واحدة من كلّ معادلة ──────────────────────────────────
   🐛 كان الإخراج "htmlAndMathml": KaTeX يكتب كلّ معادلة مرّتين، نسخة HTML
   مرئية ونسخة MathML مخفية (1×1 بكسل). الشاشة سليمة، لكنّ كلّ مستخرِج
   نصّ (محرّكات البحث، القرّاء، النسخ واللصق) يقرأ النسختين:
   «𝑓(0)=1 f(0)=1». مقال الدالة الأسية وحده فيه 154 معادلة مكرّرة.
   الآن: HTML وحده، ونصّ خطّي مقروء في aria-label لقارئ الشاشة
   (يُستخرج من شجرة MathML نفسها: الأسّ ^ والكسر / والجذر √). */

type MNode = { tag: string; kids: (MNode | string)[] };

function parseMathml(xml: string): MNode {
  const root: MNode = { tag: "root", kids: [] };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z]+)[^>]*?(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[4] !== undefined) { top.kids.push(decode(m[4])); continue; }
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    const node: MNode = { tag: m[2], kids: [] };
    top.kids.push(node);
    if (!m[3]) stack.push(node);
  }
  return root;
}

const wrap = (s: string) => (s.length > 1 && !/^[(\[{].*[)\]}]$/.test(s) ? `(${s})` : s);

function linear(n: MNode | string): string {
  if (typeof n === "string") return n;
  const k = n.kids.filter((c) => typeof c !== "string" || c.trim() !== "" || n.tag === "mtext");
  const parts = k.map(linear);
  switch (n.tag) {
    case "annotation": return "";
    case "msup": return /^[′″]+$/.test(parts[1] ?? "") ? `${parts[0]}${parts[1]}` : `${parts[0]}^${wrap(parts[1] ?? "")}`;
    case "msub": return `${parts[0]}_${wrap(parts[1] ?? "")}`;
    case "msubsup": return `${parts[0]}_${wrap(parts[1] ?? "")}^${wrap(parts[2] ?? "")}`;
    case "mfrac": return `${wrap(parts[0] ?? "")}/${wrap(parts[1] ?? "")}`;
    case "msqrt": return `√${wrap(parts.join(""))}`;
    case "mroot": return `√[${parts[1] ?? ""}]${wrap(parts[0] ?? "")}`;
    case "munder": return `${parts[0]} ${parts[1] ?? ""} `;
    case "mover": return parts[0] ?? "";
    case "munderover": return `${parts[0]} ${parts[1] ?? ""} ${parts[2] ?? ""} `;
    case "mi": return parts.join("");
    case "mo": { const o = parts.join(""); return /^[=<>≤≥≈≠→∈+−×]$/.test(o) ? ` ${o} ` : o; }
    case "mtext": return parts.join("");
    default: return parts.join("");
  }
}

/** نصّ خطّي للمعادلة: «exp(na) = (exp a)^n» — لقارئ الشاشة فقط */
export function mathToText(tex: string): string {
  const ml = katex.renderToString(tex, { throwOnError: false, strict: "ignore", output: "mathml" });
  return linear(parseMathml(ml)).replace(/⁡/g, " ").replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")").trim();
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function render(tex: string, displayMode: boolean): string {
  try {
    const t = decode(tex).trim();
    const out = katex.renderToString(t, { displayMode, throwOnError: false, strict: "ignore", output: "html" });
    const label = attr(mathToText(t));
    return displayMode
      ? `<div class="bz-math-display" dir="ltr" role="math" aria-label="${label}">${out}</div>`
      : `<span class="bz-math" dir="ltr" role="math" aria-label="${label}">${out}</span>`;
  } catch {
    return tex;
  }
}

/** يحوّل \( \) و\[ \] في HTML المقال إلى معادلات مرسومة. بلا معادلات: يُرجع النصّ كما هو. */
export function renderArticleMath(html: string): string {
  if (!html.includes("\\(") && !html.includes("\\[")) return html;
  return html
    /* معادلة مستقلّة داخل فقرة وحدها: نُخرجها من <p> كي لا يصير div داخل p */
    .replace(/<p>\s*\\\[([\s\S]+?)\\\]\s*<\/p>/g, (_, tex) => render(tex, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => render(tex, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => render(tex, false));
}
