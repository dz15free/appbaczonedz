"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ALL_SUBJECTS } from "@/lib/constants";
import {
  useSiteSubjects, addSubject, renameSubject, setSubjectVisible, deleteSubject,
} from "@/features/study/subjects-store";

/* ════════════════════════════════════════════════════════════
   محرّر مواد الموقع

   يتحكّم في المواد الظاهرة في **الغرف والمكتبة وكل قائمة اختيار**
   دفعة واحدة — كانت مكتوبة في ثلاثة ملفّات منفصلة.
════════════════════════════════════════════════════════════ */

export function SubjectsEditor() {
  const subjects = useSiteSubjects(true);   // نعرض المخفيّة أيضاً للأدمن
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function add() {
    if (!name.trim()) return;
    const id = await addSubject(name);
    if (id) { setName(""); setMsg({ kind: "ok", text: `أُضيفت «${name.trim()}».` }); }
    else setMsg({ kind: "err", text: "تعذّرت الإضافة." });
  }

  async function saveRename(id: string) {
    if (!draft.trim()) { setEditing(null); return; }
    await renameSubject(id, draft);
    setEditing(null);
    setMsg({ kind: "ok", text: "حُفظ الاسم." });
  }

  async function remove(id: string, label: string) {
    const isStatic = ALL_SUBJECTS.some((s) => s.id === id);
    const q = isStatic
      ? `«${label}» مادّة أساسية — ستُخفى من كل القوائم ولا تُحذف نهائياً. متابعة؟`
      : `حذف «${label}» نهائياً؟`;
    if (!confirm(q)) return;
    const r = await deleteSubject(id);
    setMsg({
      kind: "ok",
      text: r === "hidden" ? "أُخفيت من كل القوائم." : "حُذفت نهائياً.",
    });
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <Icon name="layers" size={18} className="text-[var(--bz-blue)]" />
        <h2 className="font-display text-lg font-extrabold">مواد الموقع</h2>
        <span className="rounded-md bg-[var(--bz-canvas)] px-2 py-0.5 font-mono text-[11px] text-text-muted">
          {subjects.filter((s) => !s.hidden).length} ظاهرة / {subjects.length}
        </span>
      </header>

      <p className="rounded-lg bg-[var(--bz-blue-050)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--bz-blue-700)]">
        ما تضيفه هنا يظهر في <b>الغرف</b> و<b>المكتبة</b> وكل قائمة اختيار مادّة
        في الموقع. المادّة الأساسية تُخفى ولا تُحذف، فلا يفقد المحتوى القديم
        مادّته.
      </p>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${
          msg.kind === "ok"
            ? "bg-[var(--bz-green-050)] text-[var(--bz-green)]"
            : "bg-[var(--bz-red-050)] text-[var(--bz-red)]"}`}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="اسم المادّة الجديدة"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--bz-blue)]"
        />
        <button onClick={add}
          className="shrink-0 rounded-lg bg-[var(--bz-blue)] px-4 text-sm font-bold text-white">
          أضف
        </button>
      </div>

      <div className="space-y-1">
        {subjects.map((s) => (
          <div key={s.id}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm ${
              s.hidden ? "border-border bg-[var(--bz-canvas)] opacity-60" : "border-border"}`}>
            {editing === s.id ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(s.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--bz-blue)] bg-surface px-2 py-1 text-sm outline-none"
                />
                <button onClick={() => saveRename(s.id)}
                  className="shrink-0 text-[var(--bz-green)]" aria-label="حفظ">
                  <Icon name="check" size={16} />
                </button>
                <button onClick={() => setEditing(null)}
                  className="shrink-0 text-text-muted" aria-label="إلغاء">
                  <Icon name="close" size={15} />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {s.name}
                  {s.hidden && <span className="ms-1 text-[10px] text-text-muted">(مخفيّة)</span>}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-text-muted">{s.id}</span>
                <button onClick={() => { setEditing(s.id); setDraft(s.name); }}
                  className="shrink-0 text-text-muted hover:text-primary" aria-label="تعديل الاسم">
                  <Icon name="pen" size={14} />
                </button>
                <button onClick={() => setSubjectVisible(s.id, Boolean(s.hidden))}
                  className="shrink-0 text-text-muted hover:text-primary"
                  aria-label={s.hidden ? "إظهار" : "إخفاء"}>
                  <Icon name="eye" size={14} />
                </button>
                <button onClick={() => remove(s.id, s.name)}
                  className="shrink-0 text-text-muted hover:text-[var(--bz-red)]" aria-label="حذف">
                  <Icon name="trash" size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
