/* ════════════════════════════════════════════════════════════
   «أين يقع ثقل معدّلك؟» — يُولَّد من جدول الحاسبة نفسه

   🐛 كانت هذه الأرقام مكتوبة باليد في كلّ دليل، فتباعدت عن الحاسبة في
   الأدلّة الستّة كلّها: مجموع علوم تجريبية «25» والحاسبة 30، و«16 من 30
   = 60٪» والصحيح 53٪، ومجموع لغات أجنبية «21» والحاسبة 28…
   الآن تُحسب كلّ نسبة ومجموع من `BRANCHES` (المصدر الوحيد للمعاملات)،
   فلا يمكن أن يقول الدليل غير ما تقوله الحاسبة.
   ════════════════════════════════════════════════════════════ */

import { BRANCHES } from "@/features/calculator/branches";

const pct = (n: number) => `${Math.round(n * 1000) / 10}٪`.replace(".", "٫");

/** توزيع ساعات أسبوعية مقترح بنسبة المعاملات — يُقرَّب إلى نصف ساعة، وحدّ أدنى نصف ساعة */
function hoursFor(coefs: number[], weekly: number): number[] {
  const tot = coefs.reduce((a, c) => a + c, 0);
  return coefs.map((c) => Math.max(0.5, Math.round((c / tot) * weekly * 2) / 2));
}

/** «8 موادّ» · «11 مادّة» — العدد العربي يغيّر معدوده */
const subjectsWord = (n: number) => (n >= 3 && n <= 10 ? `${n} موادّ` : `${n} مادّة`);

const fmtH = (h: number) => (Number.isInteger(h) ? `${h}` : `${Math.floor(h)}٫5`);

export function branchWeightHtml(branchSlug: string): string {
  const b = BRANCHES.find((x) => x.slug === branchSlug);
  if (!b) throw new Error(`branch-weights: unknown branch ${branchSlug}`);
  const mand = b.subjects.filter((s) => !s.optional).slice().sort((x, y) => y.coef - x.coef);
  const opt = b.subjects.filter((s) => s.optional);
  const total = mand.reduce((a, s) => a + s.coef, 0);

  // المواد الثقيلة: كلّ مادّة معاملها 4 فأكثر (أو الثلاث الأولى إن لم تكفِ)
  let heavy = mand.filter((s) => s.coef >= 4);
  if (heavy.length < 2) heavy = mand.slice(0, 3);
  const heavySum = heavy.reduce((a, s) => a + s.coef, 0);
  const share = heavySum / total;
  const shareWord = share > 0.5 ? "أكثر من نصف معدّلك" : share > 0.4 ? "قرابة نصف معدّلك" : "جزء كبير من معدّلك";

  const light = mand.filter((s) => s.coef <= 2);
  const lightSum = light.reduce((a, s) => a + s.coef, 0);

  // أمثلة أثر النقطة: نقطة في المادّة الأثقل مقابل نقطة في مادّة معاملها 1 أو 2
  const top = mand[0];
  const small = mand.find((s) => s.coef === 2) ?? mand[mand.length - 1];

  const WEEK = 20;
  const hrs = hoursFor(mand.map((s) => s.coef), WEEK);
  const hrsSum = hrs.reduce((a, h) => a + h, 0);

  return `<p>في شعبة ${b.short} <strong>${subjectsWord(mand.length)} إجبارية مجموع معاملاتها ${total}</strong>${
    opt.length ? `، ومعها ${opt.map((s) => `${s.name} اختيارية (معامل ${s.coef})`).join("")}` : ""
  }. والمعدّل = مجموع (العلامة × المعامل) مقسوماً على ${total}.</p>
<p>${heavy.map((s) => `<strong>${s.name} (${s.coef})</strong>`).join(" و")} — ${heavySum} من ${total}، أي <strong>${pct(share)}</strong>: ${shareWord} من ${heavy.length === 2 ? "مادّتين" : `${heavy.length} موادّ`}. وفي المقابل ${subjectsWord(light.length)} معاملها 1 أو 2 مجموعها ${lightSum} (${pct(lightSum / total)}).</p>
<p><strong>أثر النقطة الواحدة:</strong> نقطة إضافية في ${top.name} ترفع معدّلك ${(top.coef / total).toFixed(2).replace(".", "٫")}، ونقطة في ${small.name} ترفعه ${(small.coef / total).toFixed(2).replace(".", "٫")}. الفرق ${top.coef / small.coef === Math.round(top.coef / small.coef) ? `${top.coef / small.coef} أضعاف` : `${(top.coef / small.coef).toFixed(1).replace(".", "٫")} ضعفاً`} — وهو ما يجب أن يظهر في توزيع وقتك.</p>
<table>
<thead><tr><th>المادّة</th><th>المعامل</th><th>وزنها في المعدّل</th><th>ساعات أسبوعية مقترحة</th></tr></thead>
<tbody>
${mand.map((s, i) => `<tr><td>${s.name}</td><td>${s.coef}</td><td>${pct(s.coef / total)}</td><td>${fmtH(hrs[i])}</td></tr>`).join("\n")}
</tbody>
<tfoot><tr><th>المجموع</th><td>${total}</td><td>100٪</td><td>${fmtH(hrsSum)}</td></tr></tfoot>
</table>
<p>الساعات بنسبة المعاملات على أسبوع من نحو ${WEEK} ساعة مراجعة صافية (بعد التقريب إلى نصف ساعة) — نقطة بداية لا قاعدة: زِد المادّة التي علامتك فيها أضعف، وأنقص التي أتقنتها. المعاملات من <a href="/calculate/${b.slug}">حاسبة معدل ${b.short}</a> (القرار الوزاري رقم 186، الساري لبكالوريا 2027).</p>
`;
}
