"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap, faLocationDot, faStar, faRightFromBracket,
  faPen, faXmark, faCamera, faFire, faComments, faUsers, faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { logoutUser, updateAccount, updateAvatar } from "@/lib/firebase/auth";
import { compressAvatar } from "@/lib/avatar";
import { TRACKS, WILAYAS } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProfileBadges } from "@/features/gamification/profile-stats";
import { listenFriends, type Person } from "@/features/community/social";
import { useLeaderboardRank } from "@/features/gamification/use-rank";

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
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const rank = useLeaderboardRank(user?.uid, profile?.points);

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setAvatarLoading(true);
    try {
      const compressed = await compressAvatar(file);
      await updateAvatar(user.uid, compressed);
    } catch { /* تجاهل */ }
    finally { setAvatarLoading(false); }
  }

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
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={pickAvatar} />
          {/* Avatar + edit button */}
          <button onClick={() => avatarInput.current?.click()} disabled={avatarLoading}
            className="relative" aria-label="تغيير الصورة">
            <UserAvatar name={profile?.name || user.displayName || "ط"} avatarUrl={profile?.avatarUrl} size="xl" />
            <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-gradient-primary text-white shadow">
              <FontAwesomeIcon icon={faCamera} className="h-3.5 w-3.5" />
            </span>
          </button>

          <h1 className="mt-4 font-display text-xl font-extrabold">{profile?.name || user.displayName || "طالب"}</h1>
          <span className="mt-0.5 text-sm text-text-muted">{user.email}</span>

          {/* شارة الدور */}
          {profile?.role === "teacher" && (
            <span className="mt-2 flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-sm font-bold text-secondary">
              👨‍🏫 أستاذ
            </span>
          )}
          {profile?.role === "admin" && (
            <span className="mt-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              🛡️ إدارة
            </span>
          )}

          {/* Streak */}
          {(profile?.streak ?? 0) >= 2 && (
            <div className={`mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
              (profile?.streak ?? 0) >= 7 ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
            }`}>
              <FontAwesomeIcon icon={faFire} className="h-4 w-4" />
              {profile?.streak} أيام متتالية
            </div>
          )}

          {/* Level + Points */}
          <div className="mt-3 flex items-center gap-2 rounded-full bg-warning/10 px-4 py-1.5 text-sm font-bold text-warning">
            <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
            المستوى {profile?.level ?? 1} · {profile?.points ?? 0} نقطة
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid w-full grid-cols-4 gap-2 text-center">
            {[
              { icon: faFileLines, val: profile?.postCount ?? 0,   label: "منشور" },
              { icon: faComments,  val: profile?.commentCount ?? 0, label: "تعليق" },
              { icon: faUsers,     val: friends.length,             label: "صديق" },
              { icon: faStar,      val: rank ? `#${rank}` : "—",   label: "ترتيبي" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface py-3">
                <FontAwesomeIcon icon={s.icon} className="h-4 w-4 text-primary" />
                <p className="mt-1 text-lg font-extrabold">{s.val}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          {rank && (
            <a href="/leaderboard" className="mt-2 block text-center text-xs text-primary hover:underline">
              عرض لوحة الترتيب الكاملة →
            </a>
          )}
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
          <a
            href="/admin"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
          >
            🛡️ لوحة إدارة BacZoneDZ
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
