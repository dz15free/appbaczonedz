/* ════════════════════════════════════════════════════════════
   التعرّف على الأشكال — «السبورة تفهم قصدك»

   رياضيات خالصة، بلا أي مكتبة خارجية.

   🐛 لماذا أُعيدت كتابته: النسخة الأولى كانت تسأل أوّلاً «هل هو مستدير؟»
   بمعامل الاستدارة 4π·A/P² وعتبة 0.72 — والمربّع المثالي نفسه يساوي
   π/4 = 0.785، فكلّ مربّع يُحسب دائرة. والمثلّث الذي تخرج له أربعة
   رؤوس من اهتزاز اليد كان يسقط إلى الفرع الأخير (استدارة > 0.55)
   فيصير دائرة هو الآخر. النتيجة: كلّ ما يُرسم يتحوّل إلى دائرة.

   الطريقة الآن — **مطابقة ثلاثة مرشّحين واختيار الأقرب**:
     ١) الغلاف المحدّب للرسمة (يمتصّ اهتزاز اليد كلّه).
     ٢) أكبر مثلّث داخله، وأصغر مستطيل يحيط به (بأيّ دوران)،
        والقطع الناقص المحاط بذلك المستطيل.
     ٣) متوسّط بُعد نقاط الرسمة عن محيط كلّ مرشّح — الأصغر يفوز،
        وإن لم يقترب أيٌّ منها كفايةً تبقى الرسمة حرّة.
   فالمثلّث يخرج مثلّثاً **برؤوسه هو** (قائماً أو مائلاً كما رُسم)،
   والمستطيل مستطيلاً، والدائرة دائرة.

   مبدأ أساسي: التعرّف **اقتراح لا إلزام**. المستدعي يعرض زرّ تراجع،
   ويمكن تعطيله كلّياً (وضع الرسم الحرّ).
════════════════════════════════════════════════════════════ */

export interface Pt { x: number; y: number }

export type Recognized =
  | { type: "line"; x: number; y: number; w: number; h: number }
  | { type: "arrow"; x: number; y: number; w: number; h: number }
  /** `angle` = 0 ⇒ الصندوق محاذٍ للمحاور. وإلّا فالصندوق حول المركز قبل
      الدوران، و`pts` رؤوسه الأربعة الفعلية. */
  | { type: "rect"; x: number; y: number; w: number; h: number; angle: number; pts: Pt[] }
  /** `pts` تحضر فقط للقطع المائل (محيطه كمضلّع) — النموذج القديم لا يدوّر. */
  | { type: "ellipse"; x: number; y: number; w: number; h: number; angle: number; pts?: Pt[] }
  /** `pts` رؤوس المثلّث الثلاثة كما رُسم؛ والصندوق يحيط بها. */
  | { type: "triangle"; x: number; y: number; w: number; h: number; pts: Pt[] }
  | null;

/* ── أدوات هندسية ──────────────────────────────────── */

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

