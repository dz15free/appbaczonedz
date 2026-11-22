"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faChevronLeft,
  faCircleInfo,
  faGraduationCap,
  faMagnifyingGlass,
  faSliders,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { SPEC_FIELDS } from "@/features/guide/spec-index";
import { linkOf } from "@/features/guide/spec-link";
import type { SpecFull } from "@/features/guide/guide-merge";

const FIELD_TONES = ["blue", "violet", "green", "amber", "rose", "sky"] as const;
const GENERIC_EXCERPT = /ماذا تدرس فيه،?\s*شروط القبول،?\s*وفرص العمل بعد التخرّج في الجزائر/;

function cardExcerpt(spec: SpecFull): string {
  const excerpt = spec.excerpt?.trim();
  if (excerpt && !GENERIC_EXCERPT.test(excerpt)) return excerpt;

  const topics = [
    spec.study && "طبيعة الدراسة",
    spec.subjects && "المواد أو الوحدات",
    spec.admission && "القبول",
    spec.careers && "الآفاق المهنية",
    spec.master && "مواصلة الدراسة",
    spec.daily && "اليوم العملي",
    spec.prosCons && "نقاط مهمة قبل الاختيار",
  ].filter(Boolean) as string[];
  const available = topics.slice(0, 4).join("، ") || "معلومات أولية عن التخصص";
  return spec.indexable
    ? `يعرض هذا الدليل: ${available}.`
    : `المتاح حالياً: ${available}. يحتاج الدليل إلى استكمال أو تدقيق.`;
}

