"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faLocationDot, faStar, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { logoutUser } from "@/lib/firebase/auth";
import { TRACKS } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/field";
import { ProfileBadges } from "@/features/gamification/profile-stats";
import { listenFriends, type Person } from "@/features/community/social";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [friends, setFriends] = useState<Person[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return listenFriends(user.uid, setFriends);
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const trackName = TRACKS.find((t) => t.id === profile?.track)?.name ?? "—";

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-5 py-8">
        {/* البطاقة */}
        <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-3xl font-extrabold text-white">
            {(profile?.name || user.displayName || "ط").charAt(0)}
          </div>
          <h1 className="mt-4 font-display text-xl font-extrabold">
            {profile?.name || user.displayName || "طالب"}
          </h1>
          <span className="mt-1 text-sm text-text-muted">{user.email}</span>

          <div className="mt-4 flex items-center gap-2 rounded-full bg-warning/10 px-4 py-1.5 text-sm font-bold text-warning">
            <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
            المستوى {profile?.level ?? 1} · {profile?.points ?? 0} نقطة
          </div>
        </div>

        {/* المعلومات */}
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

        {/* الإنجازات */}
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
      </section>
    </AppShell>
  );
}
