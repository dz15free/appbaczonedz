/* ════════════════════════════════════════════════════════════
   معاملات البكالوريا — النظام المعمول به

   المرجع: القرار رقم 186 المؤرّخ في 23 مارس 2006، الذي أعاده إلى
   السريان القرارُ رقم 36 المؤرّخ في 9 سبتمبر 2026 بإلغائه القرار
   رقم 20 المؤرّخ في 28 جويلية 2026.

   كل جدول أدناه مُتحقَّق منه حسابياً: مجموع المعاملات الإجبارية
   مكتوب فوق كل شعبة، والأمازيغية خارجه لأنّها بونص لا تدخل القاسم.

   ⚠️ رقمٌ واحد خاطئ هنا يعني معدّلاً خاطئاً يبني عليه طالب ترتيب
   رغباته. لا يُعدَّل شيء إلّا مقابل نصّ وزاري.
════════════════════════════════════════════════════════════ */

export interface CalcSubject {
  name: string;
  coef: number;
  /** المادّة الاختيارية (الأمازيغية): بونص لا تدخل في القاسم */
  optional?: boolean;
}

export interface Branch {
  /** المعرّف في الرابط — ثابت بعد النشر */
  slug: string;
  /** الاسم الكامل كما في الوزارة */
  ar: string;
  /** اسم قصير للعناوين والبطاقات */
  short: string;
  color: string;
  subjects: CalcSubject[];
}

