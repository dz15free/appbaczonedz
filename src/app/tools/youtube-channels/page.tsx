import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBookOpen, faCalculator, faPlay, faRoute } from "@fortawesome/free-solid-svg-icons";
import { PublicHeader } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { CHANNELS, TOTAL_CHANNELS } from "@/features/tools/channels-data";
import { YouTubeDirectory } from "@/features/tools/youtube-directory";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "أفضل قنوات يوتيوب لمراجعة البكالوريا في الجزائر";
const DESC = `دليل تعليمي يضم ${TOTAL_CHANNELS} اسماً وقناة متاحة للبحث في يوتيوب، مصنفة حسب المادة لمساعدة طالب البكالوريا على الوصول إلى الشرح المناسب دون تضييع وقت.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["قنوات يوتيوب للبكالوريا", "مراجعة البكالوريا يوتيوب", "أساتذة يوتيوب بكالوريا", "شرح دروس البكالوريا", "BacZone"],
  alternates: { canonical: "/tools/youtube-channels" },
  openGraph: { type: "website", locale: "ar_DZ", url: absUrl("/tools/youtube-channels"), title: TITLE, description: DESC, siteName: "BacZone" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function ChannelsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: TITLE, description: DESC, url: absUrl("/tools/youtube-channels"), inLanguage: "ar" },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "الأدوات", item: absUrl("/tools") },
        { "@type": "ListItem", position: 2, name: "قنوات يوتيوب للمراجعة", item: absUrl("/tools/youtube-channels") },
      ] },
    ],
  };

  return (
    <main className="bz-youtube-page min-h-screen">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-youtube-hero">
        <div className="bz-youtube-hero-grid mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
          <div className="bz-youtube-hero-copy">
            <nav className="bz-youtube-breadcrumb" aria-label="مسار الصفحة"><Link href="/tools">الأدوات</Link><span>/</span><span>مصادر المراجعة</span></nav>
            <span className="bz-youtube-eyebrow"><FontAwesomeIcon icon={faPlay} /> دليل مصادر تعليمية</span>
            <h1>{TITLE}</h1>
            <p>ليست هذه قائمة روابط عشوائية. جمعنا الأسماء الموجودة في الدليل ورتبناها حسب المادة، لتبدأ بسؤال واضح وتصل إلى شرح يناسب مستواك ثم تعود إلى الحل والتطبيق.</p>
            <div className="bz-youtube-hero-actions"><a href="#channel-directory" className="bz-youtube-primary">اكتشف القنوات <FontAwesomeIcon icon={faArrowLeft} /></a><Link href="/guides" className="bz-youtube-secondary">ابدأ من دليل المراجعة</Link></div>
          </div>
          <div className="bz-youtube-hero-card" aria-label="ملخص الدليل">
            <div className="bz-youtube-hero-card-icon"><FontAwesomeIcon icon={faPlay} /></div>
            <span>الدليل مبني على الأسماء المتاحة</span>
            <strong>{TOTAL_CHANNELS}</strong>
            <small>اسماً وقناة قابلة للبحث</small>
            <div className="bz-youtube-hero-card-line" />
            <p>لا نرتب الأساتذة بالأفضلية؛ الشرح الأفضل هو ما يساعدك أنت على الفهم والحل.</p>
          </div>
        </div>
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-4">
          <section className="bz-youtube-intro">
            <div className="bz-youtube-intro-head"><span className="bz-youtube-section-kicker">قبل أن تفتح الفيديو</span><h2>اجعل يوتيوب جزءاً من خطة، لا بديلاً عن المراجعة</h2><p>الفيديو مفيد حين يجيب عن تعثر محدد. أما مشاهدة شرح طويل بلا سؤال أو تمرين بعدها فقد تمنحك إحساساً بالفهم من دون نتيجة على الورقة.</p></div>
            <div className="bz-youtube-principles">
              <article><span>01</span><h3>سؤال واحد</h3><p>ابحث عن درس أو فكرة محددة، مثل شرح المتتاليات أو تمرين في الكهرباء.</p></article>
              <article><span>02</span><h3>شاهِد بتركيز</h3><p>دوّن الفكرة أو الخطوة التي أوقفتك، ولا تفتح أكثر من شرح في الوقت نفسه.</p></article>
              <article><span>03</span><h3>حلّ بعده</h3><p>أغلق الفيديو وحاول تمريناً أو موضوعاً؛ التطبيق هو الذي يثبت ما فهمته.</p></article>
            </div>
          </section>

          <section className="bz-youtube-howto"><div><span className="bz-youtube-section-kicker">طريقة استعمال الدليل</span><h2>اختر مصدراً يناسب حاجتك الآن</h2></div><p>إن كنت تتعلم لأول مرة، ابحث عن شرح هادئ ومفصل. وإن كنت تراجع، اختر فيديو أقصر ثم انتقل إلى التمارين. لا تحتاج إلى متابعة كل الأسماء؛ ابدأ باسم واحد لكل مادة واحتفظ بما نفعك.</p></section>

          <section className="bz-youtube-directory-shell"><div className="bz-youtube-directory-head"><div><span className="bz-youtube-section-kicker">دليل القنوات</span><h2>ابحث حسب المادة أو اسم الأستاذ</h2><p>{CHANNELS.length} تصنيفاً متاحاً، والبطاقات تفتح بحثاً بالاسم في يوتيوب لأن البيانات الحالية لا تحتوي روابط مباشرة للقنوات.</p></div><span className="bz-youtube-directory-badge"><FontAwesomeIcon icon={faPlay} /> مصدر قابل للاكتشاف</span></div><YouTubeDirectory categories={CHANNELS} /></section>

          <section className="bz-youtube-next"><div className="bz-youtube-next-icon"><FontAwesomeIcon icon={faRoute} /></div><div><span className="bz-youtube-section-kicker">الخطوة التالية</span><h2>حوّل المشاهدة إلى تقدّم قابل للقياس</h2><p>بعد الشرح، احسب وقتك وخطّط جلسة قصيرة ثم جرّب تمريناً. يمكنك العودة إلى أدوات BacZone حين تحتاج إلى قياس أو تنظيم أو تركيز.</p></div><div className="bz-youtube-next-links"><Link href="/tools/study-planner"><FontAwesomeIcon icon={faRoute} /> أنشئ برنامج مراجعة</Link><Link href="/tools/pomodoro"><FontAwesomeIcon icon={faPlay} /> ابدأ جلسة تركيز</Link><Link href="/calculate"><FontAwesomeIcon icon={faCalculator} /> احسب معدلك</Link></div></section>

          <aside className="bz-youtube-related"><span className="bz-youtube-section-kicker">اقرأ وتابع</span><h2>موارد قريبة من هدفك</h2><div><Link href="/guides"><FontAwesomeIcon icon={faBookOpen} /> أدلة المراجعة</Link><Link href="/specialties"><FontAwesomeIcon icon={faRoute} /> دليل التخصصات</Link><Link href="/blog"><FontAwesomeIcon icon={faBookOpen} /> مقالات تعليمية</Link></div></aside>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}
