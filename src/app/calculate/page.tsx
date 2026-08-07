import type { Metadata } from "next";
import { EditablePage } from "@/features/admin/editable-page";
import Link from "next/link";
import { BRANCHES, totalCoef } from "@/features/calculator/branches";
import { absUrl } from "@/features/guide/site-url";

const TITLE =
  "حساب معدل البكالوريا 2027 جميع الشعب | حاسبة معدل الباك بعد تعديلات الوزارة";
const DESC =
  "حساب معدل البكالوريا 2027 بدقة لجميع الشعب (علوم تجريبية، رياضيات، هندسة، تسيير، آداب، لغات، فنون) وفق المعاملات الجديدة لوزارة التربية حساب معدل الباك مجانا وبدقة.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "حساب معدل البكالوريا",
    "حساب معدل الباك",
    "حساب معدل البكالوريا 2027",
    "حاسبة معدل الباك",
    "حساب معدل الباكلوريا",
    "حساب معدل البكالوريا شعبة علوم تجريبية",
    "حساب معدل البكالوريا شعبة رياضيات",
    "حساب معدل البكالوريا شعبة تسيير واقتصاد",
    "حساب معدل البكالوريا شعبة آداب وفلسفة",
    "حساب معدل البكالوريا شعبة لغات أجنبية",
    "حساب معدل البكالوريا تقني رياضي",
    "حساب معدل البكالوريا شعبة فنون",
    "حاسبة معدل البكالوريا بعد تعديلات الوزارة",
    "معاملات البكالوريا 2027",
    "حساب معدل البكالوريا بعد تغييرات الوزارة",
  ],
  alternates: { canonical: "/calculate" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: absUrl("/calculate"),
    title: TITLE,
    description: DESC,
    siteName: "BacZone",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function CalculateHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: TITLE,
        description: DESC,
        url: absUrl("/calculate"),
        applicationCategory: "EducationalApplication",
        operatingSystem: "All",
        inLanguage: "ar",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "DZD",
        },
        creator: {
          "@type": "Organization",
          name: "BacZone",
          url: absUrl("/"),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "كيف يتم حساب معدل البكالوريا؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "يُحسب معدل البكالوريا بضرب علامة كل مادة في معاملها، ثم قسمة مجموع النقاط على مجموع المعاملات. الصيغة: المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات.",
            },
          },
          {
            "@type": "Question",
            name: "هل الحاسبة تعتمد المعاملات الجديدة بعد تعديلات الوزارة؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "نعم، حاسبة BacZone محدثة وفق آخر التعديلات الصادرة عن وزارة التربية الوطنية لمعاملات بكالوريا 2027 لجميع الشعب.",
            },
          },
          {
            "@type": "Question",
            name: "هل يمكن حساب المعدل لجميع الشعب؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "نعم، تتوفر حاسبة منفصلة لكل شعبة: علوم تجريبية، رياضيات، تقني رياضي (الهندسة)، تسيير واقتصاد، آداب وفلسفة، لغات أجنبية، وفنون.",
            },
          },
          {
            "@type": "Question",
            name: "هل النتيجة التي تظهرها الحاسبة رسمية؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "الحاسبة أداة تقدير دقيقة وفق المعاملات المعتمدة. النتيجة الرسمية النهائية تصدر فقط عن الديوان الوطني للامتحانات والمسابقات.",
            },
          },
        ],
      },
    ],
  };

  return (
    <EditablePage pageKey="calculate">
      <main className="bz-guide min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Hero */}
        <header className="bz-guide-hero">
          <div className="mx-auto w-full max-w-4xl px-4 py-9 sm:py-12">
            <span className="bz-guide-kicker">حاسبة BacZone 2027</span>
            <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.25] sm:text-4xl">
              حساب معدل البكالوريا 2027 — جميع الشعب
            </h1>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
              احسب معدّلك بدقة وفق{" "}
              <b className="text-white">
                المعاملات المعتمدة بعد تعديلات وزارة التربية
              </b>
              . اختر شعبتك، أدخل علاماتك، واحصل على النتيجة فوراً — بلا تسجيل.
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl px-3 pb-10 sm:px-4">
          <Link
            href="/home"
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--bz-blue)] hover:underline"
          >
            ← العودة إلى BacZone
          </Link>

          {/* اختيار الشعبة */}
          <h2 className="mb-2 mt-7 font-display text-lg font-extrabold">
            اختر شعبتك لحساب المعدل
          </h2>
          <p className="mb-4 text-[13px] leading-[1.8] text-[var(--bz-ink-3)]">
            كل شعبة لها حاسبة مستقلة بموادها ومعاملاتها الرسمية. اضغط على شعبتك
            للبدء مباشرة:
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {BRANCHES.map((b) => (
              <Link
                key={b.slug}
                href={`/calculate/${b.slug}`}
                className="bz-branch-card"
              >
                <span
                  className="bz-branch-bar"
                  style={{ background: b.color }}
                />
                <span className="bz-branch-name">{b.short}</span>
                <span className="bz-branch-meta">
                  {b.subjects.length} مواد · مجموع المعاملات {totalCoef(b)}
                </span>
              </Link>
            ))}
          </div>

          {/* محتوى سيو */}
          <section className="mt-10 space-y-5 text-[13.5px] leading-[1.9] text-[var(--bz-ink-2)]">
            <div className="rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 sm:p-5">
              <h2 className="mb-2 font-display text-base font-extrabold text-[var(--bz-ink)]">
                كيف يتم حساب معدل البكالوريا؟
              </h2>
              <p>
                يعتمد حساب معدل شهادة البكالوريا في الجزائر على نظام المعاملات.
                كل مادة لها معامل يعكس وزنها في المعدل النهائي. الصيغة الرسمية
                هي:
              </p>
              <p className="my-3 rounded-xl border border-[var(--bz-line)] bg-white px-4 py-3 text-center font-extrabold text-[var(--bz-ink)]">
                المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات
              </p>
              <p>
                كلما ارتفع معامل المادة زاد تأثيرها على معدلك. لذلك يُنصح
                بالتركيز أكثر على المواد ذات المعاملات العالية في شعبتك.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 sm:p-5">
              <h2 className="mb-2 font-display text-base font-extrabold text-[var(--bz-ink)]">
                حاسبة معدل البكالوريا بعد تعديلات الوزارة 2027
              </h2>
              <p>
                شهدت بكالوريا السنوات الأخيرة تعديلات في بعض المواد والمعاملات.
                حاسبة BacZone محدثة لتطابق آخر ما صدر عن وزارة التربية الوطنية،
                وتشمل جميع الشعب المعتمدة:
              </p>
              <ul className="mt-2 list-disc space-y-1 pr-5">
                <li>
                  <Link
                    href="/calculate/sciences"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة علوم تجريبية
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculate/math"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة رياضيات
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculate/engineering"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة تقني رياضي (الهندسة)
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculate/economy"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة تسيير واقتصاد
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculate/letters"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة آداب وفلسفة
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculate/languages"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة لغات أجنبية
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculate/arts"
                    className="font-bold text-[var(--bz-blue)] hover:underline"
                  >
                    حساب معدل البكالوريا شعبة فنون
                  </Link>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 sm:p-5">
              <h2 className="mb-2 font-display text-base font-extrabold text-[var(--bz-ink)]">
                لماذا تستخدم حاسبة BacZone؟
              </h2>
              <ul className="list-disc space-y-1 pr-5">
                <li>دقيقة ومبنية على المعاملات الرسمية المعتمدة</li>
                <li>سريعة وتعمل مباشرة من الهاتف والحاسوب</li>
                <li>بدون تسجيل أو إدخال بيانات شخصية</li>
                <li>صفحة مستقلة لكل شعبة لنتائج أوضح وأدق</li>
                <li>محدثة خصيصاً لبكالوريا 2027</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 sm:p-5">
              <h2 className="mb-2 font-display text-base font-extrabold text-[var(--bz-ink)]">
                نصائح للحصول على معدل أفضل
              </h2>
              <p>
                ركّز على المواد ذات المعاملات المرتفعة لأنها تؤثر أكثر على
                المعدل النهائي. استخدم الحاسبة بعد كل فرض أو اختبار تجريبي
                لمعرفة موقعك الحقيقي، وحدد المواد التي تحتاج جهداً إضافياً قبل
                الامتحان الرسمي. التخطيط المبكر والمتابعة المستمرة هما مفتاح
                التفوق.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-extrabold">
              أسئلة شائعة حول حساب معدل البكالوريا
            </h2>
            <div className="space-y-2">
              {[
                {
                  q: "كيف يتم حساب معدل البكالوريا؟",
                  a: "يُحسب بضرب علامة كل مادة في معاملها، ثم قسمة مجموع النقاط على مجموع المعاملات. الصيغة: المعدل = مجموع (العلامة × المعامل) ÷ مجموع المعاملات.",
                },
                {
                  q: "هل الحاسبة تعتمد المعاملات الجديدة بعد تعديلات الوزارة؟",
                  a: "نعم، حاسبة BacZone محدثة وفق آخر التعديلات الصادرة عن وزارة التربية الوطنية لمعاملات بكالوريا 2027 لجميع الشعب.",
                },
                {
                  q: "هل يمكن حساب المعدل لجميع الشعب؟",
                  a: "نعم، تتوفر حاسبة منفصلة لكل شعبة: علوم تجريبية، رياضيات، تقني رياضي (الهندسة)، تسيير واقتصاد، آداب وفلسفة، لغات أجنبية، وفنون.",
                },
                {
                  q: "هل النتيجة التي تظهرها الحاسبة رسمية؟",
                  a: "الحاسبة أداة تقدير دقيقة وفق المعاملات المعتمدة. النتيجة الرسمية النهائية تصدر فقط عن الديوان الوطني للامتحانات والمسابقات.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-[var(--bz-line)] bg-[var(--bz-canvas)]"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 text-[13.5px] font-bold text-[var(--bz-ink)]">
                    {item.q}
                  </summary>
                  <div className="border-t border-[var(--bz-line)] px-4 py-3 text-[13px] leading-[1.8] text-[var(--bz-ink-2)]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* تنبيه */}
          <p className="mt-8 rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 text-[11.5px] leading-[1.9] text-[var(--bz-ink-3)]">
            <b className="text-[var(--bz-ink-2)]">تنبيه:</b> هذه أداة تقدير وفق
            المعاملات المعتمدة. النتيجة الرسمية النهائية تصدر عن الديوان الوطني
            للامتحانات والمسابقات.
          </p>
        </div>

        {/* Footer */}
        <footer className="border-t border-[var(--bz-line)] bg-[var(--bz-canvas)]">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-right">
            <div className="text-[12px] font-bold text-[var(--bz-ink-2)]">
              BacZone — منصتك للتفوق في البكالوريا
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-semibold text-[var(--bz-ink-3)]">
              <a
                href="https://app.baczonedz.com/"
                className="hover:text-[var(--bz-blue)] hover:underline"
              >
                الصفحة الرئيسية
              </a>
              <a
                href="https://www.baczonedz.com/p/contact-us.html"
                className="hover:text-[var(--bz-blue)] hover:underline"
              >
                اتصل بنا
              </a>
              <a
                href="https://www.baczonedz.com/p/privacy-policy.html"
                className="hover:text-[var(--bz-blue)] hover:underline"
              >
                سياسة الخصوصية
              </a>
              <a
                href="https://www.baczonedz.com/p/terms-and-conditions.html"
                className="hover:text-[var(--bz-blue)] hover:underline"
              >
                اتفاقية الاستخدام
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </EditablePage>
  );
}