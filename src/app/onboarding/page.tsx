"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { saveProfile } from "@/lib/firebase/auth";
import { TRACKS, WILAYAS } from "@/lib/constants";
import { Button } from "@/components/ui/field";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [track, setTrack] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [saving, setSaving] = useState(false);

  // حماية الصفحة: لا دخول بدون مصادقة
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function handleSave() {
    if (!user || !track || !wilaya) return;
    setSaving(true);
    await saveProfile(user.uid, track, wilaya);
    router.push("/home");
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <div className="bz-cosmic-bg flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-glass sm:p-8">
        <h1 className="font-display text-2xl font-extrabold">أكمل ملفك الدراسي</h1>
        <p className="mt-1 text-sm text-text-muted">اختر شعبتك وولايتك لنخصّص لك المحتوى المناسب.</p>

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

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-semibold">الولاية</span>
          <select
            value={wilaya}
            onChange={(e) => setWilaya(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">اختر ولايتك</option>
            {WILAYAS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>

        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!track || !wilaya}
          className="mt-8 w-full"
        >
          الدخول إلى المنصة
        </Button>
      </div>
    </div>
  );
}
