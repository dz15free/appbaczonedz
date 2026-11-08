"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp, faXmark, faCircleCheck, faTriangleExclamation, faTrash, faHardDrive,
} from "@fortawesome/free-solid-svg-icons";
import type { LessonContent, LessonVideo } from "./types";
import { providerOf } from "./types";
import {
  uploadVideoToR2, getQuota, checkDriveFile, fmtBytes, fmtEta, VIDEO_ACCEPT, MAX_VIDEO_BYTES,
  type Quota, type UploadProgress,
} from "./video-client";
import { initDrive, connectDrive, uploadToDrive, isDriveConfigured } from "@/lib/gdrive";

/* ════════════════════════════════════════════════════════════
   فيديو الدرس — ثلاث طرق، والأستاذ يختار

     ارفع إلى BacZone   أفضل حماية: روابط مشاهدة مؤقّتة. ضمن حصّته.
     ارفع إلى Drive     من حساب Google الخاص به (15 GB مجّاناً) — لا يستهلك حصّته.
     الصق رابطاً        YouTube / Drive / MP4 كما كان.
   ════════════════════════════════════════════════════════════ */

type Tab = "r2" | "drive" | "link";

export function LessonVideoField({
  courseId, lessonId, content, onContent, onUploaded,
}: {
  courseId?: string;
  lessonId: string;
  content: LessonContent;
  onContent: (patch: Partial<LessonContent>) => void;
  /** يُستدعى بعد اكتمال الرفع — لحفظ المسوّدة فوراً فلا يضيع المرجع */
  onUploaded?: (v: LessonVideo) => void;
}) {
  const video = content.video;
  const [tab, setTab] = useState<Tab>(content.url && !video ? "link" : "r2");

  if (video) {
    return <UploadedCard video={video} onRemove={() => onContent({ video: undefined })} />;
  }

  return (
    <div className="space-y-2.5">
      <span className="block text-[11px] font-bold text-text-muted">فيديو الدرس</span>
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-background p-1">
        {([
          ["r2", "ارفع إلى BacZone"],
          ["drive", "ارفع إلى Drive"],
          ["link", "الصق رابطاً"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`min-h-[40px] rounded-lg px-2 text-[11.5px] font-extrabold transition ${
              tab === id ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "r2" && (
        <R2Uploader courseId={courseId} lessonId={lessonId}
          onDone={(v) => { onContent({ video: v, url: undefined }); onUploaded?.(v); }} />
      )}
      {tab === "drive" && (
        <DriveUploader courseId={courseId}
          onDone={(v) => { onContent({ video: v, url: undefined }); onUploaded?.(v); }} />
      )}
      {tab === "link" && (
        <label className="block">
          <input value={content.url ?? ""} onChange={(e) => onContent({ url: e.target.value })}
            dir="ltr" placeholder="https://… (YouTube / Google Drive / MP4)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs text-text-primary outline-none focus:border-primary" />
          {content.url && (
            <span className="mt-1 block text-[10.5px] font-bold text-text-muted">
              المزوّد المكتشَف:{" "}
              <span className="text-primary">
                {{ youtube: "YouTube", drive: "Google Drive", direct: "رابط مباشر" }[providerOf(content.url) as string] ?? "غير معروف"}
              </span>
            </span>
          )}
        </label>
      )}
    </div>
  );
}

/* ── الفيديو المحفوظ ── */
function UploadedCard({ video, onRemove }: { video: LessonVideo; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5">
      <FontAwesomeIcon icon={video.source === "drive" ? faHardDrive : faCircleCheck} className="h-5 w-5 shrink-0 text-emerald-600" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-extrabold text-text-primary">{video.name || "فيديو الدرس"}</span>
        <span className="block text-[10.5px] text-text-muted">
          {video.source === "drive" ? "على Google Drive الخاص بك" : "على BacZone — روابط مشاهدة مؤقّتة"}
          {video.size ? ` · ${fmtBytes(video.size)}` : ""}
        </span>
      </span>
      <button type="button" onClick={onRemove}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-border px-3 text-[11.5px] font-bold text-text-muted hover:text-danger"
        title="يُحذف الملفّ من BacZone عند حفظ الدورة">
        <FontAwesomeIcon icon={faTrash} className="h-3 w-3" /> إزالة
      </button>
    </div>
  );
}

/* ── الرفع إلى BacZone (R2) ── */
function R2Uploader({ courseId, lessonId, onDone }: { courseId?: string; lessonId: string; onDone: (v: LessonVideo) => void }) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (courseId) getQuota().then(setQuota).catch(() => {});
    return () => ctrl.current?.abort();
  }, [courseId]);

  if (!courseId) {
    return <Note>احفظ المسوّدة أوّلاً (زرّ «حفظ»)، ثمّ ارفع الفيديو — الملفّ يُربط بالدورة المحفوظة.</Note>;
  }

  async function pick(file?: File | null) {
    if (!file || progress) return;
    setError("");
    if (!/^video\/(mp4|webm)$/.test(file.type)) return setError("الصيغ المقبولة: MP4 أو WebM فقط.");
    if (file.size > MAX_VIDEO_BYTES) return setError("الحدّ الأقصى للملفّ الواحد 2 GB. اضغطه بجودة 720p أو استعمل Drive.");
    if (quota && quota.usedBytes + file.size > quota.limitBytes) {
      return setError(`لا تكفي مساحتك (المتبقّي ${fmtBytes(Math.max(0, quota.limitBytes - quota.usedBytes))}). ارفع هذا الفيديو إلى Google Drive من الخيار الثاني.`);
    }
    ctrl.current = new AbortController();
    try {
      const v = await uploadVideoToR2({ courseId: courseId!, lessonId, file, signal: ctrl.current.signal, onProgress: setProgress });
      onDone(v);
      getQuota().then(setQuota).catch(() => {});
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "تعذّر الرفع.");
      getQuota().then(setQuota).catch(() => {});
    } finally {
      setProgress(null);
      ctrl.current = null;
      if (input.current) input.current.value = "";
    }
  }

  const pct = progress ? Math.floor((progress.loaded / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="space-y-2">
      {quota && <QuotaBar q={quota} />}

      {progress ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3" aria-live="polite">
          <div className="flex items-center justify-between text-[12px] font-extrabold text-text-primary">
            <span>
              {progress.state === "starting" ? "جارٍ التحضير…"
                : progress.state === "finishing" ? "جارٍ الإنهاء…"
                : progress.state === "waiting-network" ? "انقطع الإنترنت — سيُستأنف تلقائياً"
                : `${pct}%`}
            </span>
            <button type="button" onClick={() => ctrl.current?.abort()}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[11.5px] font-bold text-text-muted hover:text-danger">
              <FontAwesomeIcon icon={faXmark} className="h-3 w-3" /> إلغاء
            </button>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] font-bold text-text-muted" dir="rtl">
            <span>{fmtBytes(progress.loaded)} من {fmtBytes(progress.total)}</span>
            <span>{progress.speed ? `${fmtBytes(progress.speed)}/ث · يتبقّى ${fmtEta(progress.eta)}` : "…"}</span>
          </div>
        </div>
      ) : (
        <button type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files?.[0]); }}
          className={`flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
            drag ? "border-primary bg-primary/8" : "border-border bg-background hover:border-primary/50"}`}>
          <FontAwesomeIcon icon={faCloudArrowUp} className="h-6 w-6 text-primary" />
          <span className="text-[12.5px] font-extrabold text-text-primary">اسحب الفيديو هنا أو اضغط لاختياره</span>
          <span className="text-[10.5px] text-text-muted">MP4 أو WebM · حتّى 2 GB</span>
        </button>
      )}
      <input ref={input} type="file" accept={VIDEO_ACCEPT} hidden onChange={(e) => void pick(e.target.files?.[0])} />

      {error && <ErrorNote text={error} />}
      <Note>
        💡 صدّر الفيديو بجودة <b>720p</b>: ساعة درس ≈ 450–700 MB. التخزين لا يضغط الفيديو، والجودة الأعلى تُبطئ المشاهدة على هواتف التلاميذ.
        إن انقطع الرفع، اختر الملفّ نفسه فيُكمل من حيث توقّف.
      </Note>
    </div>
  );
}

function QuotaBar({ q }: { q: Quota }) {
  const pct = Math.min(100, Math.round((q.usedBytes / Math.max(1, q.limitBytes)) * 100));
  return (
    <div className="rounded-xl bg-background px-3 py-2">
      <div className="flex justify-between text-[10.5px] font-bold text-text-muted">
        <span>مساحتك على BacZone</span>
        <span dir="ltr">{fmtBytes(q.usedBytes)} / {fmtBytes(q.limitBytes)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${pct > 90 ? "bg-danger" : pct > 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── الرفع إلى Drive الأستاذ ── */
function DriveUploader({ courseId, onDone }: { courseId?: string; onDone: (v: LessonVideo) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { void initDrive().catch(() => {}); }, []);

  if (!courseId) return <Note>احفظ المسوّدة أوّلاً، ثمّ ارفع الفيديو.</Note>;
  if (!isDriveConfigured()) return <ErrorNote text="الربط مع Google Drive غير مُفعّل على المنصّة." />;

  async function choose() {
    setError("");
    try {
      await connectDrive();           // داخل النقرة: وإلّا حجب المتصفّح نافذة Google
      input.current?.click();
    } catch (e) {
      setError((e as Error).message || "تعذّر ربط حساب Google.");
    }
  }

  async function upload(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) return setError("اختر ملفّ فيديو.");
    setError("");
    setPct(0);
    try {
      const r = await uploadToDrive(file, setPct);
      const check = await checkDriveFile(courseId!, r.id).catch(() => ({ ok: true } as { ok: boolean; reason?: string }));
      if (!check.ok) throw new Error(check.reason || "تعذّر التحقّق من الملفّ على Drive.");
      onDone({ source: "drive", fileId: r.id, name: r.name || file.name, size: file.size, type: file.type });
    } catch (e) {
      setError((e as Error).message || "تعذّر الرفع إلى Drive.");
    } finally {
      setPct(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {pct != null ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3" aria-live="polite">
          <div className="text-[12px] font-extrabold text-text-primary">يُرفع إلى Google Drive… {pct}%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => void choose()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-4 text-[12.5px] font-extrabold text-text-primary hover:border-primary/50">
          <FontAwesomeIcon icon={faHardDrive} className="h-5 w-5 text-primary" />
          اختر فيديو وارفعه إلى Google Drive الخاص بك
        </button>
      )}
      <input ref={input} type="file" accept="video/*" hidden onChange={(e) => void upload(e.target.files?.[0])} />
      {error && <ErrorNote text={error} />}
      <Note>
        الملفّ يُحفظ في حسابك على Google (15 GB مجّاناً) ولا يستهلك مساحتك على BacZone، ويُشغَّل في مشغّل المنصّة.
        لا تحذفه من Drive وإلّا توقّف الدرس. حماية الدورات المدفوعة أعلى عند الرفع إلى BacZone.
      </Note>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-background px-3 py-2 text-[11px] leading-relaxed text-text-muted">{children}</p>;
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-danger">
      <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 h-3 w-3 shrink-0" /> {text}
    </p>
  );
}

