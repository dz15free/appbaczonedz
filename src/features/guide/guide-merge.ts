/* ════════════════════════════════════════════════════════════
   دمج الدليل — وحدة **محايدة** (بلا "use client" وبلا Firebase)

   🐛 كانت هذه الدوالّ داخل `guide-store.ts` وأعلاه `"use client"`،
   وهي تستورد `SEED_CONTENT` — **١٫١٩ ميغابايت** من محتوى الدليل.
   فكانت الحزمة كلّها تُشحن إلى متصفّح كل زائر لصفحتي التخصّصات، ثمّ
   يُرمى نصفها لحظة وصول بيانات Firebase.

   وأخطر من ذلك: لأنّ الصفحة كانت مكوّن عميل يجلب المحتوى في
   `useEffect`، فإنّ ما يصل إلى زاحف Google هو هذا حرفياً:

       <main>جارٍ التحميل…</main>

   لا عنوان، ولا نصّ، ولا بيانات منظّمة — في **٢٦٠ صفحة** مُرسَلة
   إليه في `sitemap.xml`. بفصل الدمج هنا صار الخادم يقرؤه ويُصيّر
   الصفحة جاهزة، ولا يحمّل الزائر بايتاً واحداً من البذرة.
   ════════════════════════════════════════════════════════════ */

import { SPEC_INDEX, type SpecLite } from "@/features/guide/spec-index";
import { SEED_CONTENT } from "@/features/guide/seed-content";
import { SOURCE_HEALTH_SPECIALTIES } from "@/features/guide/source-health-specialties";
import { P13_ENRICHED_CONTENT, P13_KEEP_NOINDEX_SLUGS } from "@/features/guide/p13-fusha-content";
import { P15_SOURCE_CONTENT } from "@/features/guide/p15-source-driven-content";

export interface SourceSection {
  id: string;
  sourceKey?: string;
  label: string;
  icon?: string;
  tone?: "pro" | "con" | null;
  body: string;
}

export interface SpecContent {
  /** الرابط الظاهر — إن غاب استُعمل المعرّف */
  permalink?: string;
  /** روابط سابقة تظلّ تعمل بعد التغيير */
  aliases?: string[];
  title?: string;
  fr?: string;
  field?: string;
  /** وصف قصير للسيو ولبطاقة الفهرس */
  excerpt?: string;
  intro?: string;
  study?: string;
  admission?: string;
  subjects?: string;
  careers?: string;
  pros?: string;
  cons?: string;
  verdict?: string;
  /* أقسام إضافية من مراجع المناهج — تُثري المقال بما يهمّ الطالب فعلاً
     ولا يجده في الوصف الرسمي: ماذا بعد الليسانس، أين يُدرَّس، وماذا
     يقول من درسه. */
  modules?: string;
  master?: string;
  where?: string;
  sources?: string;
  salary?: string;
  daily?: string;
  numbers?: string;
  future?: string;
  voices?: string;
  prosCons?: string;
  /** أقسام مصدرية متغيرة بحسب بنية صفحة التخصص الأصلية */
  sections?: SourceSection[];
  /** مسودّة لا تظهر للزوّار */
  draft?: boolean;
  updatedAt?: number;
}

const P13_CONTENT = P13_ENRICHED_CONTENT as Record<string, Partial<SpecContent>>;
const P15_CONTENT = P15_SOURCE_CONTENT as unknown as Record<string, Partial<SpecContent>>;

export type SpecQuality = "rich" | "medium" | "needs-review";

export type SpecFull = SpecLite & SpecContent & {
  published: boolean;
  /** عدد الأحرف النصية في الحقول التحريرية، بعد إزالة تنسيق Markdown البسيط. */
  contentChars: number;
  /** عدد الحقول الأساسية المكتوبة: التعريف، الدراسة، القبول، العمل، والخلاصة. */
  coreFieldCount: number;
  /** صفحة مكتملة بما يكفي للإعلان عنها في sitemap، لا مجرد صفحة لها مقدمة. */
  indexable: boolean;
  quality: SpecQuality;
};

const CONTENT_FIELDS: (keyof SpecContent)[] = [
  "intro", "study", "admission", "subjects", "careers", "pros", "cons", "verdict",
  "modules", "master", "where", "sources", "numbers", "future", "salary", "daily", "voices", "prosCons",
];
const CORE_FIELDS: (keyof SpecContent)[] = ["intro", "study", "admission", "careers", "verdict"];

