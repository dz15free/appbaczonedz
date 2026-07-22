/* ════════════════════════════════════════════════════════════
   التعرّف على الأشكال — «السبورة تفهم قصدك»

   رياضيات خالصة، بلا أي مكتبة خارجية:
     ١) تبسيط المسار (Ramer–Douglas–Peucker)
     ٢) مغلق أم مفتوح؟
     ٣) مفتوح + انحراف منخفض → خط (مع محاذاة لأقرب ١٥°)
     ٤) مغلق: نسبة المساحة للمحيط² تميّز الدائرة، وعدد الرؤوس
        يميّز المثلّث من المستطيل

   مبدأ أساسي: التعرّف **اقتراح لا إلزام**. المستدعي يعرض
   حركة ناعمة وزرّ تراجع، ويمكن تعطيله كلّياً (وضع الرسم الحرّ).
════════════════════════════════════════════════════════════ */

export interface Pt { x: number; y: number }

export type Recognized =
  | { type: "line"; x: number; y: number; w: number; h: number }
  | { type: "arrow"; x: number; y: number; w: number; h: number }
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "ellipse"; x: number; y: number; w: number; h: number }
  | { type: "triangle"; x: number; y: number; w: number; h: number }
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

/* ── التعرّف ───────────────────────────────────────── */

export interface RecognizeOptions {
  /** محاذاة الخطوط لأقرب ١٥° */
  snapAngles?: boolean;
  /** اعتبار المسار سهماً إن انتهى برأس حادّ */
  detectArrow?: boolean;
}

/**
 * يحاول التعرّف على شكل من مسار حرّ.
 * يرجع null إن لم يكن واثقاً — والرسم الحرّ يبقى كما هو.
 */
export function recognize(raw: Pt[], opts: RecognizeOptions = {}): Recognized {
  if (!raw || raw.length < 4) return null;

  const b = bounds(raw);
  const diag = Math.hypot(b.w, b.h);
  if (diag < 8) return null;                    // نقرة لا رسمة

  const simplified = rdp(raw, diag * 0.035);
  const first = raw[0], last = raw[raw.length - 1];
  const gap = Math.hypot(last.x - first.x, last.y - first.y);
  const len = pathLength(raw);
  const closed = gap < diag * 0.28 && len > diag * 1.2;

  /* ── مفتوح ───────────────────────────────────────── */
  if (!closed) {
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
  const area = polyArea(simplified);
  if (area < 4) return null;

  // معامل الاستدارة: 4π·A / P²  → 1 للدائرة المثالية
  const perim = pathLength(raw);
  const circ = (4 * Math.PI * area) / (perim * perim);

  if (circ > 0.72) {
    return { type: "ellipse", x: b.x, y: b.y, w: b.w, h: b.h };
  }

  // عدد الرؤوس (نطرح واحداً لأنّ نقطة الإغلاق تتكرّر)
  const corners = Math.max(simplified.length - 1, 0);

  if (corners === 3) return { type: "triangle", x: b.x, y: b.y, w: b.w, h: b.h };
  if (corners === 4 || corners === 5) {
    // مستطيل إن كانت المساحة قريبة من مساحة الصندوق
    if (area / Math.max(b.w * b.h, 1e-6) > 0.62) {
      return { type: "rect", x: b.x, y: b.y, w: b.w, h: b.h };
    }
  }
  if (circ > 0.55) return { type: "ellipse", x: b.x, y: b.y, w: b.w, h: b.h };

  return null;
}
