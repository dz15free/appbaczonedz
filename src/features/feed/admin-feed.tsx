"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrash, faPen, faXmark, faCheck, faSpinner, faEye, faEyeSlash,
  faThumbtack, faStar, faCircleInfo, faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import { useSiteSubjects } from "@/features/study/subjects-store";
import {
  useFeed, createFeedItem, updateFeedItem, deleteFeedItem, isLive,
  FEED_TYPES, type FeedItem, type FeedQuestion, type FeedCard as FCard,
  type FeedAttachment,
} from "@/features/feed/feed";
import {
  BRANCHES, branchLabel, buildBranchMap, branchIds, isAllBranches, toggleBranchIn,
  type BranchMap,
} from "@/features/feed/targeting";

/* ════════════════════════════════════════════════════════════
   إدارة مساحة الدراسة — داخل لوحة الإدارة القائمة

   نموذج **ديناميكي**: الحقول تتبع النوع. عرض حقول الاستفتاء مع سؤال
   الفلسفة يُنتج نموذجاً لا يُملأ. ولا تُعرض حقول لا تخصّ النوع أصلاً.

   والاستهداف بالتصنيف القائم نفسه: `TRACKS` للشُّعب وسجلّ المواد
   للمواد — فما ينشره الأدمن يصل من قُصد به لا غير.
════════════════════════════════════════════════════════════ */

type Draft = Partial<FeedItem> & { branches?: BranchMap | null };

const emptyDraft = (): Draft => ({
  type: "question",
  title: "",
  branches: { all: true },
  subject: "general",
  // النقاط اختيارية: المحتوى الدراسي ليس دائماً مهمّة تُكافأ، وجعلها 5
  // افتراضاً كان يحوّل كل بطاقة إلى صيد نقاط. صفر = بلا نقاط ولا شارة.
  xp: 0,
  questions: [{ text: "", choices: [{ text: "", correct: true }, { text: "" }] }],
  options: ["", ""],
  cards: [{ front: "", back: "" }],
});