function plainText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/[*#_`>•\-]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function editorialQuality(content: SpecContent): Pick<SpecFull, "contentChars" | "coreFieldCount" | "indexable" | "quality"> {
  const fieldChars = CONTENT_FIELDS.reduce((total, field) => total + plainText(content[field]).length, 0);
  const sectionChars = Array.isArray(content.sections)
    ? content.sections.reduce((total, section) => total + plainText(section.body).length, 0)
    : 0;
  const contentChars = fieldChars + sectionChars;
  const coreFieldCount = CORE_FIELDS.filter((field) => plainText(content[field]).length > 0).length;
  // لا نعتمد على عدد الكلمات وحده: نطلب الحد الأدنى من الحقول التي يحتاجها
  // الطالب لاتخاذ قرار، مع إبقاء الصفحة الضعيفة متاحة للمراجعة المباشرة.
  const indexable = contentChars >= 1200 && coreFieldCount >= 4;
  const quality: SpecQuality = contentChars >= 2600 && coreFieldCount === CORE_FIELDS.length
    ? "rich"
    : indexable
      ? "medium"
      : "needs-review";
  return { contentChars, coreFieldCount, indexable, quality };
}

/* بعض مفاتيح المحتوى تحمل علامات فرنسية، بينما الروابط الثابتة في الفهرس
   تستعمل صيغة ASCII. نطابق الصيغتين بعد إزالة العلامات فقط؛ لا نغيّر
   الرابط العام ولا ننسخ المحتوى إلى مفاتيح مكررة. */
function plainSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const SEED_BY_PLAIN_SLUG = new Map(
  Object.entries(SEED_CONTENT).map(([slug, value]) => [plainSlug(slug), value]),
);

/* لا نعرض حقل voices عندما ينسب تجارب أو آراء إلى الطلبة من دون سجل
   منشور أو مصدر يمكن التحقق منه. تبقى بقية الحقول والروابط متاحة، ويمكن
   للمحرر إعادة الحقل بعد توثيقه. هذا استثناء صغير، لا إعادة كتابة جماعية. */
const UNVERIFIED_VOICE_SLUGS = new Set([
  "informatique",
  "ens-electrical-lycee",
  "ens-civil-lycee",
  "ens-mechanics-lycee",
  "ens-process-eng-lycee",
  "ens-sport-moyen",
  "ens-anglais-primaire",
  "ens-francais-primaire",
  "ens-sport-primaire",
  "ens-tamazight-primaire",
  "ens",
  "med-psy",
  "math",
  "ensh",
  "hydrocarbures",
]);

/* claims عالية الخطورة لا تُترك في الصفحة بصيغة تقريرية عند غياب مصدر مطابق.
   نزيل السطر الذي يحمل claim، لا الصفحة ولا الحقل التعليمي كله؛ أما
   salary/numbers فهما حقول مخصصة للأرقام ولذلك يُخفَيان إذا لم يثبتا. */
const WHOLE_FIELD_RISK = new Set<keyof SpecContent>(["salary"]);
const RISKY_CLAIM = /معدل القبول|معدل الترشح|عدد المقاعد|راتب|الراتب|منحة|توظيف|مضمون|يضمن|مطلوب جداً|مطلوب جدًا|منصب الشغل|الامتيازات|100%|\d+(?:[.,]\d+)?\s*(?:\/20|دج|%|شهر|طالب|مقعد)/u;
const SAFE_EDUCATIONAL_DURATION = /(?:مدة الدراسة|نظام الدراسة|مدة التكوين|الدراسة لمدة|تكوين يمتد|تستغرق الدراسة)[^\n]{0,140}?\d+(?:[.,]\d+)?\s*(?:سنة|سنوات|عام|أعوام|عامين|ثلاث سنوات|أربع سنوات|خمس سنوات|ست سنوات)/u;
const URL_TOKEN = /https?:\/\/[^\s]+/gu;

/* لا نحسب الأرقام الموجودة داخل URL-encoded الرسمي كـclaim؛ فالتسلسل
   `%D8%...` يحتوي أرقاماً وعلامة `%` لكنه ليس معدل قبول أو نسبة. */
function hasUnverifiedRisk(value: string): boolean {
  const withoutUrls = value.replace(URL_TOKEN, "");
  const withoutSafeDurations = withoutUrls.split("\n").map((line) => line.replace(SAFE_EDUCATIONAL_DURATION, "")).join("\n");
  return RISKY_CLAIM.test(withoutSafeDurations);
}

function cleanUnverifiedRisk(value: string): string | undefined {
  const safeLines = value.split("\n").filter((line) => !hasUnverifiedRisk(line));
  const cleaned = safeLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned || undefined;
}