export const BRANCHES: Branch[] = [
  /* مجموع المعاملات الإجبارية: 30 */
  {"slug": "sciences", "ar": "علوم تجريبية", "short": "علوم تجريبية", "color": "#2350D9", "subjects": [{"name": "علوم الطبيعة والحياة", "coef": 6}, {"name": "الرياضيات", "coef": 5}, {"name": "العلوم الفيزيائية", "coef": 5}, {"name": "اللغة العربية وآدابها", "coef": 3}, {"name": "اللغة الفرنسية", "coef": 2}, {"name": "اللغة الإنجليزية", "coef": 2}, {"name": "الفلسفة", "coef": 2}, {"name": "التاريخ والجغرافيا", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  /* مجموع المعاملات الإجبارية: 29 */
  {"slug": "math", "ar": "رياضيات", "short": "رياضيات", "color": "#D2453C", "subjects": [{"name": "الرياضيات", "coef": 7}, {"name": "العلوم الفيزيائية", "coef": 6}, {"name": "اللغة العربية وآدابها", "coef": 3}, {"name": "علوم الطبيعة والحياة", "coef": 2}, {"name": "اللغة الفرنسية", "coef": 2}, {"name": "اللغة الإنجليزية", "coef": 2}, {"name": "الفلسفة", "coef": 2}, {"name": "التاريخ والجغرافيا", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  /* مجموع المعاملات الإجبارية: 33 */
  {"slug": "engineering", "ar": "تقني رياضي", "short": "تقني رياضي", "color": "#D08217", "subjects": [{"name": "التكنولوجيا (مادة التخصص)", "coef": 7}, {"name": "الرياضيات", "coef": 6}, {"name": "العلوم الفيزيائية", "coef": 6}, {"name": "اللغة العربية وآدابها", "coef": 3}, {"name": "اللغة الفرنسية", "coef": 2}, {"name": "اللغة الإنجليزية", "coef": 2}, {"name": "الفلسفة", "coef": 2}, {"name": "التاريخ والجغرافيا", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  /* مجموع المعاملات الإجبارية: 34 */
  {"slug": "economy", "ar": "تسيير واقتصاد", "short": "تسيير واقتصاد", "color": "#7C3AED", "subjects": [{"name": "تسيير محاسبي ومالي", "coef": 6}, {"name": "اقتصاد ومناجمنت", "coef": 5}, {"name": "الرياضيات", "coef": 5}, {"name": "التاريخ والجغرافيا", "coef": 4}, {"name": "اللغة العربية وآدابها", "coef": 3}, {"name": "القانون", "coef": 2}, {"name": "اللغة الفرنسية", "coef": 2}, {"name": "اللغة الإنجليزية", "coef": 2}, {"name": "الفلسفة", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 1, "optional": true}]},
  /* مجموع المعاملات الإجبارية: 27 */
  {"slug": "letters", "ar": "آداب وفلسفة", "short": "آداب وفلسفة", "color": "#C2410C", "subjects": [{"name": "اللغة العربية وآدابها", "coef": 6}, {"name": "الفلسفة", "coef": 6}, {"name": "التاريخ والجغرافيا", "coef": 4}, {"name": "اللغة الفرنسية", "coef": 3}, {"name": "اللغة الإنجليزية", "coef": 3}, {"name": "الرياضيات", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  /* مجموع المعاملات الإجبارية: 28 */
  {"slug": "languages", "ar": "لغات أجنبية", "short": "لغات أجنبية", "color": "#0E7490", "subjects": [{"name": "اللغة العربية وآدابها", "coef": 5}, {"name": "اللغة الفرنسية", "coef": 5}, {"name": "اللغة الإنجليزية", "coef": 5}, {"name": "لغة أجنبية 3 (إسبانية/ألمانية/إيطالية)", "coef": 4}, {"name": "التاريخ والجغرافيا", "coef": 2}, {"name": "الفلسفة", "coef": 2}, {"name": "الرياضيات", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
];

export function getBranch(slug: string): Branch | null {
  return BRANCHES.find((b) => b.slug === slug) ?? null;
}

/** مجموع المعاملات الإجبارية — القاسم في المعادلة */
export function totalCoef(b: Branch): number {
  return b.subjects.filter((s) => !s.optional).reduce((t, s) => t + s.coef, 0);
}

export interface CalcResult {
  average: number;
  totalPoints: number;
  totalCoef: number;
  /** نقاط البونص من المادّة الاختيارية */
  bonus: number;
  passed: boolean;
  mention: string;
}

export function mentionOf(avg: number): string {
  if (avg >= 18) return "ممتاز";
  if (avg >= 16) return "جيّد جدّاً";
  if (avg >= 14) return "جيّد";
  if (avg >= 12) return "قريب من الجيّد";
  if (avg >= 10) return "مقبول";
  return "دون المعدّل";
}

/**
 * حساب المعدّل — **نفس منطق حاسبتك حرفياً**:
 *
 *   الإجبارية : المجموع += العلامة × المعامل ، والقاسم += المعامل
 *   الاختيارية: إن تجاوزت 10 فقط → المجموع += (العلامة − 10) × المعامل
 *               **ولا يُضاف معاملها إلى القاسم** — لهذا تُسمّى بونصاً.
 *
 * `grades` مفتاحها اسم المادّة، وقيمتها نصّ (لأنّ الحقل نصّي) أو رقم.
 */
export function calculate(b: Branch, grades: Record<string, string | number>): CalcResult | null {
  let totalPoints = 0;
  let coefSum = 0;
  let bonus = 0;

  for (const s of b.subjects) {
    const raw = grades[s.name];
    const txt = typeof raw === "number" ? String(raw) : (raw ?? "").trim().replace(",", ".");

    if (txt === "") {
      // الاختيارية يجوز تركها فارغة؛ الإجبارية لا
      if (s.optional) continue;
      return null;
    }
    const g = Number(txt);
    if (!Number.isFinite(g) || g < 0 || g > 20) return null;

    if (s.optional) {
      if (g > 10) {
        const add = (g - 10) * s.coef;
        totalPoints += add;
        bonus += add;
      }
    } else {
      totalPoints += g * s.coef;
      coefSum += s.coef;
    }
  }

  if (coefSum === 0) return null;
  const average = totalPoints / coefSum;
  return {
    average,
    totalPoints,
    totalCoef: coefSum,
    bonus,
    passed: average >= 10,
    mention: mentionOf(average),
  };
}

/** التحقّق من علامة واحدة — للتغذية الراجعة الفورية أثناء الكتابة */
export function gradeError(v: string, optional?: boolean): string | null {
  const t = v.trim().replace(",", ".");
  if (t === "") return optional ? null : "مطلوبة";
  const n = Number(t);
  if (!Number.isFinite(n)) return "أدخل رقماً";
  if (n < 0 || n > 20) return "بين 0 و20";
  return null;
}
