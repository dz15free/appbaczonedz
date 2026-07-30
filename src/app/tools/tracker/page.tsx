"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/ui/icon";
import { STREAMS, subjectsOf, unitsOf, type Lesson } from "@/features/study/curriculum";
import { listenCustomLessons, mergeLessons, listenHiddenSubjects, isSubjectHidden, type CustomLesson } from "@/features/study/curriculum-store";

/* ════════════════════════════════════════════════════════════
   تقدّمي الدراسي — على المنهج الرسمي

   كانت الصفحة تحمل قائمة مواد **مكتوبة في الشيفرة**، وتُخزّن التقدّم
   **بفهرس الدرس** (`t0` · `t1` …). فأيّ إضافة أو حذف في القائمة يُزيح
   الفهارس، فيجد الطالب علاماته على دروس أخرى — أسوأ من فقدانها لأنّه
   لا يلاحظها.

   الآن: المواد من المنهج، والتقدّم مفتاحه **معرّف الدرس** — مستقرّ مهما
   تغيّرت القائمة أو ترتيبها. ولهذا جعلت معرّفات المحرّر مشتقّة من
   المحتوى لا من الوقت.
════════════════════════════════════════════════════════════ */

type Status = "todo" | "partial" | "done";

const NEXT: Record<Status, Status> = { todo: "partial", partial: "done", done: "todo" };

const STATUS_UI: Record<Status, { label: string; bg: string; fg: string; icon: "check" | "target" | "circle" }> = {
  todo:    { label: "لم يبدأ", bg: "var(--bz-canvas)",     fg: "var(--bz-ink-3)",   icon: "circle" },
  partial: { label: "جارٍ",    bg: "var(--bz-amber-050)",  fg: "var(--bz-amber)",   icon: "target" },
  done:    { label: "أتقنته",  bg: "var(--bz-green-050)",  fg: "var(--bz-green)",   icon: "check" },
};

const STREAM_KEY = "bz-stream";

