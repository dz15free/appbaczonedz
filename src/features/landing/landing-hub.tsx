import Link from "next/link";
import type { BlogIndexEntry } from "@/features/blog/types";
import { minutesLabel } from "@/features/blog/types";
import { SPEC_INDEX, SPEC_FIELDS } from "@/features/guide/spec-index";

/* ════════════════════════════════════════════════════════════
   الرئيسية كبوّابة محتوى — ما يقرؤه الزائر قبل أيّ تسجيل

   مراجع AdSense لا يسجّل الدخول: يرى ما يراه زائر جديد فقط. فالرئيسية
   يجب أن تكون بذاتها صفحة نافعة: دروس محلولة (تزيد وحدها مع الدروس
   المجدولة)، معطيات توجيه حقيقية بمصدرها، وتصفّح التخصّصات بروابط إلى
   صفحاتها لا إلى فهرس عامّ.
   ════════════════════════════════════════════════════════════ */

const A = "font-bold text-[var(--v9-link,var(--bz-blue))] underline underline-offset-4";

export function LandingLessons({ posts }: { posts: BlogIndexEntry[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="lh-lessons">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="bz-landing-kicker">دروس بأمثلة محلولة</span>
            <h2 id="lh-lessons" className="bz-landing-section-title !text-right">راجع درساً كاملاً الآن</h2>
            <p className="bz-landing-section-subtitle !mx-0 !text-right">
              كلّ درس: القوانين، مثال من نوع البكالوريا محلول خطوة بخطوة ومتحقَّق من حسابه، الأخطاء التي تُضيّع النقاط، ثمّ تمارين بأجوبتها. يُضاف درس جديد كلّ يومين.
            </p>
          </div>
          <Link href="/blog" className="bz-landing-text-link">كلّ الدروس والمقالات ←</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="bz-landing-tool-card">
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="bz-landing-card-link">{minutesLabel(p.readMinutes ?? 1)} قراءة ←</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* أرقام توجيه بكالوريا 2026 — نفسها المنشورة في صفحة كلّ تخصّص مع مصدرها */
const HEALTH_2026: { slug: string; name: string; value: string; note: string }[] = [
  { slug: "medcine-dentaire", name: "طبّ الأسنان", value: "16.81", note: "وطنياً، الأولوية الأولى" },
  { slug: "medcine", name: "الطبّ", value: "16.33", note: "وطنياً، الأولوية الأولى" },
  { slug: "pharmacie", name: "الصيدلة", value: "16.03", note: "وطنياً، الأولوية الأولى" },
  { slug: "kine", name: "العلاج الطبيعي والفيزيائي", value: "≈ 15.8", note: "الوسيط بين الولايات" },
  { slug: "anesthesie-reanimation", name: "عون التخدير والإنعاش", value: "15.48", note: "الوسيط بين الولايات" },
  { slug: "sage-femme", name: "القابلة", value: "15.17", note: "الوسيط بين الولايات" },
  { slug: "vetrinaire", name: "الطبّ البيطري (المدرسة العليا)", value: "15.11", note: "الجزائر العاصمة" },
  { slug: "isp", name: "ممرّض الصحّة العمومية", value: "14.25", note: "الوسيط بين الولايات" },
];

export function LandingOrientation() {
  const byField = SPEC_FIELDS.map((f) => {
    const items = SPEC_INDEX.filter((s) => s.field === f);
    return { field: f, count: items.length, sample: items.slice(0, 4) };
  });

  return (
    <section className="px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="lh-orient">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <span className="bz-landing-kicker">بعد البكالوريا</span>
          <h2 id="lh-orient" className="bz-landing-section-title !text-right">كيف يعمل التوجيه الجامعي، وكم معدّلاً تحتاج؟</h2>
          <p className="bz-landing-section-subtitle !mx-0 !text-right">
            المعدّل الأدنى المكتوب في دليل التوجيه شرطٌ للترشّح فقط. ما يقرّر قبولك فعلاً هو <strong>آخر معدّل قُبل به</strong> في التخصّص،
            وهو يتغيّر كلّ سنة مع عدد المترشّحين والمقاعد.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3 text-[14px] leading-[1.95] text-[var(--bz-ink-2)]">
            <h3 className="text-[16px] font-extrabold text-[var(--bz-ink)]">ثلاثة أشياء تحدّد قبولك</h3>
            <p>
              <strong className="text-[var(--bz-ink)]">١. الأولوية:</strong> كلّ تخصّص يرتّب الشعب في أولويات. تلميذ العلوم التجريبية يدخل الطبّ
              في الأولوية الأولى، وتلميذ التقني رياضي في الثانية بمعدّل أعلى عادةً.
            </p>
            <p>
              <strong className="text-[var(--bz-ink)]">٢. نوع التسجيل:</strong> تخصّص «وطني» مفتوح لكلّ الولايات، و«محلّي أو جهوي» محصور في
              المؤسّسات المرتبطة بولايتك. ومعاهد الشبه الطبّي تخصّص مقاعد لكلّ ولاية، فيختلف آخر معدّل مقبول في المعهد نفسه
              من ولاية إلى أخرى بأكثر من خمس نقاط أحياناً.
            </p>
            <p>
              <strong className="text-[var(--bz-ink)]">٣. المعدّل الذي يُرتَّب به:</strong> بعض التخصّصات تعتمد المعدّل العام وأخرى المعدّل
              الموزون بموادّ معيّنة. <Link href="/tools/weighted-average" className={A}>احسب معدّلك الموزون</Link> قبل ملء بطاقة الرغبات.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-[16px] font-extrabold text-[var(--bz-ink)]">مثال: آخر معدّل مقبول في تخصّصات الصحّة — توجيه 2026</h3>
            <div className="bz-calc-table-wrap">
              <table className="bz-calc-table">
                <thead><tr><th>التخصّص</th><th>آخر معدّل مقبول</th><th>ملاحظة</th></tr></thead>
                <tbody>
                  {HEALTH_2026.map((r) => (
                    <tr key={r.slug}>
                      <th><Link href={`/specialties/${r.slug}`}>{r.name}</Link></th>
                      <td>{r.value}</td>
                      <td style={{ whiteSpace: "normal" }}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] leading-[1.8] text-[var(--bz-ink-2)]">
              لاحظ أنّ طبّ الأسنان كان أصعب دخولاً من الطبّ نفسه. المصدر وتفاصيل كلّ ولاية في صفحة كلّ تخصّص.
            </p>
          </div>
        </div>

        <h3 className="mb-3 mt-10 text-[16px] font-extrabold text-[var(--bz-ink)]">تصفّح {SPEC_INDEX.length} تخصّصاً حسب المجال</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byField.map((g) => (
            <div key={g.field} className="rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-surface)] p-4">
              <p className="text-[14.5px] font-extrabold text-[var(--bz-ink)]">{g.field} <span className="text-[12px] font-bold text-[var(--bz-ink-2)]">· {g.count}</span></p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                {g.sample.map((s) => <li key={s.slug}><Link href={`/specialties/${s.slug}`} className={A}>{s.ar}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
