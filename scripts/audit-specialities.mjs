/* ════════════════════════════════════════════════════════════
   فاحص التخصّصات المُنجَزة — يُشغَّل بعد كل دفعة كتابة

   يمنع ثلاثة أخطاء تكرّرت فعلاً في هذا المشروع:

   ١) بقايا الدارجة في حقل لم يُستبدَل. وقع في `vetrinaire.extra`
      و`med-info.extra` و`assistant-social.subjects` و`cs-eco.cons`
      — والصفحة تعرض عندئذٍ الفصحى والدارجة معاً.
   ٢) حقول خارج المخطّط تبقى إلى جانب الجديدة، فيقرأ الزائر نصّين
      متناقضين للمعلومة نفسها.
   ٣) تكرار المعرّف: صفحتان لتخصّص واحد. وقع في
      `anesthesie-reanimation` حين أُضيف وهو موجود.

   ⚠️ الأنماط بحدود كلمات لا بتضمين نصّي: «يديرونها» تحوي «يديرو»،
   و«التحليل» تحوي «لي»، و«يُعنى بصحّة» تحوي «بصح». وفاحصٌ يُنذر
   كاذباً يُهمَل بعد ثالث مرّة، فيصير وجوده أسوأ من غيابه.
════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";

const SRC = "src/features/guide/specialities.ts";
const IDX = "src/features/guide/spec-index.ts";
const read = (f, re) => JSON.parse("[" + readFileSync(f, "utf8").match(re)[1].trim().replace(/,$/, "") + "]");

const specs = read(SRC, /SPECIALITIES: Speciality\[\] = \[([\s\S]*?)\n\];/);
const index = read(IDX, /SPEC_INDEX[^=]*=\s*\[([\s\S]*?)\n\];/);
const done = JSON.parse(readFileSync("scripts/specialities-done.json", "utf8"));

const SCHEMA = ["slug","ar","fr","alt","field","intro","study","modules","subjects","admission",
  "numbers","where","daily","careers","prosCons","master","verdict","extra"];

const DARIJA = [
  /بزاف/, /\bكاين\b/, /\bواش\b/, /\bباه\b/, /\bتاع\b/, /\bراك\b/, /\bماشي\b/,
  /\bيديرو\b/, /ماراكش/, /\bوين\b/, /\bتقدر\b/, /\bراهي\b/, /\bباش\b/, /كيفاش/,
  /\bمليح\b/, /\bشوية\b/, /\bكلش\b/, /\bبرك\b/, /ديريكت/, /السبيطار/, /\bديرها\b/,
  /\bهدرة\b/, /\bخاطيك\b/, /\bبنادم\b/, /\bنتاع\b/, /\bهاد\b/,
];

let errors = 0;
const fail = (m) => { console.error("  ✗ " + m); errors++; };

const idxBySlug = new Map(index.map((r) => [r.slug, r]));
if (specs.length !== index.length) fail(`المصدر ${specs.length} والفهرس ${index.length}`);
const dup = specs.map((x) => x.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dup.length) fail("معرّفات مكرّرة: " + [...new Set(dup)].join(", "));
for (const x of specs) {
  const r = idxBySlug.get(x.slug);
  if (!r) fail(`${x.slug}: غائب عن الفهرس`);
  else if (r.field !== x.field) fail(`${x.slug}: الميدان يختلف بين المصدر والفهرس`);
}

for (const slug of done) {
  const x = specs.find((y) => y.slug === slug);
  if (!x) { fail(`${slug}: مفقود من المصدر`); continue; }
  const json = JSON.stringify(x);
  const hits = DARIJA.filter((re) => re.test(json)).map((re) => re.source);
  if (hits.length) fail(`${slug}: دارجة → ${hits.join(" · ")}`);
  const extra = Object.keys(x).filter((k) => !SCHEMA.includes(k));
  if (extra.length) fail(`${slug}: حقول خارج المخطّط → ${extra.join(", ")}`);
  if (!x.intro || !x.verdict) fail(`${slug}: ينقصه intro أو verdict`);
}

console.log(errors
  ? `\n✗ ${errors} مشكلة — لا تُسلَّم الدفعة قبل إصلاحها.`
  : `✓ ${done.length}/${specs.length} تخصّصاً مُنجَزاً: فصحى، مخطّط سليم، فهرس متطابق.`);
process.exit(errors ? 1 : 0);
