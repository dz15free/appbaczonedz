"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faLocationDot, faStar, faRightFromBracket, faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { logoutUser, updateAccount } from "@/lib/firebase/auth";
import { TRACKS, WILAYAS } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/field";
import { ProfileBadges } from "@/features/gamification/profile-stats";
import { listenFriends, type Person } from "@/features/community/social";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [friends, setFriends] = useState<Person[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [track, setTrack] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return listenFriends(user.uid, setFriends);
  }, [user]);

  function openEdit() {
    setName(profile?.name || user?.displayName || "");
    setTrack(profile?.track || "");
    setWilaya(profile?.wilaya || "");
    setErr("");
    setEditing(true);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    setErr("");
    try {
      await updateAccount(user, { name, track, wilaya });
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const trackName = TRACKS.find((t) => t.id === profile?.track)?.name ?? "—";

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-5 py-8">
        <div className="relative flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center">
          <button
            onClick={openEdit}
            aria-label="تعديل"
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
          </button>
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-3xl font-extrabold text-white">
            {(profile?.name || user.displayName || "ط").charAt(0)}
          </div>
          <h1 className="mt-4 font-display text-xl font-extrabold">{profile?.name || user.displayName || "طالب"}</h1>
          <span className="mt-1 text-sm text-text-muted">{user.email}</span>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-warning/10 px-4 py-1.5 text-sm font-bold text-warning">
            <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
            المستوى {profile?.level ?? 1} · {profile?.points ?? 0} نقطة
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5 text-primary" />
            <div>
              <span className="block text-xs text-text-muted">الشعبة</span>
              <span className="font-bold">{trackName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5 text-primary" />
            <div>
              <span className="block text-xs text-text-muted">الولاية</span>
              <span className="font-bold">{profile?.wilaya ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ProfileBadges
            stats={{ points: profile?.points, postCount: profile?.postCount, commentCount: profile?.commentCount }}
            friendCount={friends.length}
          />
        </div>

        <Button
          variant="ghost"
          onClick={() => logoutUser().then(() => router.push("/"))}
          className="mt-6 flex w-full items-center justify-center gap-2 text-danger"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          تسجيل الخروج
        </Button>

        {profile?.role === "admin" && (
          <a href="/admin" className="mt-2 block text-center text-xs text-text-muted hover:text-primary">
            🛡️ لوحة الإدارة
          </a>
        )}
      </section>

      {/* نافذة التعديل */}
      {editing && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setEditing(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">تعديل الملف الشخصي</h2>
              <button onClick={() => setEditing(false)} aria-label="إغلاق" className="text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1 block text-sm font-semibold">الاسم</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <label className="mb-1 block text-sm font-semibold">الشعبة</label>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">اختر الشعبة</option>
              {TRACKS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <label className="mb-1 block text-sm font-semibold">الولاية</label>
            <select
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">اختر الولاية</option>
              {WILAYAS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {err && <p className="mb-3 text-sm text-danger">{err}</p>}

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