/** تبسيط المسار — يُبقي الرؤوس المهمّة فقط */
export function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  let maxD = 0, idx = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  const left = rdp(pts.slice(0, idx + 1), eps);
  const right = rdp(pts.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

function pathLength(pts: Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return s;
}

function bounds(pts: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** مساحة المضلّع (صيغة الحذاء) */
function polyArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** إعادة توزيع النقاط على مسافات متساوية — سرعة اليد لا تُرجّح جهة على أخرى */
function resample(pts: Pt[], n: number): Pt[] {
  const total = pathLength(pts);
  if (total <= 0 || pts.length < 2) return pts.slice();
  const step = total / n;
  const out: Pt[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (seg > 0 && acc + seg >= step && out.length < n) {
      const t = (step - acc) / seg;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(a);
      seg = Math.hypot(b.x - a.x, b.y - a.y);
      acc = 0;
    }
    acc += seg;
  }
  return out;
}

/** الغلاف المحدّب (السلسلة الرتيبة) */
function convexHull(input: Pt[]): Pt[] {
  const pts = input.slice().sort((p, q) => p.x - q.x || p.y - q.y);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** أكبر مثلّث رؤوسه من نقاط الغلاف */
function largestTriangle(hull: Pt[]): Pt[] | null {
  const n = hull.length;
  if (n < 3) return null;
  let best = 0, bi = 0, bj = 1, bk = 2;
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      const ax = hull[j].x - hull[i].x, ay = hull[j].y - hull[i].y;
      for (let k = j + 1; k < n; k++) {
        const a = Math.abs(ax * (hull[k].y - hull[i].y) - ay * (hull[k].x - hull[i].x));
        if (a > best) { best = a; bi = i; bj = j; bk = k; }
      }
    }
  }
  return best > 0 ? [hull[bi], hull[bj], hull[bk]] : null;
}

interface Frame { cx: number; cy: number; a: number; b: number; ang: number }

/** أصغر مستطيل يحيط بالغلاف — أحد أضلاعه ينطبق حتماً على ضلع من الغلاف */
function minAreaRect(hull: Pt[]): Frame | null {
  const n = hull.length;
  if (n < 3) return null;
  let best: Frame | null = null, bestArea = Infinity;
  for (let i = 0; i < n; i++) {
    const p = hull[i], q = hull[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 1e-9) continue;
    const ux = (q.x - p.x) / len, uy = (q.y - p.y) / len;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const h of hull) {
      const u = h.x * ux + h.y * uy, v = -h.x * uy + h.y * ux;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
    const area = (u1 - u0) * (v1 - v0);
    if (area < bestArea) {
      bestArea = area;
      const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
      best = {
        cx: mu * ux - mv * uy, cy: mu * uy + mv * ux,
        a: (u1 - u0) / 2, b: (v1 - v0) / 2, ang: Math.atan2(uy, ux),
      };
    }
  }
  if (!best) return null;
  /* نطبّع الزاوية إلى (−45°، 45°]: المستطيل نفسه يوصف بأربع زوايا،
     ونريد الوصف الأقرب للمحاور حتى يكون «محاذٍ أم مائل؟» سؤالاً واحداً. */
  let { a, b, ang } = best;
  while (ang > Math.PI / 4) { ang -= Math.PI / 2; [a, b] = [b, a]; }
  while (ang <= -Math.PI / 4) { ang += Math.PI / 2; [a, b] = [b, a]; }
  return { cx: best.cx, cy: best.cy, a, b, ang };
}

/** نقطة عالمية → إحداثيات الإطار (u على طول الضلع، v عمودي عليه) */
function toFrame(f: Frame, p: Pt): { u: number; v: number } {
  const c = Math.cos(f.ang), s = Math.sin(f.ang);
  const dx = p.x - f.cx, dy = p.y - f.cy;
  return { u: dx * c + dy * s, v: -dx * s + dy * c };
}
function fromFrame(f: Frame, u: number, v: number): Pt {
  const c = Math.cos(f.ang), s = Math.sin(f.ang);
  return { x: f.cx + u * c - v * s, y: f.cy + u * s + v * c };
}

const DEG = Math.PI / 180;

/* ── صقل المرشّح الفائز ─────────────────────────────── */

/** خطّ بأصغر المربّعات الكلّية عبر نقاط ضلع واحد */
function fitLine(pts: Pt[]): { x: number; y: number; dx: number; dy: number } | null {
  if (pts.length < 3) return null;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= pts.length; my /= pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { x: mx, y: my, dx: Math.cos(th), dy: Math.sin(th) };
}

function intersect(
  l1: { x: number; y: number; dx: number; dy: number },
  l2: { x: number; y: number; dx: number; dy: number },
): Pt | null {
  const den = l1.dx * l2.dy - l1.dy * l2.dx;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((l2.x - l1.x) * l2.dy - (l2.y - l1.y) * l2.dx) / den;
  return { x: l1.x + l1.dx * t, y: l1.y + l1.dy * t };
}

/** رؤوس المثلّث الحقيقية = تقاطع الخطوط المطابِقة لأضلاعه.
    أكبر مثلّث في الغلاف يقع داخل الزوايا المدوّرة باليد، فيخرج أصغر
    من المقصود؛ مطابقة الأضلاع تُعيد الرؤوس إلى حيث أرادها الراسم. */
function refineTriangle(tri: Pt[], pts: Pt[], diag: number): Pt[] {
  const groups: Pt[][] = [[], [], []];
  for (const p of pts) {
    let bk = 0, bd = Infinity;
    for (let k = 0; k < 3; k++) {
      const d = distToSeg(p, tri[k], tri[(k + 1) % 3]);
      if (d < bd) { bd = d; bk = k; }
    }
    const a = tri[bk], b = tri[(bk + 1) % 3];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / Math.max(dx * dx + dy * dy, 1e-9);
    if (t > 0.14 && t < 0.86) groups[bk].push(p);   // نُسقط جوار الزوايا المدوّرة
  }
  const lines = groups.map(fitLine);
  if (lines.some((l) => !l)) return tri;
  const out: Pt[] = [];
  for (let k = 0; k < 3; k++) {
    const v = intersect(lines[(k + 2) % 3]!, lines[k]!);
    if (!v || Math.hypot(v.x - tri[k].x, v.y - tri[k].y) > diag * 0.3) return tri;
    out.push(v);
  }
  return out;
}

/** تسوية المثلّث: ضلع شبه أفقي يصير أفقياً، وشبه عمودي عمودياً،
    ورأس شبه متوسّط فوق قاعدة أفقية يتوسّطها (متساوي الساقين). */
function tidyTriangle(v: Pt[]): Pt[] {
  const t = v.map((p) => ({ ...p }));
  const tol = Math.tan(8 * DEG);
  for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3];
    if (Math.abs(b.y - a.y) < tol * Math.abs(b.x - a.x)) { const m = (a.y + b.y) / 2; a.y = m; b.y = m; }
  }
  for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3];
    if (Math.abs(b.x - a.x) < tol * Math.abs(b.y - a.y)) { const m = (a.x + b.x) / 2; a.x = m; b.x = m; }
  }
  for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3], apex = t[(k + 2) % 3];
    if (a.y !== b.y) continue;
    const mid = (a.x + b.x) / 2;
    if (Math.abs(apex.x - mid) < Math.abs(b.x - a.x) * 0.09) apex.x = mid;
  }
  return t;
}

