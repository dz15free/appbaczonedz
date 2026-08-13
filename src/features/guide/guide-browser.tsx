"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SPEC_FIELDS } from "@/features/guide/spec-index";
import { linkOf } from "@/features/guide/spec-link";
import type { SpecFull } from "@/features/guide/guide-merge";

export function GuideBrowser({ rows }: { rows: SpecFull[] }) {
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("ar");
    return rows.filter((spec) => {
      if (field && spec.field !== field) return false;
      if (!term) return true;
      return `${spec.ar} ${spec.fr} ${spec.field} ${spec.excerpt ?? ""}`
        .toLocaleLowerCase("ar")
        .includes(term);
    });
  }, [rows, q, field]);

  const groups = useMemo(() => {
    const map = new Map<string, SpecFull[]>();
    for (const spec of filtered) {
      const list = map.get(spec.field) ?? [];
      list.push(spec);
      map.set(spec.field, list);
    }
    return [...map.entries()].sort((a, b) => {
      const ready = b[1].filter((item) => item.published).length - a[1].filter((item) => item.published).length;
      return ready || a[0].localeCompare(b[0], "ar");
    });
  }, [filtered]);

  const published = rows.filter((spec) => spec.published).length;
  const readyInView = filtered.filter((spec) => spec.published).length;

  return (
    <div className="bz-specialty-browser">
      <Link href="/" className="bz-specialty-back">
        <Icon name="chevRight" size={13} />
        العودة إلى الصفحة الرئيسية
      </Link>

      <div className="bz-specialty-overview" aria-label="ملخص دليل التخصصات">
        <div><strong>{rows.length}+</strong><span>تخصصًا في الدليل</span></div>
        <div><strong>{published}</strong><span>صفحة مفصلة جاهزة</span></div>
        <div><strong>{SPEC_FIELDS.length}</strong><span>مجالات للدراسة</span></div>
      </div>

      <section className="bz-specialty-controls" aria-label="البحث والتصفية">
        <div className="bz-specialty-search">
          <Icon name="search" size={17} className="pointer-events-none text-[var(--bz-ink-3)]" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            type="search"
            dir="auto"
            placeholder="ابحث عن تخصص، مجال، أو اسم مختصر…"
            aria-label="ابحث عن تخصص"
          />
          {q && <button type="button" onClick={() => setQ("")} aria-label="مسح البحث">×</button>}
        </div>
        <div className="bz-specialty-filter-meta">
          <span>{readyInView} نتيجة مفصلة</span>
          {q || field ? (
            <button type="button" onClick={() => { setQ(""); setField(""); }}>إظهار الكل</button>
          ) : <span>اختر مجالًا لتضييق القائمة</span>}
        </div>
        <div className="bz-hide-scrollbar bz-specialty-chips" role="list" aria-label="مجالات التخصصات">
          <button type="button" onClick={() => setField("")} className={`bz-guide-chip ${!field ? "is-on" : ""}`}>كل المجالات</button>
          {SPEC_FIELDS.map((item) => (
            <button key={item} type="button" onClick={() => setField(item === field ? "" : item)} className={`bz-guide-chip ${field === item ? "is-on" : ""}`}>
              {item}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bz-specialty-empty">
          <Icon name="search" size={22} />
          <h2>لم نجد تخصصًا بهذه الكلمات</h2>
          <p>جرّب كلمة أقصر مثل «طب» أو «هندسة»، أو أعد ضبط التصفية.</p>
          <button type="button" onClick={() => { setQ(""); setField(""); }}>إعادة البحث</button>
        </div>
      ) : (
        <div className="bz-specialty-groups">
          {groups.map(([group, items]) => {
            const ready = items.filter((item) => item.published).length;
            return (
              <section key={group} id={group} className="bz-specialty-group">
                <div className="bz-specialty-group-heading">
                  <div><span className="bz-specialty-group-mark" /><div><h2>{group}</h2><p>{ready} صفحات مفصلة · {items.length} تخصصًا في المجال</p></div></div>
                  <a href={`#${encodeURIComponent(group)}`} aria-label={`رابط مجال ${group}`}>#{group}</a>
                </div>
                <div className="bz-specialty-grid">
                  {items.map((spec) => spec.published ? (
                    <Link key={spec.slug} href={`/specialties/${linkOf(spec)}`} className="bz-spec-card">
                      <span className="bz-spec-card-top"><span className="bz-spec-index">{String(items.indexOf(spec) + 1).padStart(2, "0")}</span><span className="bz-spec-status"><Icon name="check" size={11} /> صفحة جاهزة</span></span>
                      <span className="bz-spec-name">{spec.ar}</span>
                      {spec.fr && <span className="bz-spec-fr" dir="ltr">{spec.fr}</span>}
                      {spec.excerpt && <span className="bz-spec-ex">{spec.excerpt}</span>}
                      <span className="bz-spec-go">اكتشف الدراسة والقبول والفرص <Icon name="chevLeft" size={13} /></span>
                    </Link>
                  ) : (
                    <div key={spec.slug} className="bz-spec-card is-soon" aria-disabled="true">
                      <span className="bz-spec-card-top"><span className="bz-spec-index">{String(items.indexOf(spec) + 1).padStart(2, "0")}</span><span className="bz-spec-status is-muted">قريبًا</span></span>
                      <span className="bz-spec-name">{spec.ar}</span>
                      {spec.fr && <span className="bz-spec-fr" dir="ltr">{spec.fr}</span>}
                      <span className="bz-spec-soon">نحضّر شرحًا عمليًا لهذا التخصص</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <a href="https://www.baczonedz.com/2026/07/BAC-2026-Fichier-des-moyennes-minimales.html" target="_blank" rel="noreferrer" className="bz-avg-card bz-specialty-average mt-10">
        <span className="bz-avg-bg" aria-hidden />
        <span className="bz-avg-in"><span className="bz-avg-icon"><Icon name="poll" size={20} /></span><span className="min-w-0 flex-1"><span className="bz-avg-t">معدّلات القبول الدنيا — بكالوريا 2026</span><span className="bz-avg-d">قارن معدّلك قبل ترتيب الرغبات، ثم ارجع دائمًا إلى منصة التوجيه الرسمية.</span></span><Icon name="download" size={16} className="shrink-0 opacity-80" /></span>
      </a>
      <p className="bz-specialty-disclaimer"><b>ملاحظة:</b> معدلات القبول تتغير كل سنة بحسب عدد الناجحين وترتيب رغباتهم؛ اعتبرها مؤشرًا لا ضمانًا.</p>
    </div>
  );
}
