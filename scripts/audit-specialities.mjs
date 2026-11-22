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
  /* المقدّمة تُعرَّف بالتخصّص لا بمدّته: سطرها الأوّل هو ما يظهر تحت
     «ما هو هذا التخصّص؟» وفي وصف السيو وبطاقة الفهرس. ومقدّمة تبدأ
     بـ«ستّ سنوات…» تجيب عن سؤال لم يُطرح. */
  const lead = (x.intro || "").replace(/\*\*/gu, "").split("\n")[0].trim();
  if (/^(ستّ|ست|سبع|خمس|ثلاث|أربع|سنتان|\d)/u.test(lead))
    fail(`${slug}: المقدّمة تبدأ بالمدّة لا بالتعريف → «${lead.slice(0, 50)}…»`);
  if (lead.length < 40) fail(`${slug}: السطر الأوّل من المقدّمة قصير جداً (${lead.length} حرفاً)`);
}

/* ── ٥) سجلّ ما خرج من الدليل ──
   العدد المعروض تغيّر من 260 إلى 258 في 22 نوفمبر 2026. لا ينقص الدليل
   صفحةً دون سطر هنا يقول لماذا وإلى أين ذهبت: الفاحص يرفض أيّ معرّف محذوف
   عاد إلى الفهرس، أو فقد تحويله الدائم في next.config.mjs. */
const REMOVED = [
  { slug: "agronomie", to: "agro", date: "2026-11-22",
    why: "«العلوم الزراعية» و«العلوم الفلاحية» تسميتان للتخصّص نفسه (رموز D03 في توجيه 2026). كانت الصفحة نفسها تقول إنّها تكرار." },
  { slug: "ensrpc", to: "enscrbc", date: "2026-11-22",
    why: "المدرسة الوطنية العليا لحفظ الممتلكات الثقافية وترميمها مكرّرة بمعرّفين (رمزها N00TUT01). كانت الصفحة نفسها تقول إنّها تكرار." },
];
const nextCfg = readFileSync("next.config.mjs", "utf8");
for (const r of REMOVED) {
  if (idxBySlug.has(r.slug)) fail(`${r.slug}: مسجّل محذوفاً لكنّه عاد إلى الفهرس`);
  if (!idxBySlug.has(r.to)) fail(`${r.slug}: الصفحة التي دُمج فيها (${r.to}) غير موجودة`);
  if (!nextCfg.includes(`"${r.slug}": "${r.to}"`)) fail(`${r.slug}: لا تحويل دائم إلى ${r.to} في next.config.mjs`);
}

/* ── ٦) الموثّق وقيد التحقّق ── */
const noindexBlock = merge.match(/GENERAL_SOURCE_ONLY_NOINDEX = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";
const pending = [...noindexBlock.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
for (const s of pending) if (!idxBySlug.has(s)) fail(`${s}: في قائمة «قيد التحقّق» وغير موجود في الفهرس`);

console.log(`\nالدليل: ${index.length} صفحة · ${index.length - pending.length} خارج قائمة «قيد التحقّق» · ${pending.length} قيد التحقّق`);
console.log(`قيد التحقّق (لا تُحتسب ولا تُفهرس): ${pending.join("، ")}`);
console.log(`خرج من الدليل (${REMOVED.length}): ` + REMOVED.map((r) => `${r.slug} ← دُمج في ${r.to} (${r.date})`).join("، "));
console.log("ملاحظة: «الموثّق» في الموقع = indexable بعد الدمج؛ قد يُخفي p13 صفحات أخرى غير مراجَعة — وكلّها مراجَعة اليوم.");

console.log(errors
  ? `\n✗ ${errors} مشكلة — لا تُسلَّم الدفعة قبل إصلاحها.`
  : `✓ ${reviewed.length}/${specs.length} تخصّصاً مُراجَعاً: يصل الصفحة · فصحى · مخطّط سليم · فهرس متطابق.`);
process.exit(errors ? 1 : 0);
