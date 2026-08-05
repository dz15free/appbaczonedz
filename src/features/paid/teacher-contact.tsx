"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  listenTeacherContact, saveTeacherContact, normalizeUrl, type TeacherContact,
} from "@/features/paid/teacher-sales";

/* ════════════════════════════════════════════════════════════
   بيانات تواصل الأستاذ

   **اختيارية بالكامل** — والرسائل داخل المنصّة تبقى الطريق الأساسي.
   هذه إضافة لمن يريد أن يُوصل إليه خارجها.

   **الخصوصية قرار الأستاذ لا قرارنا:**
   • خاصّة (الافتراضي) → الإدارة وحدها تراها، للتسوية المالية.
   • عامّة → كل زائر يراها في صفحته.

   بدأنا بالخاصّ عمداً: نشر رقم هاتف بالخطأ لا يمكن التراجع عنه بعد أن
   يُنسَخ. والافتراض الآمن أولى حين يكون الخطأ غير قابل للإصلاح.
════════════════════════════════════════════════════════════ */

const MAX_LINKS = 6;

export function TeacherContactEditor({ uid }: { uid: string }) {
  const [c, setC] = useState<TeacherContact>({ visibility: "private", links: [] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = listenTeacherContact(uid, (v) => {
      if (v) setC({ visibility: v.visibility ?? "private", phone: v.phone ?? "", links: v.links ?? [] });
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  const links = c.links ?? [];

  function setLink(i: number, patch: Partial<{ label: string; url: string }>) {
    const next = links.map((l, j) => (j === i ? { ...l, ...patch } : l));
    setC({ ...c, links: next });
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await saveTeacherContact(uid, c);
      setMsg("حُفظت بياناتك.");
    } catch {
      setMsg("تعذّر الحفظ — أعد المحاولة.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <section className="mx-auto mt-4 max-w-md px-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-1 flex items-center gap-2">
          <Icon name="users" size={16} className="text-secondary" />
          <h2 className="font-display text-base font-extrabold">وسائل التواصل معك</h2>
        </div>
        <p className="mb-4 text-[11.5px] leading-relaxed text-text-muted">
          اختيارية بالكامل. الرسائل داخل المنصّة تبقى الطريق الأساسي، وهذه إضافة
          لمن يريد الوصول إليك خارجها.
        </p>

        <label className="mb-1 block text-[11px] font-bold text-text-muted">رقم الهاتف (اختياري)</label>
        <input
          value={c.phone ?? ""}
          onChange={(e) => setC({ ...c, phone: e.target.value })}
          inputMode="tel"
          dir="ltr"
          placeholder="0X XX XX XX XX"
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <label className="mb-1 block text-[11px] font-bold text-text-muted">
          روابط (فيسبوك · تيليغرام · موقعك…)
        </label>
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={l.label}
                onChange={(e) => setLink(i, { label: e.target.value })}
                placeholder="الاسم"
                className="w-24 shrink-0 rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                value={l.url}
                onChange={(e) => setLink(i, { url: e.target.value })}
                dir="ltr"
                placeholder="facebook.com/…"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
              />
              <button
                onClick={() => setC({ ...c, links: links.filter((_, j) => j !== i) })}
                aria-label="حذف الرابط"
                className="shrink-0 px-1 text-text-muted hover:text-danger"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>

        {links.length < MAX_LINKS && (
          <button
            onClick={() => setC({ ...c, links: [...links, { label: "", url: "" }] })}
            className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-primary"
          >
            <Icon name="plus" size={13} /> أضف رابطاً
          </button>
        )}

        {/* الظهور */}
        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="mb-2 text-[11px] font-bold text-text-muted">من يرى هذه البيانات؟</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {([
              { v: "private", t: "الإدارة فقط", d: "للتسوية المالية" },
              { v: "public", t: "كل الزوّار", d: "تظهر في صفحتك" },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => setC({ ...c, visibility: o.v })}
                className={`flex-1 rounded-lg border px-3 py-2 text-right transition ${
                  (c.visibility ?? "private") === o.v
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className="block text-xs font-extrabold">{o.t}</span>
                <span className="block text-[10.5px] text-text-muted">{o.d}</span>
              </button>
            ))}
          </div>
          {c.visibility === "public" && (
            <p className="mt-2 rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-amber-700">
              سيراها كل زائر. لا تنشر رقماً لا تريد وصوله إلى الجميع — الرقم المنشور
              لا يمكن سحبه بعد أن يُنسَخ.
            </p>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-3 w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "..." : "حفظ"}
        </button>
        {msg && <p className="mt-2 text-center text-[11.5px] font-bold text-secondary">{msg}</p>}

        {links.some((l) => l.url) && (
          <p className="mt-2 text-[10.5px] text-text-muted" dir="ltr">
            {links.filter((l) => l.url).map((l) => normalizeUrl(l.url)).join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}
