import type { Metadata } from "next";
import Link from "next/link";
import { AuthAwareLink } from "@/components/ui/auth-aware-link";
import { PLAN_BRANCHES } from "@/features/tools/planner-data";
import { StudyPlanner } from "@/features/tools/study-planner";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "إنشاء برنامج مراجعة البكالوريا — جدول أسبوعي حسب شعبتك";
const DESC =
  "أنشئ جدول مراجعتك الأسبوعي في دقائق: اختر شعبتك وأيّامك وفتراتك، " +
  "ووزّع موادّك بحسب المعاملات — ثمّ اطبعه. بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "برنامج مراجعة البكالوريا", "جدول مراجعة", "تنظيم وقت الدراسة",
    "جدول دراسة يومي", "بكالوريا 2027", "BacZone",
  ],
  alternates: { canonical: "/tools/study-planner" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: absUrl("/tools/study-planner"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const FAQ = [
  {
    q: "لماذا أملأ الجدول بنفسي بدل أن تولّده الأداة آلياً؟",
    a: "لأنّ الجدول الذي يضعه صاحبه يُنفَّذ، والذي يُفرَض عليه يُهمَل بعد أيّام. لا أحد يعرف طاقتك وظروفك أفضل منك — ودورنا أن نُظهر لك المعاملات ونُسهّل الملء، لا أن نقرّر عنك.",
  },
  {
    q: "كم ساعة أضع في اليوم؟",
    a: "لا يوجد رقم صحيح للجميع. أربع ساعات صافية بتركيز تفوق ثماني ساعات نصفها هاتف. ابدأ بما تحتمله فعلاً وزد تدريجياً — البرنامج الطموح الذي ينهار بعد أسبوع أسوأ من المتواضع الذي يدوم.",
  },
  {
    q: "هل أوزّع الوقت بالتساوي بين المواد؟",
    a: "لا. المعامل يقرّر. مادّة بمعامل 6 تستحقّ ضعف وقت مادّة بمعامل 3 على الأقلّ — ونصيحة شعبتك في الأداة تُبيّن أين يقع ثقل معدّلك.",
  },
  {
    q: "ماذا أفعل إن تأخّرت عن الجدول؟",
    a: "لا تُعوّض ما فات دفعةً واحدة. أكمل من حيث يُفترض أن تكون اليوم، وأدرِج ما فاتك في يوم المراجعة الأسبوعي. محاولة تعويض ثلاثة أيّام في يوم واحد تُنتج إرهاقاً وانقطاعاً جديداً.",
  },
  {
    q: "هل يُحفظ جدولي؟",
    a: "الأداة تعمل بلا تسجيل ولا تحفظ شيئاً. اطبع جدولك أو صوّره — والجدول المعلّق أمام مكتبك يُنفَّذ أكثر من جدول في هاتفك.",
  },
];

export default function StudyPlannerPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: TITLE,
        url: absUrl("/tools/study-planner"),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DZD" },
        creator: { "@type": "Organization", name: "BacZone", url: absUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الأدوات", item: absUrl("/tools") },
          { "@type": "ListItem", position: 2, name: "برنامج المراجعة", item: absUrl("/tools/study-planner") },
        ],
      },
    ],
  };

  return (
    <main className="bz-guide min-h-screen">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-guide-hero bz-no-print">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <AuthAwareLink className="hover:underline">BacZone</AuthAwareLink>
            <span>·</span>
            <Link href="/tools" className="font-bold text-white hover:underline">الأدوات</Link>
          </nav>
          <h1 className="font-display text-[24px] font-extrabold leading-[1.25] sm:text-[34px]">
            نظّم مراجعتك من اليوم
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.9] text-white/80">
            {PLAN_BRANCHES.length} شعب · نصيحة لكل شعبة · جدول قابل للطباعة · بلا تسجيل
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-3 pb-14 pt-5 sm:px-4">
        <StudyPlanner />

        <article className="mt-8 bz-no-print">
          <section className="bz-spec-sec">
            <h2>لماذا الجدول أصلاً؟</h2>
            <p className="bz-spec-p">
              أكثر ما يُضيّع وقت الطالب ليس قلّة الساعات بل <strong>القرار</strong>:
              عشر دقائق كل مساء يقضيها في السؤال «بماذا أبدأ؟»، ثمّ يختار الأسهل
              غالباً — فيراجع ما يُتقنه ويؤجّل ما يحتاجه.
            </p>
            <p className="bz-spec-p">
              والجدول يُلغي هذا القرار اليومي. تفتح الورقة فتعرف ماذا تفعل الآن،
              <strong> فيذهب جهدك إلى المراجعة لا إلى الاختيار</strong>.
            </p>
          </section>

          <section className="bz-spec-sec">
            <h2>كيف تستعمل الأداة؟</h2>
            <ol className="bz-spec-list">
              <li><strong>اختر شعبتك</strong> — ستظهر لك موادّها ونصيحة خاصّة بمعاملاتها.</li>
              <li><strong>حدّد أيّامك وفتراتك</strong> بالساعة الحقيقية لا المثالية.</li>
              <li><strong>املأ الخانات</strong> من قائمة موادّك، أو ضع «استراحة» و«حل مواضيع».</li>
              <li><strong>اطبع الجدول</strong> وعلّقه أمام مكتبك.</li>
            </ol>
          </section>

          <section className="bz-spec-sec is-pro">
            <h2>ثلاث قواعد تجعل الجدول يدوم</h2>
            <p className="bz-spec-p">
              <strong>اترك 20٪ فارغة.</strong> الجدول الممتلئ ينهار من أوّل ظرف طارئ،
              والفراغ ليس كسلاً بل هامش نجاة.
            </p>
            <p className="bz-spec-p">
              <strong>كرّر المادّة الثقيلة ثلاث مرّات قصيرة</strong> لا مرّة طويلة:
              ساعة ثلاث مرّات أسبوعياً تُثبّت أكثر من ثلاث ساعات دفعة واحدة.
            </p>
            <p className="bz-spec-p">
              <strong>ضع المادّة التي تنفر منها أوّل اليوم لا آخره</strong> — ما يُؤجَّل
              إلى آخر اليوم لا يُنجَز.
            </p>
          </section>

          <section className="bz-spec-sec">
            <h2>أسئلة شائعة</h2>
            {FAQ.map((f, i) => (
              <div key={i} className="mb-3">
                <p className="text-[13.5px] font-extrabold text-[var(--bz-ink)]">{f.q}</p>
                <p className="bz-spec-p">{f.a}</p>
              </div>
            ))}
          </section>
        </article>

        <aside className="mt-8 border-t border-[var(--bz-line)] pt-5 bz-no-print">
          <h2 className="mb-3 font-display text-base font-extrabold">أدوات تكمّلها</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/tools/planner" className="bz-spec-rel"><span>مخطّط البكالوريا للطباعة</span></Link>
            <Link href="/tools/pomodoro" className="bz-spec-rel"><span>مؤقّت التركيز</span></Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
