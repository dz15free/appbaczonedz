"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SPEC_FIELDS } from "@/features/guide/spec-index";
import { listenGuide, linkOf, mergeGuide, type SpecFull } from "@/features/guide/guide-store";

/* ════════════════════════════════════════════════════════════
   متصفّح الدليل

   يبدأ بالفهرس الثابت فوراً ثم يُحدَّث بما كتبتَه — فلا تظهر الصفحة
   فارغة أثناء التحميل على شبكة بطيئة.

   التخصّص بلا محتوى **يُعرض ولا يُربط**: إخفاؤه يجعل الطالب يظنّ أنّ
   تخصّصه غير موجود، وربطه يقوده إلى صفحة فارغة. فنقول له صراحةً «قيد
   الإعداد».
════════════════════════════════════════════════════════════ */

const CHIP = "bz-guide-chip";

export function GuideBrowser() {
  const [rows, setRows] = useState<SpecFull[]>(() => mergeGuide({}));
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  useEffect(() => {
    const unsub = listenGuide(setRows);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((s) => {
      if (field && s.field !== field) return false;
      if (!t) return true;
      return `${s.ar} ${s.fr} ${s.field}`.toLowerCase().includes(t);
    });
  }, [rows, q, field]);

  const groups = useMemo(() => {
    const map = new Map<string, SpecFull[]>();
    for (const s of filtered) {
      const arr = map.get(s.field) ?? [];
      arr.push(s);
      map.set(s.field, arr);
    }
    // المجال الأكثر محتوىً منشوراً أوّلاً — الطالب يرى الجاهز قبل الناقص
    return [...map.entries()].sort(
      (a, b) => b[1].filter((x) => x.published).length - a[1].filter((x) => x.published).length,
    );
  }, [filtered]);

  return (
    <>
      {/* رجوع إلى الموقع: الزائر يصل من Google مباشرة إلى هذه الصفحة،
          فبدون هذا الرابط لا يعرف أنّ خلفها منصّة كاملة. */}
      <Link href="/home" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--bz-blue)] hover:underline">
        <Icon name="chevRight" size={13} />
        العودة إلى BacZone
      </Link>

      {/* ══ البحث: يلتصق بأعلى الشاشة عند التمرير ══ */}
      <div className="bz-guide-search">
        <div className="relative flex-1">
          <Icon name="search" size={16}
            className="pointer-events-none absolute inset-y-0 right-3 my-auto text-[var(--bz-ink-3)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            dir="auto"
            placeholder="ابحث: طب · إعلام آلي · ESI · حقوق…"
            aria-label="ابحث عن تخصّص"
            className="h-12 w-full rounded-xl border border-[var(--bz-line)] bg-[var(--bz-surface,#fff)] pe-4 ps-10 text-sm outline-none transition focus:border-[var(--bz-blue)] focus:ring-4 focus:ring-[var(--bz-blue-050)]"
          />
        </div>
      </div>

      {/* ══ المجالات: شرائح تمرّر أفقياً على الهاتف ══ */}
      <div className="bz-hide-scrollbar -mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => setField("")}
          className={`${CHIP} ${!field ? "is-on" : ""}`}>الكل</button>
        {SPEC_FIELDS.map((f) => (
          <button key={f} onClick={() => setField(f === field ? "" : f)}
            className={`${CHIP} ${field === f ? "is-on" : ""}`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-[var(--bz-line)] p-8 text-center text-sm text-[var(--bz-ink-3)]">
          لا تخصّص بهذا الاسم. جرّب كلمة أقصر — مثل «طب» أو «هندسة».
        </p>
      )}

      <div className="mt-6 space-y-8">
        {groups.map(([f, items]) => (
          <section key={f} id={f} className="scroll-mt-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-[var(--bz-blue)]" />
              <h2 className="font-display text-[15px] font-extrabold sm:text-lg">{f}</h2>
              <span className="font-mono text-[11px] text-[var(--bz-ink-3)]">{items.length}</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) =>
                s.published ? (
                  <Link key={s.slug} href={`/specialties/${linkOf(s)}`} className="bz-spec-card">
                    <span className="bz-spec-name">{s.ar}</span>
                    {s.fr && <span className="bz-spec-fr" dir="ltr">{s.fr}</span>}
                    {s.excerpt && <span className="bz-spec-ex">{s.excerpt}</span>}
                    <span className="bz-spec-go">
                      اقرأ التفاصيل
                      <Icon name="chevLeft" size={13} />
                    </span>
                  </Link>
                ) : (
                  <div key={s.slug} className="bz-spec-card is-soon" aria-disabled>
                    <span className="bz-spec-name">{s.ar}</span>
                    {s.fr && <span className="bz-spec-fr" dir="ltr">{s.fr}</span>}
                    <span className="bz-spec-soon">قيد الإعداد</span>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      {/* ══ معدّلات القبول ══
          يأتي **بعد** التصفّح لا قبله: من يعرف تخصّصه يسأل عن معدّله،
          ومن لا يعرفه بعد يُشتّته الرقم. */}
      <a
        href="https://www.baczonedz.com/2026/07/BAC-2026-Fichier-des-moyennes-minimales.html"
        target="_blank"
        rel="noreferrer"
        className="bz-avg-card mt-10"
      >
        <span className="bz-avg-bg" aria-hidden />
        <span className="bz-avg-in">
          <span className="bz-avg-icon"><Icon name="poll" size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="bz-avg-t">معدّلات القبول الدنيا — بكالوريا 2026</span>
            <span className="bz-avg-d">
              الملفّ الرسمي بمعدّلات القبول لكل تخصّص وجامعة. قارن معدّلك قبل أن ترتّب رغباتك.
            </span>
          </span>
          <Icon name="download" size={16} className="shrink-0 opacity-80" />
        </span>
      </a>

      <p className="mt-4 rounded-2xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-4 text-[11.5px] leading-[1.9] text-[var(--bz-ink-3)]">
        <b className="text-[var(--bz-ink-2)]">تنبيه:</b> معدّلات القبول تتغيّر كل سنة
        بحسب عدد الناجحين ورغباتهم، فاعتبرها مؤشّراً لا ضماناً. اعتمد دائماً على
        منصّة التوجيه الرسمية عند ملء رغباتك.
      </p>
    </>
  );
}
