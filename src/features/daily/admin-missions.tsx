"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faPen, faTrash, faXmark, faCheck, faSpinner, faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { useSiteSubjects } from "@/features/study/subjects-store";
import {
  useMissions, createMission, updateMission, deleteMission,
  MISSION_KINDS, type Mission,
} from "@/features/daily/missions";
import { BranchPicker, Field, Toggle, inp, toLocal, fromLocal } from "@/features/feed/admin-feed";
import { branchLabel, type BranchMap } from "@/features/feed/targeting";

/* ════════════════════════════════════════════════════════════
   مهامّ اليوم — إدارة

   المهمّة تُربط بفعل **يُقاس فعلاً** في المنصّة، والقياس يُشرح للأدمن
   تحت كل نوع. النوع «مهمّة يدوية» موجود لما لا يُقاس بعد — ولا يمنح
   نقاطاً، لأنّ ما لا دليل عليه لا يُكافأ.
════════════════════════════════════════════════════════════ */

type Draft = Partial<Mission> & { branches?: BranchMap | null };

const empty = (): Draft => ({
  title: "", kind: "flashcards", target: 5, xp: 10,
  branches: { all: true }, subject: "general", enabled: true,
});

export function AdminMissions({ adminUid }: { adminUid: string }) {
  const list = useMissions();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const subjects = useSiteSubjects();

  async function save() {
    if (!editing?.title?.trim() || busy) return;
    setBusy(true);
    try {
      if (editing.id) await updateMission(editing.id, editing);
      else await createMission(editing, adminUid);
      setEditing(null);
    } finally { setBusy(false); }
  }

  const kindMeta = MISSION_KINDS.find((k) => k.id === editing?.kind);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
        <p className="text-xs font-bold text-text-primary">🔥 مهامّ اليوم</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
          تظهر للطالب في الرئيسية حسب شعبته، ويصله إشعار واحد يومياً. التقدّم يُقاس من نشاطه
          الحقيقي في المنصّة — لا من ضغطة زرّ — والنقاط تُستلَم مرّة واحدة في اليوم لكل مهمّة.
        </p>
      </div>

      {!editing && (
        <button onClick={() => setEditing(empty())}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white">
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> مهمّة جديدة
        </button>
      )}

      {editing && (
        <div className="space-y-3 rounded-2xl border border-primary/30 bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-extrabold text-text-primary">
              {editing.id ? "تعديل مهمّة" : "مهمّة جديدة"}
            </p>
            <button onClick={() => setEditing(null)} aria-label="إلغاء" className="text-text-muted hover:text-danger">
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>

          <Field label="عنوان المهمّة *">
            <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              maxLength={140} placeholder="مثال: احفظ ٥ بطاقات مراجعة" className={inp()} />
          </Field>

          <Field label="توضيح للطالب (اختياري)">
            <input value={editing.hint ?? ""} onChange={(e) => setEditing({ ...editing, hint: e.target.value })}
              maxLength={300} className={inp()} />
          </Field>

          <div>
            <span className="mb-1 block text-[11.5px] font-extrabold text-text-primary">نوع الفعل المقيس</span>
            <div className="flex flex-wrap gap-1.5">
              {MISSION_KINDS.map((k) => (
                <button key={k.id} onClick={() => setEditing({ ...editing, kind: k.id })}
                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                    editing.kind === k.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"
                  }`}>
                  {k.label}
                </button>
              ))}
            </div>
            {kindMeta && (
              <p className="mt-1 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-text-muted">
                <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" />
                {kindMeta.hint}
                {editing.kind === "custom" && " — لا تُمنح نقاط تلقائية لهذا النوع."}
              </p>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <Field label={`العدد المطلوب (${kindMeta?.unit ?? "وحدة"})`}>
              <input type="number" min={1} max={50} value={editing.target ?? 1}
                onChange={(e) => setEditing({ ...editing, target: Number(e.target.value) || 1 })} className={inp()} />
            </Field>
            <Field label="النقاط">
              <input type="number" min={0} max={40} value={editing.xp ?? 0}
                disabled={editing.kind === "custom"}
                onChange={(e) => setEditing({ ...editing, xp: Number(e.target.value) || 0 })} className={inp()} />
            </Field>
            <Field label="المادة">
              <select value={editing.subject ?? "general"}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className={inp()}>
                <option value="general">عامّة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <BranchPicker value={editing.branches ?? { all: true }}
            onChange={(b) => setEditing({ ...editing, branches: b })} />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="تبدأ في (اختياري)">
              <input type="datetime-local" className={inp()} value={toLocal(editing.startAt)}
                onChange={(e) => setEditing({ ...editing, startAt: fromLocal(e.target.value) })} />
            </Field>
            <Field label="تنتهي في (اختياري)">
              <input type="datetime-local" className={inp()} value={toLocal(editing.endAt)}
                onChange={(e) => setEditing({ ...editing, endAt: fromLocal(e.target.value) })} />
            </Field>
          </div>

          <Toggle label={editing.enabled === false ? "معطّلة" : "مفعّلة"}
            on={editing.enabled !== false}
            onToggle={() => setEditing({ ...editing, enabled: editing.enabled === false })} />

          <button onClick={save} disabled={busy || !editing.title?.trim()}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white disabled:opacity-50">
            <FontAwesomeIcon icon={busy ? faSpinner : faCheck} className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            {busy ? "جارٍ الحفظ…" : editing.id ? "حفظ التعديل" : "إنشاء المهمّة"}
          </button>
        </div>
      )}

      {list === null ? (
        <p className="py-8 text-center text-sm text-text-muted">جارٍ التحميل…</p>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-text-muted">
          لا مهامّ بعد.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((m) => {
            const k = MISSION_KINDS.find((x) => x.id === m.kind);
            return (
              <article key={m.id} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-extrabold text-text-primary">{m.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-text-muted">
                    <span>{k?.label ?? m.kind}</span>
                    <span className="opacity-40">·</span>
                    <span>{m.target} {k?.unit}</span>
                    <span className="opacity-40">·</span>
                    <span>+{m.xp ?? 0} نقطة</span>
                    <span className="opacity-40">·</span>
                    <span>{branchLabel(m.branches)}</span>
                  </p>
                  {m.enabled === false && (
                    <span className="mt-1 inline-block rounded-full bg-border px-2 py-0.5 text-[9.5px] font-extrabold text-text-muted">
                      معطّلة
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button onClick={() => setEditing({ ...m })} aria-label="تعديل"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:border-primary hover:text-primary">
                    <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                  </button>
                  <button onClick={() => updateMission(m.id, { enabled: m.enabled === false })}
                    aria-label="تفعيل/تعطيل"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:border-primary hover:text-primary">
                    <FontAwesomeIcon icon={m.enabled === false ? faCheck : faXmark} className="h-3 w-3" />
                  </button>
                  <button onClick={() => { if (confirm(`حذف «${m.title}»؟`)) void deleteMission(m.id); }}
                    aria-label="حذف"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted hover:border-danger hover:text-danger">
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
