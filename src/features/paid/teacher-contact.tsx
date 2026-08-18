"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  listenTeacherContact, saveTeacherContact, type TeacherContact, type TeacherContactVisibility,
} from "@/features/paid/teacher-sales";
import {
  CONTACT_META, CONTACT_ORDER, ContactIcon, type ContactKey,
} from "@/features/paid/teacher-contact-card";

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

/* الشبكات المدعومة — الهاتف له خانته الخاصّة أعلاه */
const NET_KEYS: ContactKey[] = CONTACT_ORDER.filter((k) => k !== "phone");

function editorVisibility(value: TeacherContactVisibility | undefined): "admin" | "students" | "all" {
  if (value === "public" || value === "all") return "all";
  if (value === "students") return "students";
  return "admin";
}

export function TeacherContactEditor({ uid }: { uid: string }) {
  const [c, setC] = useState<TeacherContact>({ visibility: "admin", links: [] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const unsub = listenTeacherContact(uid, (v) => {
      if (v) setC({ visibility: editorVisibility(v.visibility), phone: v.phone ?? "", links: v.links ?? [] });
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  const links = c.links ?? [];

  /* نُخزّن الشبكة في `label` والرابط في `url` — نفس بنية البيانات
     القديمة، فلا هجرة ولا كسر لما هو محفوظ. */
  function valueOf(k: ContactKey) {
    return links.find((l) => l.label === k)?.url ?? "";
  }

  function setNet(k: ContactKey, url: string) {
    const rest = links.filter((l) => l.label !== k);
    const next = url.trim() ? [...rest, { label: k, url }] : rest;
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
          اختر ما تريد مشاركته خارج المنصّة. الرسائل داخل BacZone تبقى الطريق الأساسي، ويمكنك تعديل الجمهور في أي وقت.
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

        {/* خانات مسمّاة بدل روابط حرّة: الأستاذ يضع الرابط فقط، والشبكة
            معروفة مسبقاً — فيظهر شعارها الصحيح، ولا يكتب اسماً يدوياً
            قد يخطئ فيه فلا نعرف أي شعار نعرض. */}
        <label className="mb-1.5 block text-[11px] font-bold text-text-muted">
          حساباتك (ضع الرابط فقط — اترك ما لا تملكه فارغاً)
        </label>
        <div className="space-y-2">
          {NET_KEYS.map((k) => {
            const m = CONTACT_META[k];
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${m.color}1A`, color: m.color }}>
                  <ContactIcon k={k} size={17} />
                </span>
                <input
                  value={valueOf(k)}
                  onChange={(e) => setNet(k, e.target.value)}
                  dir="ltr"
                  placeholder={m.placeholder}
                  aria-label={m.label}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary"
                />
              </div>
            );
          })}
        </div>

        {/* الظهور */}
        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="mb-2 text-[11px] font-bold text-text-muted">من يرى هذه البيانات؟</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              { v: "admin", t: "الإدارة فقط", d: "للمتابعة والتسوية" },
              { v: "students", t: "الطلاب", d: "للطلاب داخل المنصّة" },
              { v: "all", t: "الجميع", d: "تظهر في صفحتك العامة" },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setC({ ...c, visibility: o.v })}
                className={`min-h-[66px] rounded-xl border px-3 py-2 text-right transition ${
                  editorVisibility(c.visibility) === o.v
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className="block text-xs font-extrabold">{o.t}</span>
                <span className="mt-1 block text-[10.5px] leading-relaxed text-text-muted">{o.d}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 rounded-lg bg-primary/5 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-text-muted">
            ستظهر لك معاينة العرض بحسب اختيارك، ويمكنك تغيير هذا القرار لاحقاً.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-3 w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "..." : "حفظ"}
        </button>
        {msg && <p className="mt-2 text-center text-[11.5px] font-bold text-secondary">{msg}</p>}
      </div>
    </section>
  );
}
