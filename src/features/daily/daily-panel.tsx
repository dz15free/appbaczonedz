"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt, faCircleCheck, faCheck, faSpinner, faTrophy, faFire,
} from "@fortawesome/free-solid-svg-icons";
import {
  useMissions, missionsForStudent, readDailyCounters, progressOf, claimMission,
  listenClaims, listenManual, setManualDone, notifyDailyOnce, dayKey,
  MISSION_KINDS, type Mission, type DailyCounters, type MissionClaim,
} from "@/features/daily/missions";

/* ════════════════════════════════════════════════════════════
   BacZone Daily — لوحة الطالب

   السؤال الذي تجيب عنه: **ماذا عليّ اليوم؟** لذلك تظهر أوّلاً في
   الرئيسية، وتُغلق نفسها حين تنتهي المهامّ بدل أن تبقى تُذكّر بما
   أُنجز.

   التقدّم يُقرأ من أفعال الطالب في المنصّة (بطاقات محفوظة، أسئلة
   أُجيبت، دروس أُتقنت…) لا من ادّعاء الواجهة. والنقاط تُطلب بعد
   الإنجاز، مرّة واحدة في اليوم لكل مهمّة.
════════════════════════════════════════════════════════════ */

export function DailyPanel({ uid, track }: { uid?: string; track?: string | null }) {
  const all = useMissions();
  const [counters, setCounters] = useState<DailyCounters | null>(null);
  const [claims, setClaims] = useState<Record<string, MissionClaim>>({});
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState(0);

  const day = dayKey();
  const missions = all ? missionsForStudent(all, track) : [];

  const refresh = useCallback(() => {
    if (!uid) return;
    void readDailyCounters(uid).then(setCounters);
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!uid) return;
    const u1 = listenClaims(uid, day, setClaims);
    const u2 = listenManual(uid, day, setManual);
    return () => { u1(); u2(); };
  }, [uid, day]);

  /* إشعار واحد في اليوم عبر نظام الإشعارات القائم */
  useEffect(() => {
    if (!uid || !missions.length) return;
    void notifyDailyOnce(uid, missions.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, missions.length]);

  if (!uid || !all || !missions.length) return null;

  const c = counters ?? { flashcards: 0, feedQuestions: 0, feedQuiz: 0, lessons: 0, roomJoin: 0, posts: 0 };
  const doneCount = missions.filter((m) => progressOf(m, c, manual) >= m.target).length;
  const allDone = doneCount === missions.length;
  const totalXp = Object.values(claims).reduce((s, x) => s + (x.xp || 0), 0);

  async function claim(m: Mission) {
    if (!uid || busy) return;
    setBusy(m.id);
    try {
      const xp = await claimMission(uid, m, c, manual);
      if (xp) { setFlash(xp); window.setTimeout(() => setFlash(0), 2600); }
    } finally { setBusy(""); }
  }

  async function toggleManual(m: Mission) {
    if (!uid) return;
    await setManualDone(uid, day, m.id, !manual[m.id]);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-l from-primary/10 via-surface to-secondary/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-[16px] font-extrabold text-text-primary">
            <FontAwesomeIcon icon={faFire} className="h-4 w-4 text-amber-500" />
            مهمّة اليوم
          </h2>
          <p className="mt-0.5 text-[11.5px] text-text-muted">
            {allDone ? "أكملت مهامّ اليوم — أحسنت 👏" : `${doneCount} من ${missions.length} مكتملة`}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-400/15 px-3 py-1.5 text-[12px] font-extrabold text-amber-600">
          <FontAwesomeIcon icon={faTrophy} className="h-3 w-3" /> {totalXp} نقطة اليوم
        </span>
      </div>

      {/* شريط التقدّم */}
      <div className="h-1.5 w-full bg-border">
        <div
          className={`h-full transition-all ${allDone ? "bg-emerald-500" : "bg-gradient-primary"}`}
          style={{ width: `${Math.round((doneCount / missions.length) * 100)}%` }}
        />
      </div>

      <div className="space-y-2 p-3">
        {missions.map((m) => {
          const kind = MISSION_KINDS.find((k) => k.id === m.kind);
          const p = progressOf(m, c, manual);
          const done = p >= m.target;
          const claimed = Boolean(claims[m.id]);
          const isManual = m.kind === "custom";

          return (
            <div key={m.id} className={`rounded-2xl border p-3 transition ${
              done ? "border-emerald-500/35 bg-emerald-500/5" : "border-border bg-background"
            }`}>
              <div className="flex items-start gap-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                  done ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
                }`}>
                  <FontAwesomeIcon icon={done ? faCircleCheck : faBolt} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold leading-snug text-text-primary">{m.title}</p>
                  {m.hint && <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">{m.hint}</p>}
                  <p className="mt-1 text-[11px] font-bold text-text-muted">
                    {isManual ? (manual[m.id] ? "علّمتَها كمنجَزة" : "علّمها عند إنجازها")
                      : `${p} / ${m.target} ${kind?.unit ?? ""}`}
                  </p>
                </div>
                {Boolean(m.xp) && !isManual && (
                  <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600">
                    +{m.xp}
                  </span>
                )}
              </div>

              {!isManual && !done && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-gradient-primary transition-all"
                    style={{ width: `${Math.round((p / m.target) * 100)}%` }} />
                </div>
              )}

              <div className="mt-2.5">
                {isManual ? (
                  <button
                    onClick={() => toggleManual(m)}
                    className={`flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-[12.5px] font-extrabold transition ${
                      manual[m.id]
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border border-border text-text-muted hover:border-primary hover:text-primary"
                    }`}
                  >
                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                    {manual[m.id] ? "منجَزة" : "علّم كمنجَزة"}
                  </button>
                ) : claimed ? (
                  <p className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 py-2 text-[12px] font-extrabold text-emerald-600">
                    <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
                    حصلت على {claims[m.id].xp} نقطة
                  </p>
                ) : done ? (
                  <button
                    onClick={() => claim(m)}
                    disabled={busy === m.id}
                    className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[12.5px] font-extrabold text-white disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={busy === m.id ? faSpinner : faTrophy} className={`h-3 w-3 ${busy === m.id ? "animate-spin" : ""}`} />
                    استلم {m.xp ?? 0} نقطة
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        <button
          onClick={refresh}
          className="w-full py-1 text-center text-[11px] font-bold text-text-muted hover:text-primary"
        >
          تحديث التقدّم
        </button>
      </div>

      {flash > 0 && (
        <div className="border-t border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-[13px] font-extrabold text-emerald-700">
          ✅ تمّ الإنجاز — +{flash} نقطة
        </div>
      )}
    </section>
  );
}
