import type { Metadata } from "next";
import Link from "next/link";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

/* ════════════════════════════════════════════════════════════
   أدوات البكالوريا — الصفحة الأمّ

   **لا تُعرض أداة غير موجودة، ولا رابط يقود إلى 404.** وكل أداة
   مصنّفة بصدق: العامّة تعمل بلا تسجيل، والتي تحفظ تقدّمك تحتاج حساباً
   — وقول ذلك مقدّماً أفضل من جدار تسجيل يفاجئ الزائر بعد الضغط.

   الصفحة كلّها مُصيَّرة على الخادم: لا Firebase ولا حالة، فتصل سريعة
   وتُفهرَس كاملة.
════════════════════════════════════════════════════════════ */

const TITLE = "أدوات البكالوريا — حاسبات ومخطّطات ومحاكاة مجّانية";
const DESC =
  "أدوات مجّانية لطلبة البكالوريا في الجزائر: حساب المعدّل، المعدّل الموزون، " +
  "مخطّط المراجعة للطباعة، مؤقّت التركيز، وبطاقات المراجعة — أغلبها بلا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "أدوات البكالوريا", "حاسبة معدل البكالوريا", "المعدل الموزون",
    "مخطط المراجعة", "أدوات الدراسة", "بكالوريا 2027", "BacZone",
  ],
  alternates: { canonical: "/tools" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: absUrl("/tools"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

interface Tool {
  href: string;
  name: string;
  desc: string;
  /** لماذا تنفعك — لا وصف تقني */
  benefit: string;
  cta: string;
  color: string;
  /** تحتاج حساباً لأنّها تحفظ تقدّمك */
  needsAccount?: boolean;
}

/* ⚠️ كل رابط هنا **مُتحقَّق من وجوده** في المشروع. */
const TOOLS: Tool[] = [
  {
    href: "/calculate",
    name: "حساب معدل البكالوريا",
    desc: "أدخل علاماتك بالمعاملات المعتمدة لكل شعبة، واعرف معدّلك فوراً.",
    benefit: "تعرف أين تقف قبل النتائج، فترتّب رغباتك بواقعية لا بتخمين.",
    cta: "احسب معدّلي",
    color: "#2350D9",
  },
  {
    href: "/tools/weighted-average",
    name: "حساب المعدل الموزون",
    desc: "سبعة ميادين بصيغها المعتمدة: الطبّ، الإعلام الآلي، الهندسة، اللغات وغيرها.",
    benefit: "معدّلك يختلف من ميدان إلى آخر — والفرق قد يفصل بين القبول والرفض.",
    cta: "احسب الموزون",
    color: "#1E8A5F",
  },
  {
    href: "/tools/exam-simulator",
    name: "عش تجربة امتحان حقيقي",
    desc: "مواضيع بكالوريا حقيقية بالتوقيت الرسمي، مع جرس البداية والنهاية.",
    benefit: "أكثر ما يُفاجئ الطالب يوم الامتحان ليس صعوبة الموضوع بل الوقت.",
    cta: "ابدأ المحاكاة",
    color: "#C2410C",
  },
  {
    href: "/tools/study-planner",
    name: "أنشئ برنامج مراجعتك",
    desc: "معالج من ثلاث خطوات: شعبتك، أيّامك وفتراتك، ثمّ جدول أسبوعي قابل للطباعة.",
    benefit: "أكثر ما يُضيّع الوقت ليس قلّة الساعات بل السؤال اليومي: بماذا أبدأ؟",
    cta: "أنشئ جدولي",
    color: "#4F46E5",
  },
  {
    href: "/tools/youtube-channels",
    name: "قنوات يوتيوب للمراجعة",
    desc: "69 قناة وأستاذاً مصنّفة حسب المادّة، مع كيفية استعمال يوتيوب بلا إضاعة وقت.",
    benefit: "يوتيوب أسهل طريق لإضاعة ساعتين وأنت تشعر أنّك تدرس — إن دخلته بلا سؤال محدَّد.",
    cta: "تصفّح القنوات",
    color: "#DC2626",
  },
  {
    href: "/tools/planner",
    name: "مخطّط البكالوريا للطباعة",
    desc: "صمّم مخطّطك، حمّله صورة، أو خذ بلانراً جاهزاً بصيغة PDF.",
    benefit: "خطّة أمام عينيك على الجدار تُنفَّذ أكثر من خطّة في هاتفك.",
    cta: "جهّز مخطّطي",
    color: "#D08217",
  },
  {
    href: "/tools/pomodoro",
    name: "مؤقّت التركيز",
    desc: "جلسات مركّزة باستراحات منتظمة على طريقة بومودورو.",
    benefit: "خمس وعشرون دقيقة بتركيز تامّ تفوق ساعتين مع الهاتف بجانبك.",
    cta: "ابدأ جلسة",
    color: "#DB2777",
  },
  {
    href: "/specialties",
    name: "دليل التخصّصات الجامعية",
    desc: "أكثر من 250 تخصّصاً: ماذا تدرس فيه، كيف تُقبل، وأين تعمل بعده.",
    benefit: "أكثر ما يُندَم عليه ليس المعدّل، بل اختيار تخصّص لا تعرف عنه إلّا اسمه.",
    cta: "تصفّح التخصّصات",
    color: "#7C3AED",
  },
  {
    href: "/tools/tracker",
    name: "تقدّمي الدراسي",
    desc: "تابع ما أنجزته من دروس البرنامج الرسمي، مادّةً مادّة.",
    benefit: "المقياس الوحيد ذو المعنى: كم درساً صار أخضر منذ شهر؟",
    cta: "تابع تقدّمي",
    color: "#0E7490",
    needsAccount: true,
  },
  {
    href: "/tools/flashcards",
    name: "بطاقات المراجعة",
    desc: "بطاقات سؤال/جواب تُراجعها بالاسترجاع النشط لا بالقراءة.",
    benefit: "ما تسترجعه بلا نظر هو ما راجعته فعلاً؛ والباقي قرأته فقط.",
    cta: "افتح بطاقاتي",
    color: "#C2410C",
    needsAccount: true,
  },
  {
    href: "/tools/tasks",
    name: "مهامّي الدراسية",
    desc: "قائمة مهامّ يومية بسيطة لا تنسى معها ما خطّطت له.",
    benefit: "المهمّة المكتوبة تُنجز؛ والمهمّة في الذاكرة تُؤجَّل.",
    cta: "افتح مهامّي",
    color: "#4F46E5",
    needsAccount: true,
  },
];

export default function ToolsPage() {
  const free = TOOLS.filter((t) => !t.needsAccount);
  const account = TOOLS.filter((t) => t.needsAccount);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: TITLE,
        description: DESC,
        url: absUrl("/tools"),
        inLanguage: "ar",
      },
      {
        "@type": "ItemList",
        itemListElement: TOOLS.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          url: absUrl(t.href),
        })),
      },
    ],
  };

  return (
    <main className="bz-guide min-h-screen">
      <PublicHeader />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-5xl px-4 py-9 sm:py-12">
          <span className="bz-guide-kicker">أدوات BacZone</span>
          <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.25] sm:text-4xl">
            أدوات البكالوريا
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
            أدوات بنيناها لأنّ الطالب يحتاجها فعلاً — لا لتزيين الموقع.
            <b className="text-white"> أغلبها يعمل بلا تسجيل.</b>
          </p>
        </div>
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="mx-auto w-full max-w-5xl px-3 pb-14 sm:px-4">
          <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[var(--bz-blue)]" />
            <h2 className="font-display text-[15px] font-extrabold sm:text-lg">أدوات بلا تسجيل</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {free.map((t) => <ToolCard key={t.href} t={t} />)}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-[var(--bz-ink-3)]" />
            <h2 className="font-display text-[15px] font-extrabold sm:text-lg">أدوات تحفظ تقدّمك</h2>
          </div>
          <p className="mb-3 text-[11.5px] leading-relaxed text-[var(--bz-ink-3)]">
            هذه تحتاج حساباً مجّانياً — لأنّها تحفظ ما أنجزته لتجده في المرّة القادمة.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {account.map((t) => <ToolCard key={t.href} t={t} />)}
          </div>
          </section>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}

function ToolCard({ t }: { t: Tool }) {
  return (
    <Link href={t.href} className="bz-tool-card">
      <span className="bz-tool-bar" style={{ background: t.color }} />
      <span className="bz-tool-head">
        <span className="bz-tool-name">{t.name}</span>
        {t.needsAccount && <span className="bz-tool-tag">بحساب</span>}
      </span>
      <span className="bz-tool-desc">{t.desc}</span>
      <span className="bz-tool-benefit">{t.benefit}</span>
      <span className="bz-tool-cta" style={{ color: t.color }}>{t.cta} ←</span>
    </Link>
  );
}
