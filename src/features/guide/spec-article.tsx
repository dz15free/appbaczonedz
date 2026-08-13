import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { linkOf } from "@/features/guide/spec-link";
import type { SpecFull } from "@/features/guide/guide-merge";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

/* ════════════════════════════════════════════════════════════
   عرض موضوع التخصّص

   الأقسام تُعرض **فقط إن كُتبت**: قسم فارغ بعنوان يوحي بأنّ الموقع
   ناقص، وحذفه أنظف من ملئه بكلام إنشائي.
════════════════════════════════════════════════════════════ */

const SECTIONS: { key: keyof SpecFull; label: string; icon: IconName; tone?: "pro" | "con" }[] = [
  { key: "intro",     label: "ما هو هذا التخصّص؟",        icon: "book" },
  { key: "study",     label: "نظام الدراسة ومدّتها",       icon: "layers" },
  { key: "admission", label: "القبول والمعدّلات",          icon: "target" },
  { key: "subjects",  label: "المواد التي تدرسها",         icon: "file" },
  { key: "careers",   label: "أين تعمل بعد التخرّج",       icon: "users" },
  { key: "pros",      label: "ما يجذب إليه",               icon: "star",  tone: "pro" },
  { key: "cons",      label: "ما يجب أن تعرفه قبل الاختيار", icon: "target", tone: "con" },
  { key: "modules",   label: "المقاييس ولغة التدريس",       icon: "book" },
  { key: "daily",     label: "يومك الدراسي عملياً",         icon: "timer" },
  { key: "where",     label: "أين يُدرَّس في الجزائر؟",       icon: "home" },
  { key: "numbers",   label: "التخصّص بالأرقام",             icon: "poll" },
  { key: "master",    label: "ماذا بعد الليسانس؟",          icon: "layers" },
  { key: "future",    label: "الآفاق المستقبلية",           icon: "target" },
  { key: "salary",    label: "الأجر والمنح",                icon: "star" },
  { key: "prosCons",  label: "مميّزات وعيوب",               icon: "shapes" },
  /* آراء الطلبة قبل الخلاصة مباشرة: آخر ما يقرؤه الطالب قبل أن يقرّر
     يجب أن يكون صوت من جرّب، لا وصفاً رسمياً. */
  { key: "voices",    label: "من داخل التخصّص: ما يقوله طلبته", icon: "chat" },
  { key: "verdict",   label: "الخلاصة",                    icon: "check" },
];

/* يُصيّر **الغامق** بلا مكتبة Markdown.
   نُقسّم على `**` ثم نُغمّق الأجزاء الفردية — تركيب بسيط لا يحتمل
   ثغرة حقن لأنّنا نُنشئ عناصر React لا HTML خامّاً. */
