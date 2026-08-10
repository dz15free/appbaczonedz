/* ════════════════════════════════════════════════════════════
   راسم المعادلات على اللوح

   🐛 **سبب ظهور الرمز `^` في المعادلة**

   كان اللوح يحوّل LaTeX إلى نصّ عادي عبر خريطة حروف Unicode مرتفعة:

       const SUP = { "0":"⁰", "1":"¹", "2":"²", … , n:"ⁿ", i:"ⁱ" };
       t = t.replace(/\^(\w)/g, (_m, g) => SUP[g] ?? `^${g}`);
                                                  ↑↑↑↑↑↑↑
   فأيّ أسّ ليس رقماً ولا `n` ولا `i` يسقط إلى البديل `^${g}` —
   فيُرسَم رمز `^` حرفياً على اللوح كما في الدائرة الحمراء في صورتك.
   وحتى لو وسّعنا الخريطة، فإنّ Unicode **لا يملك** مقابلاً مرتفعاً
   لكل الحروف (لا يوجد `q` مرتفع مثلاً)، والأسّ المركّب مثل `n+1`
   مستحيل أصلاً بحرف واحد.

   الحلّ الصحيح ليس خريطة أوسع، بل **تخطيط رياضي حقيقي**: نقيس كل
   جزء ونرسمه في موضعه بالحجم المناسب — الأسّ مرفوع بخطّ أصغر، والدليل
   منخفض، والكسر بسطٍ ومقام وخطّ بينهما، والجذر بعلامته وسقفه. فلا
   يظهر `^` ولا `_` ولا `{}` أبداً، ويعمل مع أي محتوى.

   بلا مكتبات وبلا شبكة: `measureText` و`fillText` وحدهما — لأنّ اللوح
   يعمل داخل غرفة مباشرة على شبكات جزائرية بطيئة، وتحميل KaTeX
   ورسمه في صورة لكل معادلة ثمنٌ لا يستحقّه أسّ واحد.
   ════════════════════════════════════════════════════════════ */

/* ── الرموز ── تُبدَّل قبل التخطيط، فهي حروف عادية بعرض معلوم */
const SYMBOLS: [RegExp, string][] = [
  [/\\times/g, "×"], [/\\div/g, "÷"], [/\\pm/g, "±"], [/\\mp/g, "∓"],
  [/\\leq/g, "≤"], [/\\geq/g, "≥"], [/\\neq/g, "≠"], [/\\equiv/g, "≡"],
  [/\\approx/g, "≈"], [/\\sim/g, "∼"], [/\\propto/g, "∝"],
  [/\\infty/g, "∞"], [/\\partial/g, "∂"], [/\\nabla/g, "∇"],
  [/\\int/g, "∫"], [/\\iint/g, "∬"], [/\\oint/g, "∮"],
  [/\\sum/g, "∑"], [/\\prod/g, "∏"],
  [/\\alpha/g, "α"], [/\\beta/g, "β"], [/\\gamma/g, "γ"], [/\\delta/g, "δ"],
  [/\\epsilon/g, "ε"], [/\\varepsilon/g, "ε"], [/\\zeta/g, "ζ"], [/\\eta/g, "η"],
  [/\\theta/g, "θ"], [/\\iota/g, "ι"], [/\\kappa/g, "κ"], [/\\lambda/g, "λ"],
  [/\\mu/g, "μ"], [/\\nu/g, "ν"], [/\\xi/g, "ξ"], [/\\rho/g, "ρ"],
  [/\\sigma/g, "σ"], [/\\tau/g, "τ"], [/\\upsilon/g, "υ"], [/\\phi/g, "φ"],
  [/\\varphi/g, "φ"], [/\\chi/g, "χ"], [/\\psi/g, "ψ"], [/\\omega/g, "ω"],
  [/\\Gamma/g, "Γ"], [/\\Delta/g, "Δ"], [/\\Theta/g, "Θ"], [/\\Lambda/g, "Λ"],
  [/\\Xi/g, "Ξ"], [/\\Pi/g, "Π"], [/\\Sigma/g, "Σ"], [/\\Phi/g, "Φ"],
  [/\\Psi/g, "Ψ"], [/\\Omega/g, "Ω"],
  [/\\rightarrow/g, "→"], [/\\to/g, "→"], [/\\leftarrow/g, "←"],
  [/\\Rightarrow/g, "⇒"], [/\\Leftarrow/g, "⇐"], [/\\leftrightarrow/g, "↔"],
  [/\\cdot/g, "·"], [/\\ldots/g, "…"], [/\\dots/g, "…"],
  [/\\in/g, "∈"], [/\\notin/g, "∉"], [/\\subset/g, "⊂"], [/\\cup/g, "∪"], [/\\cap/g, "∩"],
  [/\\forall/g, "∀"], [/\\exists/g, "∃"], [/\\emptyset/g, "∅"],
  [/\\degree/g, "°"], [/\\circ/g, "∘"], [/\\angle/g, "∠"], [/\\perp/g, "⊥"],
  [/\\parallel/g, "∥"], [/\\therefore/g, "∴"],
  /* دوالّ تُكتب منتصبة لا مائلة — وهي عادة رياضية لا تجميل */
  [/\\(sin|cos|tan|cot|sec|csc|ln|log|lim|exp|max|min|det|gcd|arcsin|arccos|arctan)\b/g, "$1"],
  [/\\left/g, ""], [/\\right/g, ""],
  [/\\!|\\,|\\;|\\:/g, ""],
  [/\\quad|\\qquad/g, "  "],
  [/\\text\{([^{}]*)\}/g, "$1"],
  [/\\mathrm\{([^{}]*)\}/g, "$1"],
];