/** أضلاع المستطيل من متوسّط نقاط كلّ ضلع — لا من أقصى نقطة شاذّة */
function refineRect(f: Frame, pts: Pt[]): Frame {
  const side = { l: [] as number[], r: [] as number[], t: [] as number[], b: [] as number[] };
  for (const p of pts) {
    const { u, v } = toFrame(f, p);
    if (Math.abs(v) < f.b * 0.6) (u > 0 ? side.r : side.l).push(u);
    if (Math.abs(u) < f.a * 0.6) (v > 0 ? side.b : side.t).push(v);
  }
  const mean = (xs: number[], fallback: number) =>
    xs.length >= 2 ? xs.reduce((s, x) => s + x, 0) / xs.length : fallback;
  const l = mean(side.l, -f.a), r = mean(side.r, f.a);
  const t = mean(side.t, -f.b), b = mean(side.b, f.b);
  if (r - l < f.a || b - t < f.b) return f;       // صقل غير معقول: نبقى على الأصل
  const c = fromFrame(f, (l + r) / 2, (t + b) / 2);
  return { cx: c.x, cy: c.y, a: (r - l) / 2, b: (b - t) / 2, ang: f.ang };
}

/* ── التعرّف ───────────────────────────────────────── */

export interface RecognizeOptions {
  /** محاذاة الخطوط لأقرب ١٥° */
  snapAngles?: boolean;
  /** اعتبار المسار سهماً إن انتهى برأس حادّ */
  detectArrow?: boolean;
  /** أصغر قطر (بوحدة الإدخال) لشكل مغلق يُحوَّل. تحته تبقى الرسمة حرّة:
      من يكتب «0» أو «o» أو «ه» بالقلم لا يريد دائرة هندسية مكانها. */
  minClosedSize?: number;
}