export function AdminStudyFeed({ adminUid }: { adminUid: string }) {
  const items = useFeed(120);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const list = useMemo(() => {
    const sorted = [...(items ?? [])].sort((a, b) => b.createdAt - a.createdAt);
    return filter === "all" ? sorted : sorted.filter((i) => i.type === filter);
  }, [items, filter]);

  async function save() {
    if (!editing || busy) return;
    if (!editing.title?.trim()) return;
    setBusy(true);
    try {
      const body = normalize(editing);
      if (editing.id) await updateFeedItem(editing.id, body);
      else await createFeedItem(body, adminUid);
      setEditing(null);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
        <p className="text-xs font-bold text-text-primary">🎓 مساحة الدراسة</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
          محتوى تعليمي **يفعله** الطالب لا يقرؤه فقط: أسئلة، تحدّيات، بطاقات، أخطاء شائعة.
          يظهر في الرئيسية والمجتمع فوق المنشورات العادية، ويصل لمن استهدفتَه بشعبته ومادّته.
        </p>
      </div>

      {!editing && (
        <button
          onClick={() => setEditing(emptyDraft())}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> عنصر جديد
        </button>
      )}

      {editing && (
        <FeedEditor
          draft={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={save}
          busy={busy}
        />
      )}

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <FilterChip active={filter === "all"} label="الكلّ" onClick={() => setFilter("all")} />
        {FEED_TYPES.map((t) => (
          <FilterChip key={t.id} active={filter === t.id} label={`${t.emoji} ${t.label}`} onClick={() => setFilter(t.id)} />
        ))}
      </div>

      {items === null ? (
        <p className="py-8 text-center text-sm text-text-muted">جارٍ التحميل…</p>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-text-muted">
          لا عناصر في هذا التصنيف.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((i) => (
            <AdminFeedRow key={i.id} item={i} onEdit={() => setEditing({ ...i })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"
      }`}>
      {label}
    </button>
  );
}

function AdminFeedRow({ item, onEdit }: { item: FeedItem; onEdit: () => void }) {
  const subjects = useSiteSubjects();
  const subjectName = subjects.find((s) => s.id === item.subject)?.name ?? item.subject;
  const meta = FEED_TYPES.find((t) => t.id === item.type);
  const live = isLive(item);
  return (
    <article className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start gap-2.5">
        <span className="text-base" aria-hidden>{meta?.emoji ?? "📌"}</span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12.5px] font-extrabold text-text-primary">{item.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-text-muted">
            <span>{meta?.label ?? item.type}</span>
            <span className="opacity-40">·</span>
            <span>{branchLabel(item.branches)}</span>
            {item.subject && item.subject !== "general" && (<><span className="opacity-40">·</span><span>{subjectName}</span></>)}
            {Boolean(item.xp) && (<><span className="opacity-40">·</span><span>+{item.xp} نقطة</span></>)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.pinned && <Tag icon={faThumbtack} label="مثبّت" />}
            {item.featured && <Tag icon={faStar} label="مميّز" />}
            {!live && <Tag icon={faEyeSlash} label={item.hidden ? "مخفيّ" : "خارج فترة النشر"} tone="muted" />}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <IconBtn icon={faPen} label="تعديل" onClick={onEdit} />
          <IconBtn icon={item.hidden ? faEye : faEyeSlash} label={item.hidden ? "إظهار" : "إخفاء"}
            onClick={() => updateFeedItem(item.id, { hidden: !item.hidden })} />
          <IconBtn icon={faTrash} label="حذف" danger
            onClick={() => { if (confirm(`حذف «${item.title}»؟`)) void deleteFeedItem(item.id); }} />
        </div>
      </div>
    </article>
  );
}

function Tag({ icon, label, tone }: { icon: typeof faStar; label: string; tone?: "muted" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${
      tone === "muted" ? "bg-border text-text-muted" : "bg-primary/10 text-primary"
    }`}>
      <FontAwesomeIcon icon={icon} className="h-2 w-2" /> {label}
    </span>
  );
}

function IconBtn({
  icon, label, onClick, danger,
}: { icon: typeof faPen; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted transition ${
        danger ? "hover:border-danger hover:text-danger" : "hover:border-primary hover:text-primary"
      }`}>
      <FontAwesomeIcon icon={icon} className="h-3 w-3" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   المحرّر الديناميكي
══════════════════════════════════════════════════════════ */
function FeedEditor({
  draft, onChange, onCancel, onSave, busy,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const subjects = useSiteSubjects();
  const type = String(draft.type ?? "question");
  const meta = FEED_TYPES.find((t) => t.id === type);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...draft, [k]: v });

  const showQuestions = ["question", "quiz", "practice", "document", "challenge"].includes(type);
  const showOptions = type === "poll";
  const showCards = type === "flashcard";
  const showMistake = type === "mistake";
  const showModel = type === "philosophy";

  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-extrabold text-text-primary">
          {draft.id ? "تعديل عنصر" : "عنصر جديد"}
        </p>
        <button onClick={onCancel} aria-label="إلغاء" className="text-text-muted hover:text-danger">
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>
      </div>

      {/* النوع */}
      <div>
        <span className="mb-1 block text-[11.5px] font-extrabold text-text-primary">النوع</span>
        <div className="flex flex-wrap gap-1.5">
          {FEED_TYPES.map((t) => (
            <button key={t.id} onClick={() => set("type", t.id)}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                type === t.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        {meta && <p className="mt-1 text-[10.5px] text-text-muted">{meta.hint}</p>}
      </div>

      <Field label="العنوان *">
        <input value={draft.title ?? ""} onChange={(e) => set("title", e.target.value)} maxLength={160}
          placeholder="مثال: هل تستطيع حلّ هذا السؤال؟" className={inp()} />
      </Field>

      <Field label="نصّ تمهيدي">
        <textarea value={draft.body ?? ""} onChange={(e) => set("body", e.target.value)} rows={2} maxLength={1500}
          className={inp(true)} />
      </Field>

      <Field label="رابط صورة (اختياري)">
        <input value={draft.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} dir="ltr"
          placeholder="https://…" className={`${inp()} font-mono text-xs`} />
      </Field>

      <AttachmentsEditor draft={draft} onChange={onChange} />

      {/* حقول النوع */}
      {showQuestions && <QuestionsEditor draft={draft} onChange={onChange} />}
      {showOptions && <OptionsEditor draft={draft} onChange={onChange} />}
      {showCards && <CardsEditor draft={draft} onChange={onChange} />}
      {showMistake && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="الخطأ"><textarea value={draft.wrong ?? ""} onChange={(e) => set("wrong", e.target.value)} rows={2} className={inp(true)} /></Field>
          <Field label="الصواب"><textarea value={draft.right ?? ""} onChange={(e) => set("right", e.target.value)} rows={2} className={inp(true)} /></Field>
          <Field label="لماذا؟"><textarea value={draft.why ?? ""} onChange={(e) => set("why", e.target.value)} rows={2} className={inp(true)} /></Field>
          <Field label="نصيحة"><textarea value={draft.tip ?? ""} onChange={(e) => set("tip", e.target.value)} rows={2} className={inp(true)} /></Field>
        </div>
      )}
      {showModel && (
        <Field label="نموذج الإجابة (يظهر بعد مشاركة الطالب)">
          <textarea value={draft.modelAnswer ?? ""} onChange={(e) => set("modelAnswer", e.target.value)} rows={4} className={inp(true)} />
        </Field>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="رابط إضافي (اختياري)">
          <input value={draft.linkUrl ?? ""} onChange={(e) => set("linkUrl", e.target.value)} dir="ltr"
            placeholder="https://…" className={`${inp()} font-mono text-xs`} />
        </Field>
        <Field label="نصّ زرّ الرابط">
          <input value={draft.linkLabel ?? ""} onChange={(e) => set("linkLabel", e.target.value)}
            placeholder="افتح المصدر" className={inp()} />
        </Field>
      </div>

      {/* الاستهداف */}
      <BranchPicker value={draft.branches ?? { all: true }} onChange={(b) => set("branches", b)} />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Field label="المادة">
          <select value={draft.subject ?? "general"} onChange={(e) => set("subject", e.target.value)} className={inp()}>
            <option value="general">عامّ (بلا مادّة)</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="النقاط عند الإنجاز (اختياري)">
          <input type="number" min={0} max={40} value={draft.xp ?? 0}
            onChange={(e) => set("xp", Number(e.target.value) || 0)} className={inp()} />
          <p className="mt-1 text-[10.5px] font-semibold text-text-muted">0 = بلا نقاط، ولا تظهر شارة النقاط للطالب.</p>
        </Field>
        <Field label="الأولوية (0–50)">
          <input type="number" min={0} max={50} value={draft.priority ?? 0}
            onChange={(e) => set("priority", Number(e.target.value) || 0)} className={inp()} />
        </Field>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="ينشر في (اختياري)">
          <input type="datetime-local" className={inp()}
            value={toLocal(draft.publishAt)}
            onChange={(e) => set("publishAt", fromLocal(e.target.value))} />
        </Field>
        <Field label="ينتهي في (اختياري)">
          <input type="datetime-local" className={inp()}
            value={toLocal(draft.expiresAt)}
            onChange={(e) => set("expiresAt", fromLocal(e.target.value))} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle label="مثبّت في الأعلى" on={Boolean(draft.pinned)} onToggle={() => set("pinned", !draft.pinned)} />
        <Toggle label="مميّز" on={Boolean(draft.featured)} onToggle={() => set("featured", !draft.featured)} />
        <Toggle label="مخفيّ" on={Boolean(draft.hidden)} onToggle={() => set("hidden", !draft.hidden)} />
      </div>

      <button onClick={onSave} disabled={busy || !draft.title?.trim()}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white disabled:opacity-50">
        <FontAwesomeIcon icon={busy ? faSpinner : faCheck} className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "جارٍ الحفظ…" : draft.id ? "حفظ التعديل" : "نشر العنصر"}
      </button>
    </div>
  );
}

/* ── محرّرات فرعية ── */

function QuestionsEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const qs = draft.questions ?? [];
  const setQs = (v: FeedQuestion[]) => onChange({ ...draft, questions: v });

  return (
    <div className="rounded-xl border border-border bg-background p-2.5">
      <p className="mb-2 text-[11.5px] font-extrabold text-text-primary">الأسئلة</p>
      <div className="space-y-2.5">
        {qs.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-border bg-surface p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-extrabold text-text-muted">سؤال {qi + 1}</span>
              {qs.length > 1 && (
                <button onClick={() => setQs(qs.filter((_, i) => i !== qi))}
                  aria-label="حذف السؤال" className="ms-auto text-text-muted hover:text-danger">
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                </button>
              )}
            </div>
            <textarea value={q.text} rows={2} placeholder="نصّ السؤال"
              onChange={(e) => setQs(qs.map((x, i) => (i === qi ? { ...x, text: e.target.value } : x)))}
              className={`${inp(true)} mt-1.5`} />
            <input value={q.imageUrl ?? ""} dir="ltr" placeholder="رابط صورة السؤال (اختياري)"
              onChange={(e) => setQs(qs.map((x, i) => (i === qi ? { ...x, imageUrl: e.target.value } : x)))}
              className={`${inp()} mt-1.5 font-mono text-xs`} />

            <p className="mt-2 text-[10.5px] font-bold text-text-muted">الخيارات — اضغط الدائرة لتحديد الصحيح</p>
            <div className="mt-1 space-y-1.5">
              {q.choices.map((c, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <button
                    onClick={() => setQs(qs.map((x, i) => (i === qi
                      ? { ...x, choices: x.choices.map((y, j) => ({ ...y, correct: j === ci })) } : x)))}
                    aria-label="الإجابة الصحيحة"
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                      c.correct ? "border-emerald-500 bg-emerald-500/15 text-emerald-600" : "border-border text-text-muted"
                    }`}>
                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                  </button>
                  <input value={c.text} placeholder={`الخيار ${ci + 1}`}
                    onChange={(e) => setQs(qs.map((x, i) => (i === qi
                      ? { ...x, choices: x.choices.map((y, j) => (j === ci ? { ...y, text: e.target.value } : y)) } : x)))}
                    className={inp()} />
                  {q.choices.length > 2 && (
                    <button onClick={() => setQs(qs.map((x, i) => (i === qi
                      ? { ...x, choices: x.choices.filter((_, j) => j !== ci) } : x)))}
                      aria-label="حذف الخيار" className="shrink-0 text-text-muted hover:text-danger">
                      <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setQs(qs.map((x, i) => (i === qi ? { ...x, choices: [...x.choices, { text: "" }] } : x)))}
              className="mt-1.5 text-[11px] font-bold text-primary hover:underline">
              + خيار
            </button>

            <textarea value={q.explanation ?? ""} rows={2} placeholder="شرح الإجابة (يظهر بعد المحاولة)"
              onChange={(e) => setQs(qs.map((x, i) => (i === qi ? { ...x, explanation: e.target.value } : x)))}
              className={`${inp(true)} mt-2`} />
          </div>
        ))}
      </div>
      <button
        onClick={() => setQs([...qs, { text: "", choices: [{ text: "", correct: true }, { text: "" }] }])}
        className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-[12px] font-extrabold text-primary">
        <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> إضافة سؤال
      </button>
    </div>
  );
}

/* ── محرّر المرفقات ──
   «تمرين قصير» يحتاج غالباً صورة التمرين أو ملفّاً. لا نملك استضافة
   للرفع، فالمرفق رابط — وهو نفس مبدأ الدورات (Drive/YouTube) القائم في
   المنصّة، فلا نظام تخزين جديد. النوع يُستنتج تلقائياً ويمكن فرضه. */
function AttachmentsEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const list: FeedAttachment[] = draft.attachments ?? [];
  const setList = (v: FeedAttachment[]) => onChange({ ...draft, attachments: v });

  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-text-primary">
          <FontAwesomeIcon icon={faPaperclip} className="h-3 w-3 text-primary" /> مرفقات (صور / ملفّات)
        </p>
        <button type="button" onClick={() => setList([...list, { url: "", label: "" }])}
          disabled={list.length >= 6}
          className="flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-[11.5px] font-extrabold text-primary transition hover:bg-primary/5 disabled:opacity-40">
          <FontAwesomeIcon icon={faPlus} className="h-2.5 w-2.5" /> إضافة مرفق
        </button>
      </div>

      <p className="mt-1.5 text-[10.5px] leading-relaxed text-text-muted">
        ألصق رابط الصورة أو الملفّ (Drive أو أي مستضيف). الصور تُعرض داخل البطاقة، والملفّات تظهر بطاقةَ تحميل للطالب.
      </p>

      {list.length > 0 && (
        <div className="mt-2.5 space-y-2">
          {list.map((a, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-text-muted">#{i + 1}</span>
                <button type="button" onClick={() => setList(list.filter((_, x) => x !== i))}
                  className="ms-auto grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label="حذف المرفق">
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                </button>
              </div>
              <input value={a.url} dir="ltr" placeholder="https://…"
                onChange={(e) => setList(list.map((x, xi) => (xi === i ? { ...x, url: e.target.value } : x)))}
                className={`${inp()} mt-1 font-mono text-xs`} />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input value={a.label ?? ""} placeholder="اسم المرفق (اختياري)"
                  onChange={(e) => setList(list.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
                  className={inp()} />
                <select value={a.kind ?? ""} className={inp()}
                  onChange={(e) => setList(list.map((x, xi) => (xi === i ? { ...x, kind: (e.target.value || undefined) as FeedAttachment["kind"] } : x)))}>
                  <option value="">تلقائي (حسب الرابط)</option>
                  <option value="image">صورة</option>
                  <option value="pdf">ملفّ PDF</option>
                  <option value="file">ملفّ آخر</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const opts = draft.options ?? [];
  const set = (v: string[]) => onChange({ ...draft, options: v });
  return (
    <div className="rounded-xl border border-border bg-background p-2.5">
      <p className="mb-2 text-[11.5px] font-extrabold text-text-primary">خيارات الاستفتاء</p>
      <div className="space-y-1.5">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={o} placeholder={`الخيار ${i + 1}`}
              onChange={(e) => set(opts.map((x, j) => (j === i ? e.target.value : x)))} className={inp()} />
            {opts.length > 2 && (
              <button onClick={() => set(opts.filter((_, j) => j !== i))} aria-label="حذف"
                className="shrink-0 text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {opts.length < 6 && (
        <button onClick={() => set([...opts, ""])} className="mt-1.5 text-[11px] font-bold text-primary hover:underline">
          + خيار
        </button>
      )}
    </div>
  );
}

function CardsEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const cards = draft.cards ?? [];
  const set = (v: FCard[]) => onChange({ ...draft, cards: v });
  return (
    <div className="rounded-xl border border-border bg-background p-2.5">
      <p className="mb-2 text-[11.5px] font-extrabold text-text-primary">البطاقات</p>
      <div className="space-y-2">
        {cards.map((c, i) => (
          <div key={i} className="grid gap-1.5 rounded-xl border border-border bg-surface p-2.5 sm:grid-cols-2">
            <input value={c.front} placeholder="الوجه (السؤال)"
              onChange={(e) => set(cards.map((x, j) => (j === i ? { ...x, front: e.target.value } : x)))} className={inp()} />
            <div className="flex gap-1.5">
              <input value={c.back} placeholder="الظهر (الجواب)"
                onChange={(e) => set(cards.map((x, j) => (j === i ? { ...x, back: e.target.value } : x)))} className={inp()} />
              {cards.length > 1 && (
                <button onClick={() => set(cards.filter((_, j) => j !== i))} aria-label="حذف"
                  className="shrink-0 text-text-muted hover:text-danger">
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {cards.length < 10 && (
        <button onClick={() => set([...cards, { front: "", back: "" }])}
          className="mt-1.5 text-[11px] font-bold text-primary hover:underline">+ بطاقة</button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   منتقي الشُّعب — مشترك بين التغذية والمهامّ والغرف والدورات
══════════════════════════════════════════════════════════ */
export function BranchPicker({
  value, onChange, label = "الشُّعب المستهدَفة",
}: { value: BranchMap | null; onChange: (b: BranchMap) => void; label?: string }) {
  const all = isAllBranches(value);
  const selected = branchIds(value);
  return (
    <div>
      <span className="mb-1 block text-[11.5px] font-extrabold text-text-primary">
        {label}
        <span className="ms-1.5 font-normal text-text-muted">
          — {all ? "الجميع" : `${selected.length} ${selected.length === 1 ? "شعبة" : "شعب"}`}
        </span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onChange(buildBranchMap([]))} aria-pressed={all}
          className={chip(all)}>
          {all && <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />} كل الشعب
        </button>
        {BRANCHES.map((b) => {
          const on = !all && selected.includes(b.id);
          return (
            <button key={b.id} onClick={() => onChange(toggleBranchIn(value, b.id))} aria-pressed={on} className={chip(on)}>
              {on && <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />} {b.name}
            </button>
          );
        })}
      </div>
      <p className="mt-1 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-text-muted">
        <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" />
        اختر شعبة أو أكثر — أو «كل الشعب» ليصل الجميع.
      </p>
    </div>
  );
}

function chip(on: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-extrabold transition ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-muted hover:border-primary/50 hover:text-primary"
  }`;
}

/* ── عناصر صغيرة ── */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-extrabold text-text-primary">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on}
      className={`flex min-h-9 items-center gap-2 rounded-xl border px-3 text-[11.5px] font-extrabold transition ${
        on ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:text-primary"
      }`}>
      <FontAwesomeIcon icon={on ? faCheck : faXmark} className="h-2.5 w-2.5" /> {label}
    </button>
  );
}

export function inp(area = false) {
  return `w-full rounded-xl border border-border bg-background px-3 text-[13px] outline-none transition focus:border-primary ${
    area ? "resize-y py-2.5" : "h-10"
  }`;
}

export function toLocal(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function fromLocal(v: string): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
}

/** يُنظّف المسوّدة حسب نوعها — لا تُخزَّن حقول لا تخصّه */
function normalize(d: Draft): Partial<FeedItem> {
  const type = String(d.type ?? "question");
  const base: Partial<FeedItem> = {
    type, title: d.title?.trim(), body: d.body?.trim(), imageUrl: d.imageUrl?.trim(),
    linkUrl: d.linkUrl?.trim(), linkLabel: d.linkLabel?.trim(),
    branches: d.branches ?? { all: true }, subject: d.subject || "general",
    xp: d.xp, priority: d.priority, pinned: d.pinned, featured: d.featured, hidden: d.hidden,
    publishAt: d.publishAt, expiresAt: d.expiresAt,
  };

  if (["question", "quiz", "practice", "document", "challenge"].includes(type)) {
    base.questions = (d.questions ?? [])
      .filter((q) => q.text.trim())
      .map((q) => ({
        text: q.text.trim(),
        imageUrl: q.imageUrl?.trim() || undefined,
        explanation: q.explanation?.trim() || undefined,
        choices: q.choices.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), correct: c.correct || undefined })),
      }))
      .filter((q) => q.choices.length >= 2);
  }
  base.attachments = (d.attachments ?? [])
    .filter((a) => (a.url ?? "").trim())
    .slice(0, 6)
    .map((a) => ({
      url: a.url.trim(),
      label: a.label?.trim() || undefined,
      kind: a.kind || undefined,
    }));
  // null صراحةً كي يحذفها `update` حين يُفرغها الأدمن
  if (!base.attachments.length) base.attachments = null;

  if (type === "poll") base.options = (d.options ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 6);
  if (type === "flashcard") base.cards = (d.cards ?? []).filter((c) => c.front.trim()).map((c) => ({ front: c.front.trim(), back: c.back.trim() || c.front.trim() })).slice(0, 10);
  if (type === "mistake") { base.wrong = d.wrong?.trim(); base.right = d.right?.trim(); base.why = d.why?.trim(); base.tip = d.tip?.trim(); }
  if (type === "philosophy") base.modelAnswer = d.modelAnswer?.trim();

  return base;
}