/** هل يحتاج هذا النصّ تخطيطاً رياضياً؟ نصّ عاديّ لا يُشغّل المحرّك. */
export function looksLikeMath(t: string): boolean {
  return /[\^_]|\\[a-zA-Z]+|\{|\}/.test(t);
}

/* ── شجرة التخطيط ──
   كل عقدة تعرف عرضها وارتفاعها فوق خطّ الأساس وتحته، فيستطيع الأب
   أن يضعها في موضعها بلا تخمين. */
type Node =
  | { t: "run"; s: string; scale: number }
  | { t: "sup"; base: Node[]; sup: Node[] }
  | { t: "sub"; base: Node[]; sub: Node[] }
  | { t: "supsub"; base: Node[]; sup: Node[]; sub: Node[] }
  | { t: "frac"; num: Node[]; den: Node[] }
  | { t: "sqrt"; body: Node[] };

interface Box { w: number; up: number; down: number }

/* ── التحليل ──
   محلّل صغير لمجموعة LaTeX التي يكتبها طالب البكالوريا فعلاً: أسّ،
   دليل، كسر، جذر، ومجموعات `{}`. ما لا يعرفه يمرّ كنصّ عادي بدل أن
   يُفسد المعادلة كاملة — والخطأ في معادلة واحدة لا يجوز أن يُفرغ اللوح. */
function tokenize(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      const m = /^\\[a-zA-Z]+/.exec(src.slice(i));
      if (m) { out.push(m[0]); i += m[0].length; continue; }
      out.push(src[i + 1] ?? "\\"); i += 2; continue;
    }
    if ("{}^_".includes(c)) { out.push(c); i++; continue; }
    out.push(c); i++;
  }
  return out;
}

function parse(tokens: string[], pos = { i: 0 }, stopAtBrace = false): Node[] {
  const nodes: Node[] = [];
  let buf = "";
  const flush = () => { if (buf) { nodes.push({ t: "run", s: buf, scale: 1 }); buf = ""; } };

  while (pos.i < tokens.length) {
    const tk = tokens[pos.i];

    if (tk === "}") { if (stopAtBrace) { pos.i++; break; } pos.i++; continue; }

    if (tk === "{") { pos.i++; flush(); nodes.push(...parse(tokens, pos, true)); continue; }

    if (tk === "^" || tk === "_") {
      pos.i++;
      flush();
      const arg = readArg(tokens, pos);
      const base = nodes.length ? [nodes.pop() as Node] : [{ t: "run", s: "", scale: 1 } as Node];
      const prev = base[0];

      /* أسّ ودليل على العنصر نفسه (`x_i^2`) يُرسمان معاً لا متتاليين */
      if (tk === "^" && prev.t === "sub") {
        nodes.push({ t: "supsub", base: prev.base, sup: arg, sub: prev.sub });
      } else if (tk === "_" && prev.t === "sup") {
        nodes.push({ t: "supsub", base: prev.base, sup: prev.sup, sub: arg });
      } else if (tk === "^") {
        nodes.push({ t: "sup", base, sup: arg });
      } else {
        nodes.push({ t: "sub", base, sub: arg });
      }
      continue;
    }

    if (tk === "\\frac" || tk === "\\dfrac" || tk === "\\tfrac") {
      pos.i++; flush();
      const num = readArg(tokens, pos);
      const den = readArg(tokens, pos);
      nodes.push({ t: "frac", num, den });
      continue;
    }

    if (tk === "\\sqrt") {
      pos.i++; flush();
      const body = readArg(tokens, pos);
      nodes.push({ t: "sqrt", body });
      continue;
    }

    /* رمز معروف → حرف واحد. غير معروف → يُكتب بلا الشرطة المائلة. */
    if (tk.startsWith("\\")) {
      let s = tk;
      for (const [re, ch] of SYMBOLS) { const r = s.replace(re, ch); if (r !== s) { s = r; break; } }
      buf += s.startsWith("\\") ? s.slice(1) : s;
      pos.i++;
      continue;
    }

    buf += tk;
    pos.i++;
  }

  flush();
  return nodes;
}

