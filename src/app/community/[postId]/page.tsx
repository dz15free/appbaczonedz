"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faArrowUp, faArrowDown, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import {
  listenPost,
  listenComments,
  addComment,
  votePost,
  type Post,
  type Comment,
} from "@/features/community/social";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const u1 = listenPost(postId, user.uid, setPost);
    const u2 = listenComments(postId, setComments);
    return () => {
      u1();
      u2();
    };
  }, [postId, user]);

  async function send() {
    if (!text.trim() || !user) return;
    const name = profile?.name || user.displayName || "طالب";
    setText("");
    await addComment(postId, user.uid, name, text);
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <button onClick={() => router.push("/community")} className="mb-3 flex items-center gap-2 text-sm text-text-muted">
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          رجوع للمجتمع
        </button>

        {!post ? (
          <p className="text-text-muted">المنشور غير موجود.</p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                  {post.authorName.charAt(0)}
                </span>
                <span className="font-bold">{post.authorName}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{post.text}</p>
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
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-surface p-3">
                  <span className="text-xs font-bold text-primary">{c.authorName}</span>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.text}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-text-muted">لا تعليقات بعد — ابدأ النقاش!</p>}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="اكتب تعليقك..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button onClick={send} disabled={!text.trim()} aria-label="إرسال" className="grid h-11 w-11 place-items-center rounded-md bg-gradient-primary text-white disabled:opacity-50">
                <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
              </button>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
