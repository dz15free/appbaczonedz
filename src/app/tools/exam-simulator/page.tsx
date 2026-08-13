import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-shell";
import { PublicBackButton } from "@/components/ui/public-back-button";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { SPECIALTY_KEYS, specialty } from "@/features/rooms/exam-sim/exam-data";
import { SoloSimulator } from "@/features/tools/solo-simulator";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "غرفة امتحان البكالوريا الافتراضية (Virtual Bac Room) — محاكاة امتحان البكالوريا";
const DESC =
  "غرفة امتحان البكالوريا الافتراضية بمواضيع حقيقية وتوقيت رسمي: اختر شعبتك ومادّتك، " +
  "ادخل القاعة، حلّ بالمدّة المعتمدة، ثمّ راجع الحلّ النموذجي — بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "محاكاة البكالوريا", "امتحان تجريبي بكالوريا", "مواضيع البكالوريا بالتوقيت",
    "تجربة امتحان البكالوريا", "بكالوريا 2027", "BacZone",
  ],
  alternates: { canonical: "/tools/exam-simulator" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: absUrl("/tools/exam-simulator"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

const FAQ = [
  {
    q: "ما الفرق بين هذه المحاكاة وحلّ الموضوع في البيت؟",
    a: "الفرق هو الوقت. حلّ موضوع بلا مؤقّت يقيس معرفتك وحدها؛ أمّا الحلّ بالمدّة الرسمية فيقيس ما تستطيع إخراجه فعلاً في يوم الامتحان — وهما شيئان مختلفان تماماً. كثير من الطلبة يعرفون الإجابة ولا يصلون إليها في الوقت.",
  },
  {
    q: "هل أحتاج حساباً لاستعمالها؟",
    a: "لا. المحاكاة الفردية تعمل بلا تسجيل، والجلسة تبقى في متصفّحك ولا تُحفظ في أي مكان.",
  },
  {
    q: "ما الفرق بينها وبين محاكاة الغرف؟",
    a: "محاكاة الغرف جماعية: الأستاذ يفتح امتحاناً لطلبته ويتابعهم ويصحّح لهم. وهذه فردية: تجرّبها وحدك متى شئت وتصحّح لنفسك.",
  },
  {
    q: "متى أبدأ استعمالها؟",
    a: "بعد إنهاء مراجعة الدرس لا قبلها. المحاكاة أداة قياس لا أداة تعلّم؛ استعمالها على مادّة لم تُراجعها يُحبطك بلا فائدة.",
  },
  {
    q: "كم مرّة أعيدها؟",
    a: "موضوع واحد أسبوعياً لكل مادّة ثقيلة يكفي في الأشهر الأخيرة. والأهمّ من التكرار هو تحليل أخطائك بعد كل مرّة.",
  },
];

export default function ExamSimulatorPage() {
  const specs = SPECIALTY_KEYS.map((k) => specialty(k)).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: TITLE,
        url: absUrl("/tools/exam-simulator"),
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
          { "@type": "ListItem", position: 2, name: "محاكاة الامتحان", item: absUrl("/tools/exam-simulator") },
        ],
      },
    ],
  };

  return (
    <main className="bz-guide min-h-screen">
      <PublicHeader />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <Link href="/tools" className="font-bold text-white hover:underline">الأدوات</Link>
          </nav>
          <PublicBackButton fallbackHref="/tools" fallbackLabel="الأدوات" tone="dark" className="mb-5" />
          <h1 className="max-w-4xl font-display text-[24px] font-extrabold leading-[1.25] sm:text-[34px]">
            {TITLE}
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.9] text-white/80">
            محاكاة امتحان البكالوريا · موضوع حقيقي · توقيت رسمي · تصحيح بعد النهاية
          </p>
        </div>
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="mx-auto w-full max-w-6xl px-3 pb-14 pt-5 sm:px-4">
          <SoloSimulator />

        <article className="mt-8">
          <section className="bz-spec-sec">
            <h2>لماذا المحاكاة بالتوقيت وليست مجرّد حلّ موضوع؟</h2>
            <p className="bz-spec-p">
              أكثر ما يُفاجئ الطالب يوم الامتحان ليس صعوبة الموضوع، بل <strong>الوقت</strong>.
              فمن حلّ المواضيع في البيت بلا مؤقّت — يتوقّف متى شاء ويعود إلى الدفتر عند
              أوّل تعثّر — يجد نفسه أمام واقع مختلف تماماً في القاعة.
            </p>
            <p className="bz-spec-p">
              وهذه الأداة تعيد إنتاج الظرف الحقيقي: <strong>المدّة الرسمية للمادّة</strong>،
              وجرس عند البداية والنهاية، وموضوع كامل بلا حلّ ظاهر حتى تُنهي. فتكتشف
              أخطاء التوزيع <strong>قبل</strong> أن تكلّفك نقاطاً حقيقية.
            </p>
          </section>

          <section className="bz-spec-sec">
            <h2>كيف تستفيد منها فعلاً؟</h2>
            <ol className="bz-spec-list">
              <li><strong>اختر مادّة راجعتها</strong> — المحاكاة أداة قياس لا أداة تعلّم.</li>
              <li><strong>جهّز مكانك كقاعة امتحان</strong>: ورق وقلم، والهاتف بعيد.</li>
              <li><strong>لا توقف المؤقّت</strong> مهما تعثّرت — التعثّر جزء من القياس.</li>
              <li><strong>صحّح بالحلّ النموذجي</strong> وسجّل <em>نوع</em> الخطأ لا العلامة.</li>
              <li><strong>أعد ما أخطأت فيه بعد يومين</strong> — التصحيح الفوري يُخفي النسيان.</li>
            </ol>
          </section>

          <section className="bz-spec-sec is-pro">
            <h2>الشعب والمواد المتاحة</h2>
            <div className="flex flex-wrap gap-1.5">
              {specs.map((s) => (
                <span key={s!.label} className="rounded-lg px-2.5 py-1 text-[12px] font-bold text-white"
                  style={{ background: s!.color }}>
                  {s!.label}
                  <span className="ms-1.5 font-normal opacity-80">{s!.subjects.length} مواد</span>
                </span>
              ))}
            </div>
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

        <aside className="mt-8 border-t border-[var(--bz-line)] pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">أدوات تكمّلها</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/calculate" className="bz-spec-rel"><span>احسب معدّلك بعد التصحيح</span></Link>
            <Link href="/tools" className="bz-spec-rel"><span>كل أدوات البكالوريا</span></Link>
          </div>
          </aside>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}
