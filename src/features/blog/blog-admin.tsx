"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faPen, faTrash, faEye, faEyeSlash, faUpRightFromSquare,
  faFloppyDisk, faArrowRight, faCircleCheck, faCircleHalfStroke, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { ArticleEditor } from "@/features/blog/article-editor";
import {
  useBlogIndex, loadContent, saveArticle, setStatus, deleteArticle, slugTaken,
} from "@/features/blog/blog-store";
import { BLOG_LABELS, slugify, estimateReadMinutes, type BlogIndexEntry } from "@/features/blog/types";
import { sanitizeArticle, htmlToText } from "@/features/blog/sanitize";

/* ════════════════════════════════════════════════════════════
   لوحة المقالات

   تجربة قريبة من Blogger: قائمة، ثمّ محرّر فيه العنوان والرابط
   والتصنيفات والمقتطف والصورة وحقول السيو، وأزرار حفظ/معاينة/نشر.

   ── قرار: «حفظ» لا يَنشر ──
   زرّ الحفظ يُبقي حالة المقال كما هي (مسودّة تبقى مسودّة)، والنشر فعل
   مستقلّ بزرّ مستقلّ. الخلط بينهما يعني مقالاً نصف مكتوب على الإنترنت
   لأنّ المحرّر ضغط «حفظ» ليُكمل غداً.

   ── المعاينة داخل اللوحة لا برابط عامّ ──
   رابط معاينة عامّ للمسودّات يعني عنواناً يمكن أن يُفهرَس أو يُشارَك
   لمحتوى غير جاهز. والمعاينة هنا تُصيَّر بنفس المنقّي ونفس أنماط
   `bz-article` المستعملة في الصفحة العامّة — فما تراه هو ما يُنشر.
   ════════════════════════════════════════════════════════════ */

type Mode = { kind: "list" } | { kind: "edit"; entry?: BlogIndexEntry };

const EMPTY = {
  title: "", slug: "", html: "", excerpt: "", cover: "", coverAlt: "",
  labels: [] as string[], seoTitle: "", seoDescription: "", canonical: "",
  noindex: false, authorName: "",
};

