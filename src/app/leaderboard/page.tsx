"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faMedal, faStar, faArrowRight, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { ref, query, orderByChild, limitToLast, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { BADGES, earnedBadges } from "@/features/gamification/points";

interface Player {
  uid: string;
  name: string;
  points: number;
  level: number;
  postCount?: number;
  commentCount?: number;
  track?: string;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <FontAwesomeIcon icon={faCrown} className="h-6 w-6 text-warning" />;
  if (rank === 2) return <FontAwesomeIcon icon={faMedal} className="h-6 w-6 text-slate-400" />;
  if (rank === 3) return <FontAwesomeIcon icon={faMedal} className="h-6 w-6 text-amber-700" />;
  return <span className="w-6 text-center text-sm font-bold text-text-muted">{rank}</span>;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const q = query(ref(rtdb, "users"), orderByChild("points"), limitToLast(50));
    return onValue(q, (snap) => {
      const val = (snap.val() as Record<string, any>) ?? {};
      const list = Object.entries(val)
        .filter(([, u]: [string, any]) => u.role !== "teacher" && u.role !== "admin") // الطلاب فقط
        .map(([uid, u]: [string, any]) => ({
          uid, name: u.name ?? "طالب", points: u.points ?? 0,
          level: u.level ?? 1, postCount: u.postCount, commentCount: u.commentCount, track: u.track,
        }))
        .sort((a, b) => b.points - a.points);
      setPlayers(list);
      if (user) {
        const idx = list.findIndex((p) => p.uid === user.uid);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    });
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const top3 = players.slice(0, 3);
  const rest = players.slice(3, 30);

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-text-muted">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" /> رجوع
        </button>

        {/* رأس الصفحة */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-warning">
            <FontAwesomeIcon icon={faTrophy} className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-extrabold">لوحة الترتيب</h1>
          <p className="mt-1 text-sm text-text-muted">أفضل الطلاب على المنصّة بالنقاط المكتسبة</p>
        </div>

        {/* ترتيبي */}
        {myRank && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:gap-3">
            <span className="font-bold text-primary">ترتيبي: #{myRank}</span>
            <span className="text-text-muted">·</span>
            <span className="text-sm text-text-muted">{profile?.points ?? 0} نقطة</span>
            <span className="text-text-muted">·</span>
            <span className="text-sm text-text-muted">المستوى {profile?.level ?? 1}</span>
          </div>
        )}

        {/* المتصدّرون الثلاثة الأوائل */}
        {top3.length > 0 && (
          <div className="mb-5 flex items-end justify-center gap-1.5 sm:gap-3">
            {/* الثاني */}
            {top3[1] && (
              <Link href={`/u/${top3[1].uid}?name=${encodeURIComponent(top3[1].name)}`} className="flex flex-col items-center gap-1 w-20 sm:w-28">
                <span className="text-slate-400 text-lg">🥈</span>
                <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-xl font-extrabold text-white">
                  {top3[1].name.charAt(0)}
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface text-[10px] font-bold text-slate-400">#2</span>
                </div>
                <span className="text-center text-xs font-semibold truncate w-full">{top3[1].name}</span>
                <span className="text-xs text-text-muted">{top3[1].points} نقطة</span>
              </Link>
            )}
            {/* الأوّل */}
            {top3[0] && (
              <Link href={`/u/${top3[0].uid}?name=${encodeURIComponent(top3[0].name)}`} className="flex flex-col items-center gap-1 w-20 sm:w-28 -mb-1">
                <FontAwesomeIcon icon={faCrown} className="h-7 w-7 text-warning animate-bounce" />
                <div className="relative grid h-20 w-20 place-items-center rounded-full ring-4 ring-warning/50 bg-gradient-primary text-2xl font-extrabold text-white shadow-glow">
                  {top3[0].name.charAt(0)}
                  <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-warning text-[11px] font-bold text-white">#1</span>
                </div>
                <span className="text-center text-sm font-bold truncate w-full">{top3[0].name}</span>
                <span className="text-xs font-bold text-warning">{top3[0].points} نقطة</span>
              </Link>
            )}
            {/* الثالث */}
            {top3[2] && (
              <Link href={`/u/${top3[2].uid}?name=${encodeURIComponent(top3[2].name)}`} className="flex flex-col items-center gap-1 w-20 sm:w-28">
                <span className="text-amber-700 text-lg">🥉</span>
                <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-xl font-extrabold text-white">
                  {top3[2].name.charAt(0)}
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface text-[10px] font-bold text-amber-700">#3</span>
                </div>
                <span className="text-center text-xs font-semibold truncate w-full">{top3[2].name}</span>
                <span className="text-xs text-text-muted">{top3[2].points} نقطة</span>
              </Link>
            )}
          </div>
        )}

        {/* القائمة الكاملة */}
        <div className="space-y-2">
          {rest.map((p, i) => {
            const rank = i + 4;
            const isMe = p.uid === user.uid;
            const badges = earnedBadges({ points: p.points, postCount: p.postCount, commentCount: p.commentCount }, 0).length;
            return (
              <Link
                key={p.uid}
                href={`/u/${p.uid}?name=${encodeURIComponent(p.name)}`}
                className={`flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary ${isMe ? "border-primary/50 bg-primary/5" : "border-border bg-surface"}`}
              >
                <div className="flex w-7 justify-center">
                  <RankIcon rank={rank} />
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-extrabold text-white">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate font-semibold">{p.name}{isMe && " (أنا)"}</span>
                  <span className="text-xs text-text-muted">المستوى {p.level}</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-bold text-warning">
                    <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5" />
                    {p.points}
                  </div>
                  {badges > 0 && <div className="text-[10px] text-text-muted">{badges} وسام</div>}
                </div>
              </Link>
            );
          })}
        </div>

        {players.length === 0 && (
          <div className="py-16 text-center text-text-muted">
            <FontAwesomeIcon icon={faTrophy} className="h-10 w-10" />
            <p className="mt-3 text-sm">لا بيانات بعد — انشر وعلّق لتكسب النقاط!</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
