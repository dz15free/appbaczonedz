/* ════════════════════════════════════════════════════════════
   فاحص التخصّصات المُراجَعة — يُشغَّل بعد كل دفعة كتابة

   يمنع أربعة أخطاء وقعت فعلاً في هذا المشروع:

   ١) **النصّ لا يصل الصفحة.** أخطرها وأطولها بقاءً: كُتب 44 تخصّصاً
      في `specialities.ts` وهو خارج سلسلة الدمج أصلاً، فبقي الزائر
      يقرأ نصّ `p17` العامّ. لا يكشفه فحص لغوي ولا مدقّق أنواع —
      الملفّ سليم والنصّ سليم، لكنّه غير مقروء.
   ٢) **بقايا الدارجة في حقل لم يُستبدَل** — وقع في `vetrinaire.extra`
      و`med-info.extra` و`assistant-social.subjects` و`cs-eco.cons`
      و`biomedical.subjects`، فتُعرض الفصحى والدارجة في صفحة واحدة.
   ٣) **حقول خارج المخطّط** تبقى إلى جانب الجديدة فيقرأ الزائر نصّين
      متناقضين للمعلومة نفسها.
   ٤) **تكرار المعرّف**: صفحتان لتخصّص واحد — وقع في
      `anesthesie-reanimation` حين أُضيف وهو موجود.

   ⚠️ أنماط الدارجة بحدود كلمات لا بتضمين نصّي: «يديرونها» تحوي
   «يديرو»، و«التحليل» تحوي «لي»، و«يُعنى بصحّة» تحوي «بصح». وفاحصٌ
   يُنذر كاذباً يُهمَل بعد ثالث مرّة، فيصير وجوده أسوأ من غيابه.
════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";

const read = (f, re) => JSON.parse("[" + readFileSync(f, "utf8").match(re)[1].trim().replace(/,$/, "") + "]");
const SRC = "src/features/guide/specialities.ts";
const IDX = "src/features/guide/spec-index.ts";
const REV = "src/features/guide/reviewed-specialities.ts";
const MERGE = "src/features/guide/guide-merge.ts";

const specs = read(SRC, /SPECIALITIES: Speciality\[\] = \[([\s\S]*?)\n\];/);
const index = read(IDX, /SPEC_INDEX[^=]*=\s*\[([\s\S]*?)\n\];/);
const reviewed = read(REV, /REVIEWED_SLUGS: readonly string\[\] = \[([\s\S]*?)\n\];/);

const SCHEMA = ["slug","ar","fr","alt","field","intro","study","modules","subjects","admission",
  "numbers","where","daily","careers","prosCons","master","verdict","extra"];

const DARIJA = [
  /بزاف/, /\bكاين\b/, /\bواش\b/, /\bباه\b/, /\bتاع\b/, /\bراك\b/, /\bماشي\b/,
  /\bيديرو\b/, /ماراكش/, /\bوين\b/, /\bتقدر\b/, /\bراهي\b/, /\bباش\b/, /كيفاش/,
  /\bمليح\b/, /\bشوية\b/, /\bكلش\b/, /\bبرك\b/, /ديريكت/, /السبيطار/, /\bديرها\b/,
  /\bهدرة\b/, /\bخاطيك\b/, /\bبنادم\b/, /\bنتاع\b/, /\bهاد\b/, /\bبكري\b/, /\bخلونا\b/,
];

let errors = 0;
const fail = (m) => { console.error("  ✗ " + m); errors++; };

/* ── ١) هل تصل المراجعة إلى الصفحة؟ ──
   فحص بنيوي لا لغوي: يتأكّد أنّ الدمج يستورد الملفّ ويضع طبقته بعد
   كل الطبقات الأخرى. ترتيب `spread` هو ما يقرّر أيّ نصّ يفوز. */
const merge = readFileSync(MERGE, "utf8");
if (!merge.includes('from "@/features/guide/specialities"'))
  fail("guide-merge لا يستورد specialities — المراجعات لن تظهر للزائر");
if (!merge.includes('from "@/features/guide/reviewed-specialities"'))
  fail("guide-merge لا يستورد قائمة المُراجَع");
const spreadOrder = [...merge.matchAll(/\.\.\.\((\w+)/g)].map((m) => m[1]);
const last = spreadOrder.lastIndexOf("reviewed");
if (last === -1) fail("طبقة المُراجَع غائبة عن الدمج");
else if (spreadOrder.slice(last + 1).some((n) => n !== "reviewed"))
  fail("طبقة المُراجَع ليست الأخيرة — طبقة أخرى تكتب فوقها");

/* ── ٢) تطابق المصدر والفهرس ── */
const idxBySlug = new Map(index.map((r) => [r.slug, r]));
if (specs.length !== index.length) fail(`المصدر ${specs.length} والفهرس ${index.length}`);
const dup = [...new Set(specs.map((x) => x.slug).filter((s, i, a) => a.indexOf(s) !== i))];
if (dup.length) fail("معرّفات مكرّرة: " + dup.join(", "));
for (const x of specs) {
  const r = idxBySlug.get(x.slug);
  if (!r) fail(`${x.slug}: غائب عن الفهرس`);
  else if (r.field !== x.field) fail(`${x.slug}: الميدان يختلف بين المصدر والفهرس`);
}

/* ── ٣) جودة كل تخصّص مُراجَع ── */
for (const slug of reviewed) {
  const x = specs.find((y) => y.slug === slug);
  if (!x) { fail(`${slug}: مُدرَج في قائمة المُراجَع وغير موجود في المصدر`); continue; }
  const json = JSON.stringify(x);
  const hits = DARIJA.filter((re) => re.test(json)).map((re) => re.source);
  if (hits.length) fail(`${slug}: دارجة → ${hits.join(" · ")}`);
  const extra = Object.keys(x).filter((k) => !SCHEMA.includes(k));
  if (extra.length) fail(`${slug}: حقول خارج المخطّط → ${extra.join(", ")}`);
  if (!x.intro?.trim() || !x.verdict?.trim()) fail(`${slug}: ينقصه intro أو verdict`);
  if ((x.pros || x.cons) && x.prosCons) fail(`${slug}: pros/cons القديمة باقية مع prosCons`);
}

console.log(errors
  ? `\n✗ ${errors} مشكلة — لا تُسلَّم الدفعة قبل إصلاحها.`
  : `✓ ${reviewed.length}/${specs.length} تخصّصاً مُراجَعاً: يصل الصفحة · فصحى · مخطّط سليم · فهرس متطابق.`);
process.exit(errors ? 1 : 0);
