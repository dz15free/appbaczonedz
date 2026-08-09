"use client";

import { Fragment, useEffect, useRef, useState } from "react";
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
  faImage, faVideo, faEllipsis,
  faPaperclip,
  faSpinner,
  faTrash,
  faFlag,
  faGlobe,
  faUserGroup,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { AdSlot } from "@/components/ui/ad-slot";
import { FeedCard } from "@/features/feed/feed-cards";
import { useFeed, rankFeed, listenMyFeedProgress, type FeedProgress } from "@/features/feed/feed";
import { prepareFile, prepareImagePair, type PreparedImage } from "@/lib/upload";
import { PostAttachment } from "@/features/community/post-attachment";
import { RoleBadge } from "@/components/ui/role-badge";
import { LiveAvatar } from "@/components/ui/live-avatar";
import {
  createPost,
  listenPosts,
  votePost,
  deletePost,
  reportContent,
  searchUsers,
  sendFriendRequest,
  cancelFriendRequest,
  getUserName,
  acceptFriendRequest,
  rejectFriendRequest,
  listenFriendRequests,
  listenFriends,
  listenSentRequests,
  listenThreads,
  getFriendSuggestions,
  type Post,
  type Person,
  type Thread,
} from "@/features/community/social";
import { RichText } from "@/components/ui/linkify";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { ShareButton } from "@/components/ui/share-sheet";
import { PostMediaGrid, isSupportedVideoUrl } from "@/features/community/post-media";

const MAX_IMAGES = 6;

type Tab = "feed" | "people" | "messages";

export default function CommunityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const me: Person | null = user ? { uid: user.uid, name: profile?.name || user.displayName || "طالب" } : null;
  const [tab, setTab] = useState<Tab>("feed");

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  if (loading || !user || !me) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const TABS: { id: Tab; label: string }[] = [
    /* لا تبويب مستقلّ لمساحة الدراسة: محتواها **يندمج** مع المنشورات
       في التبويب نفسه. تبويبٌ منفصل يعني مكاناً ثانياً يُنسى، وصفحةً
       بيضاء حين لا يكون فيه محتوى بعد. */
    { id: "feed", label: "المنشورات" },
    { id: "people", label: "الأصدقاء" },
    { id: "messages", label: "الرسائل" },
  ];

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-5">
        <AdSlot placement="community" className="mb-4" />
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] flex-1 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-bold transition ${
                tab === t.id ? "bg-gradient-primary text-white" : "text-text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "feed" && (
          <Feed
            me={me}
            isAdmin={profile?.role === "admin"}
            myRole={profile?.role}
            track={profile?.track ?? null}
          />
        )}
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

