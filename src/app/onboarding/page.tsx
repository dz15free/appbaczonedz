"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onValue, ref, query, orderByChild, limitToLast } from "firebase/database";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faCalculator, faCheck, faComments, faPenToSquare, faUsers, faChalkboardUser, faDoorOpen,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfileState } from "@/features/auth/use-profile";
import { saveProfile } from "@/lib/firebase/auth";
import { rtdb } from "@/lib/firebase/config";
import { TRACKS, WILAYAS, ALL_SUBJECTS, subjectsForTrack } from "@/lib/constants";
import { joinGroup, type StudyGroup } from "@/features/groups/groups";
import { Button } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { loginHrefFor, useNextDestination } from "@/features/auth/use-require-auth";

/* ════════════════════════════════════════════════════════════
   أوّل دخول — ألّا يجد التلميذ منصّة فارغة

   ١. ترحيب قصير (ثلاثة أشياء يجدها هنا).
   ٢. الشعبة والولاية (أو المادة للأستاذ) — كما كانت.
   ٣. موادّ شعبته، ومجموعات مراجعة حقيقية لشعبته ينضمّ إليها بنقرة.
   ٤. أوّل خطوة واضحة: «اكتب أوّل سؤال لك».

   من كان يكمل حقلاً ناقصاً فقط (حساب قديم)، أو جاء من رابط بعينه
   (غرفة، دورة…)، يُختصر له الطريق: الحقول ثمّ وجهته مباشرة.
   ════════════════════════════════════════════════════════════ */

type Step = "welcome" | "profile" | "groups" | "start";