function sanitizePublicEditorialContent(slug: string, content: SpecContent): SpecContent {
  const sanitized: SpecContent = { ...content };
  if (UNVERIFIED_VOICE_SLUGS.has(slug)) delete sanitized.voices;
  if (sanitized.voices && hasUnverifiedRisk(sanitized.voices)) delete sanitized.voices;
  for (const field of CONTENT_FIELDS) {
    const value = sanitized[field];
    if (typeof value !== "string" || !value.trim()) continue;
    /* numbers هو قسم معدلات منقولة من ملف مصدر مع تنبيه السنة؛ لا نحذفه
       كحقول الرواتب، ولا نسمح له بتجاوز بقية قواعد التنقية. */
    if (field === "numbers") continue;
    if (WHOLE_FIELD_RISK.has(field)) {
      delete sanitized[field];
      continue;
    }
    if (hasUnverifiedRisk(value)) (sanitized as Record<string, string | undefined>)[field] = cleanUnverifiedRisk(value);
  }
  if (slug === "ensm" && sanitized.pros) {
    sanitized.pros = sanitized.pros.replace(
      "التوظيف بعد التخرّج سريع ونسبته عالية حسب إجماع الطلبة.",
      "فرص العمل تختلف بحسب المسار والمؤسسة وسوق العمل، ولا تكفي الشهادة وحدها للحكم عليها.",
    );
  }
  return sanitized;
}

const EDITORIAL_DISAMBIGUATORS: Record<string, string> = {
  "ens-anglais-primaire": "تدريس اللغة الإنجليزية في المرحلة الابتدائية",
  "ens-francais-primaire": "تدريس اللغة الفرنسية في المرحلة الابتدائية",
  "ens-sport-primaire": "التربية البدنية والرياضية في المرحلة الابتدائية",
  "ens-tamazight-primaire": "تدريس اللغة الأمازيغية في المرحلة الابتدائية",
};

/* محتوى هذه الصفحات صار مفيداً وقابلاً للقراءة، لكن مصدره المفتوح في هذه
   الجولة عام لشبكة ENS وسياق تكوين الأساتذة، لا بطاقة رسمية مطابقة لكل
   لغة/طور. تبقى الصفحات accessible مع noindex إلى أن يتوفر عرض مؤسسي
   مطابق؛ لا نرفعها إلى البحث لمجرد بلوغ حد الأحرف. */
const GENERAL_SOURCE_ONLY_NOINDEX = new Set([
  "ens-anglais-primaire",
  "ens-francais-primaire",
  "ens-sport-primaire",
  "ens-tamazight-primaire",
]);

function focusPhrase(content: SpecContent): string {
  const candidates = [content.subjects, content.modules, content.study, content.pros, content.intro];
  for (const candidate of candidates) {
    const value = plainText(candidate);
    if (!value) continue;
    const first = value.split(/[.!؟؛:\n]/u)[0].trim();
    if (first.length >= 24) return first.slice(0, 190);
  }
  return "المفاهيم والمهارات المرتبطة بهذا الميدان";
}

/* تقلّل القالبية الظاهرة في المقدمات والخواتيم من دون اختلاق حقائق جديدة:
   نعيد بناء النص فقط عندما يطابق القالب العام القديم، ونستعمل جملة تركيز
   مأخوذة من محتوى الصفحة نفسه بعد التنقية. */
