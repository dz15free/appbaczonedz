"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SPEC_INDEX, SPEC_FIELDS } from "@/features/guide/spec-index";

/* البحث وحده تفاعلي — بقيّة الصفحة تُصيَّر على الخادم فتبقى مقروءة
   لمحرّكات البحث ولمن عطّل JavaScript. */

export function SpecSearch() {
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t && !field) return [];
    return SPEC_INDEX.filter((s) => {
      if (field && s.field !== field) return false;
      if (!t) return true;
      return `${s.ar} ${s.fr} ${s.field}`.toLowerCase().includes(t);
    }).slice(0, 60);
  }, [q, field]);

  const active = Boolean(q.trim() || field);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          dir="auto"
          placeholder="ابحث: طب · إعلام آلي · ESI · حقوق…"
          aria-label="ابحث عن تخصّص"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition focus:border-[var(--bz-blue)] focus:ring-2 focus:ring-[var(--bz-blue-100)]"
        />
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          aria-label="تصفية حسب المجال"
          className="h-11 shrink-0 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-[var(--bz-blue)]"
        >
          <option value="">كل المجالات</option>
          {SPEC_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {active && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-bold text-text-muted">
            {results.length === 0 ? "لا نتيجة — جرّب كلمة أقصر" : `${results.length} نتيجة`}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((s) => (
              <Link
                key={s.slug}
                href={`/specialties/${s.slug}`}
                className="rounded-xl border border-[var(--bz-blue-100)] bg-[var(--bz-blue-050)] p-3 transition hover:shadow-md"
              >
                <span className="block truncate text-sm font-extrabold text-[var(--bz-blue-700)]">
                  {s.ar}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-text-muted">
                  {s.fr || s.field}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
