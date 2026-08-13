import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";
import { CHANNELS, TOTAL_CHANNELS, searchUrl } from "@/features/tools/channels-data";
import { absUrl } from "@/features/guide/site-url";

/* دليل لا أداة تفاعلية: كل المحتوى مُصيَّر على الخادم — صفر JavaScript
   للعرض، فتصل سريعة جداً وتُفهرَس كاملة. */

const TITLE = "أفضل قنوات يوتيوب للدراسة للبكالوريا — مصنّفة حسب المادّة";
const DESC =
  `دليل ${TOTAL_CHANNELS} قناة وأستاذاً على يوتيوب لمراجعة البكالوريا في الجزائر، ` +
  "مصنّفة حسب المادّة: الرياضيات، الفيزياء، العلوم، اللغات، الهندسة وغيرها.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "قنوات يوتيوب للبكالوريا", "أساتذة يوتيوب بكالوريا", "شرح دروس البكالوريا",
    "مراجعة البكالوريا يوتيوب", "بكالوريا 2027", "BacZone",
  ],
  alternates: { canonical: "/tools/youtube-channels" },
  openGraph: {
    type: "article", locale: "ar_DZ", url: absUrl("/tools/youtube-channels"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function ChannelsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: TITLE,
        description: DESC,
        inLanguage: "ar",
        publisher: { "@type": "Organization", name: "BacZone" },
        mainEntityOfPage: { "@type": "WebPage", "@id": absUrl("/tools/youtube-channels") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الأدوات", item: absUrl("/tools") },
          { "@type": "ListItem", position: 2, name: "قنوات يوتيوب", item: absUrl("/tools/youtube-channels") },
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
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <Link href="/tools" className="font-bold text-white hover:underline">الأدوات</Link>
          </nav>
          <h1 className="font-display text-[24px] font-extrabold leading-[1.25] sm:text-[34px]">
            أفضل قنوات يوتيوب للمراجعة
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.9] text-white/80">
            {TOTAL_CHANNELS} قناة وأستاذاً · {CHANNELS.length} مادّة · مصنّفة لتصل إلى ما تحتاجه مباشرة
          </p>
        </div>
      </header>

      <PublicSidebarLayout placement="tools">
        <div className="mx-auto w-full max-w-4xl px-3 pb-14 pt-5 sm:px-4">
          <section className="bz-spec-sec">
          <h2>كيف تستعمل يوتيوب في المراجعة بلا أن يبتلع وقتك؟</h2>
          <p className="bz-spec-p">
            يوتيوب سلاح ذو حدّين: فيه شرح ممتاز لدروس تعثّرت فيها، وفيه أيضاً
            أسهل طريق لإضاعة ساعتين وأنت تشعر أنّك تدرس.
          </p>
          <ul className="bz-spec-list">
            <li><strong>ادخل بسؤال محدَّد لا بنيّة «المراجعة»</strong>: «شرح المتتاليات الهندسية» لا «رياضيات بكالوريا».</li>
            <li><strong>شاهد ثمّ أغلق وحلّ بيدك.</strong> مشاهدة أستاذ يحلّ تُعطي إحساس الفهم بلا أثر — والفهم يُقاس بيدك على الورقة.</li>
            <li><strong>أستاذ واحد لكل مادّة.</strong> تعدّد الشروح لنفس الدرس يُشتّت أكثر ممّا يُفيد.</li>
            <li><strong>سرعة 1.25× أو 1.5×</strong> للدروس التي تراجعها لا التي تتعلّمها أوّل مرّة.</li>
            <li><strong>لا تفتحه في وقت حصّتك المخصّصة للتمارين</strong> — الشرح مكمّل للتمرين لا بديل عنه.</li>
          </ul>
        </section>

        <div className="mb-3 rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-3.5 text-[11.5px] leading-[1.9] text-[var(--bz-ink-3)]">
          <b className="text-[var(--bz-ink-2)]">ملاحظة:</b> كل اسم أدناه يفتح <b>بحثاً في
          يوتيوب</b> لا رابط قناة مباشراً — لأنّ روابط القنوات تتغيّر وتُحذف، أمّا البحث
          بالاسم فيصل دائماً إلى ما هو متاح اليوم. والأسماء مرتّبة بالمادّة لا بالأفضلية:
          الأفضل هو من تفهم شرحه أنت.
        </div>

        <div className="space-y-6">
          {CHANNELS.map((c) => (
            <section key={c.category}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-[var(--bz-blue)]" />
                <h2 className="font-display text-[15px] font-extrabold">{c.category}</h2>
                <span className="font-mono text-[11px] text-[var(--bz-ink-3)]">{c.channels.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {c.channels.map((name) => (
                  <a
                    key={name}
                    href={searchUrl(name)}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="bz-ch-card"
                  >
                    <span className="bz-ch-ico" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.5 7.2a2.7 2.7 0 0 0-1.9-1.9C18.9 4.8 12 4.8 12 4.8s-6.9 0-8.6.5A2.7 2.7 0 0 0 1.5 7.2 28 28 0 0 0 1 12a28 28 0 0 0 .5 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 8.6.5 8.6.5s6.9 0 8.6-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 23 12a28 28 0 0 0-.5-4.8zM9.8 15.3V8.7l5.7 3.3z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{name}</span>
                    <span className="shrink-0 text-[10.5px] text-[var(--bz-ink-3)]">ابحث ↗</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-9 border-t border-[var(--bz-line)] pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">نظّم مشاهدتك</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/tools/study-planner" className="bz-spec-rel"><span>أنشئ برنامج مراجعتك</span></Link>
            <Link href="/tools/pomodoro" className="bz-spec-rel"><span>مؤقّت التركيز</span></Link>
          </div>
          </aside>
        </div>
      </PublicSidebarLayout>
    </main>
  );
}
