
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { linkOf } from "@/features/guide/spec-link";
import type { SourceSection, SpecFull } from "@/features/guide/guide-merge";
import { absUrl } from "@/features/guide/site-url";
import { PublicHeader, PublicCta } from "@/components/public-shell";
import { PublicBackButton } from "@/components/ui/public-back-button";
import { PublicSidebarLayout } from "@/features/sidebar/sidebar-server";

const SECTIONS: { key: keyof SpecFull; label: string; icon: IconName; tone?: "pro" | "con" }[] = [
  { key: "intro", label: "ما هو هذا التخصّص؟", icon: "book" },
  { key: "study", label: "طبيعة الدراسة ومدّتها", icon: "layers" },
  { key: "subjects", label: "المواد والمحاور التي تدرسها", icon: "file" },
  { key: "modules", label: "المقاييس ولغة التدريس", icon: "book" },
  { key: "admission", label: "شروط القبول والتوجيه", icon: "target" },
  { key: "numbers", label: "معدلات القبول في المصدر", icon: "poll" },
  { key: "where", label: "أين يُدرَّس في الجزائر؟", icon: "home" },
  { key: "daily", label: "كيف يبدو يومك الدراسي؟", icon: "timer" },
  { key: "careers", label: "أين يمكن أن تعمل بعد التخرّج؟", icon: "users" },
  { key: "pros", label: "ما الذي قد يجذبك إليه؟", icon: "star", tone: "pro" },
  { key: "cons", label: "ما ينبغي أن تعرفه قبل الاختيار", icon: "target", tone: "con" },
  { key: "master", label: "ماذا بعد التخرّج؟", icon: "layers" },
  { key: "future", label: "آفاق التطور المهني والعلمي", icon: "target" },
  { key: "prosCons", label: "مميّزات وتحديات مختصرة", icon: "shapes" },
  { key: "voices", label: "ملاحظات عملية قبل الاختيار", icon: "chat" },
  { key: "verdict", label: "الخلاصة", icon: "check" },
  { key: "sources", label: "مصادر المعلومات", icon: "book" },
];

function Rich({ text }: { text: string }) {
  const parts = text.split("**");
  const renderPart = (part: string, keyPrefix: string, emphasized: boolean) => {
    const tokens = part.split(/(https?:\/\/[^\s)]+)/gu);
    return tokens.map((token, tokenIndex) => {
      if (/^https?:\/\//u.test(token)) {
        return <a key={`${keyPrefix}-url-${tokenIndex}`} href={token} target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--bz-blue)] underline decoration-dotted underline-offset-2">{token}</a>;
      }
      return emphasized
        ? <strong key={`${keyPrefix}-text-${tokenIndex}`} className="font-extrabold text-[var(--bz-ink)]">{token}</strong>
        : <span key={`${keyPrefix}-text-${tokenIndex}`}>{token}</span>;
    });
  };
  return <>{parts.map((part, index) => renderPart(part, String(index), index % 2 === 1))}</>;
}

function Body({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((paragraph, index) => {
    const value = paragraph.trim();
    if (!value) return null;
    if (value.startsWith("•") || value.startsWith("-")) {
      return <ul key={index} className="bz-spec-list">{value.split("\n").filter(Boolean).map((item, itemIndex) => <li key={itemIndex}><Rich text={item.replace(/^[•\-]\s*/, "")} /></li>)}</ul>;
    }
    return <p key={index} className="bz-spec-p"><Rich text={value} /></p>;
  })}</>;
}

export function SpecNotFound({ spec }: { spec?: SpecFull | null }) {
  return <>
    <PublicHeader />
    <main className="bz-empty-public mx-auto max-w-2xl px-4 py-16 text-center">
      <span className="bz-empty-public-mark"><Icon name="book" size={21} /></span>
      <h1 className="mt-5 font-display text-[22px] font-extrabold leading-snug">{spec ? `تخصّص ${spec.ar} — قيد الإعداد` : "لم نجد هذا التخصّص"}</h1>
      <p className="mx-auto mt-2.5 max-w-md text-[15px] leading-[1.9] text-[var(--bz-ink-2)]">{spec ? "نكتب شرح هذا التخصّص حالياً. عد قريباً، أو تصفّح بقيّة التخصّصات." : "ربما تغيّر الرابط. تصفّح الدليل للعثور على تخصّصك."}</p>
      <Link href="/specialties" className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--bz-blue)] px-5 text-[14px] font-extrabold text-white"><Icon name="chevRight" size={14} /> كل التخصّصات</Link>
    </main>
    <PublicCta />
  </>;
}

