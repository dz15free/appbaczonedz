/* ════════════════════════════════════════════════════════════
   معاملات البكالوريا — منقولة حرفياً من حاسبتك العاملة

   ⚠️ **لم يُغيَّر رقم واحد.** المعاملات وأسماء المواد والمادّة
   الاختيارية كما هي في الملفّ الذي أرسلتَه — طلبتَ تطوير الشكل لا
   المنطق، وتغيير معامل واحد يعني معدّلاً خاطئاً يبني عليه طالب قراره.
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
  {"slug": "sciences", "ar": "علوم تجريبية", "short": "علوم تجريبية", "color": "#2350D9", "subjects": [{"name": "علوم الطبيعة والحياة", "coef": 6}, {"name": "الرياضيات", "coef": 5}, {"name": "الفيزياء", "coef": 4}, {"name": "اللغة الإنجليزية", "coef": 3}, {"name": "اللغة العربية وآدابها", "coef": 2}, {"name": "التاريخ", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  {"slug": "math", "ar": "رياضيات", "short": "رياضيات", "color": "#D2453C", "subjects": [{"name": "الرياضيات", "coef": 8}, {"name": "الفيزياء", "coef": 6}, {"name": "الإعلام الآلي", "coef": 3}, {"name": "اللغة الإنجليزية", "coef": 3}, {"name": "علوم الطبيعة والحياة", "coef": 2}, {"name": "التاريخ", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  {"slug": "engineering", "ar": "تقني رياضي (الهندسة)", "short": "تقني رياضي — الهندسة", "color": "#D08217", "subjects": [{"name": "التكنولوجيا (مادة التخصص)", "coef": 7}, {"name": "الرياضيات", "coef": 5}, {"name": "الفيزياء", "coef": 4}, {"name": "الإعلام الآلي", "coef": 3}, {"name": "اللغة الإنجليزية", "coef": 3}, {"name": "التاريخ", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  {"slug": "economy", "ar": "تسيير واقتصاد", "short": "تسيير واقتصاد", "color": "#7C3AED", "subjects": [{"name": "تسيير محاسبي ومالي", "coef": 6}, {"name": "اقتصاد ومناجمنت", "coef": 4}, {"name": "الرياضيات", "coef": 3}, {"name": "اللغة الإنجليزية", "coef": 3}, {"name": "التاريخ والجغرافيا", "coef": 3}, {"name": "اللغة العربية وآدابها", "coef": 2}, {"name": "القانون", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  {"slug": "letters", "ar": "آداب وفلسفة", "short": "آداب وفلسفة", "color": "#C2410C", "subjects": [{"name": "اللغة العربية وآدابها", "coef": 7}, {"name": "الفلسفة", "coef": 6}, {"name": "التاريخ والجغرافيا", "coef": 4}, {"name": "اللغة الإنجليزية", "coef": 3}, {"name": "اللغة الفرنسية", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 3, "optional": true}]},
  {"slug": "languages", "ar": "لغات أجنبية", "short": "لغات أجنبية", "color": "#0E7490", "subjects": [{"name": "لغة أجنبية 3 (إسبانية/ألمانية/إيطالية)", "coef": 6}, {"name": "اللغة الإنجليزية", "coef": 4}, {"name": "اللغة الفرنسية", "coef": 4}, {"name": "اللغة العربية وآدابها", "coef": 2}, {"name": "التاريخ والجغرافيا", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 2, "optional": true}]},
  {"slug": "arts", "ar": "فنون", "short": "فنون", "color": "#DB2777", "subjects": [{"name": "فنون 1 (التخصص)", "coef": 6}, {"name": "فنون 2", "coef": 5}, {"name": "اللغة العربية وآدابها", "coef": 4}, {"name": "اللغة الإنجليزية", "coef": 2}, {"name": "اللغة الفرنسية", "coef": 2}, {"name": "التاريخ والجغرافيا", "coef": 2}, {"name": "العلوم الإسلامية", "coef": 2}, {"name": "التربية البدنية", "coef": 1}, {"name": "اللغة الأمازيغية", "coef": 3, "optional": true}]}
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