function personalizeEditorialText(slug: string, content: SpecContent, fallbackTitle: string, fallbackField: string): SpecContent {
  const personalized: SpecContent = { ...content };
  const title = plainText(personalized.title) || fallbackTitle;
  const field = plainText(personalized.field) || fallbackField;
  const focus = focusPhrase(personalized);
  const disambiguator = EDITORIAL_DISAMBIGUATORS[slug];
  const distinctFocus = disambiguator ? `${focus}، مع الانتباه إلى ${disambiguator}` : focus;
  const intro = personalized.intro?.trim() || "";
  const excerpt = personalized.excerpt?.trim() || "";
  const genericEditorialPattern = /لماذا تقرأ هذه الصفحة|هنا تجد\s+\**?ما تدرسه فعلاً|ماذا تدرس فيه، شروط القبول، وفرص العمل بعد التخرّج في الجزائر|ماذا تدرس فيه، شروط القبول، وفرص العمل بعد التخرج في الجزائر/u;
  const generatedIntro = `قبل أن تختار ${title}، من المفيد أن تعرف ما الذي ستقرأه وتطبّقه فعلاً داخل المسار. يركّز هذا الدليل على ${distinctFocus}، ثم يربط ذلك بطبيعة مجال ${field} وبالأسئلة التي ينبغي أن تطرحها على نفسك قبل ترتيب الرغبات.`;
  /* بعض السجلات القديمة وضعت القالب في excerpt لا intro؛ نعالج المصدرين
     معاً حتى لا يعود النص نفسه إلى الصفحة عبر fallback العرض أو metadata. */
  if (genericEditorialPattern.test(intro) || (!intro && genericEditorialPattern.test(excerpt))) {
    personalized.intro = generatedIntro;
  }
  if (genericEditorialPattern.test(excerpt) || (!excerpt && personalized.intro === generatedIntro)) {
    personalized.excerpt = generatedIntro;
  }
  const verdict = personalized.verdict?.trim() || "";
  if (verdict.includes("القاعدة التي ننصح بها في BacZone") || verdict.includes("المعدّلات المذكورة أعلاه من سنوات سابقة") || verdict.includes("خلاصة عملية: اسأل نفسك هل تستطيع متابعة")) {
    let lead = verdict;
    const ruleIndex = lead.indexOf("**القاعدة التي ننصح بها في BacZone:**");
    if (ruleIndex >= 0) lead = lead.slice(0, ruleIndex);
    const adviceIndex = lead.indexOf("**نصيحة عملية:**");
    if (adviceIndex >= 0) lead = lead.slice(0, adviceIndex);
    const practicalIndex = lead.indexOf("خلاصة عملية:");
    if (practicalIndex >= 0) lead = lead.slice(0, practicalIndex);
    const historicalIndex = lead.indexOf("المعدّلات المذكورة أعلاه من سنوات سابقة");
    if (historicalIndex >= 0) lead = lead.slice(0, historicalIndex);
    lead = lead.replace(/\n+/gu, " ").replace(/القسم\s+\d+\s+الخلاصة/gu, "").trim();
    personalized.verdict = `${lead ? `${lead}\n\n` : ""}**خلاصة عملية تخص ${title}:** اسأل نفسك هل تستطيع متابعة ${distinctFocus} بانتظام، وهل يناسبك مجال ${field} كما هو في الدراسة اليومية لا كما يبدو في الاسم. إذا كانت الإجابة نعم، فارجع إلى شروط التوجيه الرسمية للسنة المعنية واتخذ قرارك على أساس واضح.`;
  }
  return personalized;
}

/** يدمج الفهرس الثابت مع ما كتبتَه */
export function mergeGuide(content: Record<string, SpecContent>): SpecFull[] {
  const allSpecIndex: SpecLite[] = SPEC_INDEX;
  return allSpecIndex.map((s) => {
    /* البذرة أساس، وما كتبتَه في لوحة الإدارة يفوز عليها حقلاً حقلاً —
       فتستطيع تعديل قسم واحد دون إعادة كتابة الباقي. */
    const baseSeed = SEED_CONTENT[s.slug] ?? SEED_BY_PLAIN_SLUG.get(plainSlug(s.slug));
    /* محتوى التخصصات الصحية المضافة يكمل البذرة، ثم تفوز طبقة P13 العربية الفصيحة على المحتوى القديم لهذه الصفحات لضمان اتساق المراجعة الجديدة. */
    const c = personalizeEditorialText(s.slug, sanitizePublicEditorialContent(s.slug, {
      ...(SOURCE_HEALTH_SPECIALTIES[s.slug] ?? {}),
      ...(baseSeed ?? {}),
      ...(content?.[s.slug] ?? {}),
      ...(P13_CONTENT[s.slug] ?? {}),
      ...(P15_CONTENT[s.slug] ?? {}),
      ...(P15_CONTENT[s.slug] ? { draft: false } : {}),
    }), s.ar, s.field);
    const published = Boolean(c.intro?.trim()) && c.draft !== true;
    const quality = editorialQuality(c);
    // noindex يعبّر عن سياسة فهرسة محافظة، ولا يعني أن المقال نفسه ناقص؛
    // لذلك نحافظ على تقييم المحتوى الحقيقي ونفصل بين جودة التحرير وقابلية الفهرسة.
    const finalQuality = GENERAL_SOURCE_ONLY_NOINDEX.has(s.slug) || P13_KEEP_NOINDEX_SLUGS.has(s.slug)
      ? { ...quality, indexable: false }
      : quality;
    return {
      ...s,
      ...c,
      ar: c.title?.trim() || s.ar,
      fr: c.fr?.trim() || s.fr,
      field: c.field?.trim() || s.field,
      // وجود مقدمة يتيح الوصول إلى الصفحة، لكنه لا يكفي وحده لإدراجها في sitemap.
      published,
      ...finalQuality,
    };
  });
}


/* `linkOf` و`normalizePermalink` في `spec-link.ts`: استيرادهما من هنا
   يجرّ `SEED_CONTENT` معهما إلى أي مكوّن عميل يحتاج بناء رابط. */
export { linkOf, normalizePermalink } from "@/features/guide/spec-link";