/** يقرأ وسيطاً: مجموعة `{…}` كاملة، أو حرفاً واحداً */
function readArg(tokens: string[], pos: { i: number }): Node[] {
  if (tokens[pos.i] === "{") { pos.i++; return parse(tokens, pos, true); }
  const tk = tokens[pos.i];
  if (tk === undefined) return [{ t: "run", s: "", scale: 1 }];
  pos.i++;
  if (tk.startsWith("\\")) {
    let s = tk;
    for (const [re, ch] of SYMBOLS) { const r = s.replace(re, ch); if (r !== s) { s = r; break; } }
    return [{ t: "run", s: s.startsWith("\\") ? s.slice(1) : s, scale: 1 }];
  }
  return [{ t: "run", s: tk, scale: 1 }];
}

/* ── القياس والرسم ──
   النِّسب مأخوذة من عُرف الطباعة الرياضية: الأسّ ٧٠٪ من الحجم ويُرفع
   ٤٥٪ من الارتفاع، والكسر يبتعد عن الخطّ بنحو ٣٥٪. */
const SUP_SCALE = 0.7;
const SUP_RISE = 0.45;
const SUB_DROP = 0.2;
const FRAC_GAP = 0.16;

function fontOf(px: number) { return `bold ${px}px "Cambria Math", "Latin Modern Math", Georgia, serif`; }

function measureRun(ctx: CanvasRenderingContext2D, s: string, px: number): Box {
  ctx.font = fontOf(px);
  return { w: ctx.measureText(s).width, up: px * 0.72, down: px * 0.24 };
}

function measureList(ctx: CanvasRenderingContext2D, list: Node[], px: number): Box {
  let w = 0, up = 0, down = 0;
  for (const n of list) {
    const b = measureNode(ctx, n, px);
    w += b.w;
    up = Math.max(up, b.up);
    down = Math.max(down, b.down);
  }
  return { w, up, down };
}

function measureNode(ctx: CanvasRenderingContext2D, n: Node, px: number): Box {
  switch (n.t) {
    case "run":
      return measureRun(ctx, n.s, px * n.scale);
    case "sup": {
      const b = measureList(ctx, n.base, px);
      const s = measureList(ctx, n.sup, px * SUP_SCALE);
      return { w: b.w + s.w + px * 0.04, up: Math.max(b.up, px * SUP_RISE + s.up), down: b.down };
    }
    case "sub": {
      const b = measureList(ctx, n.base, px);
      const s = measureList(ctx, n.sub, px * SUP_SCALE);
      return { w: b.w + s.w + px * 0.04, up: b.up, down: Math.max(b.down, px * SUB_DROP + s.down) };
    }
    case "supsub": {
      const b = measureList(ctx, n.base, px);
      const up_ = measureList(ctx, n.sup, px * SUP_SCALE);
      const dn = measureList(ctx, n.sub, px * SUP_SCALE);
      return {
        w: b.w + Math.max(up_.w, dn.w) + px * 0.04,
        up: Math.max(b.up, px * SUP_RISE + up_.up),
        down: Math.max(b.down, px * SUB_DROP + dn.down),
      };
    }
    case "frac": {
      const nu = measureList(ctx, n.num, px * 0.92);
      const de = measureList(ctx, n.den, px * 0.92);
      const w = Math.max(nu.w, de.w) + px * 0.3;
      return {
        w,
        up: nu.up + nu.down + px * FRAC_GAP + px * 0.28,
        down: de.up + de.down + px * FRAC_GAP - px * 0.28 + px * 0.1,
      };
    }
    case "sqrt": {
      const b = measureList(ctx, n.body, px);
      return { w: b.w + px * 0.62, up: b.up + px * 0.16, down: b.down };
    }
  }
}

function drawList(ctx: CanvasRenderingContext2D, list: Node[], x: number, y: number, px: number): number {
  let cx = x;
  for (const n of list) cx = drawNode(ctx, n, cx, y, px);
  return cx;
}