export function GuideBrowser({ rows }: { rows: SpecFull[] }) {
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  /* الموثّق وحده يدخل في العدد وفي المجالات. التخصّص الذي لم نجد له
     مصدراً رسمياً بعد (وهو خارج الفهرسة أصلاً، انظر GENERAL_SOURCE_ONLY_NOINDEX)
     كان يُعرض بين الموثّقة ويُحتسب في «+250»؛ الآن له قسم مستقلّ تحتها. */
  const verifiedRows = useMemo(() => rows.filter((spec) => spec.indexable), [rows]);
  const pendingRows = useMemo(() => rows.filter((spec) => !spec.indexable && spec.published), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("ar");
    return verifiedRows.filter((spec) => {
      if (field && spec.field !== field) return false;
      if (!term) return true;
      return `${spec.ar} ${spec.fr} ${spec.field} ${spec.excerpt ?? ""}`
        .toLocaleLowerCase("ar")
        .includes(term);
    });
  }, [verifiedRows, q, field]);

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

  const readyInView = filtered.filter((spec) => spec.published).length;
  const fieldTone = (name: string) => FIELD_TONES[Math.max(0, SPEC_FIELDS.indexOf(name)) % FIELD_TONES.length];

  return (
    <div className="bz-specialty-explorer">
      <div className="bz-specialty-overview bz-specialty-overview-pro" aria-label="ملخص دليل التخصصات">
        <div className="is-primary"><span className="bz-specialty-stat-icon"><FontAwesomeIcon icon={faGraduationCap} /></span><strong>{verifiedRows.length}</strong><span>تخصصًا موثّقًا في الدليل</span></div>
        <div><span className="bz-specialty-stat-icon"><FontAwesomeIcon icon={faCircleInfo} /></span><strong>{pendingRows.length}</strong><span>قيد التحقّق، خارج العدد</span></div>
        <div><span className="bz-specialty-stat-icon"><FontAwesomeIcon icon={faCircleInfo} /></span><strong>{SPEC_FIELDS.length}</strong><span>مجالات للدراسة</span></div>
      </div>

      <section className="bz-specialty-command" aria-label="البحث والتصفية">
        <div className="bz-specialty-command-head"><div><span className="bz-specialty-command-kicker"><FontAwesomeIcon icon={faSliders} /> ابحث بطريقتك</span><h2>من أين تريد أن تبدأ؟</h2><p>اكتب اسم التخصص، أو اختر المجال الذي يهمك، ثم افتح الصفحة الأقرب إلى سؤالك.</p></div><span className="bz-specialty-command-count"><b>{readyInView}</b> نتيجة مفصلة</span></div>
        <div className="bz-specialty-search bz-specialty-search-pro">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none text-[var(--bz-ink-3)]" />
          <input value={q} onChange={(event) => setQ(event.target.value)} type="search" dir="auto" placeholder="ابحث عن طب، إعلام آلي، هندسة…" aria-label="ابحث عن تخصص" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="مسح البحث"><FontAwesomeIcon icon={faXmark} /></button>}
        </div>
        <div className="bz-specialty-filter-row">
          <div className="bz-specialty-filter-label"><FontAwesomeIcon icon={faSliders} /> المجالات</div>
          <div className="bz-hide-scrollbar bz-specialty-chips" role="list" aria-label="مجالات التخصصات">
            <button type="button" onClick={() => setField("")} className={`bz-guide-chip ${!field ? "is-on" : ""}`}>كل المجالات</button>
            {SPEC_FIELDS.map((item) => <button key={item} type="button" onClick={() => setField(item === field ? "" : item)} className={`bz-guide-chip ${field === item ? "is-on" : ""}`}>{item}</button>)}
          </div>
        </div>
        {(q || field) && <div className="bz-specialty-active-filter"><span>تصفية مفعّلة: {field || "بحث عام"}{q ? ` · «${q}»` : ""}</span><button type="button" onClick={() => { setQ(""); setField(""); }}>إظهار الكل <FontAwesomeIcon icon={faXmark} /></button></div>}
      </section>

      {filtered.length === 0 ? (
        <div className="bz-specialty-empty bz-specialty-empty-pro"><span><FontAwesomeIcon icon={faMagnifyingGlass} /></span><h2>لم نجد تخصصًا بهذه الكلمات</h2><p>جرّب كلمة أقصر مثل «طب» أو «هندسة»، أو أعد ضبط التصفية لتستعرض الدليل كاملاً.</p><button type="button" onClick={() => { setQ(""); setField(""); }}>إعادة البحث <FontAwesomeIcon icon={faArrowLeft} /></button></div>
      ) : (
        <div className="bz-specialty-results-layout">
          <aside className="bz-specialty-field-rail" aria-label="التنقل بين مجالات التخصص">
            <div className="bz-specialty-field-rail-title">تصفّح حسب المجال</div>
            {groups.map(([group, items]) => <a key={group} href={`#${encodeURIComponent(group)}`} className={`bz-specialty-field-link tone-${fieldTone(group)}`}><span>{group}</span><b>{items.length}</b><FontAwesomeIcon icon={faChevronLeft} /></a>)}
          </aside>
          <div className="bz-specialty-groups bz-specialty-groups-pro">
            {groups.map(([group, items]) => {
              const ready = items.filter((item) => item.published).length;
              const tone = fieldTone(group);
              return (
                <section key={group} id={group} className={`bz-specialty-group bz-specialty-group-pro tone-${tone}`}>
                  <div className="bz-specialty-group-heading bz-specialty-group-heading-pro">
                    <div className="bz-specialty-group-title-wrap"><span className="bz-specialty-group-mark" /><div><span className="bz-specialty-group-kicker">مجال التخصّص</span><h2>{group}</h2><p>{ready} صفحات مفصلة · {items.length} تخصصًا في المجال</p></div></div>
                    <a href={`#${encodeURIComponent(group)}`} aria-label={`رابط مجال ${group}`}><span>انتقل إلى المجال</span><FontAwesomeIcon icon={faArrowLeft} /></a>
                  </div>
                  <div className="bz-specialty-grid bz-specialty-grid-pro">
                    {items.map((spec, index) => spec.published ? (
                      <Link key={spec.slug} href={`/specialties/${linkOf(spec)}`} className="bz-spec-card bz-spec-card-pro">
                        <span className="bz-spec-card-top"><span className="bz-spec-index">{String(index + 1).padStart(2, "0")}</span>                        <span className="bz-spec-status"><FontAwesomeIcon icon={faCheck} /> صفحة مفصلة</span></span>
                        <span className="bz-spec-name">{spec.ar}</span>
                        {spec.fr && <span className="bz-spec-fr" dir="ltr">{spec.fr}</span>}
                        <span className="bz-spec-ex">{cardExcerpt(spec)}</span>
                        <span className="bz-spec-go">افتح الدليل <FontAwesomeIcon icon={faArrowLeft} /></span>
                      </Link>
                    ) : (
                      <div key={spec.slug} className="bz-spec-card bz-spec-card-pro is-soon" aria-disabled="true">
                        <span className="bz-spec-card-top"><span className="bz-spec-index">{String(index + 1).padStart(2, "0")}</span><span className="bz-spec-status is-muted">قريبًا</span></span>
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
        </div>
      )}

      {pendingRows.length > 0 && !field && (
        <section className="bz-specialty-group bz-specialty-group-pro mt-10" id="pending-verification" aria-labelledby="pending-title">
          <div className="bz-specialty-group-heading bz-specialty-group-heading-pro">
            <div className="bz-specialty-group-title-wrap"><span className="bz-specialty-group-mark" /><div><span className="bz-specialty-group-kicker">قيد التحقّق — خارج العدد</span><h2 id="pending-title">تخصّصات لم نجد لها مصدراً رسمياً بعد</h2><p>{pendingRows.length} {pendingRows.length >= 3 && pendingRows.length <= 10 ? "صفحات" : "صفحة"} لا نحتسبها ضمن الدليل الموثّق: لم يظهر لها رمز في منشور التوجيه 2026، أو اسمها لا يطابق عرضاً تفتحه مؤسسة بعينها. نتركها متاحة لمن يبحث عنها، مع التنبيه داخلها.</p></div></div>
          </div>
          <div className="bz-specialty-grid bz-specialty-grid-pro">
            {pendingRows
              .filter((spec) => !q.trim() || `${spec.ar} ${spec.fr}`.toLocaleLowerCase("ar").includes(q.trim().toLocaleLowerCase("ar")))
              .map((spec) => (
                <Link key={spec.slug} href={`/specialties/${linkOf(spec)}`} className="bz-spec-card bz-spec-card-pro">
                  <span className="bz-spec-card-top"><span className="bz-spec-status is-muted"><FontAwesomeIcon icon={faCircleInfo} /> غير موثّق</span></span>
                  <span className="bz-spec-name">{spec.ar}</span>
                  {spec.fr && <span className="bz-spec-fr" dir="ltr">{spec.fr}</span>}
                  <span className="bz-spec-go">افتح المعلومات المتاحة <FontAwesomeIcon icon={faArrowLeft} /></span>
                </Link>
              ))}
          </div>
        </section>
      )}

      <a href="https://www.baczonedz.com/2026/07/BAC-2026-Fichier-des-moyennes-minimales.html" target="_blank" rel="noreferrer" className="bz-avg-card bz-specialty-average mt-10"><span className="bz-avg-bg" aria-hidden /><span className="bz-avg-in"><span className="bz-avg-icon"><FontAwesomeIcon icon={faGraduationCap} /></span><span className="min-w-0 flex-1"><span className="bz-avg-t">معدّلات القبول الدنيا — بكالوريا 2026</span><span className="bz-avg-d">قارن معدّلك قبل ترتيب الرغبات، ثم ارجع دائمًا إلى منصة التوجيه الرسمية.</span></span><FontAwesomeIcon icon={faArrowLeft} size="sm" className="shrink-0 opacity-80" /></span></a>
      <p className="bz-specialty-disclaimer"><b>ملاحظة:</b> معدلات القبول تتغير كل سنة بحسب عدد الناجحين وترتيب رغباتهم؛ اعتبرها مؤشرًا لا ضمانًا.</p>
    </div>
  );
}
