import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/features/guides/guides-data";
import { absUrl } from "@/features/guide/site-url";

const TITLE = "أدلّة البكالوريا والتوجيه الجامعي";
const DESC =
  "أدلّة مرجعية لطالب البكالوريا في الجزائر: التوجيه بعد البكالوريا، " +
  "ترتيب الرغبات، والمعدّل الموزون — مشروحة خطوة بخطوة.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: ["أدلة البكالوريا", "التوجيه الجامعي", "دليل الطالب", "بكالوريا 2027", "BacZone"],
  alternates: { canonical: "/guides" },
  openGraph: {
    type: "website", locale: "ar_DZ", url: absUrl("/guides"),
    title: TITLE, description: DESC, siteName: "BacZone",
  },
};

export default function GuidesIndex() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESC,
    url: absUrl("/guides"),
    inLanguage: "ar",
  };

  return (
    <main className="bz-guide min-h-screen">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-4xl px-4 py-9 sm:py-12">
          <span className="bz-guide-kicker">أدلّة BacZone</span>
          <h1 className="mt-2.5 font-display text-[26px] font-extrabold leading-[1.25] sm:text-4xl">
            {TITLE}
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80 sm:text-[15px]">
            أدلّة مرجعية تُرجَع إليها لا تُقرأ مرّة — كل واحد مقسّم إلى أقسام
            تقفز إلى ما تحتاجه منها.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-3 pb-14 pt-6 sm:px-4">
        <div className="grid grid-cols-1 gap-3">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="bz-tool-card">
              <span className="bz-tool-bar" style={{ background: g.color }} />
              <span className="bz-tool-head">
                <span className="bz-tool-name">{g.title}</span>
                <span className="bz-tool-tag">{g.readMinutes} دقائق</span>
              </span>
              <span className="bz-tool-desc">{g.description}</span>
              <span className="bz-tool-benefit">{g.audience}</span>
              <span className="bz-tool-cta" style={{ color: g.color }}>اقرأ الدليل ←</span>
            </Link>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 text-[11.5px] leading-[1.9] text-[var(--bz-ink-3)]">
          نُضيف الأدلّة تدريجياً وبعناية: دليل واحد مفيد أنفع من عشرة سطحية.
        </p>
      </div>
    </main>
  );
}
