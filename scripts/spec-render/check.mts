/* فحص العرض الفعليّ للتخصّصات المراجَعة — يمرّ بدالّة الدمج الحقيقية
   (مع المرشّح الآلي) ويقول لكلّ تخصّص: هل يُفهرَس؟ وهل حُذف سطر كتبتَه؟
   سكربت audit يفحص الملفّ؛ هذا يفحص ما يصل إلى الصفحة فعلاً. */
import { mergeGuide, GENERAL_SOURCE_ONLY_NOINDEX } from "@/features/guide/guide-merge";
import { SPECIALITIES } from "@/features/guide/specialities";
import { REVIEWED_SLUGS } from "@/features/guide/reviewed-specialities";
const rows = mergeGuide({}) as unknown as Array<Record<string, unknown>>;
const F = ["intro","study","subjects","admission","where","careers","prosCons","master","verdict","modules","numbers","daily"];
let problems = 0;
for (const slug of REVIEWED_SLUGS) {
  const src = SPECIALITIES.find((x) => x.slug === slug) as unknown as Record<string, string>;
  const out = rows.find((r) => r.slug === slug);
  if (!src || !out) { console.log(`✗ ${slug}: غير موجود`); problems++; continue; }
  const lost: string[] = [];
  for (const f of F) {
    const b = String(out[f] ?? "");
    for (const l of String(src[f] ?? "").split("\n").map((x) => x.trim()).filter(Boolean))
      if (!b.includes(l)) lost.push(`${f}: ${l.slice(0, 80)}`);
  }
  /* المصادر: ما كُتب في extra تحت «مصادر» يجب أن يصل إلى قسم المصادر في الصفحة */
  const srcExtra = ((src as unknown as { extra?: { t?: string; v?: string }[] }).extra ?? []).find((e) => (e?.t ?? "").includes("مصادر"));
  if (srcExtra?.v) {
    const shown = String(out.sources ?? "");
    for (const l of srcExtra.v.split("\n").map((x) => x.trim()).filter(Boolean))
      if (!shown.includes(l)) lost.push(`sources: ${l.slice(0, 80)}`);
  }
  /* منع فهرسة مقصود (بيانات رسمية ناقصة) — ليس خطأً، لكن يُذكَر */
  const intentional = !out.indexable && GENERAL_SOURCE_ONLY_NOINDEX.has(slug);
  if (intentional && !lost.length) { console.log(`• ${slug} — noindex مقصود حتى تكتمل بياناته الرسمية`); continue; }
  if (!out.indexable || lost.length) {
    problems++;
    console.log(`✗ ${slug} — يُفهرَس: ${out.indexable ? "نعم" : "لا"} · أسطر محذوفة: ${lost.length}`);
    for (const l of lost) console.log("     ", l);
  }
}
console.log(problems ? `\n${problems} تخصّصاً فيه مشكلة.` : `✓ ${REVIEWED_SLUGS.length} تخصّصاً مراجَعاً: لا سطر محذوف، وكلّها تُفهرَس عدا المقصود أعلاه.`);
process.exit(problems ? 1 : 0);
