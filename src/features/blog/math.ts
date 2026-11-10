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

function render(tex: string, displayMode: boolean): string {
  try {
    const out = katex.renderToString(decode(tex).trim(), { displayMode, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
    return displayMode ? `<div class="bz-math-display" dir="ltr">${out}</div>` : `<span class="bz-math" dir="ltr">${out}</span>`;
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
