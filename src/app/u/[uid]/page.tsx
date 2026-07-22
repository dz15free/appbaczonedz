"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faGraduationCap,
  faLocationDot,
  faStar,
  faUserPlus,
  faUserXmark,
  faMessage,
  faArrowUp,
  faArrowDown,
  faComment,
  faGlobe,
  faUserGroup,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { MyRatingSummary, RateTeacherSheet } from "@/features/community/teacher-rating-ui";
import { SupportChatSheet } from "@/features/support/support-chat";
import { TRACKS, subjectName } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { PostAttachment } from "@/features/community/post-attachment";
import { ProfileBadges } from "@/features/gamification/profile-stats";
import {
  listenUserPosts,
  listenFriends,
  listenSentRequests,
  sendFriendRequest,
  cancelFriendRequest,
  votePost,
  type Post,
  type Person,
} from "@/features/community/social";
import { loginHrefFor } from "@/features/auth/use-require-auth";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} يوم`;
}

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const myProfile = useProfile(user?.uid);
  const theirProfile = useProfile(uid);

  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [theirFriends, setTheirFriends] = useState<Person[]>([]);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [sentLocal, setSentLocal] = useState(false);
  const [nameParam, setNameParam] = useState("");

  const isMe = user?.uid === uid;
  const isTeacher = theirProfile?.role === "teacher" || theirProfile?.role === "admin";
  const isAdmin = theirProfile?.role === "admin";
  const [rateOpen, setRateOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    setNameParam(new URLSearchParams(window.location.search).get("name") || "");
  }, [uid]);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const u1 = listenUserPosts(uid, user.uid, setPosts);
    const u2 = listenFriends(user.uid, setFriends);
    const u3 = listenSentRequests(user.uid, setSentSet);
    const u4 = listenFriends(uid, setTheirFriends);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [user, uid]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const isFriend = friends.some((f) => f.uid === uid);
  const isSent = sentSet.has(uid) || sentLocal;
  const trackName = TRACKS.find((t) => t.id === theirProfile?.track)?.name ?? "—";
  const name = theirProfile?.name || nameParam || "طالب";

  // الخصوصية: عام للجميع، أصدقاء للأصدقاء، خاص لصاحبه
  const visiblePosts = posts.filter(
    (p) => p.visibility === "public" || isMe || (p.visibility === "friends" && isFriend)
  );

  async function addFriend() {
    if (!user) return;
    await sendFriendRequest({ uid: user.uid, name: myProfile?.name || user.displayName || "طالب" }, uid);
    setSentLocal(true);
  }
  async function cancelReq() {
    if (!user) return;
    await cancelFriendRequest(user.uid, uid);
    setSentLocal(false);
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <button onClick={() => router.back()} className="mb-3 flex items-center gap-2 text-sm text-text-muted">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          رجوع
        </button>

        {/* بطاقة البروفايل */}
        <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center">
          <UserAvatar name={name} avatarUrl={theirProfile?.avatarUrl} size="xl" />
          <h1 className="mt-3 font-display text-xl font-extrabold">{name}</h1>
          {isTeacher ? (
            <div className="mt-1.5"><RoleBadge uid={uid} role={theirProfile?.role} /></div>
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-warning/10 px-4 py-1.5 text-sm font-bold text-warning">
              <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
              المستوى {theirProfile?.level ?? 1} · {theirProfile?.points ?? 0} نقطة
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faGraduationCap} className="h-4 w-4 text-primary" />
              {theirProfile?.role === "teacher" ? subjectName(theirProfile?.teachSubject) : trackName}
            </span>
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLocationDot} className="h-4 w-4 text-primary" /> {theirProfile?.wilaya ?? "—"}
            </span>
          </div>

          {!isMe && isAdmin && user && (
            <button
              onClick={() => setSupportOpen(true)}
              className="mt-4 flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white shadow-glow transition hover:opacity-90"
            >
              <FontAwesomeIcon icon={faMessage} className="h-4 w-4" /> تواصل مع الإدارة
            </button>
          )}

          {!isMe && !isAdmin && (
            <div className="mt-4 flex gap-2">
              {isFriend ? (
                <Link
                  href={`/messages/${uid}?name=${encodeURIComponent(name)}`}
                  className="flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white"
                >
                  <FontAwesomeIcon icon={faMessage} className="h-4 w-4" /> مراسلة
                </Link>
              ) : isSent ? (
                <button onClick={cancelReq} className="flex items-center gap-2 rounded-md bg-surface px-5 py-2 text-sm text-text-muted hover:text-danger">
                  <FontAwesomeIcon icon={faUserXmark} className="h-4 w-4" /> إلغاء الطلب
                </button>
              ) : (
                <button onClick={addFriend} className="flex items-center gap-2 rounded-md bg-primary/10 px-5 py-2 text-sm font-bold text-primary">
                  <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" /> إضافة صديق
                </button>
              )}
            </div>
          )}

          {/* زرّ تقييم الأستاذ — لأي طالب زار بروفايله (الأساتذة فقط، لا الإدارة) */}
          {isTeacher && !isAdmin && !isMe && user && (
            <button
              onClick={() => setRateOpen(true)}
              className="mt-3 flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-5 py-2 text-sm font-bold text-amber-600 transition hover:bg-amber-400/20"
            >
              <FontAwesomeIcon icon={faStar} className="h-4 w-4" /> قيّم الأستاذ
            </button>
          )}

          {/* درج التواصل مع الإدارة */}
          {isAdmin && !isMe && (
            <SupportChatSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
          )}
        </div>

        {/* الإنجازات — للطلبة فقط */}
        {!isTeacher && (
          <div className="mt-4">
            <ProfileBadges
              stats={{ points: theirProfile?.points, postCount: theirProfile?.postCount, commentCount: theirProfile?.commentCount }}
              friendCount={theirFriends.length}
            />
          </div>
        )}

        {/* تقييم الطلاب — يظهر على بروفايل الأستاذ (لا الإدارة) */}
        {isTeacher && !isAdmin && (
          <div className="mt-4">
            <MyRatingSummary uid={uid} />
          </div>
        )}

        {/* درج تقييم الأستاذ */}
        {isTeacher && !isAdmin && !isMe && user && (
          <RateTeacherSheet
            teacherUid={uid}
            teacherName={name}
            studentUid={user.uid}
            studentName={myProfile?.name || user.displayName || "طالب"}
            open={rateOpen}
            onClose={() => setRateOpen(false)}
          />
        )}

        {/* منشورات الشخص */}
        <h2 className="mb-2 mt-6 text-sm font-bold">المنشورات ({visiblePosts.length})</h2>
        <div className="space-y-3">
          {visiblePosts.length === 0 && <p className="py-6 text-center text-sm text-text-muted">لا منشورات ظاهرة.</p>}
          {visiblePosts.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                {timeAgo(p.createdAt)}
                <FontAwesomeIcon
                  icon={p.visibility === "private" ? faLock : p.visibility === "friends" ? faUserGroup : faGlobe}
                  className="h-2.5 w-2.5"
                />
              </div>
              {p.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{p.text}</p>}
              <PostAttachment post={p} />
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 rounded-full bg-background px-1">
                  <button onClick={() => votePost(p.id, user.uid, 1, p.myVote)} className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === 1 ? "text-secondary" : "text-text-muted"}`} aria-label="رفع">
                    <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
                  </button>
                  <span className="min-w-4 text-center text-sm font-bold">{p.score}</span>
                  <button onClick={() => votePost(p.id, user.uid, -1, p.myVote)} className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === -1 ? "text-danger" : "text-text-muted"}`} aria-label="خفض">
                    <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
                  </button>
                </div>
                <Link href={`/community/${p.id}`} className="flex items-center gap-1.5 text-text-muted hover:text-primary">
                  <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
                  {p.commentCount > 0 ? `${p.commentCount} تعليق` : "تعليق"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
