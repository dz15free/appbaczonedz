import Link from "next/link";
import { BRANCHES, totalCoef } from "@/features/calculator/branches";
import { exampleFor, avg, BAC_YEAR, COEF_LAW } from "@/features/calculator/seo";

/* ════════════════════════════════════════════════════════════
   الصفحة الرئيسية — قسمان يُقرآن لا يُنقر عليهما فقط

   كانت الرئيسية فهرس روابط: بطاقات أدوات، وقوائم مقالات، وأزرار. مراجع
   AdSense (وتلميذ يفتح الموقع أوّل مرّة) لا يجد فيها معلومة يستفيد منها
   دون أن يغادرها. هذان القسمان يعطيان قيمة في الصفحة نفسها:

   ١) المعاملات في لمحة — تُولَّد من جدول الحاسبة (المصدر الوحيد)، مع
      مثال محسوب بدالّة الحاسبة نفسها، فلا يمكن أن يخالف رقمٌ هنا الحاسبة.
   ٢) سنة البكالوريا مرحلةً مرحلة — منهجية لا مواعيد رسمية: لا نذكر تاريخاً
      لا مصدر له؛ التواريخ الرسمية يعلنها الديوان الوطني للامتحانات.
   ════════════════════════════════════════════════════════════ */

const PHASES = [
  {
    when: "سبتمبر — ديسمبر",
    title: "بناء الأساس",
    body: "افهم الدروس أوّلاً بأوّل ولا تؤجّل الفهم إلى المراجعة. بعد كلّ درس في المادّة الأثقل معاملاً في شعبتك، حلّ تمرينين تطبيقيين على الأقلّ في الأسبوع نفسه.",
    link: { href: "/tools/study-planner", label: "أنشئ برنامجك الأسبوعي" },
  },
  {
    when: "جانفي — مارس",
    title: "التمارين قبل الملخّصات",
    body: "انتقل من «فهمت الدرس» إلى «أحلّ التمرين وحدي». خصّص لكلّ مادّة ثقيلة تمريناً كاملاً من مواضيع سابقة أسبوعياً، وسجّل نوع خطئك لا علامتك فقط.",
    link: { href: "/blog", label: "دروس بأمثلة محلولة" },
  },
  {
    when: "أفريل — ماي",
    title: "مواضيع كاملة بالتوقيت",
    body: "موضوع واحد كامل بالمدّة الرسمية أسبوعياً لكلّ مادّة ثقيلة. الفرق بين من يعرف الحلّ ومن يكتبه في الوقت يظهر هنا، وأخطاء الوقت لا تُصلَح إلّا بالتدرّب عليها.",
    link: { href: "/tools/exam-simulator", label: "جرّب محاكاة الامتحان" },
  },
  {
    when: "الأسابيع الأخيرة",
    title: "التثبيت لا الجديد",
    body: "لا تفتح دروساً جديدة. راجع أخطاءك المسجّلة، وأعد ما أتقنته بسرعة، ونم جيداً. قبل ملء بطاقة الرغبات احسب معدّلك الموزون لكلّ ميدان تفكّر فيه.",
    link: { href: "/tools/weighted-average", label: "احسب المعدّل الموزون" },
  },
];

export function LandingKnowledge() {
  const sci = BRANCHES.find((b) => b.slug === "sciences") ?? BRANCHES[0];
  const ex = exampleFor(sci);
  const exTotal = totalCoef(sci);
  const exPoints = ex.rows.reduce((a, r) => a + r.points, 0);

  return (
    <>
      {/* ── المعاملات في لمحة ── */}
      <section className="px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="lk-coef">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7">
            <span className="bz-landing-kicker">بكالوريا {BAC_YEAR}</span>
            <h2 id="lk-coef" className="bz-landing-section-title !text-right">أين يقع ثقل معدّلك في كلّ شعبة؟</h2>
            <p className="bz-landing-section-subtitle !mx-0 !text-right">
              المعدّل = مجموع (العلامة × المعامل) مقسوماً على مجموع المعاملات. لذلك نقطة في مادّة معاملها 6 تساوي ثلاث
              نقاط في مادّة معاملها 2. هذه أثقل الموادّ في كلّ شعبة حسب القرار الوزاري رقم {COEF_LAW.inForce.no} الساري.
            </p>
          </div>
          <div className="bz-calc-table-wrap">
            <table className="bz-calc-table">
              <thead>
                <tr><th>الشعبة</th><th>مجموع المعاملات</th><th>الموادّ الأثقل</th><th>وزنها من المعدّل</th></tr>
              </thead>
              <tbody>
                {BRANCHES.map((b) => {
                  const tot = totalCoef(b);
                  const heavy = b.subjects.filter((s) => !s.optional && s.coef >= 4);
                  const share = Math.round((heavy.reduce((a, s) => a + s.coef, 0) / tot) * 100);
                  return (
                    <tr key={b.slug}>
                      <th><Link href={`/calculate/${b.slug}`}>{b.short}</Link></th>
                      <td>{tot}</td>
                      <td style={{ whiteSpace: "normal" }}>{heavy.map((s) => `${s.name} (${s.coef})`).join("، ")}</td>
                      <td>{share}٪</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[14px] leading-[1.95] text-[var(--bz-ink-2)]">
            <strong className="text-[var(--bz-ink)]">مثال محسوب — شعبة {sci.short}:</strong> تلميذ علاماته في الموادّ الإجبارية
            مجموع نقاطها الموزونة {String(Math.round(exPoints * 10) / 10)} من {exTotal * 20}. معدّله
            {" "}{String(Math.round(exPoints * 10) / 10)} ÷ {exTotal} = <strong className="text-[var(--bz-ink)]">{avg(ex.result.average)}</strong>.
            {" "}<Link href={`/calculate/${sci.slug}`} className="font-bold text-[var(--v9-link,var(--bz-blue))] underline underline-offset-4">احسب معدّلك بعلاماتك</Link>،
            أو اطّلع على <Link href="/calculate#coefficients" className="font-bold text-[var(--v9-link,var(--bz-blue))] underline underline-offset-4">جدول معاملات كلّ الموادّ</Link>.
          </p>
        </div>
      </section>

      {/* ── سنة البكالوريا مرحلةً مرحلة ── */}
      <section className="px-5 pb-14 sm:px-8 sm:pb-16" aria-labelledby="lk-year">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7">
            <span className="bz-landing-kicker">منهجية</span>
            <h2 id="lk-year" className="bz-landing-section-title !text-right">سنة البكالوريا مرحلةً مرحلة</h2>
            <p className="bz-landing-section-subtitle !mx-0 !text-right">
              ما يجب أن تركّز عليه في كلّ فترة من السنة، والأداة التي تساعدك فيها. المواعيد الرسمية للامتحان يعلنها الديوان
              الوطني للامتحانات والمسابقات؛ هذا تقسيم للعمل لا رزنامة رسمية.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((p, i) => (
              <li key={p.title} className="rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-surface)] p-4">
                <span className="text-[11.5px] font-extrabold text-[var(--v9-link,var(--bz-blue))]">{i + 1} · {p.when}</span>
                <h3 className="mt-1.5 text-[15.5px] font-extrabold text-[var(--bz-ink)]">{p.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.9] text-[var(--bz-ink-2)]">{p.body}</p>
                <Link href={p.link.href} className="mt-2 inline-flex min-h-[40px] items-center text-[13px] font-bold text-[var(--v9-link,var(--bz-blue))] underline underline-offset-4">{p.link.label}</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
