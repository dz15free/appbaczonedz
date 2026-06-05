"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faUserPlus,
  faCheck,
  faXmark,
  faMessage,
  faPaperPlane,
  faArrowUp,
  faArrowDown,
  faFire,
  faClock,
  faImage,
  faPaperclip,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { prepareFile } from "@/lib/upload";
import { PostAttachment } from "@/features/community/post-attachment";
import {
  createPost,
  listenPosts,
  votePost,
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
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [friends, setFriends] = useState<Person[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<{ kind: "image" | "file"; dataUrl: string; name: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => listenPosts(me.uid, setPosts), [me.uid]);
  useEffect(() => listenFriends(me.uid, setFriends), [me.uid]);

  const friendIds = new Set(friends.map((f) => f.uid));

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreparing(true);
    try {
      const p = await prepareFile(file);
      setPending({ kind: p.kind, dataUrl: p.dataUrl, name: p.name });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تجهيز الملف.");
    } finally {
      setPreparing(false);
    }
  }

  async function publish() {
    if (!text.trim() && !pending) return;
    setPosting(true);
    await createPost(me.uid, me.name, text, pending ?? undefined);
    setText("");
    setPending(null);
    setPosting(false);
  }

  async function addFriend(uid: string, name: string) {
    await sendFriendRequest(me, uid);
    setSent((s) => ({ ...s, [uid]: true }));
  }

  const shown = [...posts].sort((a, b) => (sort === "top" ? b.score - a.score : b.createdAt - a.createdAt));

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

        {/* معاينة المرفق */}
        {(pending || preparing) && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background p-2 text-sm">
            {preparing ? (
              <span className="flex items-center gap-2 text-text-muted">
                <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" /> جارٍ التجهيز...
              </span>
            ) : pending?.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pending.dataUrl} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4 text-primary" />
            )}
            {pending && <span className="flex-1 truncate">{pending.name}</span>}
            {pending && (
              <button onClick={() => setPending(null)} aria-label="إزالة" className="text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input ref={imageInput} type="file" accept="image/*" hidden onChange={pick} />
            <input ref={fileInput} type="file" hidden onChange={pick} />
            <button onClick={() => imageInput.current?.click()} aria-label="صورة" className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10">
              <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
            </button>
            <button onClick={() => fileInput.current?.click()} aria-label="ملف" className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10">
              <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={publish}
            disabled={posting || (!text.trim() && !pending)}
            className="rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            نشر
          </button>
        </div>
      </div>

      {/* الترتيب */}
      <div className="flex gap-2">
        <button
          onClick={() => setSort("recent")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            sort === "recent" ? "bg-primary/10 text-primary" : "text-text-muted"
          }`}
        >
          <FontAwesomeIcon icon={faClock} className="h-3 w-3" /> الأحدث
        </button>
        <button
          onClick={() => setSort("top")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            sort === "top" ? "bg-primary/10 text-primary" : "text-text-muted"
          }`}
        >
          <FontAwesomeIcon icon={faFire} className="h-3 w-3" /> الأكثر تفاعلاً
        </button>
      </div>

      {shown.length === 0 && <p className="py-8 text-center text-text-muted">لا منشورات بعد. كن أول من ينشر!</p>}

      {shown.map((p) => {
        const showAdd = p.authorId !== me.uid && !friendIds.has(p.authorId);
        return (
          <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                  {p.authorName.charAt(0)}
                </span>
                <div>
                  <span className="block text-sm font-bold">{p.authorName}</span>
                  <span className="text-xs text-text-muted">{timeAgo(p.createdAt)}</span>
                </div>
              </div>
              {showAdd &&
                (sent[p.authorId] ? (
                  <span className="text-xs text-text-muted">تم الإرسال</span>
                ) : (
                  <button
                    onClick={() => addFriend(p.authorId, p.authorName)}
                    className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs text-primary"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="h-3 w-3" />
                    صداقة
                  </button>
                ))}
            </div>

            {p.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.text}</p>}
            <PostAttachment post={p} />

            <div className="mt-3 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 rounded-full bg-background px-1">
                <button
                  onClick={() => votePost(p.id, me.uid, 1, p.myVote)}
                  className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === 1 ? "text-secondary" : "text-text-muted hover:text-secondary"}`}
                  aria-label="رفع"
                >
                  <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
                </button>
                <span className={`min-w-4 text-center text-sm font-bold ${p.score > 0 ? "text-secondary" : p.score < 0 ? "text-danger" : "text-text-muted"}`}>
                  {p.score}
                </span>
                <button
                  onClick={() => votePost(p.id, me.uid, -1, p.myVote)}
                  className={`grid h-8 w-8 place-items-center rounded-full ${p.myVote === -1 ? "text-danger" : "text-text-muted hover:text-danger"}`}
                  aria-label="خفض"
                >
                  <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
                </button>
              </div>

              <Link href={`/community/${p.id}`} className="flex items-center gap-1.5 text-text-muted hover:text-primary">
                <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
                {p.commentCount > 0 ? `${p.commentCount} تعليق` : "تعليق"}
              </Link>
            </div>
          </div>
        );
      })}
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
                <Link href={`/messages/${f.uid}?name=${encodeURIComponent(f.name)}`} className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary">
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
        <Link key={t.uid} href={`/messages/${t.uid}?name=${encodeURIComponent(t.name)}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary">
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
