/* ════════════════════════════════════════════════════════════
   المعدّل الموزون — منقول حرفياً من أداتك

   ⚠️ **لم تُغيَّر معادلة واحدة.** المعاملات والميادين والصيغ كما هي في
   الملفّ الذي أرسلته: معدّل خاطئ هنا يعني طالباً يبني ترتيب رغباته على
   رقم لا وجود له.

   والقاعدة العامّة في كل الميادين: **معدّل البكالوريا يُحسب مرّتين**،
   ومادّة التخصّص مرّة واحدة، ثمّ يُقسم المجموع على ثلاثة.
════════════════════════════════════════════════════════════ */

export interface WField {
  id: string;
  label: string;
}

export interface WDomain {
  id: string;
  title: string;
  desc: string;
  color: string;
  fields: WField[];
  formulaText: string;
  calc: (bac: number, v: Record<string, number>) => number;
}

export const W_DOMAINS: WDomain[] = [
  {
    id: "bio_med",
    title: "ميدان الطب والعلوم الطبيعية",
    desc: "الطب · الصيدلة · طب الأسنان · البيطرة · علوم الطبيعة والحياة · علوم الأرض والكون.",
    color: "#1E8A5F",
    fields: [{ id: "science_grade", label: "علامة العلوم الطبيعية" }],
    formulaText: "(معدل البكالوريا × 2 + علامة العلوم الطبيعية) ÷ 3",
    calc: (bac, v) => (bac * 2 + v.science_grade) / 3,
  },
  {
    id: "math_cs",
    title: "الرياضيات والإعلام الآلي",
    desc: "المدارس الوطنية العليا للإعلام الآلي · ميدان رياضيات وإعلام آلي.",
    color: "#2350D9",
    fields: [{ id: "math_grade", label: "علامة الرياضيات" }],
    formulaText: "(معدل البكالوريا × 2 + علامة الرياضيات) ÷ 3",
    calc: (bac, v) => (bac * 2 + v.math_grade) / 3,
  },
  {
    id: "tech_arch",
    title: "هندسة معمارية وعلوم المادة",
    desc: "هندسة معمارية وعمران · علوم المادة · علوم وتكنولوجيا.",
    color: "#4F46E5",
    fields: [
      { id: "math_grade", label: "علامة الرياضيات" },
      { id: "physics_grade", label: "علامة الفيزياء" },
    ],
    formulaText: "(معدل البكالوريا × 2 + (الرياضيات + الفيزياء) ÷ 2) ÷ 3",
    calc: (bac, v) => (bac * 2 + (v.math_grade + v.physics_grade) / 2) / 3,
  },
  {
    id: "tech_math_branch",
    title: "التكنولوجيا — شعبة تقني رياضي",
    desc: "علوم وتكنولوجيا مسار هندسة: طرائق · مدنية · كهربائية · ميكانيكية.",
    color: "#D08217",
    fields: [
      { id: "math_grade", label: "علامة الرياضيات" },
      { id: "tech_grade", label: "علامة مادة التخصص (الهندسة)" },
    ],
    formulaText: "(معدل البكالوريا × 2 + (الرياضيات + علامة التخصص) ÷ 2) ÷ 3",
    calc: (bac, v) => (bac * 2 + (v.math_grade + v.tech_grade) / 2) / 3,
  },
  {
    id: "foreign_languages",
    title: "الآداب واللغات الأجنبية",
    desc: "الفرنسية · الإنجليزية · الإسبانية · الألمانية · الروسية · الإيطالية.",
    color: "#7C3AED",
    fields: [{ id: "lang_grade", label: "علامة لغة الشعبة المطلوبة" }],
    formulaText: "(معدل البكالوريا × 2 + علامة لغة الشعبة المطلوبة) ÷ 3",
    calc: (bac, v) => (bac * 2 + v.lang_grade) / 3,
  },
  {
    id: "translation",
    title: "ميدان الترجمة",
    desc: "ميدان آداب ولغات أجنبية — تخصّص ترجمة.",
    color: "#DB2777",
    fields: [
      { id: "lang1", label: "اللغة الأجنبية 1" },
      { id: "lang2", label: "اللغة الأجنبية 2" },
      { id: "lang3", label: "اللغة الأجنبية 3" },
    ],
    formulaText: "(معدل البكالوريا × 2 + معدل اللغات الثلاث) ÷ 3",
    calc: (bac, v) => (bac * 2 + (v.lang1 + v.lang2 + v.lang3) / 3) / 3,
  },
  {
    id: "humanities_economics",
    title: "العلوم الإنسانية والاقتصاد",
    desc: "الحقوق · العلوم السياسية · الاقتصاد · التسيير · العلوم الإنسانية والاجتماعية.",
    color: "#0E7490",
    fields: [],
    formulaText: "يُعتمد معدّل البكالوريا العامّ مباشرةً بلا ترجيح.",
    calc: (bac) => bac,
  },
];

export function getDomain(id: string): WDomain | null {
  return W_DOMAINS.find((d) => d.id === id) ?? null;
}

/** تحقّق من علامة واحدة — يقبل الفاصلة العربية */
export function gradeError(v: string): string | null {
  const t = (v ?? "").trim().replace(",", ".");
  if (t === "") return "مطلوبة";
  const n = Number(t);
  if (!Number.isFinite(n)) return "أدخل رقماً";
  if (n < 0 || n > 20) return "بين 0 و20";
  return null;
}

export interface WResult {
  weighted: number;
  bac: number;
  /** الفرق عن معدّل البكالوريا — يُظهر أثر الترجيح */
  delta: number;
}

export function computeWeighted(
  domain: WDomain,
  bacRaw: string,
  values: Record<string, string>,
): WResult | null {
  if (gradeError(bacRaw)) return null;
  const bac = Number(bacRaw.trim().replace(",", "."));

  const v: Record<string, number> = {};
  for (const f of domain.fields) {
    if (gradeError(values[f.id] ?? "")) return null;
    v[f.id] = Number((values[f.id] ?? "").trim().replace(",", "."));
  }

  const weighted = domain.calc(bac, v);
  if (!Number.isFinite(weighted)) return null;
  return { weighted, bac, delta: weighted - bac };
}