export default function OnboardingPage() {
  const next = useNextDestination();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfileState(user?.uid);
  const [step, setStep] = useState<Step | null>(null);
  const [track, setTrack] = useState("");
  const [teachSubject, setTeachSubject] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  /* يُقرَّر مرّة واحدة عند أوّل قراءة للملفّ — بعد الحفظ يصير الملفّ
     «مكتملاً»، ولا نريد أن يُطرد التلميذ قبل أن يرى الخطوتين الأخيرتين */
  const decided = useRef(false);

  const isTeacher = profile?.role === "teacher";
  const name = (profile?.name || user?.displayName || "").split(" ")[0];
  const headingSomewhere = next !== "/home";

  // حماية الصفحة: لا دخول بدون مصادقة
  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (profileLoading || decided.current) return;
    if (!user) return;
    decided.current = true;
    if (profile?.wilaya) setWilaya(profile.wilaya as string);
    if (profile?.track) setTrack(profile.track as string);
    if (profile?.teachSubject) setTeachSubject(profile.teachSubject as string);
    /* الشرط نفسه المستعمل في `needsOnboarding` حرفياً */
    const complete =
      Boolean(profile?.wilaya) &&
      (profile?.role === "teacher" ? Boolean(profile?.teachSubject) : Boolean(profile?.track));
    if (complete) { router.replace(next); return; }
    const isNew = !profile?.wilaya && !profile?.track && !profile?.teachSubject;
    setStep(isNew && !headingSomewhere ? "welcome" : "profile");
  }, [profileLoading, profile, user, next, router, headingSomewhere]);

  async function handleSave() {
    if (!user || saving) return;
    if (!wilaya || (isTeacher ? !teachSubject : !track)) return;
    setSaving(true);
    setSaveErr("");
    try {
      await saveProfile(user.uid, isTeacher ? { teachSubject, wilaya } : { track, wilaya });
      if (headingSomewhere) { router.push(next); return; }
      setStep(isTeacher ? "start" : "groups");
    } catch {
      /* 🐛 كان الزرّ يبقى يدور إلى الأبد إن فشل الحفظ */
      setSaveErr("تعذّر الحفظ. تحقّق من اتصالك وحاول مجدداً.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || profileLoading || !step) {
    return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  }

  const order: Step[] = isTeacher ? ["welcome", "profile", "start"] : ["welcome", "profile", "groups", "start"];
  const index = order.indexOf(step);

  return (
    <div className="bz-onb">
      <div className="bz-onb-card">
        <div className="bz-onb-progress" aria-label={`الخطوة ${index + 1} من ${order.length}`}>
          {order.map((s, i) => <span key={s} className={i <= index ? "is-on" : ""} />)}
        </div>

        {step === "welcome" && (
          <section>
            <h1 className="bz-onb-h1">أهلاً {name || "بك"} 👋</h1>
            <p className="bz-onb-lede">
              {isTeacher
                ? "BacZone مكانك لتدرّس تلاميذ البكالوريا مباشرة. ثلاث خطوات قصيرة ونبدأ."
                : "هنا تراجع للبكالوريا مع تلاميذ مثلك من كلّ الولايات. دقيقة واحدة ونجهّز لك كلّ شيء."}
            </p>
            <ul className="bz-onb-points">
              {isTeacher ? (
                <>
                  <li><FontAwesomeIcon icon={faChalkboardUser} /> غرف تدريس بالصوت والسبورة</li>
                  <li><FontAwesomeIcon icon={faPenToSquare} /> دورات تنشرها وتتابع تلاميذها</li>
                  <li><FontAwesomeIcon icon={faComments} /> مجتمع تجيب فيه عن أسئلتهم</li>
                </>
              ) : (
                <>
                  <li><FontAwesomeIcon icon={faDoorOpen} /> غرف مراجعة مباشرة بالصوت والسبورة</li>
                  <li><FontAwesomeIcon icon={faComments} /> مجتمع تسأل فيه ويجيبك زملاؤك والأساتذة</li>
                  <li><FontAwesomeIcon icon={faCalculator} /> أدوات: حاسبة المعدّل، المؤقّت، دليل التخصّصات</li>
                </>
              )}
            </ul>
            <Button onClick={() => setStep("profile")} className="bz-onb-cta">
              لنبدأ <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
            </Button>
          </section>
        )}

        {step === "profile" && (
          <section>
            <h1 className="bz-onb-h1">{isTeacher ? "ماذا تدرّس؟" : "ما شعبتك؟"}</h1>
            <p className="bz-onb-lede">
              {isTeacher ? "نعرض غرفك ودوراتك لتلاميذ مادّتك." : "نخصّص لك المواد والغرف والمجموعات على شعبتك."}
            </p>

            <div className="bz-onb-choices" role="radiogroup" aria-label={isTeacher ? "المادة" : "الشعبة"}>
              {(isTeacher ? ALL_SUBJECTS : TRACKS).map((t) => {
                const on = (isTeacher ? teachSubject : track) === t.id;
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={on}
                    onClick={() => (isTeacher ? setTeachSubject(t.id) : setTrack(t.id))}
                    className={`bz-onb-choice ${on ? "is-on" : ""}`}>
                    {on && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                    {t.name}
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold">الولاية</span>
              <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="bz-onb-select">
                <option value="">اختر ولايتك</option>
                {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>

            {saveErr && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{saveErr}</p>}

            <Button onClick={handleSave} loading={saving}
              disabled={!wilaya || (isTeacher ? !teachSubject : !track)} className="bz-onb-cta">
              متابعة <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
            </Button>
            {!wilaya || (isTeacher ? !teachSubject : !track) ? (
              <p className="bz-onb-hint">{isTeacher ? "اختر المادة والولاية للمتابعة." : "اختر الشعبة والولاية للمتابعة."}</p>
            ) : null}
          </section>
        )}

        {step === "groups" && user && (
          <GroupsStep uid={user.uid} name={profile?.name || user.displayName || "تلميذ"} track={track}
            onNext={() => setStep("start")} />
        )}

        {step === "start" && (
          <section>
            <h1 className="bz-onb-h1">كلّ شيء جاهز ✓</h1>
            <p className="bz-onb-lede">ابدأ بخطوة واحدة صغيرة — أسهل طريقة لتشعر أنّك في مكانك.</p>
            <Link href="/community?compose=1" className="bz-onb-first">
              <span className="bz-onb-first-ic"><FontAwesomeIcon icon={faPenToSquare} /></span>
              <span className="min-w-0 flex-1">
                <b>{isTeacher ? "عرّف بنفسك للتلاميذ" : "اكتب أوّل سؤال لك"}</b>
                <small>{isTeacher ? "منشور قصير في المجتمع: من أنت وماذا تدرّس." : "سؤال في درس لم تفهمه — يجيبك زملاؤك والأساتذة."}</small>
              </span>
              <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5 opacity-70" />
            </Link>
            <div className="bz-onb-more">
              <Link href="/rooms"><FontAwesomeIcon icon={faDoorOpen} /> {isTeacher ? "أنشئ غرفة تدريس" : "ادخل غرفة مراجعة"}</Link>
              {isTeacher
                ? <Link href="/courses/new"><FontAwesomeIcon icon={faChalkboardUser} /> أنشئ دورة</Link>
                : <Link href="/calculate"><FontAwesomeIcon icon={faCalculator} /> احسب معدّلك</Link>}
            </div>
            <button type="button" className="bz-onb-skip" onClick={() => router.push(next)}>
              أو اذهب إلى الرئيسية
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── موادّ الشعبة ومجموعات حقيقية لها ── */
function GroupsStep({ uid, name, track, onNext }: { uid: string; name: string; track: string; onNext: () => void }) {
  const [groups, setGroups] = useState<StudyGroup[] | null>(null);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState("");
  const subjects = subjectsForTrack(track);
  const trackName = TRACKS.find((t) => t.id === track)?.name ?? "";

  useEffect(() => {
    const q = query(ref(rtdb, "groups"), orderByChild("createdAt"), limitToLast(100));
    const unsub = onValue(q, (snap) => {
      const val = (snap.val() as Record<string, Omit<StudyGroup, "id">>) ?? {};
      const list = Object.entries(val)
        .map(([id, g]) => ({ ...g, id }) as StudyGroup)
        .filter((g) => g.subject === track || g.subject === "general")
        /* مجموعات الشعبة أوّلاً، ثمّ العامّة؛ الأحدث في كلّ منهما */
        .sort((a, b) => Number(b.subject === track) - Number(a.subject === track) || b.createdAt - a.createdAt)
        .slice(0, 4);
      setGroups(list);
    }, () => setGroups([]));
    return () => unsub();
  }, [track]);

  async function join(g: StudyGroup) {
    if (busy || joined[g.id]) return;
    setBusy(g.id);
    try {
      await joinGroup(uid, name, g.id);
      setJoined((j) => ({ ...j, [g.id]: true }));
      toast.success(`انضممت إلى «${g.name}»`);
    } catch {
      toast.error("تعذّر الانضمام الآن. يمكنك ذلك لاحقاً من صفحة المجموعات.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <h1 className="bz-onb-h1">موادّك ومجموعاتك</h1>
      <p className="bz-onb-lede">هذه موادّ شعبة {trackName}، ومجموعات مراجعة يتبادل فيها التلاميذ الأسئلة والملفّات.</p>

      <div className="bz-onb-subjects">
        {subjects.map((s) => <span key={s.id}>{s.name}</span>)}
      </div>

      {groups === null ? (
        <div className="bz-onb-groups" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="bz-onb-group is-skel" />)}
        </div>
      ) : groups.length === 0 ? (
        <p className="bz-onb-empty">لا مجموعات لشعبتك بعد — تستطيع إنشاء أوّل واحدة لاحقاً من «المجموعات».</p>
      ) : (
        <div className="bz-onb-groups">
          {groups.map((g) => (
            <div key={g.id} className="bz-onb-group">
              <span className="bz-onb-group-ic"><FontAwesomeIcon icon={faUsers} /></span>
              <span className="min-w-0 flex-1">
                <b>{g.name}</b>
                {g.description && <small>{g.description}</small>}
              </span>
              <button type="button" onClick={() => void join(g)} disabled={!!busy || joined[g.id]}
                aria-busy={busy === g.id} className={`bz-onb-join ${joined[g.id] ? "is-on" : ""}`}>
                {joined[g.id] ? <><FontAwesomeIcon icon={faCheck} /> انضممت</> : busy === g.id ? "…" : "انضمّ"}
              </button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onNext} className="bz-onb-cta">
        متابعة <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
      </Button>
    </section>
  );
}
