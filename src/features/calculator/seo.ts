import { calculate, totalCoef, type Branch, type CalcResult } from "./branches";

/* ════════════════════════════════════════════════════════════
   بيانات السيو لصفحات حساب المعدّل — مصدر واحد

   كلّ ما تعرضه صفحتا `/calculate` و`/calculate/[branch]` من نصّ مرتبط
   بالسنة أو بالمرجع القانوني يُقرأ من هنا. فعند دورة جديدة يُغيَّر رقم
   واحد، لا عشرون جملة موزّعة في صفحتين (وهكذا بقي عنوان الصفحة الجامعة
   يقول «2026» بعد أن صارت صفحات الشعب «2027»).

   ⚠️ لا رقم هنا يُكتب يدوياً من الجداول: المثال المحسوب يمرّ من
   `calculate` نفسها، فلا يختلف ما يقرأه الزائر عمّا تُخرجه الحاسبة.
════════════════════════════════════════════════════════════ */

/** دورة البكالوريا التي يُحضَّر لها الآن */
export const BAC_YEAR = 2027;

/* المرجع القانوني للمعاملات — يطابق ما هو موثَّق في `branches.ts` */
export const COEF_LAW = {
  /** القرار الساري */
  inForce: { no: 186, date: "23 مارس 2006" },
  /** القرار الذي عدّل المواقيت والمعاملات ثمّ أُلغي */
  cancelled: { no: 20, date: "28 جويلية 2026" },
  /** قرار الإلغاء */
  cancelling: { no: 36, date: "9 سبتمبر 2026" },
} as const;

/** تاريخ آخر مراجعة لمحتوى صفحات الحاسبة (ISO) — يُعلَن في الخريطة والبيانات المنظّمة */
export const CALC_UPDATED = "2026-11-11";

/** التقديرات — الحدود نفسها التي تعتمدها `mentionOf` */
export const MENTIONS: { from: string; label: string }[] = [
  { from: "من 10 إلى أقلّ من 12", label: "مقبول" },
  { from: "من 12 إلى أقلّ من 14", label: "قريب من الجيّد" },
  { from: "من 14 إلى أقلّ من 16", label: "جيّد" },
  { from: "من 16 إلى أقلّ من 18", label: "جيّد جدّاً" },
  { from: "18 فما فوق", label: "ممتاز" },
];

/* علامات المثال: ثابتة ومتنوّعة، تُوزَّع على المواد الإجبارية بترتيبها.
   ليست علامات تلميذ حقيقي ولا «متوسّطاً وطنياً» — مثال توضيحي وحسب،
   ويُقال ذلك صراحةً بجانبه. */
const SAMPLE = [13, 11.5, 12, 14, 10.5, 12.5, 11, 13.5, 15, 16, 12];

export interface ExampleRow { name: string; grade: number; coef: number; points: number }
export interface BranchExample { rows: ExampleRow[]; result: CalcResult }

/** مثال محسوب لشعبة: الأمازيغية متروكة فارغة (كما يفعل أغلب المترشّحين) */
export function exampleFor(b: Branch): BranchExample {
  const mandatory = b.subjects.filter((s) => !s.optional);
  const rows = mandatory.map((s, i) => {
    const grade = SAMPLE[i % SAMPLE.length];
    return { name: s.name, grade, coef: s.coef, points: grade * s.coef };
  });
  const grades: Record<string, number> = {};
  for (const r of rows) grades[r.name] = r.grade;
  const result = calculate(b, grades);
  /* مستحيل عملياً (كلّ الإجبارية معبّأة وضمن 0–20)، لكنّ صفحةً تعرض
     مثالاً خاطئاً أسوأ من بناءٍ يفشل. */
  if (!result) throw new Error(`calculator example failed for ${b.slug}`);
  return { rows, result };
}

/** رقم بفاصلتين عشريتين على الأكثر، بلا أصفار زائدة: 12.5 لا 12.50 */
export function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** المعدّل كما تعرضه الحاسبة: خانتان عشريتان دائماً */
export function avg(n: number): string {
  return n.toFixed(2);
}

/** أثقل المواد الإجبارية — لجملة «أين يقع ثقل المعدّل» وللأسئلة الشائعة */
export function topSubjects(b: Branch, n = 3) {
  return b.subjects.filter((s) => !s.optional).sort((a, c) => c.coef - a.coef).slice(0, n);
}

/* مصفوفة «كلّ الشعب»: صفّ لكل مادّة وعمود لكل شعبة.
   الأسماء تُوحَّد للعرض فقط (مادّة التخصّص التكنولوجية تبقى باسمها). */
export function coefMatrix(branches: Branch[]) {
  const order: string[] = [];
  for (const b of branches) for (const s of b.subjects) if (!order.includes(s.name)) order.push(s.name);
  /* الأمازيغية آخراً دائماً: اختيارية وخارج القاسم */
  order.sort((a, c) => Number(a.includes("الأمازيغية")) - Number(c.includes("الأمازيغية")));
  return {
    rows: order.map((name) => ({
      name,
      optional: branches.some((b) => b.subjects.some((s) => s.name === name && s.optional)),
      coefs: branches.map((b) => b.subjects.find((s) => s.name === name)?.coef ?? null),
    })),
    totals: branches.map((b) => totalCoef(b)),
  };
}