function Feed({ me, isAdmin, myRole, track }: {
  me: Person; isAdmin: boolean; myRole?: string; track?: string | null;
}) {
  /* مساحة الدراسة تندمج هنا: عنصر تعليمي بعد كل ثلاثة منشورات.
     الأستاذ والأدمن يريانها **كمنشور يُقرأ** — بلا نقاط ولا «قرأتها» —
     لأنّهما ليسا من يجمع النقاط. */
  const feedItems = useFeed(40);
  const [feedProgress, setFeedProgress] = useState<Record<string, FeedProgress>>({});
  const isStaff = myRole === "teacher" || myRole === "admin";
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [postSubject, setPostSubject] = useState("");
  const [friends, setFriends] = useState<Person[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ kind: "image" | "file"; dataUrl: string; name: string } | null>(null);
  const [pendingImages, setPendingImages] = useState<PreparedImage[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoField, setShowVideoField] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  /* `?compose=1` يفتح المحرّر مباشرة — يأتي من زرّ «أضف منشوراً» في
     أدوات التدريس. بلا هذا يهبط الأستاذ على القائمة ويبحث عن الحقل. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).get("compose")) return;
    const t = window.setTimeout(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 250);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsub = listenPosts(me.uid, setPosts);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);
  useEffect(() => {
    if (isStaff) return;   // الأستاذ لا يجمع تقدّماً، فلا داعي لمستمعه
    const unsub = listenMyFeedProgress(me.uid, setFeedProgress);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid, isStaff]);
  useEffect(() => {
    const unsub = listenFriends(me.uid, setFriends);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);
  useEffect(() => {
    const unsub = listenSentRequests(me.uid, setSentSet);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);

  const friendIds = new Set(friends.map((f) => f.uid));

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setPreparing(true);
    try {
      const images = files.filter((f) => f.type.startsWith("image/"));
      const others = files.filter((f) => !f.type.startsWith("image/"));

      if (images.length) {
        const room = MAX_IMAGES - pendingImages.length;
        if (room <= 0) { alert(`الحد الأقصى ${MAX_IMAGES} صور في المنشور.`); return; }
        const prepared = await Promise.all(images.slice(0, room).map((f) => prepareImagePair(f)));
        setPendingImages((prev) => [...prev, ...prepared]);
      }
      // الملفات غير الصور تبقى على النظام القديم: مرفق واحد
      if (others.length) {
        const p = await prepareFile(others[0]);
        setPending({ kind: p.kind, dataUrl: p.dataUrl, name: p.name });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تجهيز الملف.");
    } finally {
      setPreparing(false);
    }
  }

  async function publish() {
    const vid = videoUrl.trim();
    if (vid && !isSupportedVideoUrl(vid)) {
      alert("رابط الفيديو غير مدعوم. استعمل يوتيوب أو Vimeo أو رابط ملف mp4.");
      return;
    }
    if (!text.trim() && !pending && !pendingImages.length && !vid) return;
    setPosting(true);
    const media = [
      ...(vid ? [{ kind: "video" as const, url: vid }] : []),
      ...pendingImages.map((i) => ({ kind: "image" as const, thumb: i.thumb, full: i.full, name: i.name })),
    ];
    try {
      await createPost(me.uid, me.name, text, pending ?? undefined, visibility, postSubject || undefined, myRole, media);
      setText("");
      setPending(null);
      setPendingImages([]);
      setVideoUrl("");
      setVisibility("public");
      setPostSubject("");
    } catch (err) {
      // بلا هذا كان الزرّ يبقى «جارٍ النشر» إلى الأبد عند أي فشل
      console.error("[BacZone] فشل النشر:", err);
      alert(err instanceof Error ? err.message : "تعذّر نشر المنشور. تحقّق من اتصالك وحاول مجدداً.");
    } finally {
      setPosting(false);
    }
  }

  async function addFriend(uid: string, name: string) {
    await sendFriendRequest(me, uid);
    setSent((s) => ({ ...s, [uid]: true }));
  }
  async function cancelReq(uid: string) {
    await cancelFriendRequest(me.uid, uid);
    setSent((s) => ({ ...s, [uid]: false }));
  }

  // فلترة حسب الخصوصية: عام للجميع، أصدقاء للأصدقاء، خاص لصاحبه فقط
  const visible = (p: Post) =>
    p.visibility === "public" ||
    p.authorId === me.uid ||
    (p.visibility === "friends" && friendIds.has(p.authorId));

  const shown = [...posts]
    .filter(visible)
    .filter((p) => !subjectFilter || (p as any).subject === subjectFilter)
    .sort((a, b) => (sort === "top" ? b.score - a.score : b.createdAt - a.createdAt));

  /* عناصر الدراسة المرتّبة لهذا المستخدم — تُحقن بين المنشورات لا
     تُستبدل بها. التصفية بالمادّة تسري عليها أيضاً كي يبقى الفلتر صادقاً. */
  const studyItems = (feedItems ? rankFeed(feedItems, { track, subject: subjectFilter || null }) : [])
    .filter((i) => !subjectFilter || i.subject === subjectFilter);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex gap-3">
          <LiveAvatar uid={me.uid} name={me.name || "ط"} size="md" className="shrink-0" />
          <textarea
            ref={composerRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شارك سؤالاً أو فكرة أو ملخّصاً..."
            rows={2}
            className="min-h-[44px] flex-1 resize-none bg-transparent pt-2 text-sm outline-none placeholder:text-text-muted"
          />
        </div>

        {/* معاينة المرفق */}
        {(pending || preparing) && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm">
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

        {/* معاينة الصور المختارة */}
        {pendingImages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumb} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setPendingImages((p) => p.filter((_, j) => j !== i))}
                  aria-label="إزالة الصورة"
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <span className="self-end text-[11px] text-text-muted">{pendingImages.length}/{MAX_IMAGES}</span>
          </div>
        )}

        {/* رابط فيديو */}
        {showVideoField && (
          <div className="mt-2">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="رابط يوتيوب أو Vimeo أو ملف mp4"
              dir="ltr"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-[10px] text-text-muted">
              الفيديو يُشارَك برابط ولا يُرفع — هذا يحافظ على سرعة المنصّة ويُبقيها مجانية.
            </p>
          </div>
        )}

        {/* صف الأدوات */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={pick} />
          <input ref={fileInput} type="file" hidden onChange={pick} />
          <button onClick={() => imageInput.current?.click()} aria-label="صور" title="إرفاق صور (حتى 6)"
            className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary">
            <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
          </button>
          <button onClick={() => setShowVideoField((v) => !v)} aria-label="فيديو" title="إضافة فيديو برابط"
            className={`grid h-9 w-9 place-items-center rounded-lg transition hover:bg-primary/10 hover:text-primary ${
              showVideoField || videoUrl ? "bg-primary/10 text-primary" : "text-text-muted"
            }`}>
            <FontAwesomeIcon icon={faVideo} className="h-4 w-4" />
          </button>
          <button onClick={() => fileInput.current?.click()} aria-label="ملف" title="إرفاق ملف"
            className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary">
            <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
          </button>
          <div className="h-5 w-px bg-border" />
          {([
            { id: "public",  icon: faGlobe,     label: "عام" },
            { id: "friends", icon: faUserGroup, label: "أصدقاء" },
            { id: "private", icon: faLock,       label: "خاص" },
          ] as const).map((v) => (
            <button key={v.id} onClick={() => setVisibility(v.id)} aria-label={v.label} title={v.label}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${visibility === v.id ? "bg-gradient-primary text-white" : "text-text-muted hover:bg-primary/10 hover:text-primary"}`}>
              <FontAwesomeIcon icon={v.icon} className="h-3.5 w-3.5" />
            </button>
          ))}

          <select value={postSubject} onChange={(e) => setPostSubject(e.target.value)}
            className="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
            title="فئة المنشور">
            <option value="">بدون فئة</option>
            {["اللغة العربية","العلوم الإسلامية","الرياضيات","علوم الطبيعة والحياة","العلوم الفيزيائية","الفلسفة","التاريخ والجغرافيا","اللغة الفرنسية","اللغة الإنجليزية","اللغة الأمازيغية","القانون","التسيير المحاسبي والمالي","الاقتصاد والمناجمنت","اللغة الإسبانية","اللغة الألمانية","اللغة الإيطالية","الهندسة الكهربائية","الهندسة الميكانيكية","هندسة الطرائق","الهندسة المدنية","مادة التخصص الفني"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={publish} disabled={posting || (!text.trim() && !pending)}
            className="h-9 shrink-0 rounded-lg bg-gradient-primary px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
            {posting ? "..." : "نشر"}
          </button>
        </div>
      </div>

      {/* الترتيب + فلتر الفئة */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSort("recent")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${sort === "recent" ? "bg-primary/10 text-primary" : "text-text-muted"}`}>
          <FontAwesomeIcon icon={faClock} className="h-3 w-3" /> الأحدث
        </button>
        <button onClick={() => setSort("top")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${sort === "top" ? "bg-primary/10 text-primary" : "text-text-muted"}`}>
          <FontAwesomeIcon icon={faFire} className="h-3 w-3" /> الأكثر تفاعلاً
        </button>
        <div className="mx-1 h-5 w-px self-center bg-border" />
        {["","رياضيات","علوم","فيزياء","عربية","فرنسية","فلسفة"].map((s) => (
          <button key={s} onClick={() => setSubjectFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${subjectFilter === s ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"}`}>
            {s || "الكل"}
          </button>
        ))}
      </div>

      {shown.length === 0 && studyItems.length === 0 && (
        <p className="py-8 text-center text-text-muted">لا منشورات بعد. كن أول من ينشر!</p>
      )}

      {/* أوّل عنصر دراسي يتصدّر القائمة — ما يأتي الطالب لأجله */}
      {studyItems[0] && (
        <FeedCard
          item={studyItems[0]}
          uid={me.uid}
          track={track}
          readOnly={isStaff}
          progress={feedProgress[studyItems[0].id] ?? null}
        />
      )}

      {shown.map((p, pi) => {
        const showAdd = p.authorId !== me.uid && !friendIds.has(p.authorId);
        /* عنصر دراسي بعد كل ثلاثة منشورات — لا اثنان متتاليان ولا
           خمسة في صفّ واحد. الأوّل عُرض فوق القائمة، فنبدأ من الثاني. */
        const inject = pi > 0 && (pi + 1) % 3 === 0
          ? studyItems[Math.floor((pi + 1) / 3)]
          : undefined;
        return (
          <Fragment key={p.id}>
          <article
            className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/30 hover:shadow-glass"
          >
            {/* ترويسة الكاتب */}
            <div className="flex items-start gap-2.5 px-4 pt-3.5">
              <Link href={`/u/${p.authorId}?name=${encodeURIComponent(p.authorName)}`} className="shrink-0">
                <LiveAvatar uid={p.authorId} name={p.authorName} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <Link
                    href={`/u/${p.authorId}?name=${encodeURIComponent(p.authorName)}`}
                    className="truncate text-sm font-bold hover:underline"
                  >
                    {p.authorName}
                  </Link>
                  <RoleBadge uid={p.authorId} role={p.authorRole} />
                  {p.subject && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {p.subject}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted">
                  <span>{timeAgo(p.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <FontAwesomeIcon
                    icon={p.visibility === "private" ? faLock : p.visibility === "friends" ? faUserGroup : faGlobe}
                    className="h-2.5 w-2.5"
                    title={p.visibility === "private" ? "خاص" : p.visibility === "friends" ? "الأصدقاء" : "عام"}
                  />
                  {p.editedAt && <span>· مُعدّل</span>}
                  {p.locked && <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5 text-warning" title="مُغلق" />}
                </div>
              </div>

              <PostMenu
                canDelete={p.authorId === me.uid || isAdmin}
                onDelete={() => { if (confirm("حذف هذا المنشور؟")) deletePost(p); }}
                onReport={() => {
                  reportContent("post", p.id, me);
                  alert("تم الإبلاغ. شكراً لمساعدتك في إبقاء المجتمع آمناً.");
                }}
                friendState={!showAdd ? null : (sent[p.authorId] || sentSet.has(p.authorId)) ? "sent" : "none"}
                onFriend={() => addFriend(p.authorId, p.authorName)}
                onCancelFriend={() => cancelReq(p.authorId)}
              />
            </div>

            {/* المحتوى */}
            <div className="px-4 pt-2.5">
              {p.text && (
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  <RichText text={p.text} noPreview={!!p.media?.length || !!p.attachmentId} />
                </div>
              )}
            </div>

            {/* الوسائط — بعرض البطاقة كاملاً */}
            <div className="px-4">
              {p.media?.length ? <PostMediaGrid media={p.media} /> : <PostAttachment post={p} />}
            </div>

            {/* شريط التفاعل */}
            <div className="mt-3 flex items-center gap-1 border-t border-border px-2 py-1.5">
              <div className="flex items-center rounded-full bg-background">
                <button
                  onClick={() => votePost(p.id, me.uid, 1, p.myVote)}
                  aria-label="تصويت مؤيّد"
                  className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${
                    p.myVote === 1 ? "text-secondary" : "text-text-muted hover:text-secondary"
                  }`}
                >
                  <FontAwesomeIcon icon={faArrowUp} className="h-4 w-4" />
                </button>
                <span
                  className={`min-w-6 text-center text-sm font-bold tabular-nums ${
                    p.score > 0 ? "text-secondary" : p.score < 0 ? "text-danger" : "text-text-muted"
                  }`}
                >
                  {p.score}
                </span>
                <button
                  onClick={() => votePost(p.id, me.uid, -1, p.myVote)}
                  aria-label="تصويت معارض"
                  className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${
                    p.myVote === -1 ? "text-danger" : "text-text-muted hover:text-danger"
                  }`}
                >
                  <FontAwesomeIcon icon={faArrowDown} className="h-4 w-4" />
                </button>
              </div>

              <Link
                href={`/community/${p.id}`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary"
              >
                <FontAwesomeIcon icon={faComment} className="h-3.5 w-3.5" />
                {p.commentCount > 0 ? `${p.commentCount} تعليق` : "تعليق"}
              </Link>

              <ShareButton
                target={{
                  path: `/community/${p.id}`,
                  title: p.text ? p.text.slice(0, 80) : `منشور ${p.authorName}`,
                }}
              />
            </div>
          </article>

          {inject && (
            <FeedCard
              item={inject}
              uid={me.uid}
              track={track}
              readOnly={isStaff}
              progress={feedProgress[inject.id] ?? null}
            />
          )}
          </Fragment>
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
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<{ uid: string; name: string; track?: string }[]>([]);
  const { user } = useAuth();
  const profile = useProfile(user?.uid);

  useEffect(() => {
    const unsub = listenFriendRequests(me.uid, setRequests);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);
  useEffect(() => {
    const unsub = listenFriends(me.uid, setFriends);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);
  useEffect(() => {
    const unsub = listenSentRequests(me.uid, setSentSet);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);

  // اقتراحات الأصدقاء بناءً على الشعبة
  useEffect(() => {
    if (!profile?.track || !me.uid) return;
    const excluded = new Set([me.uid, ...friends.map((f) => f.uid), ...Array.from(sentSet)]);
    getFriendSuggestions(me.uid, profile.track, excluded).then(setSuggestions);
  }, [me.uid, profile?.track, friends, sentSet]);

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
  async function cancelReq(uid: string) {
    await cancelFriendRequest(me.uid, uid);
    setSent((s) => ({ ...s, [uid]: false }));
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
                  <LiveAvatar uid={r.uid} name={r.name} size="sm" />
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
            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
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
                <Link href={`/u/${p.uid}?name=${encodeURIComponent(p.name)}`} className="flex items-center gap-2 font-semibold hover:opacity-80">
                  <LiveAvatar uid={p.uid} name={p.name} size="sm" />
                  {p.name}
                </Link>
                {isFriend ? (
                  <span className="text-xs text-secondary">صديق</span>
                ) : sent[p.uid] || sentSet.has(p.uid) ? (
                  <button onClick={() => cancelReq(p.uid)} className="rounded-md px-2 py-1 text-xs text-text-muted hover:text-danger">
                    إلغاء الطلب
                  </button>
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
                <Link href={`/u/${f.uid}?name=${encodeURIComponent(f.name)}`} className="flex items-center gap-2 font-semibold hover:opacity-80">
                  <LiveAvatar uid={f.uid} name={f.name} size="sm" />
                  {f.name}
                </Link>
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
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const unsub = listenThreads(me.uid, setThreads);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [me.uid]);

  // نجلب الاسم الحالي لكل شخص من RTDB لضمان صحّته
  useEffect(() => {
    if (!threads.length) return;
    Promise.all(
      threads.map(async (t) => {
        const n = await getUserName(t.uid);
        return [t.uid, n || t.name] as [string, string];
      })
    ).then((pairs) => setNames(Object.fromEntries(pairs)));
  }, [threads]);

  const displayName = (t: Thread) => names[t.uid] || t.name || "طالب";

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
        <Link key={t.uid} href={`/messages/${t.uid}?name=${encodeURIComponent(displayName(t))}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:border-primary">
          <LiveAvatar uid={t.uid} name={displayName(t)} size="md" className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <span className="block font-bold">{displayName(t)}</span>
            <span className="block truncate text-sm text-text-muted">{t.lastText}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* قائمة إجراءات المنشور — تجمع الثانوي بدل تكديسه في الترويسة */
function PostMenu({
  canDelete, onDelete, onReport, friendState, onFriend, onCancelFriend,
}: {
  canDelete: boolean;
  onDelete: () => void;
  onReport: () => void;
  friendState: "sent" | "none" | null;
  onFriend: () => void;
  onCancelFriend: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="خيارات المنشور"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary"
      >
        <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-glass">
          {friendState === "none" && (
            <MenuRow icon={faUserPlus} label="إضافة صديق" onClick={() => { onFriend(); setOpen(false); }} />
          )}
          {friendState === "sent" && (
            <MenuRow icon={faXmark} label="إلغاء طلب الصداقة" onClick={() => { onCancelFriend(); setOpen(false); }} />
          )}
          {canDelete ? (
            <MenuRow icon={faTrash} label="حذف المنشور" danger onClick={() => { setOpen(false); onDelete(); }} />
          ) : (
            <MenuRow icon={faFlag} label="إبلاغ" onClick={() => { setOpen(false); onReport(); }} />
          )}
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, onClick, danger }: {
  icon: typeof faFlag; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-right text-xs font-semibold transition ${
        danger ? "text-danger hover:bg-danger/10" : "text-text-primary hover:bg-primary/10"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
