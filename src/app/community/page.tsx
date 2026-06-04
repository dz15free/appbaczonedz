"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faComment,
  faUserPlus,
  faCheck,
  faXmark,
  faMessage,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import {
  createPost,
  listenPosts,
  toggleLike,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listenFriendRequests,
  listenFriends,
  listenThreads,
  type Post,
  type Person,
  type Thread,
} from "@/features/community/social";

type Tab = "feed" | "people" | "messages";

export default function CommunityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const me: Person | null = user ? { uid: user.uid, name: profile?.name || user.displayName || "طالب" } : null;
  const [tab, setTab] = useState<Tab>("feed");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user || !me) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: "feed", label: "المنشورات" },
    { id: "people", label: "الأصدقاء" },
    { id: "messages", label: "الرسائل" },
  ];

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-5">
        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
                tab === t.id ? "bg-gradient-primary text-white" : "text-text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "feed" && <Feed me={me} />}
        {tab === "people" && <People me={me} />}
        {tab === "messages" && <Messages me={me} />}
      </section>
    </AppShell>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} يوم`;
}

function Feed({ me }: { me: Person }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => listenPosts(me.uid, setPosts), [me.uid]);

  async function publish() {
    if (!text.trim()) return;
    setPosting(true);
    await createPost(me.uid, me.name, text);
    setText("");
    setPosting(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="شارك سؤالاً أو فكرة أو ملخّصاً..."
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="mt-2 flex justify-start">
          <button
            onClick={publish}
            disabled={posting || !text.trim()}
            className="rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            نشر
          </button>
        </div>
      </div>

      {posts.length === 0 && <p className="py-8 text-center text-text-muted">لا منشورات بعد. كن أول من ينشر!</p>}

      {posts.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
              {p.authorName.charAt(0)}
            </span>
            <div>
              <span className="block text-sm font-bold">{p.authorName}</span>
              <span className="text-xs text-text-muted">{timeAgo(p.createdAt)}</span>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.text}</p>
          <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
            <button
              onClick={() => toggleLike(p.id, me.uid, !p.likedByMe)}
              className={`flex items-center gap-1.5 ${p.likedByMe ? "text-danger" : "hover:text-danger"}`}
            >
              <FontAwesomeIcon icon={faHeart} className="h-4 w-4" />
              {p.likeCount > 0 && p.likeCount}
            </button>
            <Link href={`/community/${p.id}`} className="flex items-center gap-1.5 hover:text-primary">
              <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
              تعليق ومناقشة
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function People({ me }: { me: Person }) {
  const [requests, setRequests] = useState<Person[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  useEffect(() => listenFriendRequests(me.uid, setRequests), [me.uid]);
  useEffect(() => listenFriends(me.uid, setFriends), [me.uid]);

  async function doSearch() {
    if (!term.trim()) return;
    setSearching(true);
    setResults(await searchUsers(term, me.uid));
    setSearching(false);
  }
  async function addFriend(p: Person) {
    await sendFriendRequest(me, p.uid);
    setSent((s) => ({ ...s, [p.uid]: true }));
  }

  const friendIds = new Set(friends.map((f) => f.uid));

  return (
    <div className="space-y-5">
      {requests.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold">طلبات الصداقة ({requests.length})</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.uid} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                    {r.name.charAt(0)}
                  </span>
                  {r.name}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => acceptFriendRequest(me, r)} className="grid h-9 w-9 place-items-center rounded-md bg-secondary/10 text-secondary" aria-label="قبول">
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                  </button>
                  <button onClick={() => rejectFriendRequest(me.uid, r.uid)} className="grid h-9 w-9 place-items-center rounded-md bg-danger/10 text-danger" aria-label="رفض">
                    <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-bold">ابحث عن أصدقاء</h2>
        <div className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="اكتب اسم الطالب..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button onClick={doSearch} disabled={searching} className="rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            بحث
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {results.map((p) => {
            const isFriend = friendIds.has(p.uid);
            return (
              <div key={p.uid} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                    {p.name.charAt(0)}
                  </span>
                  {p.name}
                </span>
                {isFriend ? (
                  <span className="text-xs text-secondary">صديق</span>
                ) : sent[p.uid] ? (
                  <span className="text-xs text-text-muted">تم الإرسال</span>
                ) : (
                  <button onClick={() => addFriend(p)} className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary">
                    <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
                    إضافة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold">أصدقائي ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-text-muted">لا أصدقاء بعد — ابحث وأرسل طلبات.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.uid} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                    {f.name.charAt(0)}
                  </span>
                  {f.name}
                </span>
                <Link href={`/messages/${f.uid}`} className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary">
                  <FontAwesomeIcon icon={faMessage} className="h-3.5 w-3.5" />
                  مراسلة
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Messages({ me }: { me: Person }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => listenThreads(me.uid, setThreads), [me.uid]);

  if (threads.length === 0)
    return (
      <div className="py-10 text-center text-text-muted">
        <FontAwesomeIcon icon={faPaperPlane} className="h-8 w-8" />
        <p className="mt-3 text-sm">لا محادثات بعد. راسل صديقاً من تبويب «الأصدقاء».</p>
      </div>
    );

  return (
    <div className="space-y-2">
      {threads.map((t) => (
        <Link key={t.uid} href={`/messages/${t.uid}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-primary font-bold text-white">
            {t.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block font-bold">{t.name}</span>
            <span className="block truncate text-sm text-text-muted">{t.lastText}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
