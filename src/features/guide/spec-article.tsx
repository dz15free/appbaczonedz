"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { listenGuide, linkOf, type SpecFull } from "@/features/guide/guide-store";

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
  { key: "verdict",   label: "الخلاصة",                    icon: "check" },
];

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
                <li key={j}>{li.replace(/^[•\-]\s*/, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="bz-spec-p">{t}</p>;
      })}
    </>
  );
}

export function SpecArticle({ slug }: { slug: string }) {
  const [rows, setRows] = useState<SpecFull[] | null>(null);

  useEffect(() => {
    const unsub = listenGuide(setRows);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  /* نطابق الرابط المخصّص أوّلاً، ثم الروابط القديمة، ثم المعرّف —
     فلا ينكسر رابط شاركه طالب قبل أن تُغيّر الرابط. */
  const spec = useMemo(() => {
    if (!rows) return undefined;
    const t = slug.toLowerCase();
    return (
      rows.find((s) => linkOf(s).toLowerCase() === t) ??
      rows.find((s) => (s.aliases ?? []).some((a) => a.toLowerCase() === t)) ??
      rows.find((s) => s.slug.toLowerCase() === t) ??
      null
    );
  }, [rows, slug]);

  if (spec === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-[var(--bz-ink-3)]">
        جارٍ التحميل…
      </main>
    );
  }

  if (!spec || !spec.published) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-xl font-extrabold">
          {spec ? `تخصّص ${spec.ar} — قيد الإعداد` : "لم نجد هذا التخصّص"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--bz-ink-3)]">
          {spec
            ? "نكتب شرح هذا التخصّص حالياً. عد قريباً، أو تصفّح بقيّة التخصّصات."
            : "ربما تغيّر الرابط. تصفّح الدليل للعثور على تخصّصك."}
        </p>
        <Link href="/specialties"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--bz-blue)] px-4 py-2.5 text-sm font-bold text-white">
          <Icon name="chevRight" size={14} />
          كل التخصّصات
        </Link>
      </main>
    );
  }

  const related = (rows ?? [])
    .filter((r) => r.field === spec.field && r.slug !== spec.slug && r.published)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `تخصّص ${spec.ar}${spec.fr ? ` — ${spec.fr}` : ""}`,
    description: spec.excerpt || (spec.intro ?? "").slice(0, 155),
    inLanguage: "ar",
    about: { "@type": "Thing", name: spec.field },
    publisher: { "@type": "Organization", name: "BacZone" },
  };

  return (
    <main className="bz-guide">
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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

      <article className="mx-auto w-full max-w-3xl px-3 pb-14 pt-6 sm:px-4">
        {SECTIONS.map(({ key, label, icon, tone }) => {
          const v = spec[key];
          if (typeof v !== "string" || !v.trim()) return null;
          return (
            <section key={String(key)} className={`bz-spec-sec ${tone ? `is-${tone}` : ""}`}>
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
    </main>
  );
}