/**
 * يحاول التعرّف على شكل من مسار حرّ.
 * يرجع null إن لم يكن واثقاً — والرسم الحرّ يبقى كما هو.
 */
export function recognize(raw: Pt[], opts: RecognizeOptions = {}): Recognized {
  if (!raw || raw.length < 4) return null;

  /* أوّل نقطة قد تكون شاذّة: المستخدم يضع إصبعه ثم يقفز لبداية الرسم،
     فتنشأ «شوكة» تُفسد اختبار الانغلاق. نُسقطها إن كانت بعيدة بوضوح
     عن باقي المسار مقارنةً بالخطوة المتوسّطة. */
  let pts = raw;
  if (raw.length >= 6) {
    let step = 0;
    for (let i = 2; i < Math.min(raw.length, 8); i++) {
      step += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
    }
    step /= Math.max(1, Math.min(raw.length, 8) - 2);
    const firstGap = Math.hypot(raw[1].x - raw[0].x, raw[1].y - raw[0].y);
    if (step > 0 && firstGap > step * 3) pts = raw.slice(1);
  }

  const b = bounds(pts);
  const diag = Math.hypot(b.w, b.h);
  if (diag < 8) return null;                    // نقرة لا رسمة

  const first = pts[0], last = pts[pts.length - 1];
  const gap = Math.hypot(last.x - first.x, last.y - first.y);
  const len = pathLength(pts);

  /* الانغلاق: إمّا أنّ النهاية عادت قرب البداية، وإمّا أنّ اليد **تجاوزت**
     البداية فتقاطع الذيل مع الرأس — وهو الأشيع عند رسم مثلّث أو مربّع
     بسرعة. في الحالة الثانية نقصّ الزائدتين حتى لا تُشوّها المطابقة. */
  let closed = gap < diag * 0.28 && len > diag * 1.2;
  if (len > diag * 1.6 && pts.length >= 12) {
    const q = Math.max(2, Math.floor(pts.length / 4));
    let bd = Infinity, bi = 0, bj = pts.length - 1;
    for (let i = 0; i < q; i++) {
      for (let j = pts.length - q; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
    }
    if (bd < diag * 0.1 && (bi > 0 || bj < pts.length - 1)) {
      pts = pts.slice(bi, bj + 1);
      closed = true;
    }
  }

  /* ── مفتوح ───────────────────────────────────────── */
  if (!closed) {
    const simplified = rdp(pts, diag * 0.035);
    // مستقيم؟ نقارن طول المسار بالمسافة المباشرة
    const straightness = gap / Math.max(len, 1e-6);
    if (straightness > 0.9 && simplified.length <= 3) {
      let x2 = last.x, y2 = last.y;
      if (opts.snapAngles !== false) {
        const ang = Math.atan2(y2 - first.y, x2 - first.x);
        const step = Math.PI / 12;              // ١٥°
        const snapped = Math.round(ang / step) * step;
        if (Math.abs(snapped - ang) < step * 0.45) {
          const d = Math.hypot(x2 - first.x, y2 - first.y);
          x2 = first.x + Math.cos(snapped) * d;
          y2 = first.y + Math.sin(snapped) * d;
        }
      }
      return { type: "line", x: first.x, y: first.y, w: x2 - first.x, h: y2 - first.y };
    }
    return null;                                 // منحنى حرّ: نتركه كما هو
  }

  /* ── مغلق ────────────────────────────────────────── */
  if (diag < (opts.minClosedSize ?? 24)) return null;

  const rs = resample(pts, 72);
  if (rs.length < 12) return null;
  const hull = convexHull(rs);
  if (hull.length < 3) return null;
  const hullArea = polyArea(hull);
  if (hullArea < 16) return null;
  const hullPerim = pathLength(hull.concat([hull[0]]));

  /* حرّاس: الرسمة يجب أن تكون حلقة واحدة محدّبة تقريباً. النجمة والقلب
     والحرف «8» والخربشة ليست أشكالاً هندسية — نتركها كما رُسمت. */
  if (polyArea(rs) / hullArea < 0.74) return null;
  const lenRatio = pathLength(rs) / hullPerim;
  if (lenRatio < 0.78 || lenRatio > 1.45) return null;

  const tri = largestTriangle(hull);
  const frame = minAreaRect(hull);
  if (!tri || !frame || frame.a < 1 || frame.b < 1) return null;

  // متوسّط بُعد الرسمة عن محيط كلّ مرشّح، منسوباً لحجم الشكل
  const scale = Math.sqrt(hullArea);
  let eTri = 0, eRect = 0, eEll = 0;
  for (const p of rs) {
    eTri += Math.min(distToSeg(p, tri[0], tri[1]), distToSeg(p, tri[1], tri[2]), distToSeg(p, tri[2], tri[0]));
    const { u, v } = toFrame(frame, p);
    const au = Math.abs(u), av = Math.abs(v);
    eRect += au <= frame.a && av <= frame.b
      ? Math.min(frame.a - au, frame.b - av)
      : Math.hypot(Math.max(au - frame.a, 0), Math.max(av - frame.b, 0));
    const r = Math.hypot(u / frame.a, v / frame.b);
    eEll += r > 1e-6 ? Math.abs(1 - 1 / r) * Math.hypot(u, v) : Math.min(frame.a, frame.b);
  }
  eTri /= rs.length * scale;
  eRect /= rs.length * scale;
  eEll /= rs.length * scale;

  const ranked = ([["triangle", eTri], ["rect", eRect], ["ellipse", eEll]] as const)
    .slice().sort((p, q) => p[1] - q[1]);
  const [kind, err] = ranked[0];
  const next = ranked[1][1];
  /* القبول: قريب كفايةً من مرشّحه، ومتميّز عن الثاني. شكل بين المربّع
     والدائرة بلا رجحان واضح يبقى حرّاً — التخمين الخاطئ أسوأ من عدمه. */
  if (err > 0.05 || (err > 0.018 && next < err * 1.12)) return null;

  if (kind === "triangle") {
    const v = tidyTriangle(refineTriangle(tri, rs, diag));
    const tb = bounds(v);
    return { type: "triangle", x: tb.x, y: tb.y, w: tb.w, h: tb.h, pts: v };
  }

  if (kind === "rect") {
    const f = refineRect(frame, rs);
    let { a, b: hb } = f;
    let ang = f.ang;
    if (Math.abs(a - hb) <= Math.max(a, hb) * 0.12) { const m = (a + hb) / 2; a = m; hb = m; }   // مربّع
    if (Math.abs(ang) <= 12 * DEG) ang = 0;
    else {
      const step = 15 * DEG, snapped = Math.round(ang / step) * step;
      if (Math.abs(snapped - ang) < 6 * DEG) ang = snapped;
    }
    const g: Frame = { cx: f.cx, cy: f.cy, a, b: hb, ang };
    const corners = [fromFrame(g, -a, -hb), fromFrame(g, a, -hb), fromFrame(g, a, hb), fromFrame(g, -a, hb)];
    return { type: "rect", x: g.cx - a, y: g.cy - hb, w: a * 2, h: hb * 2, angle: ang, pts: corners };
  }

  // قطع ناقص
  let { a, b: hb } = frame;
  let ang = frame.ang;
  const round = Math.abs(a - hb) <= Math.max(a, hb) * 0.15;
  if (round) { const m = (a + hb) / 2; a = m; hb = m; ang = 0; }       // دائرة: لا معنى لدورانها
  else if (Math.abs(ang) <= 14 * DEG) ang = 0;
  const g: Frame = { cx: frame.cx, cy: frame.cy, a, b: hb, ang };
  if (ang === 0) return { type: "ellipse", x: g.cx - a, y: g.cy - hb, w: a * 2, h: hb * 2, angle: 0 };
  const ring: Pt[] = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    ring.push(fromFrame(g, a * Math.cos(t), hb * Math.sin(t)));
  }
  return { type: "ellipse", x: g.cx - a, y: g.cy - hb, w: a * 2, h: hb * 2, angle: ang, pts: ring };
}
