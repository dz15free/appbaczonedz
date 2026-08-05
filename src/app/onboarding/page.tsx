"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfileState } from "@/features/auth/use-profile";
import { saveProfile } from "@/lib/firebase/auth";
import { TRACKS, WILAYAS, ALL_SUBJECTS } from "@/lib/constants";
import { Button } from "@/components/ui/field";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { useNextDestination } from "@/features/auth/use-require-auth";

export default function OnboardingPage() {
  const next = useNextDestination();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfileState(user?.uid);
  const [track, setTrack] = useState("");
  const [teachSubject, setTeachSubject] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [saving, setSaving] = useState(false);

  const isTeacher = profile?.role === "teacher";

  // نملأ ما هو محفوظ: من ينقصه حقل واحد لا يُعيد إدخال الباقي
  useEffect(() => {
    if (!profile) return;
    if (profile.wilaya) setWilaya((v) => v || (profile.wilaya as string));
    if (profile.track) setTrack((v) => v || (profile.track as string));
    if (profile.teachSubject) setTeachSubject((v) => v || (profile.teachSubject as string));
  }, [profile]);

  // حماية الصفحة: لا دخول بدون مصادقة
  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  /* من أكمل تسجيله لا يُحبس هنا.
     كان يكفي أن يتأخّر فحص الدخول أو يفشل ليُرسَل مستخدم مكتمل إلى
     صفحة إعداد لا يحتاجها — فنخرجه بأنفسنا فور تأكّدنا من اكتمال
     بياناته. الشرط نفسه المستعمل في `needsOnboarding` حرفياً، فلا
     يتناقض الفحصان. */
  useEffect(() => {
    if (profileLoading || !profile) return;
    const complete =
      Boolean(profile.wilaya) &&
      (profile.role === "teacher" ? Boolean(profile.teachSubject) : Boolean(profile.track));
    if (complete) router.replace(next);
  }, [profileLoading, profile, next, router]);

  async function handleSave() {
    if (!user || !wilaya) return;
    if (isTeacher && !teachSubject) return;
    if (!isTeacher && !track) return;
    setSaving(true);
    if (isTeacher) {
      await saveProfile(user.uid, { teachSubject, wilaya });
    } else {
      await saveProfile(user.uid, { track, wilaya });
    }
    router.push(next);
  }

  /* 🐛 كان الشرط `!profile` يحبس المستخدم في «جارٍ التحميل» إلى الأبد.
     ومن لا سجلّ له في قاعدة البيانات هو **بالضبط** من تُوجد هذه الصفحة
     لأجله — فكانت تمنع من جاءت لتخدمه.
     الآن ننتظر انتهاء **القراءة** لا وجود السجلّ: `profileLoading`
     تنتهي سواء وُجد السجلّ أو لم يوجد. */
  if (loading || !user || profileLoading) {
    return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  }

  const canSubmit = wilaya && (isTeacher ? teachSubject : track);

  return (
    <div className="bz-cosmic-bg flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-glass sm:p-8">
        <h1 className="font-display text-2xl font-extrabold">
          {isTeacher ? "أكمل ملفك كأستاذ 👨‍🏫" : "أكمل ملفك الدراسي 🎓"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {isTeacher
            ? "اختر المادة التي تدرّسها وولايتك."
            : "اختر شعبتك وولايتك لنخصّص لك المحتوى المناسب."}
        </p>

        {/* الأستاذ: المادة | الطالب: الشعبة */}
        {isTeacher ? (
          <div className="mt-6">
            <span className="mb-2 block text-sm font-semibold">المادة التي تدرّسها</span>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTeachSubject(s.id)}
                  className={`rounded-md border px-3 py-2.5 text-sm font-semibold transition ${
                    teachSubject === s.id
                      ? "border-secondary bg-secondary/10 text-secondary"
                      : "border-border bg-background hover:border-secondary/50"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <span className="mb-2 block text-sm font-semibold">الشعبة</span>
            <div className="grid grid-cols-2 gap-2">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className={`rounded-md border px-3 py-2.5 text-sm font-semibold transition ${
                    track === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-semibold">الولاية</span>
          <select
            value={wilaya}
            onChange={(e) => setWilaya(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">اختر ولايتك</option>
            {WILAYAS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>

        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!canSubmit}
          className="mt-8 w-full"
        >
          الدخول إلى المنصة
        </Button>
      </div>
    </div>
  );
}