type ArticleNavItem = { key: string; label: string; icon: IconName; tone?: "pro" | "con" };

function dynamicNavItem(section: SourceSection): ArticleNavItem {
  return { key: section.id, label: section.label, icon: (section.icon || "book") as IconName, tone: section.tone === "pro" || section.tone === "con" ? section.tone : undefined };
}

export function SpecArticle({ spec, rows }: { spec: SpecFull; rows: SpecFull[] }) {
  const unverified = !spec.indexable;
  const dynamicSections = (spec.sections ?? []).filter((section) => typeof section.body === "string" && section.body.trim().length > 0);
  const hasDynamicSections = dynamicSections.length > 0;
  /* ── أقسام `extra` ──
     🐛 كانت تُكتب ولا تُعرض: الصفحة تمرّ على SECTIONS وحدها، و`extra` ليس
     فيها؛ يُؤخذ منه بند «مصادر المعلومات» فقط (guide-merge). فبقيت 61 فقرة
     في 40 صفحة — «لا تحويل من الشبه الطبّي ولا إليه»، «لماذا يختلف المعدّل
     من ولاية إلى أخرى؟»… — مكتوبة ومراجَعة ولا يراها أحد. تُعرض الآن قبل
     الخلاصة، وبند المصادر يبقى في قسمه الخاصّ آخر الصفحة. */
  const extraItems = (Array.isArray(spec.extra) ? spec.extra : [])
    .filter((e): e is { t: string; v: string } => typeof e?.t === "string" && typeof e?.v === "string" && e.t.trim() !== "" && e.v.trim() !== "" && !e.t.includes("مصادر"))
    .map((e, i) => ({ key: `extra-${i}`, label: e.t.trim(), icon: "target" as IconName, body: e.v }));
  const orderedSections: (ArticleNavItem & { body: string })[] = [];
  for (const { key, label, icon, tone } of SECTIONS) {
    if (key === "verdict") orderedSections.push(...extraItems);
    if (key === "sources") continue;
    const value = spec[key];
    /* صفحة غير موثّقة قد تعرض معدّلات أقرب تكوين رسمي (fintech ← F02LAL01):
       العنوان يقول ذلك بدل «معدلات القبول في المصدر» الذي يوحي بأنّها معدّلاته. */
    const shownLabel = unverified && key === "numbers" ? "معدّلات أقرب تكوين رسمي (لا لهذا الاسم)" : label;
    if (typeof value === "string" && value.trim()) orderedSections.push({ key: String(key), label: shownLabel, icon, tone, body: value });
  }
  const written: ArticleNavItem[] = hasDynamicSections
    ? [...dynamicSections.map(dynamicNavItem), ...(spec.sources?.trim() ? [{ key: "sources", label: "مصادر المعلومات", icon: "book" as IconName }] : [])]
    : [...orderedSections, ...(spec.sources?.trim() ? [{ key: "sources", label: "مصادر المعلومات", icon: "book" as IconName }] : [])];
  /* غير الموثّق لا يُقترح من صفحة أخرى: الرابط بلا وسم يوحي بأنّه تخصّص مؤكّد */
  const related = rows.filter((row) => row.field === spec.field && row.slug !== spec.slug && row.published && row.indexable).slice(0, 6);
  const introText = spec.excerpt || (spec.intro ?? "").replace(/\*\*/g, "");
  const needsEditorialReview = !spec.indexable && spec.quality === "needs-review";
  const articleUrl = `/specialties/${linkOf(spec)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `تخصّص ${spec.ar}${spec.fr ? ` — ${spec.fr}` : ""}`,
    description: introText.slice(0, 160),
    inLanguage: "ar",
    about: { "@type": "Thing", name: spec.field },
    publisher: { "@type": "Organization", name: "BacZone" },
    ...(spec.updatedAt
      ? { dateModified: new Date(spec.updatedAt).toISOString() }
      : spec.lastVerifiedAt
        ? { dateModified: new Date(spec.lastVerifiedAt).toISOString() }
        : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(articleUrl) },
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "دليل التخصّصات", item: absUrl("/specialties") },
      { "@type": "ListItem", position: 2, name: spec.field, item: absUrl(`/specialties#${encodeURIComponent(spec.field)}`) },
      { "@type": "ListItem", position: 3, name: spec.ar, item: absUrl(articleUrl) },
    ],
  };

  return <>
    <PublicHeader />
    <main className="bz-guide bz-v9-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="bz-spec-hero-pro bz-spec-editorial-hero bz-v9-tool-hero">
        <div className="bz-spec-hero-orb bz-spec-hero-orb-one" />
        <div className="bz-spec-hero-orb bz-spec-hero-orb-two" />
        <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
          <nav className="bz-spec-breadcrumb mb-4 flex flex-wrap items-center gap-2 text-[11px] text-white/65" aria-label="مسار الصفحة">
            <Link href="/specialties" className="font-bold text-white hover:underline">دليل التخصّصات</Link><span>←</span><Link href={`/specialties#${encodeURIComponent(spec.field)}`} className="hover:text-white hover:underline">{spec.field}</Link><span>←</span><span className="text-white/80">{spec.ar}</span>
          </nav>
          <PublicBackButton fallbackHref="/specialties" fallbackLabel="التخصّصات" tone="dark" className="mb-6" />
          <div className="bz-spec-editorial-grid">
            <div className="bz-spec-editorial-copy">
              <div className="bz-spec-identity-line"><span className="bz-spec-hero-kicker"><Icon name="compass" size={12} /> {unverified ? "قيد التحقّق — غير موثّق" : "دليل اختيار التخصّص"}</span><span className="bz-spec-field-pill">{spec.field}</span></div>
              <h1 className="mt-4 max-w-3xl font-display text-[30px] font-extrabold leading-[1.23] sm:text-[48px]">{spec.ar}</h1>
              {spec.fr && <p className="mt-2 text-[13px] font-bold tracking-wide text-white/65" dir="ltr">{spec.fr}</p>}
              {spec.lastVerifiedAt && <p className="mt-2 text-[11px] font-bold text-white/55">آخر تحقّق من المصادر: {new Intl.DateTimeFormat("ar-DZ", { dateStyle: "long", numberingSystem: "latn" }).format(new Date(spec.lastVerifiedAt))} <span className="font-normal">· تاريخ كلّ مصدر مذكور بجانبه في «مصادر المعلومات»</span></p>}
              {unverified && <p role="note" className="bz-spec-unverified-note mt-4 max-w-2xl"><b>غير موثّق:</b> لم نجد لهذا الاسم مصدراً رسمياً — لا رمزاً في منشور التوجيه ولا إعلاناً من مؤسّسة. لا نحتسبه ضمن تخصّصات الدليل الموثّقة، ولا تبنِ عليه رغبتك قبل أن تجده في منشور سنتك.</p>}
              <p className="bz-spec-editorial-intro mt-5 max-w-2xl text-[14px] leading-[2] text-white/80 sm:text-[16px]">{introText || "اقرأ الدليل كاملاً قبل اتخاذ قرارك الدراسي."}</p>
              <div className="bz-spec-hero-actions"><a href="#guide-content"><Icon name="chevDown" size={13} /> ابدأ القراءة</a><Link href="/specialties">تصفّح كل التخصّصات <Icon name="chevLeft" size={12} /></Link></div>
            </div>
            <aside className="bz-spec-hero-summary bz-spec-editorial-summary" aria-label="ملخص التخصص">
              <span className="bz-spec-summary-label">{unverified ? "الحالة" : "اقرأ قبل أن تختار"}</span>
              <div className="bz-spec-editorial-summary-lead">{unverified ? "غير موثّق، وخارج عدد الدليل. الصفحة تعرض ما نعرفه وما لا نعرفه، وتحيل إلى أقرب التكوينات الرسمية." : "هذا الدليل يجمع المعلومات الموجودة عن المسار في قراءة واحدة، من طبيعة الدراسة إلى ما ينبغي معرفته قبل القرار."}</div>
              <div className="bz-spec-summary-row"><small>المجال</small><b>{spec.field}</b></div>
              <div className="bz-spec-summary-row"><small>{unverified ? "أقسام الصفحة" : "أقسام الدليل المتاحة"}</small><b>{written.length} {unverified ? "قسماً" : "قسم مفصّل"}</b></div>
            </aside>
          </div>
        </div>
      </header>

      <PublicSidebarLayout placement="guides">
        <article id="guide-content" className="bz-spec-article-pro mx-auto w-full max-w-6xl px-4 pb-14 pt-7">
          {/* 🐛 كان هنا مربّع «خلاصة البداية» يكرّر مقدّمة الرأس حرفياً، فتُقرأ الجملة نفسها
              مرّتين متتاليتين (وثلاثاً حين يبدأ القسم 01 بها) في 260 صفحة — تكرار يقرؤه
              Google ومراجع AdSense حشواً قالبياً. المقدّمة في الرأس تكفي. */}
          {needsEditorialReview && <aside role="note" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-6 text-amber-950">
            <strong>تنبيه قبل ترتيب الرغبات:</strong> هذا الدليل متاح للقراءة، لكن بعض معلوماته ما زالت تحتاج استكمالاً أو تدقيقاً تحريرياً. لا تعتمد على هذه الصفحة وحدها في القبول أو اختيار المؤسسة؛ راجع دليل التوجيه الرسمي للسنة التي تتقدم فيها.
          </aside>}
          <div className="bz-spec-reading-layout">
            {written.length > 1 && <aside className="bz-spec-sticky-toc" aria-label="أقسام الدليل"><p><Icon name="file" size={13} /> في هذا الدليل <b>{written.length}</b></p><div>{written.map(({ key, label }, index) => <a key={String(key)} href={`#sec-${String(key)}`}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}</div></aside>}
            <div className="bz-spec-sections">
              {hasDynamicSections
                ? dynamicSections.map((section, index) => <section key={section.id} id={`sec-${section.id}`} className={`bz-spec-sec bz-spec-sec-pro ${section.tone ? `is-${section.tone}` : ""}`}>
                  <div className="bz-spec-sec-heading"><span><Icon name={(section.icon || "book") as IconName} size={15} /></span><div><small>القسم {String(index + 1).padStart(2, "0")}</small><h2>{section.label}</h2></div></div>
                  <Body text={section.body} />
                </section>)
                : orderedSections.map(({ key, label, icon, tone, body }, index) => (
                  <section key={key} id={`sec-${key}`} className={`bz-spec-sec bz-spec-sec-pro ${tone ? `is-${tone}` : ""}`}>
                    <div className="bz-spec-sec-heading"><span><Icon name={icon} size={15} /></span><div><small>القسم {String(index + 1).padStart(2, "0")}</small><h2>{label}</h2></div></div>
                    <Body text={body} />
                  </section>
                ))}
            </div>
          </div>
          {related.length > 0 && <aside className="bz-spec-related-pro"><div><span>مقترحات من نفس الميدان</span><h2>قد تجد ضالتك في تخصّص قريب</h2></div><div className="bz-spec-related-grid">{related.map((row) => <Link key={row.slug} href={`/specialties/${linkOf(row)}`}><span>{row.ar}</span><Icon name="chevLeft" size={13} /></Link>)}</div></aside>}
          {typeof spec.sources === "string" && spec.sources.trim() && <section id="sec-sources" className="bz-spec-sec bz-spec-sec-pro">
            <div className="bz-spec-sec-heading"><span><Icon name="book" size={15} /></span><div><small>القسم {String(written.findIndex((item) => item.key === "sources") + 1).padStart(2, "0")}</small><h2>مصادر المعلومات</h2></div></div>
            <Body text={spec.sources} />
          </section>}
        </article>
      </PublicSidebarLayout>
      <PublicCta title={`تدرس ${spec.ar}؟ جهّز معدّلك أوّلاً`} hint="انضمّ إلى BacZone: غرف مراجعة مباشرة، دورات من أساتذة، وملخّصات لكل الشُّعب — مجّاناً." />
    </main>
  </>;
}
