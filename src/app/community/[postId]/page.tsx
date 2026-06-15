"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faArrowUp, faArrowDown, faPaperPlane, faUserPlus, faTrash, faFlag, faReply, faXmark, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { PostAttachment } from "@/features/community/post-attachment";
import {
  listenPost,
  listenComments,
  addComment,
  votePost,
  listenFriends,
  listenSentRequests,
  sendFriendRequest,
  cancelFriendRequest,
  deletePost,
  deleteComment,
  reportContent,
  type Post,
  type Comment,
  type Person,
} from "@/features/community/social";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [post, setPost] = useState<Post | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [friends, setFriends] = useState<Person[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return listenFriends(user.uid, setFriends);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenSentRequests(user.uid, setSentSet);
  }, [user]);

  const friendIds = new Set(friends.map((f) => f.uid));
  const myName = profile?.name || user?.displayName || "طالب";

  async function addFriend(uid: string) {
    if (!user) return;
    await sendFriendRequest({ uid: user.uid, name: myName }, uid);
    setSent((s) => ({ ...s, [uid]: true }));
  }
  async function cancelReq(uid: string) {
    if (!user) return;
    await cancelFriendRequest(user.uid, uid);
    setSent((s) => ({ ...s, [uid]: false }));
  }

  useEffect(() => {
    if (!user) return;
    const u1 = listenPost(postId, user.uid, (p) => {
      setPost(p);
      setLoaded(true);
    });
    const u2 = listenComments(postId, setComments);
    return () => {
      u1();
      u2();
    };
  }, [postId, user]);

  async function send() {
    if (!text.trim() || !user) return;
    const t = text;
    setText("");
    const parent = replyTo?.id;
    setReplyTo(null);
    await addComment(postId, user.uid, myName, t, parent);
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const topComments = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  function CommentCard({ c, isReply, parentId }: { c: Comment; isReply?: boolean; parentId?: string }) {
    if (!user) return null;
    const showAdd = c.authorId !== user.uid && !friendIds.has(c.authorId);
    const isSent = sent[c.authorId] || sentSet.has(c.authorId);
    return (
      <div className={`rounded-lg border border-border bg-surface p-3 ${isReply ? "ms-6 mt-2 border-r-2 border-r-primary/40" : ""}`}>
        <div className="flex items-center justify-between">
          <Link href={`/u/${c.authorId}?name=${encodeURIComponent(c.authorName)}`} className="text-xs font-bold text-primary hover:underline">
            {c.authorName}
          </Link>
          <div className="flex items-center gap-1.5">
            {c.authorId !== user.uid && showAdd && (
              isSent ? (
                <button onClick={() => cancelReq(c.authorId)} className="text-[10px] text-text-muted hover:text-danger">
                  إلغاء الطلب
                </button>
              ) : (
                <button
                  onClick={() => addFriend(c.authorId)}
                  className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] text-primary"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="h-3 w-3" />
                  صداقة
                </button>
              )
            )}
            <button
              onClick={() => setReplyTo({ id: parentId ?? c.id, name: c.authorName })}
              aria-label="رد"
              className="text-text-muted hover:text-primary"
            >
              <FontAwesomeIcon icon={faReply} className="h-3 w-3" />
            </button>
            {c.authorId !== user.uid && (
              <button
                onClick={() => {
                  reportContent("comment", c.id, { uid: user.uid, name: myName });
                  alert("تم الإبلاغ. شكراً.");
                }}
                aria-label="إبلاغ"
                className="text-text-muted hover:text-warning"
              >
                <FontAwesomeIcon icon={faFlag} className="h-3 w-3" />
              </button>
            )}
            {(c.authorId === user.uid || post?.authorId === user.uid) && (
              <button
                onClick={() => {
                  if (confirm("حذف هذا التعليق؟")) deleteComment(postId, c.id);
                }}
                aria-label="حذف"
                className="text-text-muted hover:text-danger"
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{c.text}</p>
      </div>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <button onClick={() => router.push("/community")} className="mb-3 flex items-center gap-2 text-sm text-text-muted">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          رجوع للمجتمع
        </button>

        {!loaded ? (
          <div className="grid place-items-center py-16 text-text-muted">
            <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
          </div>
        ) : !post ? (
          <p className="text-text-muted">المنشور غير موجود.</p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <Link href={`/u/${post.authorId}?name=${encodeURIComponent(post.authorName)}`} className="flex items-center gap-2 hover:opacity-80">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                    {post.authorName.charAt(0)}
                  </span>
                  <span className="font-bold">{post.authorName}</span>
                </Link>
                {post.authorId === user.uid ? (
                  <button
                    onClick={() => {
                      if (confirm("حذف هذا المنشور؟")) {
                        deletePost(post);
                        router.push("/community");
                      }
                    }}
                    aria-label="حذف"
                    className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      reportContent("post", post.id, { uid: user.uid, name: profile?.name || user.displayName || "طالب" });
                      alert("تم الإبلاغ. شكراً.");
                    }}
                    aria-label="إبلاغ"
                    className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:text-warning"
                  >
                    <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {post.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{post.text}</p>}
              <PostAttachment post={post} />
              <div className="mt-3 flex items-center gap-1 rounded-full bg-background px-1" style={{ width: "fit-content" }}>
                <button
                  onClick={() => votePost(post.id, user.uid, 1, post.myVote)}
                  className={`grid h-8 w-8 place-items-center rounded-full ${post.myVote === 1 ? "text-secondary" : "text-text-muted"}`}
                  aria-label="رفع"
                >
                  <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
                </button>
                <span className="min-w-5 text-center text-sm font-bold">{post.score}</span>
                <button
                  onClick={() => votePost(post.id, user.uid, -1, post.myVote)}
                  className={`grid h-8 w-8 place-items-center rounded-full ${post.myVote === -1 ? "text-danger" : "text-text-muted"}`}
                  aria-label="خفض"
                >
                  <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h2 className="mb-2 mt-5 text-sm font-bold">المناقشة ({comments.length})</h2>
            <div className="space-y-2">
              {topComments.map((c) => (
                <div key={c.id}>
                  <CommentCard c={c} />
                  {repliesOf(c.id).map((r) => (
                    <CommentCard key={r.id} c={r} isReply parentId={c.id} />
                  ))}
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-text-muted">لا تعليقات بعد — ابدأ النقاش!</p>}
            </div>

            <div className="mt-3">
              {replyTo && (
                <div className="mb-1 flex items-center justify-between rounded-md bg-primary/5 px-3 py-1.5 text-xs text-text-muted">
                  <span>ترد على {replyTo.name}</span>
                  <button onClick={() => setReplyTo(null)} aria-label="إلغاء الرد" className="hover:text-danger">
                    <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={replyTo ? `ردّك على ${replyTo.name}...` : "اكتب تعليقك..."}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button onClick={send} disabled={!text.trim()} aria-label="إرسال" className="grid h-11 w-11 place-items-center rounded-md bg-gradient-primary text-white disabled:opacity-50">
                  <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