/** يرسم عقدة على خطّ أساس `y` ويُرجع موضع النهاية أفقيّاً */
function drawNode(ctx: CanvasRenderingContext2D, n: Node, x: number, y: number, px: number): number {
  switch (n.t) {
    case "run": {
      const size = px * n.scale;
      ctx.font = fontOf(size);
      ctx.textBaseline = "alphabetic";
      ctx.fillText(n.s, x, y);
      return x + ctx.measureText(n.s).width;
    }
    case "sup": {
      const bx = drawList(ctx, n.base, x, y, px);
      /* هنا جوهر الإصلاح: الأسّ يُرسَم **مرفوعاً بخطّ أصغر**، فلا
         حاجة إلى حرف Unicode ولا إلى رمز `^`. */
      const ex = drawList(ctx, n.sup, bx + px * 0.04, y - px * SUP_RISE, px * SUP_SCALE);
      return ex;
    }
    case "sub": {
      const bx = drawList(ctx, n.base, x, y, px);
      return drawList(ctx, n.sub, bx + px * 0.04, y + px * SUB_DROP, px * SUP_SCALE);
    }
    case "supsub": {
      const bx = drawList(ctx, n.base, x, y, px);
      const s = px * SUP_SCALE;
      const a = bx + px * 0.04;
      const w1 = measureList(ctx, n.sup, s).w;
      const w2 = measureList(ctx, n.sub, s).w;
      drawList(ctx, n.sup, a, y - px * SUP_RISE, s);
      drawList(ctx, n.sub, a, y + px * SUB_DROP, s);
      return a + Math.max(w1, w2);
    }
    case "frac": {
      const s = px * 0.92;
      const nu = measureList(ctx, n.num, s);
      const de = measureList(ctx, n.den, s);
      const inner = Math.max(nu.w, de.w);
      const w = inner + px * 0.3;
      const barY = y - px * 0.28;
      drawList(ctx, n.num, x + (w - nu.w) / 2, barY - px * FRAC_GAP - nu.down, s);
      drawList(ctx, n.den, x + (w - de.w) / 2, barY + px * FRAC_GAP + de.up, s);
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, px * 0.055);
      ctx.strokeStyle = ctx.fillStyle as string;
      ctx.lineCap = "round";
      ctx.moveTo(x + px * 0.09, barY);
      ctx.lineTo(x + w - px * 0.09, barY);
      ctx.stroke();
      ctx.restore();
      return x + w;
    }
    case "sqrt": {
      const b = measureList(ctx, n.body, px);
      const hookW = px * 0.5;
      const top = y - b.up - px * 0.14;
      const bottom = y + b.down * 0.7;
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, px * 0.06);
      ctx.strokeStyle = ctx.fillStyle as string;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      /* علامة الجذر: ساق قصير ثمّ قطر صاعد ثمّ سقف يغطّي المحتوى */
      ctx.moveTo(x + px * 0.04, y - b.up * 0.42);
      ctx.lineTo(x + hookW * 0.34, y - b.up * 0.2);
      ctx.lineTo(x + hookW * 0.6, bottom);
      ctx.lineTo(x + hookW, top);
      ctx.lineTo(x + hookW + b.w + px * 0.1, top);
      ctx.stroke();
      ctx.restore();
      drawList(ctx, n.body, x + hookW + px * 0.06, y, px);
      return x + hookW + b.w + px * 0.12;
    }
  }
}

function build(tex: string): Node[] {
  /* نُنظّف ما لا يُخطَّط: محدّدات الرياضيات وأقواس العرض */
  let t = tex.replace(/\$\$?/g, "").replace(/\\\[|\\\]|\\\(|\\\)/g, "").trim();
  for (const [re, ch] of SYMBOLS) t = t.replace(re, ch);
  return parse(tokenize(t));
}

export interface MathMetrics { w: number; h: number; baseline: number }

/** قياس معادلة قبل رسمها — يستعمله حساب حدود العنصر على اللوح */
export function measureMath(ctx: CanvasRenderingContext2D, tex: string, px: number): MathMetrics {
  const save = ctx.font;
  const nodes = build(tex);
  const b = measureList(ctx, nodes, px);
  ctx.font = save;
  return { w: b.w, h: b.up + b.down, baseline: b.up };
}

/**
 * يرسم معادلة LaTeX رسماً رياضياً حقيقياً.
 * `x,y` الزاوية العليا اليمنى للصندوق كما في `fillText` بـ`textBaseline: "top"`،
 * فيبقى الاستعمال مطابقاً لما كان عليه رسم النصّ على اللوح.
 */
export function drawMath(
  ctx: CanvasRenderingContext2D,
  tex: string,
  x: number,
  y: number,
  px: number,
): MathMetrics {
  const nodes = build(tex);
  const m = measureList(ctx, nodes, px);
  ctx.save();
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  drawList(ctx, nodes, x, y + m.up, px);
  ctx.restore();
  return { w: m.w, h: m.up + m.down, baseline: m.up };
}