export default function TrackerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [custom, setCustom] = useState<CustomLesson[]>([]);
  const [hiddenSubs, setHiddenSubs] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, Status>>({});
  const [stream, setStream] = useState<string>(STREAMS[0] ?? "");
  const [subject, setSubject] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace(loginHrefFor(window.location.pathname, window.location.search));
    }
  }, [loading, user, router]);

  // شعبة الطالب تُحفظ محلّياً: لا يعيد اختيارها كل زيارة
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STREAM_KEY);
      if (saved) setStream(saved);
    } catch { /* التخزين قد يكون معطّلاً */ }
  }, []);

  useEffect(() => {
    const unsub = listenCustomLessons(setCustom);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  /* المواد التي أخفاها الأدمن تختفي من هنا أيضاً — مصدر واحد للقرار،
     فلا تظهر مادّة في صفحة وتغيب عن أخرى. */
  useEffect(() => {
    const unsub = listenHiddenSubjects(setHiddenSubs);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(rtdb, `studyProgress/${user.uid}/lessons`), (snap) => {
      setProgress((snap.val() as Record<string, Status> | null) ?? {});
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  const all = useMemo(() => mergeLessons(custom), [custom]);
  const subjects = useMemo(
    () => [...new Set(all.filter((l) => l.stream === stream).map((l) => l.subject))]
      .filter((sub) => !isSubjectHidden(hiddenSubs, stream, sub)),
    [all, stream, hiddenSubs],
  );

  // أوّل مادّة تُختار تلقائياً، وتُصحَّح إن غابت بعد تبديل الشعبة
  useEffect(() => {
    if (!subjects.includes(subject)) setSubject(subjects[0] ?? "");
  }, [subjects, subject]);

  const units = useMemo(() => {
    const rows = all.filter((l) => l.stream === stream && l.subject === subject);
    const map = new Map<string, Lesson[]>();
    for (const l of rows.sort((a, b) => a.trimester - b.trimester || a.order - b.order)) {
      const arr = map.get(l.unit) ?? [];
      arr.push(l);
      map.set(l.unit, arr);
    }
    return [...map.entries()].map(([unit, lessons]) => ({ unit, lessons }));
  }, [all, stream, subject]);

  /** النسبة: المُتقَن كامل، والجاري نصف — الطالب يستحقّ اعترافاً بما بدأه */
  function percentOf(rows: Lesson[]) {
    if (!rows.length) return 0;
    let sum = 0;
    for (const l of rows) {
      const st = progress[l.id];
      if (st === "done") sum += 1;
      else if (st === "partial") sum += 0.5;
    }
    return Math.round((sum / rows.length) * 100);
  }

  const subjectRows = useMemo(
    () => all.filter((l) => l.stream === stream && l.subject === subject),
    [all, stream, subject],
  );
  const streamRows = useMemo(() => all.filter((l) => l.stream === stream), [all, stream]);

  function cycle(id: string) {
    if (!user) return;
    const cur = progress[id] ?? "todo";
    set(ref(rtdb, `studyProgress/${user.uid}/lessons/${id}`), NEXT[cur]);
  }

  function pickStream(s: string) {
    setStream(s);
    try { localStorage.setItem(STREAM_KEY, s); } catch { /* لا يضرّ */ }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل…</div>;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-4">
        <header>
          <h1 className="font-display text-xl font-extrabold">تقدّمي الدراسي</h1>
          <p className="text-xs text-text-muted">
            برنامج السنة الثالثة ثانوي — اضغط الدرس ليتبدّل: لم يبدأ ← جارٍ ← أتقنته.
          </p>
        </header>

        {/* الشعبة */}
        <div className="bz-hide-scrollbar flex gap-1.5 overflow-x-auto">
          {[...new Set([...STREAMS, ...all.map((l) => l.stream)])].map((s) => (
            <button key={s} onClick={() => pickStream(s)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                stream === s ? "bg-[var(--bz-blue)] text-white"
                             : "border border-border text-text-muted hover:border-primary hover:text-primary"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* تقدّم الشعبة كلّها */}
        <div className="rounded-2xl border border-border p-3">
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="text-sm font-extrabold">تقدّم الشعبة</span>
            <span className="font-mono text-lg font-extrabold text-[var(--bz-blue)]">
              {percentOf(streamRows)}%
            </span>
            <span className="ms-auto text-[11px] text-text-muted">{streamRows.length} درساً</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bz-canvas)]">
            <div className="h-full rounded-full bg-[var(--bz-blue)] transition-all"
              style={{ width: `${percentOf(streamRows)}%` }} />
          </div>
        </div>

        {/* المواد */}
        {subjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
            لا دروس لهذه الشعبة بعد. تُضاف من لوحة الإدارة.
          </p>
        ) : (
          <>
            <div className="bz-hide-scrollbar flex gap-1.5 overflow-x-auto">
              {subjects.map((s) => {
                const rows = all.filter((l) => l.stream === stream && l.subject === s);
                return (
                  <button key={s} onClick={() => setSubject(s)}
                    className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      subject === s ? "border-[var(--bz-blue)] bg-[var(--bz-blue-050)] text-[var(--bz-blue-700)]"
                                    : "border-border text-text-muted hover:text-primary"}`}>
                    {s}
                    <span className="ms-1.5 font-mono text-[10px] opacity-70">{percentOf(rows)}%</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border p-3">
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-sm font-extrabold">{subject}</span>
                <span className="font-mono text-sm font-extrabold text-[var(--bz-blue)]">
                  {percentOf(subjectRows)}%
                </span>
                <span className="ms-auto text-[11px] text-text-muted">{subjectRows.length} درساً</span>
              </div>

              {/* الوحدات — المنهج مبنيّ على وحدات لا دروس مسطّحة */}
              <div className="space-y-3">
                {units.map(({ unit, lessons }) => (
                  <div key={unit}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <Icon name="layers" size={12} className="text-text-muted" />
                      <span className="text-[11.5px] font-bold text-text-muted">{unit}</span>
                      <span className="ms-auto font-mono text-[10px] text-text-muted">
                        {percentOf(lessons)}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      {lessons.map((l) => {
                        const st = progress[l.id] ?? "todo";
                        const ui = STATUS_UI[st];
                        return (
                          <button key={l.id} onClick={() => cycle(l.id)}
                            title={`${ui.label} — اضغط للتبديل`}
                            className="flex w-full items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-right transition hover:border-primary/40">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
                              style={{ background: ui.bg, color: ui.fg }}>
                              <Icon name={ui.icon} size={13} />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{l.title}</span>
                            <span className="shrink-0 font-mono text-[10px] text-text-muted">ف{l.trimester}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
