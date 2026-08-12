"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SPECIALTY_KEYS, specialty, subjectsOf, examPool,
  type SimExam, type SimSubject,
} from "@/features/rooms/exam-sim/exam-data";
import { bellStart, bellEnd, primeAudio } from "@/features/rooms/exam-sim/exam-guard";

/* ════════════════════════════════════════════════════════════
   محاكاة الامتحان — نسخة فردية عامّة

   ⚠️ **لا تمسّ نظام الغرف بحرف واحد.** `ExamStage` و`ExamSession`
   مرتبطان بالغرفة بعمق (roomId · مالك · مشاركون · مزامنة RTDB)، فلم
   أُعدّلهما ولم أستوردهما.

   ما أُعيد استعماله هنا: **البيانات** (`exam-data`) و**الجرس**
   (`exam-guard`) — وكلاهما مستقلّ عن الغرف أصلاً. فالمواضيع والمدد
   الرسمية واحدة في الوضعين، ولو تغيّرت غداً تغيّرت في الاثنين معاً.

   والفرق الجوهري: **لا كتابة في قاعدة البيانات إطلاقاً**. الجلسة
   الفردية تعيش في المتصفّح وحده — فتعمل بلا تسجيل، ولا تستهلك حصّة
   Firebase، ولا تُنشئ غرفة.

   والوقت يُحسب من **لحظة النهاية المطلقة** لا بعدّاد تنازلي: العدّاد
   يتأخّر إن نام الجهاز أو غاب التبويب، واللحظة المطلقة لا تكذب.
════════════════════════════════════════════════════════════ */

type Phase = "setup" | "running" | "done";

