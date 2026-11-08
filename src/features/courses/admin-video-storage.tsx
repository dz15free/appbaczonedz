"use client";

import { useCallback, useEffect, useState } from "react";
import { videoAdmin, fmtBytes } from "./video-client";

/* ════════════════════════════════════════════════════════════
   مساحة الفيديو — للإدارة

   الاستهلاك الكلّي مقابل سقف المنصّة (10 GB = الشريحة المجانية لـ R2)،
   وحصّة الأستاذ الافتراضية، واستثناء لأستاذ بعينه، وتنظيف الملفّات
   اليتيمة (مرفوعة ولا يستعملها أيّ درس، أو رفعٌ متروك — أقدم من يوم).
   ════════════════════════════════════════════════════════════ */

interface Overview {
  teacherLimitBytes: number;
  platformLimitBytes: number;
  platformUsedBytes: number;
  files: number;
  teachers: { uid: string; name: string; usedBytes: number; limitBytes: number | null }[];
}

const GB = 1024 ** 3;

export function AdminVideoStorage() {
  const [o, setO] = useState<Overview | null>(null);
  const [teacherGb, setTeacherGb] = useState("");
  const [platformGb, setPlatformGb] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await videoAdmin<Overview>({ op: "overview" });
      setO(r);
      setTeacherGb(String(+(r.teacherLimitBytes / GB).toFixed(2)));
      setPlatformGb(String(+(r.platformLimitBytes / GB).toFixed(2)));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function run(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMsg("");
    try {
      const r = await videoAdmin<{ removed?: number; freedBytes?: number }>(body);
      setMsg(body.op === "cleanup" ? `حُذف ${r.removed ?? 0} ملفّ وحُرّر ${fmtBytes(r.freedBytes ?? 0)}.` : done);
      await refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pct = o ? Math.min(100, Math.round((o.platformUsedBytes / Math.max(1, o.platformLimitBytes)) * 100)) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs font-bold text-text-primary">🎬 مساحة فيديو الدورات (R2)</p>
      {!o ? (
        <p className="mt-2 text-[11px] text-text-muted">{msg || "جارٍ التحميل…"}</p>
      ) : (
        <div className="mt-2 space-y-3">
          <div>
            <div className="flex justify-between text-[11px] font-bold text-text-muted">
              <span>المنصّة · {o.files} ملفّ</span>
              <span dir="ltr">{fmtBytes(o.platformUsedBytes)} / {fmtBytes(o.platformLimitBytes)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full ${pct > 90 ? "bg-danger" : pct > 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[10.5px] text-text-muted">
              أوّل 10 GB مجّانية، ثمّ نحو 0.015$ لكلّ GB شهرياً. المشاهدة بلا رسوم نقل.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-text-muted">
              حصّة كلّ أستاذ (GB)
              <input value={teacherGb} onChange={(e) => setTeacherGb(e.target.value)} inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-text-primary" />
            </label>
            <label className="text-[11px] font-bold text-text-muted">
              سقف المنصّة (GB)
              <input value={platformGb} onChange={(e) => setPlatformGb(e.target.value)} inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-text-primary" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy}
              onClick={() => void run({ op: "settings", teacherLimitGb: Number(teacherGb), platformLimitGb: Number(platformGb) }, "حُفظت الحصص.")}
              className="min-h-[40px] rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:opacity-60">
              حفظ الحصص
            </button>
            <button type="button" disabled={busy}
              onClick={() => { if (confirm("حذف كلّ فيديو لا يستعمله أيّ درس منذ أكثر من يوم؟ لا يمكن التراجع.")) void run({ op: "cleanup" }, ""); }}
              className="min-h-[40px] rounded-lg border border-border px-3 text-xs font-bold text-text-primary disabled:opacity-60">
              تنظيف الملفّات اليتيمة
            </button>
          </div>

          {o.teachers.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {o.teachers.map((t) => (
                <TeacherRow key={t.uid} t={t} defaultLimit={o.teacherLimitBytes} busy={busy}
                  onSave={(gb) => void run({ op: "teacher", teacherUid: t.uid, limitGb: gb }, "حُفظت حصّة الأستاذ.")} />
              ))}
            </ul>
          )}
          {msg && <p className="text-[11px] font-bold text-text-primary">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function TeacherRow({ t, defaultLimit, busy, onSave }: {
  t: Overview["teachers"][number]; defaultLimit: number; busy: boolean; onSave: (gb: number | null) => void;
}) {
  const [v, setV] = useState(t.limitBytes ? String(+(t.limitBytes / GB).toFixed(2)) : "");
  return (
    <li className="flex items-center gap-2 px-2 py-2 text-[11.5px]">
      <span className="min-w-0 flex-1 truncate font-bold text-text-primary">{t.name || t.uid.slice(0, 8)}</span>
      <span className="text-text-muted" dir="ltr">{fmtBytes(t.usedBytes)} / {fmtBytes(t.limitBytes ?? defaultLimit)}</span>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="افتراضي" inputMode="decimal"
        aria-label={`حصّة ${t.name} بالـ GB`}
        className="w-16 rounded-md border border-border bg-background px-1.5 py-1 text-center text-text-primary" />
      <button type="button" disabled={busy} onClick={() => onSave(v.trim() ? Number(v) : null)}
        className="min-h-[32px] rounded-md border border-border px-2 font-bold text-text-primary disabled:opacity-60">
        حفظ
      </button>
    </li>
  );
}