function Rich({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="font-extrabold text-[var(--bz-ink)]">{p}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Body({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => {
        const t = para.trim();
        if (!t) return null;
        if (t.startsWith("•") || t.startsWith("-")) {
          return (
            <ul key={i} className="bz-spec-list">
              {t.split("\n").filter(Boolean).map((li, j) => (
                <li key={j}><Rich text={li.replace(/^[•\-]\s*/, "")} /></li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="bz-spec-p"><Rich text={t} /></p>;
      })}
    </>
  );
}

/* حالة «لم نجده / قيد الإعداد» — تُستدعى من الصفحة مباشرةً */
export function SpecNotFound({ spec }: { spec?: SpecFull | null }) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-[22px] font-extrabold leading-snug">
          {spec ? `تخصّص ${spec.ar} — قيد الإعداد` : "لم نجد هذا التخصّص"}
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-[15px] leading-[1.9] text-[var(--bz-ink-2)]">
          {spec
            ? "نكتب شرح هذا التخصّص حالياً. عد قريباً، أو تصفّح بقيّة التخصّصات."
            : "ربما تغيّر الرابط. تصفّح الدليل للعثور على تخصّصك."}
        </p>
        <Link href="/specialties"
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--bz-blue)] px-5 text-[14px] font-extrabold text-white">
          <Icon name="chevRight" size={14} />
          كل التخصّصات
        </Link>
      </main>
      <PublicCta />
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   عرض موضوع التخصّص — **مكوّن خادم**

   كان مكوّن عميل يجلب المحتوى بنفسه في `useEffect`، فيصل الزاحف —
   ويصل الطالب على شبكة بطيئة — إلى «جارٍ التحميل…» ولا شيء غيره،
   والبيانات المنظّمة أسفل `return` مبكّر فلا تُرسَل أبداً.

   المعروض هنا **هو نفسه حرفاً بحرف**: لم يُحذف قسم ولا سطر. ما تغيّر
   أنّ البيانات تصل جاهزة من الصفحة بدل أن يجلبها المتصفّح.
   ════════════════════════════════════════════════════════════ */
export function SpecArticle({ spec, rows }: { spec: SpecFull; rows: SpecFull[] }) {
  /* الأقسام المكتوبة فعلاً — يشترك فيها الفهرس والعرض */
  const written = SECTIONS.filter(({ key }) => {
    const v = spec[key];
    return typeof v === "string" && v.trim().length > 0;
  });

  const related = rows
    .filter((r) => r.field === spec.field && r.slug !== spec.slug && r.published)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `تخصّص ${spec.ar}${spec.fr ? ` — ${spec.fr}` : ""}`,
    /* الوصف من `excerpt` أوّلاً: المقدّمة تحوي علامات ** فتظهر في
       نتيجة البحث حرفيّاً لو أخذناها كما هي. */
    description: (spec.excerpt || (spec.intro ?? "").replace(/\*\*/g, "")).slice(0, 160),
    inLanguage: "ar",
    about: { "@type": "Thing", name: spec.field },
    publisher: { "@type": "Organization", name: "BacZone" },
    ...(spec.updatedAt
      ? { dateModified: new Date(spec.updatedAt).toISOString() }
      : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(`/specialties/${linkOf(spec)}`) },
  };

  /* روابط **مطلقة** في فتات الطريق: Google يرفض النسبية صراحةً. */
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "دليل التخصّصات", item: absUrl("/specialties") },
      { "@type": "ListItem", position: 2, name: spec.field,
        item: absUrl(`/specialties#${encodeURIComponent(spec.field)}`) },
      { "@type": "ListItem", position: 3, name: spec.ar,
        item: absUrl(`/specialties/${linkOf(spec)}`) },
    ],
  };

  return (
    <>
    <PublicHeader />
    <main className="bz-guide">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <header className="bz-guide-hero">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
            <Link href="/specialties" className="font-bold text-white hover:underline">
              دليل التخصّصات
            </Link>
            <span>·</span>
            <Link href={`/specialties#${encodeURIComponent(spec.field)}`} className="hover:underline">
              {spec.field}
            </Link>
          </nav>
          <h1 className="font-display text-[24px] font-extrabold leading-[1.25] sm:text-[34px]">
            {spec.ar}
          </h1>
          {spec.fr && (
            <p className="mt-1.5 text-[13px] font-bold text-white/70" dir="ltr">{spec.fr}</p>
          )}
          {spec.excerpt && (
            <p className="mt-3 max-w-2xl text-[13.5px] leading-[1.9] text-white/80">
              {spec.excerpt}
            </p>
          )}
        </div>
      </header>

      <PublicSidebarLayout placement="guides">
        <article className="mx-auto w-full max-w-3xl px-4 pb-14 pt-6">
          {/* فهرس الموضوع — سبعة عشر قسماً بلا فهرس تعني تمريراً أعمى
            على الهاتف، ومن يريد «القبول والمعدّلات» وحدها مضطرّ للمرور
            بكل شيء. لا يُحذف قسم: تُضاف طريقة الوصول إليه. */}
        {written.length > 3 && (
          <nav aria-label="أقسام الموضوع" className="bz-spec-toc">
            <p className="bz-spec-toc-t">
              <Icon name="file" size={13} />
              في هذا الموضوع
              <span className="bz-spec-toc-n">{written.length} أقسام</span>
            </p>
            <div className="bz-spec-toc-l">
              {written.map(({ key, label }) => (
                <a key={String(key)} href={`#sec-${String(key)}`}>{label}</a>
              ))}
            </div>
          </nav>
        )}

        {SECTIONS.map(({ key, label, icon, tone }) => {
          const v = spec[key];
          if (typeof v !== "string" || !v.trim()) return null;
          return (
            <section key={String(key)} id={`sec-${String(key)}`} className={`bz-spec-sec ${tone ? `is-${tone}` : ""}`}>
              <h2>
                <Icon name={icon} size={15} />
                {label}
              </h2>
              <Body text={v} />
              {key === "admission" && (
                <p className="bz-spec-note">
                  المعدّلات مؤشّر من سنوات سابقة وتتغيّر كل سنة بحسب عدد الناجحين
                  ورغباتهم — لا تعتبرها ضماناً.
                </p>
              )}
            </section>
          );
        })}

        {related.length > 0 && (
          <aside className="mt-9 border-t border-[var(--bz-line)] pt-6">
            <h2 className="mb-3 font-display text-base font-extrabold">تخصّصات قريبة</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/specialties/${linkOf(r)}`} className="bz-spec-rel">
                  <span className="truncate">{r.ar}</span>
                  <Icon name="chevLeft" size={13} />
                </Link>
              ))}
            </div>
          </aside>
        )}
        </article>
      </PublicSidebarLayout>

      <PublicCta
        title={`تدرس ${spec.ar}؟ جهّز معدّلك أوّلاً`}
        hint="انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، وملخّصات لكل الشُّعب — مجّاناً."
      />
    </main>
    </>
  );
}
