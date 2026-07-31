import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SPECIALITIES, getSpeciality, type Speciality } from "@/features/guide/specialities";

/* ════════════════════════════════════════════════════════════
   صفحة تخصّص واحد

   **الرابط هو الأصل**: `/specialties/esi-alger`. قصير، ثابت، ولاتيني
   حتى لا يتحوّل إلى ترميز نسبة مئوية طويل عند المشاركة — والأهمّ أنّه
   **لا يتغيّر أبداً** بعد النشر، لأنّ تغييره يُلغي ترتيب الصفحة في
   Google ويكسر كل رابط شاركه الطلاب.

   الصفحة **ساكنة**: تُبنى وقت النشر لا وقت الطلب، فتصل لمحرّك البحث
   وللطالب على 3G في أجزاء من الثانية بلا استعلام قاعدة بيانات.
════════════════════════════════════════════════════════════ */

export const dynamicParams = false;

export function generateStaticParams() {
  return SPECIALITIES.map((s) => ({ slug: s.slug }));
}

function summarize(s: Speciality): string {
  const raw = (s.intro || s.verdict || s.careers || "").replace(/\s+/g, " ").trim();
  const clean = raw.replace(/^[•\-–—\s]+/, "");
  const cut = clean.slice(0, 155);
  return cut.length < clean.length ? `${cut.slice(0, cut.lastIndexOf(" "))}…` : cut ||
    `كل ما تحتاج معرفته عن تخصّص ${s.ar} في الجزائر: القبول والدراسة وفرص العمل.`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const s = getSpeciality(slug);
  if (!s) return { title: "تخصّص غير موجود" };

  /* العنوان يبدأ بما يكتبه الطالب في البحث: اسم التخصّص، ثم الاسم
     الفرنسي/المختصر لأنّ كثيرين يبحثون بـ«ESI» لا بالاسم الكامل. */
  const title = `تخصّص ${s.ar}${s.fr ? ` — ${s.fr}` : ""} في الجزائر`;
  const description = summarize(s);
  const url = `/specialties/${s.slug}`;

  return {
    title,
    description,
    keywords: [s.ar, s.fr ?? "", ...(s.alt ?? []), s.field,
               "التوجيه الجامعي", "معدلات القبول", "الجزائر"].filter(Boolean),
    alternates: { canonical: url },
    openGraph: {
      type: "article", locale: "ar_DZ", url, title, description, siteName: "BacZone",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const SECTIONS: { key: keyof Speciality; label: string }[] = [
  { key: "intro", label: "ما هو هذا التخصّص؟" },
  { key: "study", label: "نظام الدراسة ومدّتها" },
  { key: "admission", label: "القبول والمعدّلات" },
  { key: "subjects", label: "المواد التي تدرسها" },
  { key: "careers", label: "أين تعمل بعد التخرّج" },
  { key: "pros", label: "ما يجذب إليه" },
  { key: "cons", label: "ما يجب أن تعرفه قبل الاختيار" },
  { key: "prosCons", label: "مميّزات وعيوب" },
  { key: "verdict", label: "الخلاصة" },
];

function Body({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => {
        const t = para.trim();
        if (!t) return null;
        if (t.startsWith("•")) {
          return (
            <ul key={i} className="my-2 space-y-1.5">
              {t.split("\n").filter(Boolean).map((li, j) => (
                <li key={j} className="flex gap-2 text-[13.5px] leading-relaxed">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--bz-blue)]" />
                  <span>{li.replace(/^•\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-2 text-[13.5px] leading-[1.9]">{t}</p>
        );
      })}
    </>
  );
}

export default async function SpecialityPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const s = getSpeciality(slug);
  // `notFound()` نوعها `never`، لكنّ التضييق الصريح يجعل الملفّ سليماً
  // تحت أي إعداد أنواع ولا يعتمد على تصريح خارجي.
  if (!s) { notFound(); return null; }

  const related = SPECIALITIES.filter((x) => x.field === s.field && x.slug !== s.slug).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `تخصّص ${s.ar}${s.fr ? ` — ${s.fr}` : ""}`,
    description: summarize(s),
    inLanguage: "ar",
    about: { "@type": "Thing", name: s.field },
    publisher: { "@type": "Organization", name: "BacZone" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `/specialties/${s.slug}` },
  };

  /* فتات الطريق ليس زينة: Google يعرضه بدل الرابط الخام في النتيجة،
     فيفهم الباحث موقع الصفحة قبل أن يضغط. */
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "دليل التخصّصات", item: "/specialties" },
      { "@type": "ListItem", position: 2, name: s.field, item: `/specialties#${encodeURIComponent(s.field)}` },
      { "@type": "ListItem", position: 3, name: s.ar, item: `/specialties/${s.slug}` },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
        <Link href="/specialties" className="font-bold text-[var(--bz-blue)] hover:underline">
          دليل التخصّصات
        </Link>
        <span>·</span>
        <Link href={`/specialties#${encodeURIComponent(s.field)}`} className="hover:underline">
          {s.field}
        </Link>
      </nav>

      <header className="mb-5 border-b border-border pb-4">
        <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
          تخصّص {s.ar}
        </h1>
        {s.fr && (
          <p className="mt-1 text-sm font-bold text-text-muted" dir="ltr">{s.fr}</p>
        )}
        <span className="mt-2 inline-block rounded-full bg-[var(--bz-blue-050)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--bz-blue-700)]">
          {s.field}
        </span>
      </header>

      <article>
        {SECTIONS.map(({ key, label }) => {
          const v = s[key];
          if (typeof v !== "string" || !v.trim()) return null;
          return (
            <section key={key} className="mb-5">
              <h2 className="mb-1.5 font-display text-base font-extrabold text-[var(--bz-blue-700)]">
                {label}
              </h2>
              <Body text={v} />
              {key === "admission" && (
                <p className="mt-2 rounded-lg bg-[var(--bz-amber-050)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--bz-amber-ink,#8A5A12)]">
                  المعدّلات مؤشّر من سنوات سابقة وتتغيّر كل سنة بحسب عدد الناجحين
                  ورغباتهم — لا تعتبرها ضماناً.
                </p>
              )}
            </section>
          );
        })}

        {s.extra?.map((e, i) => (
          <section key={i} className="mb-5">
            <h2 className="mb-1.5 font-display text-base font-extrabold text-[var(--bz-blue-700)]">
              {e.t}
            </h2>
            <Body text={e.v} />
          </section>
        ))}
      </article>

      {related.length > 0 && (
        <aside className="mt-8 border-t border-border pt-5">
          <h2 className="mb-3 font-display text-base font-extrabold">تخصّصات قريبة</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.slug} href={`/specialties/${r.slug}`}
                className="rounded-xl border border-border bg-surface p-2.5 text-sm font-bold transition hover:border-[var(--bz-blue-100)] hover:shadow-sm">
                {r.ar}
              </Link>
            ))}
          </div>
        </aside>
      )}
    </main>
  );
}