const MIN_LEFT_WARN = 300;   // خمس دقائق

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${two(h)}:${two(m)}:${two(ss)}` : `${two(m)}:${two(ss)}`;
}

export function SoloSimulator() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [specKey, setSpecKey] = useState(SPECIALTY_KEYS[0] ?? "");
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [examIdx, setExamIdx] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const rang = useRef(false);

  const spec = useMemo(() => specialty(specKey), [specKey]);
  const subjects = useMemo(() => subjectsOf(specKey), [specKey]);
  const subject: SimSubject | undefined = subjects[subjectIdx];
  const pool = useMemo(() => examPool(subject), [subject]);
  const exam: SimExam | undefined = pool[examIdx];
  const minutes = exam?.duration ?? subject?.duration ?? 120;

  /* نبضة العرض فقط — المرجع دائماً `endsAt` */
  useEffect(() => {
    if (phase !== "running" || !endsAt) return;
    const tick = () => {
      const s = Math.round((endsAt - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0 && !rang.current) {
        rang.current = true;
        try { bellEnd(); } catch { /* الصوت قد يكون محظوراً */ }
        setPhase("done");
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [phase, endsAt]);

  /* تحذير المغادرة أثناء الامتحان: إغلاق التبويب بالخطأ يُضيّع الجلسة */
  useEffect(() => {
    if (phase !== "running") return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [phase]);

  function start() {
    if (!exam) return;
    // تهيئة الصوت داخل نقرة المستخدم — وإلّا حجبه المتصفّح
    try { primeAudio(); bellStart(); } catch { /* غير حرج */ }
    rang.current = false;
    setShowSolution(false);
    setEndsAt(Date.now() + minutes * 60_000);
    setPhase("running");
  }

  function finish() {
    if (!confirm("إنهاء الامتحان الآن؟ ستظهر لك ورقة الحلّ إن كانت متاحة.")) return;
    rang.current = true;
    setPhase("done");
  }

  function reset() {
    setPhase("setup");
    setEndsAt(null);
    setShowSolution(false);
    rang.current = false;
  }

  /* ── الإعداد ── */
  if (phase === "setup") {
    return (
      <div className="bz-calc">
        <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">اختر شعبتك</p>
        <div className="bz-hide-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 sm:flex-wrap">
          {SPECIALTY_KEYS.map((k) => {
            const s = specialty(k);
            if (!s) return null;
            const on = k === specKey;
            return (
              <button
                key={k}
                onClick={() => { setSpecKey(k); setSubjectIdx(0); setExamIdx(0); }}
                className={`shrink-0 rounded-xl border px-3 py-2 text-[12px] font-bold transition ${
                  on ? "text-white" : "border-[var(--bz-line)] text-[var(--bz-ink-2)]"
                }`}
                style={on ? { background: s.color, borderColor: s.color } : undefined}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">اختر المادّة</p>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {subjects.map((s, i) => (
            <button
              key={s.name}
              onClick={() => { setSubjectIdx(i); setExamIdx(0); }}
              className={`rounded-xl border px-3 py-2.5 text-start text-[12.5px] font-bold transition ${
                i === subjectIdx
                  ? "border-[var(--bz-blue)] bg-[var(--bz-blue-050)] text-[var(--bz-blue-700)]"
                  : "border-[var(--bz-line)] text-[var(--bz-ink-2)]"
              }`}
            >
              {s.name}
              <span className="mt-0.5 block text-[10.5px] font-normal text-[var(--bz-ink-3)]">
                {Math.floor(s.duration / 60)}س {s.duration % 60 ? `${s.duration % 60}د` : ""}
              </span>
            </button>
          ))}
        </div>

        {pool.length > 1 && (
          <>
            <p className="mb-2 text-[11.5px] font-bold text-[var(--bz-ink-3)]">اختر الموضوع</p>
            <div className="mb-4 space-y-1.5">
              {pool.map((e, i) => (
                <button
                  key={`${e.label}-${i}`}
                  onClick={() => setExamIdx(i)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-start text-[12.5px] transition ${
                    i === examIdx
                      ? "border-[var(--bz-blue)] bg-[var(--bz-blue-050)] font-bold text-[var(--bz-blue-700)]"
                      : "border-[var(--bz-line)] text-[var(--bz-ink-2)]"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {e.solutionUrl && (
                    <span className="shrink-0 rounded-md bg-[var(--bz-green-050)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--bz-green)]">
                      مع الحلّ
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="rounded-xl border border-[var(--bz-line)] bg-[var(--bz-canvas)] p-3">
          <p className="text-[12.5px] leading-relaxed text-[var(--bz-ink-2)]">
            <strong>{subject?.name}</strong> · المدّة الرسمية{" "}
            <strong>{Math.floor(minutes / 60)} ساعات {minutes % 60 ? `و${minutes % 60} دقيقة` : ""}</strong>
            <br />
            جهّز ورقك وقلمك، وأبعد هاتفك. المؤقّت يبدأ فور الضغط.
          </p>
        </div>

        <div className="bz-calc-actions">
          <button onClick={start} className="bz-calc-go" style={{ background: spec?.color ?? "#2350D9" }}>
            ابدأ الامتحان
          </button>
        </div>
      </div>
    );
  }

  /* ── الامتحان جارٍ / انتهى ── */
  const urgent = left <= MIN_LEFT_WARN && left > 0;
  return (
    <div className="bz-sim-stage">
      <div className={`bz-sim-bar ${urgent ? "is-urgent" : ""} ${phase === "done" ? "is-done" : ""}`}>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
          {subject?.name} · {exam?.label}
        </span>
        <span className="bz-sim-clock">
          {phase === "done" ? "انتهى الوقت" : fmt(left)}
        </span>
      </div>

      {/* الورقة داخل إطار: لا نُحمّل PDF ثقيلاً قبل الضغط على «ابدأ» */}
      <div className="bz-sim-frame">
        <iframe
          src={phase === "done" && showSolution && exam?.solutionUrl ? exam.solutionUrl : exam?.examUrl}
          title={showSolution ? "ورقة الحلّ" : "ورقة الامتحان"}
          loading="lazy"
          allow="autoplay"
        />
      </div>

      <div className="bz-sim-actions">
        {phase === "running" ? (
          <button onClick={finish} className="bz-sim-btn is-end">أنهيت — أظهر الحلّ</button>
        ) : (
          <>
            {exam?.solutionUrl && (
              <button
                onClick={() => setShowSolution((v) => !v)}
                className="bz-sim-btn is-sol"
              >
                {showSolution ? "عد إلى الموضوع" : "أظهر ورقة الحلّ"}
              </button>
            )}
            <button onClick={reset} className="bz-sim-btn">امتحان آخر</button>
          </>
        )}
      </div>

      {phase === "done" && (
        <div className="bz-sim-done">
          <p className="text-[13px] font-extrabold">كيف تصحّح لنفسك؟</p>
          <ul className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed text-[var(--bz-ink-2)]">
            <li>صحّح بالحلّ النموذجي، <strong>وسجّل نوع الخطأ لا العلامة فقط</strong>: نسيان قانون؟ خطأ حسابي؟ سوء فهم للسؤال؟</li>
            <li>أعد حلّ ما أخطأت فيه <strong>بعد يومين</strong> لا في اليوم نفسه — التصحيح الفوري يُخفي النسيان.</li>
            <li>إن لم تُنهِ الموضوع في الوقت فالمشكلة في <strong>توزيع الوقت</strong> غالباً لا في المعرفة.</li>
          </ul>
          <Link href="/tools" className="mt-3 inline-block text-[12.5px] font-bold text-[var(--bz-blue)]">
            بقيّة أدوات المراجعة ←
          </Link>
        </div>
      )}
    </div>
  );
}