export function BlogAdmin({ uid }: { uid: string }) {
  const { rows, loaded } = useBlogIndex();
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  if (mode.kind === "edit") {
    return (
      <ArticleForm
        uid={uid}
        entry={mode.entry}
        onDone={() => setMode({ kind: "list" })}
      />
    );
  }

  const drafts = rows.filter((r) => r.status !== "published");
  const live = rows.filter((r) => r.status === "published");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">المقالات</p>
          <p className="text-xs text-text-muted">
            {loaded ? `${live.length} منشور · ${drafts.length} مسودّة` : "جارٍ التحميل…"}
          </p>
        </div>
        <button
          onClick={() => setMode({ kind: "edit" })}
          className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> مقال جديد
        </button>
      </div>

      {loaded && rows.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text-muted">
          لا مقالات بعد. ابدأ بمقال جديد.
        </p>
      )}

      {[{ t: "مسودّات", list: drafts }, { t: "منشورة", list: live }].map((g) =>
        g.list.length === 0 ? null : (
          <div key={g.t}>
            <h3 className="mb-2 text-xs font-extrabold text-text-muted">{g.t} ({g.list.length})</h3>
            <div className="space-y-2">
              {g.list.map((e) => (
                <Row key={e.id} uid={uid} entry={e} onEdit={() => setMode({ kind: "edit", entry: e })} />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function Row({ uid, entry, onEdit }: { uid: string; entry: BlogIndexEntry; onEdit: () => void }) {
  const [busy, setBusy] = useState(false);
  const published = entry.status === "published";

  async function toggle() {
    setBusy(true);
    try { await setStatus(uid, entry, published ? "draft" : "published"); }
    finally { setBusy(false); }
  }

  async function del() {
    if (!window.confirm(`حذف «${entry.title}» نهائياً؟ لا تراجع عن هذا.`)) return;
    setBusy(true);
    try { await deleteArticle(uid, entry); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
        published ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
        <FontAwesomeIcon icon={published ? faCircleCheck : faCircleHalfStroke} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold">{entry.title}</p>
        <p className="truncate text-[11.5px] text-text-muted" dir="ltr">/blog/{entry.slug}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {published && (
          <a href={`/blog/${encodeURIComponent(entry.slug)}`} target="_blank" rel="noopener noreferrer"
            title="فتح الصفحة العامّة"
            className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary">
            <FontAwesomeIcon icon={faUpRightFromSquare} className="h-3.5 w-3.5" />
          </a>
        )}
        <button onClick={toggle} disabled={busy} title={published ? "سحب النشر" : "نشر"}
          className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-40">
          <FontAwesomeIcon icon={published ? faEyeSlash : faEye} className="h-3.5 w-3.5" />
        </button>
        <button onClick={onEdit} title="تحرير"
          className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary">
          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
        </button>
        <button onClick={del} disabled={busy} title="حذف"
          className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40">
          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-extrabold text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-text-muted">{hint}</span>}
    </label>
  );
}

const INPUT = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary";

function ArticleForm({ uid, entry, onDone }: { uid: string; entry?: BlogIndexEntry; onDone: () => void }) {
  const [f, setF] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(Boolean(entry));
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [preview, setPreview] = useState(false);
  const [slugWarn, setSlugWarn] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    loadContent(entry.id).then((html) => {
      if (!alive) return;
      setF({
        title: entry.title, slug: entry.slug, html,
        excerpt: entry.excerpt ?? "", cover: entry.cover ?? "", coverAlt: entry.coverAlt ?? "",
        labels: entry.labels ?? [], seoTitle: entry.seoTitle ?? "",
        seoDescription: entry.seoDescription ?? "", canonical: entry.canonical ?? "",
        noindex: Boolean(entry.noindex), authorName: entry.authorName ?? "",
      });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [entry]);

  const slug = useMemo(() => slugify(f.slug || f.title), [f.slug, f.title]);
  const readMin = useMemo(() => estimateReadMinutes(f.html), [f.html]);
  const words = useMemo(() => htmlToText(f.html, 1e9).split(/\s+/).filter(Boolean).length, [f.html]);
  const seoDesc = f.seoDescription || f.excerpt || htmlToText(f.html, 160);

  /* تحذير مبكّر: رابطان متطابقان يعني مقالاً لا يُفتح */
  useEffect(() => {
    if (!slug) { setSlugWarn(""); return; }
    let alive = true;
    const t = window.setTimeout(async () => {
      const taken = await slugTaken(slug, entry?.id);
      if (alive) setSlugWarn(taken ? "هذا الرابط مستعمل في مقال آخر — غيّره قبل الحفظ." : "");
    }, 400);
    return () => { alive = false; window.clearTimeout(t); };
  }, [slug, entry?.id]);

  const canSave = f.title.trim().length > 2 && f.html.trim().length > 20 && !slugWarn;

  async function submit(status: "draft" | "published") {
    if (!canSave) return;
    setBusy(status === "published" ? "publish" : "save");
    setMsg("");
    try {
      const res = await saveArticle(uid, { ...f, id: entry?.id, slug }, status);
      setMsg(status === "published"
        ? `نُشر — الصفحة حيّة على /blog/${res.slug}`
        : "حُفظ كمسودّة. لم يره أحد بعد.");
      if (status === "published") window.setTimeout(onDone, 1200);
    } catch (err) {
      setMsg(err instanceof Error ? `تعذّر الحفظ: ${err.message}` : "تعذّر الحفظ — تحقّق من اتصالك.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="p-6 text-center text-sm text-text-muted">جارٍ فتح المقال…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onDone} className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-primary">
          <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" /> رجوع للقائمة
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview((p) => !p)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-bold transition ${
              preview ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:text-primary"}`}>
            <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" /> معاينة
          </button>
          <button onClick={() => submit("draft")} disabled={!canSave || busy !== null}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px] font-bold text-text disabled:opacity-40">
            <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
            {busy === "save" ? "…" : "حفظ كمسودّة"}
          </button>
          <button onClick={() => submit("published")} disabled={!canSave || busy !== null}
            className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
            <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" />
            {busy === "publish" ? "…" : "نشر"}
          </button>
        </div>
      </div>

      {msg && (
        <p className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-[13px] font-bold text-primary">{msg}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── المحرّر ── */}
        <div className="space-y-3">
          <input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="عنوان المقال"
            aria-label="عنوان المقال"
            className="w-full rounded-md border border-border bg-background px-3 py-3 font-display text-lg font-extrabold outline-none focus:border-primary"
          />

          {preview ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 text-[11px] font-extrabold text-text-muted">
                هكذا يظهر المقال للزائر (بعد التنقية الأمنية نفسها)
              </p>
              <article className="bz-article"
                dangerouslySetInnerHTML={{ __html: sanitizeArticle(f.html) }} />
            </div>
          ) : (
            <ArticleEditor value={f.html} onChange={(html) => setF((s) => ({ ...s, html }))} />
          )}

          <p className="text-[11.5px] text-text-muted">
            {words} كلمة · {readMin} دقائق قراءة
            {words < 300 && words > 0 && (
              <span className="ms-2 font-bold text-amber-600">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" /> مقال قصير — أدسنس يقيس القيمة لا العدد، لكن أقلّ من ٣٠٠ كلمة نادراً ما يكفي.
              </span>
            )}
          </p>
        </div>

        {/* ── الجانب: الرابط والتصنيف والسيو ── */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-3.5 space-y-3">
            <Field label="الرابط (Permalink)" hint={`/blog/${slug || "…"}`}>
              <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })}
                placeholder="يُشتقّ من العنوان تلقائياً" className={INPUT} dir="auto" />
            </Field>
            {slugWarn && (
              <p className="rounded-md bg-danger/10 p-2 text-[11.5px] font-bold text-danger">{slugWarn}</p>
            )}
            {entry && (entry.oldSlugs?.length ?? 0) > 0 && (
              <p className="text-[11px] text-text-muted">
                روابط قديمة تُحوَّل إلى هذا المقال: {entry.oldSlugs!.length}
              </p>
            )}

            <Field label="التصنيفات">
              <div className="flex flex-wrap gap-1.5">
                {BLOG_LABELS.map((l) => {
                  const on = f.labels.includes(l.id);
                  return (
                    <button key={l.id} type="button"
                      onClick={() => setF({
                        ...f,
                        labels: on ? f.labels.filter((x) => x !== l.id) : [...f.labels, l.id],
                      })}
                      className={`rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold transition ${
                        on ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted"}`}>
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="المقتطف" hint="يظهر في الفهرس وفي نتائج البحث إن خلا وصف السيو">
              <textarea value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })}
                rows={3} placeholder="يُشتقّ من أوّل المقال إن تُرك فارغاً"
                className="w-full resize-none rounded-md border border-border bg-background p-2.5 text-sm outline-none focus:border-primary" />
            </Field>

            <Field label="صورة الغلاف (رابط)">
              <input value={f.cover} onChange={(e) => setF({ ...f, cover: e.target.value })}
                placeholder="https://…" className={INPUT} dir="ltr" />
            </Field>
            {f.cover && (
              <Field label="وصف الصورة (alt)" hint="إلزاميّ: قارئ الشاشة وGoogle يقرآنه">
                <input value={f.coverAlt} onChange={(e) => setF({ ...f, coverAlt: e.target.value })}
                  placeholder="ماذا في الصورة؟" className={INPUT} />
              </Field>
            )}

            <Field label="اسم الكاتب">
              <input value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })}
                placeholder="فريق BacZone" className={INPUT} />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5 space-y-3">
            <p className="text-[12px] font-extrabold text-text">تحسين محرّكات البحث</p>

            <Field label="عنوان السيو" hint={`${(f.seoTitle || f.title).length}/60 حرفاً — ما بعد ٦٠ يُقتطع في Google`}>
              <input value={f.seoTitle} onChange={(e) => setF({ ...f, seoTitle: e.target.value })}
                placeholder="يُستعمل عنوان المقال إن تُرك فارغاً" className={INPUT} />
            </Field>

            <Field label="وصف السيو" hint={`${seoDesc.length}/160 حرفاً`}>
              <textarea value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })}
                rows={3} placeholder="يُشتقّ من المقتطف إن تُرك فارغاً"
                className="w-full resize-none rounded-md border border-border bg-background p-2.5 text-sm outline-none focus:border-primary" />
            </Field>

            <Field label="Canonical مخصّص" hint="اتركه فارغاً — يُبنى تلقائياً. لا تملأه إلّا إن كان المقال منشوراً أصلاً في مكان آخر.">
              <input value={f.canonical} onChange={(e) => setF({ ...f, canonical: e.target.value })}
                placeholder="فارغ = تلقائي" className={INPUT} dir="ltr" />
            </Field>

            <label className="flex items-center gap-2 text-[12.5px] font-bold">
              <input type="checkbox" checked={f.noindex}
                onChange={(e) => setF({ ...f, noindex: e.target.checked })}
                className="h-4 w-4 accent-[rgb(var(--bz-primary))]" />
              منع الفهرسة (noindex)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
