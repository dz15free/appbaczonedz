// الطبقة الاجتماعية الكاملة — منشورات، تعليقات، إعجاب، صداقات، رسائل خاصة (RTDB)
import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  startAt,
  endAt,
  equalTo,
  limitToLast,
  limitToFirst,
  increment,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { awardActivity } from "@/features/gamification/points";
import { tryPushNotification } from "@/lib/push";

/** عنصر وسائط في المنشور */
export interface PostMedia {
  kind: "image" | "video";
  /** للصور: معرّفا النسختين في community/postAttachments */
  thumbId?: string;
  fullId?: string;
  /** للفيديو: رابط خارجي (لا نرفع فيديو — يستنزف حصّة RTDB) */
  url?: string;
  name?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string; // student | teacher | admin
  text: string;
  createdAt: number;
  score: number;
  myVote: number; // 1 | -1 | 0
  commentCount: number;
  visibility: "public" | "friends" | "private";
  attachmentId?: string;            // قديم: مرفق واحد (تبقى المنشورات القديمة تعمل)
  attachmentKind?: "image" | "file";
  fileName?: string;
  media?: PostMedia[];              // جديد: عدة صور و/أو فيديو
  subject?: string;
  locked?: boolean;
  editedAt?: number;
}
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  text: string;
  createdAt: number;
  parentId?: string;
}
export interface Person {
  uid: string;
  name: string;
}
export interface Thread {
  uid: string;
  name: string;
  lastText: string;
  lastAt: number;
}
export interface DMMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  type?: "text" | "image" | "file";
  attachmentId?: string;
  fileName?: string;
}

/* ───────── المنشورات ───────── */
export async function createPost(
  authorId: string,
  authorName: string,
  text: string,
  attachment?: { kind: "image" | "file"; dataUrl: string; name: string },
  visibility: "public" | "friends" | "private" = "public",
  subject?: string,
  authorRole?: string,
  media?: { kind: "image" | "video"; thumb?: string; full?: string; url?: string; name?: string }[]
) {
  const post: Record<string, unknown> = {
    authorId,
    authorName,
    text: text.trim(),
    createdAt: Date.now(),
    visibility,
  };
  if (authorRole) post.authorRole = authorRole;
  if (subject) post.subject = subject;
  // وسائط متعدّدة: نرفع النسختين لكل صورة ونحتفظ بالمعرّفين فقط
  if (media && media.length) {
    const saved: PostMedia[] = [];
    for (const m of media.slice(0, 6)) {
      if (m.kind === "video" && m.url) {
        saved.push({ kind: "video", url: m.url, name: m.name });
        continue;
      }
      if (m.kind === "image" && m.thumb && m.full) {
        const tRef = push(ref(rtdb, "community/postAttachments"));
        const fRef = push(ref(rtdb, "community/postAttachments"));
        await Promise.all([set(tRef, m.thumb), set(fRef, m.full)]);
        saved.push({ kind: "image", thumbId: tRef.key!, fullId: fRef.key!, name: m.name });
      }
    }
    if (saved.length) post.media = saved;
  }

  if (attachment) {
    const aRef = push(ref(rtdb, "community/postAttachments"));
    await set(aRef, attachment.dataUrl);
    post.attachmentId = aRef.key;
    post.attachmentKind = attachment.kind;
    post.fileName = attachment.name;
  }
  await push(ref(rtdb, "community/posts"), post);
  await awardActivity(authorId, "post");
}

/** تعديل نصّ منشور (للمؤلّف فقط — يُتحقّق عبر قواعد RTDB) */
export async function editPost(postId: string, text: string) {
  await update(ref(rtdb, `community/posts/${postId}`), {
    text: text.trim(),
    editedAt: Date.now(),
  });
}

export async function getPostAttachment(attachmentId: string): Promise<string | null> {
  try {
    const snap = await get(ref(rtdb, `community/postAttachments/${attachmentId}`));
    return (snap.val() as string) ?? null;
  } catch {
    // انقطاع شبكة أو رفض قراءة — نُرجع null فيعرض المكوّن حالة واضحة
    return null;
  }
}

/* ───────── الإشراف ───────── */
export async function deletePost(post: { id: string; attachmentId?: string }) {
  await remove(ref(rtdb, `community/posts/${post.id}`));
  if (post.attachmentId) await remove(ref(rtdb, `community/postAttachments/${post.attachmentId}`));
}

/** قفل/فتح منشور (يمنع/يسمح بإضافة تعليقات جديدة) — للإدارة فقط */
export async function setPostLocked(postId: string, locked: boolean) {
  await update(ref(rtdb, `community/posts/${postId}`), { locked });
}

export async function deleteComment(postId: string, commentId: string) {
  await remove(ref(rtdb, `community/comments/${postId}/${commentId}`));
  await update(ref(rtdb, `community/posts/${postId}`), { commentCount: increment(-1) });
}

export async function reportContent(
  kind: "post" | "comment",
  id: string,
  reporter: Person,
  reason = ""
) {
  await push(ref(rtdb, "reports"), {
    kind,
    contentRef: id,   // لا نستخدم "id" لتجنّب التعارض مع مفتاح Firebase
    reporterId: reporter.uid,
    reporterName: reporter.name,
    reason,
    createdAt: Date.now(),
  });
}

export function listenPosts(myUid: string, cb: (posts: Post[]) => void) {
  const q = query(ref(rtdb, "community/posts"), orderByChild("createdAt"), limitToLast(100));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const posts = Object.entries(val).map(([id, p]: [string, any]) => {
      const votes = (p.votes as Record<string, number>) ?? {};
      const score = Object.values(votes).reduce((a, b) => a + (b as number), 0);
      return {
        id,
        authorId: p.authorId,
        authorName: p.authorName,
        text: p.text,
        createdAt: p.createdAt ?? 0,
        score,
        myVote: votes[myUid] ?? 0,
        commentCount: p.commentCount ?? 0,
        visibility: p.visibility ?? "public",
      editedAt: p.editedAt,
        attachmentId: p.attachmentId,
        attachmentKind: p.attachmentKind,
        fileName: p.fileName,
      };
    });
    posts.sort((a, b) => b.createdAt - a.createdAt);
    cb(posts);
  });
}

export function listenPost(postId: string, myUid: string, cb: (post: Post | null) => void) {
  return onValue(ref(rtdb, `community/posts/${postId}`), (snap) => {
    const p = snap.val() as any;
    if (!p) return cb(null);
    const votes = (p.votes as Record<string, number>) ?? {};
    cb({
      id: postId,
      authorId: p.authorId,
      authorName: p.authorName,
      text: p.text,
      createdAt: p.createdAt ?? 0,
      score: Object.values(votes).reduce((a, b) => a + (b as number), 0),
      myVote: votes[myUid] ?? 0,
      commentCount: p.commentCount ?? 0,
      visibility: p.visibility ?? "public",
      editedAt: p.editedAt,
      attachmentId: p.attachmentId,
      attachmentKind: p.attachmentKind,
      fileName: p.fileName,
    });
  });
}

// منشورات مستخدم معيّن (لصفحة البروفايل)
export function listenUserPosts(authorUid: string, myUid: string, cb: (posts: Post[]) => void) {
  const q = query(ref(rtdb, "community/posts"), orderByChild("authorId"), equalTo(authorUid));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const posts = Object.entries(val).map(([id, p]: [string, any]) => {
      const votes = (p.votes as Record<string, number>) ?? {};
      return {
        id,
        authorId: p.authorId,
        authorName: p.authorName,
        text: p.text,
        createdAt: p.createdAt ?? 0,
        score: Object.values(votes).reduce((a, b) => a + (b as number), 0),
        myVote: votes[myUid] ?? 0,
        commentCount: p.commentCount ?? 0,
        visibility: p.visibility ?? "public",
      editedAt: p.editedAt,
        attachmentId: p.attachmentId,
        attachmentKind: p.attachmentKind,
        fileName: p.fileName,
      } as Post;
    });
    posts.sort((a, b) => b.createdAt - a.createdAt);
    cb(posts);
  });
}

// تصويت: 1 (إعجاب/رفع) أو -1 (خفض)؛ الضغط مجدداً يلغي
export async function votePost(postId: string, uid: string, value: 1 | -1, current: number) {
  const r = ref(rtdb, `community/posts/${postId}/votes/${uid}`);
  if (current === value) await remove(r);
  else await set(r, value);
}

/* ───────── التعليقات ───────── */
export async function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  text: string,
  parentId?: string,
  authorRole?: string
) {
  const data: Record<string, unknown> = {
    authorId,
    authorName,
    text: text.trim(),
    createdAt: Date.now(),
  };
  if (authorRole) data.authorRole = authorRole;
  if (parentId) data.parentId = parentId;
  await push(ref(rtdb, `community/comments/${postId}`), data);
  await update(ref(rtdb, `community/posts/${postId}`), { commentCount: increment(1) });
  await awardActivity(authorId, "comment");
}

export function listenComments(postId: string, cb: (comments: Comment[]) => void) {
  return onValue(ref(rtdb, `community/comments/${postId}`), (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val).map(([id, c]: [string, any]) => ({ id, ...c }));
    list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    cb(list as Comment[]);
  });
}

/* ───────── البحث عن أشخاص ───────── */
export async function searchUsers(term: string, myUid: string): Promise<Person[]> {
  const t = term.trim();
  if (!t) return [];
  const usersRef = ref(rtdb, "users");
  const byName = query(usersRef, orderByChild("name"), startAt(t), endAt(t + "\uf8ff"), limitToLast(20));
  const byEmail = query(usersRef, orderByChild("email"), startAt(t.toLowerCase()), endAt(t.toLowerCase() + "\uf8ff"), limitToLast(20));
  const [sn, se] = await Promise.all([get(byName), get(byEmail)]);
  const out = new Map<string, Person>();
  for (const snap of [sn, se]) {
    const val = (snap.val() as Record<string, any>) ?? {};
    for (const [uid, u] of Object.entries(val) as [string, any][]) {
      if (uid !== myUid) out.set(uid, { uid, name: u.name ?? "طالب" });
    }
  }
  return [...out.values()];
}

/* ───────── الصداقات ───────── */
export async function sendFriendRequest(from: Person, toUid: string) {
  await set(ref(rtdb, `friendRequests/${toUid}/${from.uid}`), {
    name: from.name,
    createdAt: Date.now(),
  });

  // حفظ معرّف الإشعار لحذفه لاحقاً عند الإلغاء
  let notifId = "";
  try {
    const notifRef = await push(ref(rtdb, `notifications/${toUid}`), {
      type: "friend_request",
      text: `${from.name} أرسل لك طلب صداقة`,
      link: "/community",
      read: false,
      createdAt: Date.now(),
    });
    notifId = notifRef.key ?? "";
  } catch { /* لا نُفشل العملية */ }

  // خزّن معرّف الإشعار مع طلب الإرسال
  await set(ref(rtdb, `sentRequests/${from.uid}/${toUid}`), { notifId });

  tryPushNotification(toUid, {
    title: "طلب صداقة جديد 👋",
    body: `${from.name} أرسل لك طلب صداقة`,
    link: "/community",
  });
}

// إلغاء طلب صداقة مُرسَل + حذف الإشعار
export async function cancelFriendRequest(fromUid: string, toUid: string) {
  // اقرأ معرّف الإشعار ثم احذفه
  try {
    const snap = await get(ref(rtdb, `sentRequests/${fromUid}/${toUid}`));
    const val = snap.val();
    if (val?.notifId) {
      await remove(ref(rtdb, `notifications/${toUid}/${val.notifId}`));
    }
  } catch { /* تجاهل */ }
  await remove(ref(rtdb, `friendRequests/${toUid}/${fromUid}`));
  await remove(ref(rtdb, `sentRequests/${fromUid}/${toUid}`));
}

export function listenSentRequests(myUid: string, cb: (ids: Set<string>) => void) {
  return onValue(ref(rtdb, `sentRequests/${myUid}`), (snap) => {
    const val = (snap.val() as Record<string, unknown>) ?? {};
    cb(new Set(Object.keys(val)));
  });
}

export async function acceptFriendRequest(me: Person, other: Person) {
  await update(ref(rtdb, `friends/${me.uid}`), { [other.uid]: { name: other.name } });
  await update(ref(rtdb, `friends/${other.uid}`), { [me.uid]: { name: me.name } });
  await remove(ref(rtdb, `friendRequests/${me.uid}/${other.uid}`));
  await addNotification(other.uid, {
    type: "friend_accept",
    text: `${me.name} قبِل طلب صداقتك`,
    link: `/u/${me.uid}?name=${encodeURIComponent(me.name)}`,
  });
  tryPushNotification(other.uid, {
    title: "قبِل صداقتك ✅",
    body: `${me.name} قبِل طلب صداقتك`,
    link: `/u/${me.uid}`,
  });
}

export async function rejectFriendRequest(myUid: string, fromUid: string) {
  await remove(ref(rtdb, `friendRequests/${myUid}/${fromUid}`));
}

export async function removeFriend(myUid: string, otherUid: string) {
  await remove(ref(rtdb, `friends/${myUid}/${otherUid}`));
  await remove(ref(rtdb, `friends/${otherUid}/${myUid}`));
}

export function listenFriendRequests(myUid: string, cb: (list: Person[]) => void) {
  return onValue(ref(rtdb, `friendRequests/${myUid}`), (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    cb(Object.entries(val).map(([uid, v]: [string, any]) => ({ uid, name: v.name ?? "طالب" })));
  });
}

export function listenFriends(myUid: string, cb: (list: Person[]) => void) {
  return onValue(ref(rtdb, `friends/${myUid}`), (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    cb(Object.entries(val).map(([uid, v]: [string, any]) => ({ uid, name: v.name ?? "طالب" })));
  });
}

// حالة العلاقة مع شخص: none | pending | friends
export async function friendStatus(myUid: string, otherUid: string): Promise<"none" | "pending" | "friends"> {
  const [f, p] = await Promise.all([
    get(ref(rtdb, `friends/${myUid}/${otherUid}`)),
    get(ref(rtdb, `friendRequests/${otherUid}/${myUid}`)),
  ]);
  if (f.exists()) return "friends";
  if (p.exists()) return "pending";
  return "none";
}

/* ───────── الرسائل الخاصة (DM) ───────── */
export function threadId(a: string, b: string) {
  return [a, b].sort().join("_");
}

export async function sendDM(me: Person, other: Person, text: string) {
  const tid = threadId(me.uid, other.uid);
  const trimmed = text.trim();
  await push(ref(rtdb, `dms/${tid}/messages`), {
    senderId: me.uid,
    text: trimmed,
    createdAt: Date.now(),
  });
  // حدّث قائمة المحادثات للطرفين
  const threadData = { name: other.name, lastText: trimmed, lastAt: Date.now() };
  const myThreadData = { name: me.name, lastText: trimmed, lastAt: Date.now() };
  await update(ref(rtdb, `dmThreads/${me.uid}`), { [other.uid]: threadData });
  await update(ref(rtdb, `dmThreads/${other.uid}`), { [me.uid]: myThreadData });
  await addNotification(other.uid, {
    type: "dm",
    text: `رسالة جديدة من ${me.name}`,
    link: `/messages/${me.uid}?name=${encodeURIComponent(me.name)}`,
  });
  tryPushNotification(other.uid, {
    title: `💬 ${me.name}`,
    body: trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed,
    link: `/messages/${me.uid}`,
  });
}

/** إرسال مرفق (صورة/ملف) في محادثة خاصة */
export async function sendDMAttachment(
  me: Person,
  other: Person,
  attachment: { kind: "image" | "file"; dataUrl: string; name: string }
) {
  const tid = threadId(me.uid, other.uid);
  const aRef = push(ref(rtdb, `dms/${tid}/attachments`));
  await set(aRef, attachment.dataUrl);
  await push(ref(rtdb, `dms/${tid}/messages`), {
    senderId: me.uid,
    text: "",
    type: attachment.kind,
    attachmentId: aRef.key,
    fileName: attachment.name,
    createdAt: Date.now(),
  });
  const preview = attachment.kind === "image" ? "📷 صورة" : `📎 ${attachment.name}`;
  const threadData = { name: other.name, lastText: preview, lastAt: Date.now() };
  const myThreadData = { name: me.name, lastText: preview, lastAt: Date.now() };
  await update(ref(rtdb, `dmThreads/${me.uid}`), { [other.uid]: threadData });
  await update(ref(rtdb, `dmThreads/${other.uid}`), { [me.uid]: myThreadData });
  await addNotification(other.uid, {
    type: "dm",
    text: `${me.name} أرسل ${preview}`,
    link: `/messages/${me.uid}?name=${encodeURIComponent(me.name)}`,
  });
  tryPushNotification(other.uid, {
    title: `💬 ${me.name}`,
    body: preview,
    link: `/messages/${me.uid}`,
  });
}

/** جلب محتوى مرفق محادثة خاصة */
export async function getDMAttachment(a: string, b: string, attachmentId: string): Promise<string | null> {
  const tid = threadId(a, b);
  const snap = await get(ref(rtdb, `dms/${tid}/attachments/${attachmentId}`));
  return (snap.val() as string) ?? null;
}

export function listenDM(a: string, b: string, cb: (msgs: DMMessage[]) => void) {
  const tid = threadId(a, b);
  const q = query(ref(rtdb, `dms/${tid}/messages`), limitToLast(200));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val).map(([id, m]: [string, any]) => ({ id, ...m }));
    list.sort((x, y) => (x.createdAt ?? 0) - (y.createdAt ?? 0));
    cb(list as DMMessage[]);
  });
}

export function listenThreads(myUid: string, cb: (threads: Thread[]) => void) {
  return onValue(ref(rtdb, `dmThreads/${myUid}`), (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val).map(([uid, t]: [string, any]) => ({
      uid,
      name: t.name ?? "طالب",
      lastText: t.lastText ?? "",
      lastAt: t.lastAt ?? 0,
    }));
    list.sort((a, b) => b.lastAt - a.lastAt);
    cb(list);
  });
}

export async function getUserName(uid: string): Promise<string> {
  const snap = await get(ref(rtdb, `users/${uid}/name`));
  return (snap.val() as string) ?? "طالب";
}

/* ───────── الإشعارات ───────── */
export interface AppNotification {
  id: string;
  type: string;
  text: string;
  link?: string;
  read?: boolean;
  createdAt: number;
}

export async function addNotification(
  toUid: string,
  n: { type: string; text: string; link?: string }
) {
  try {
    await push(ref(rtdb, `notifications/${toUid}`), {
      type: n.type,
      text: n.text,
      link: n.link ?? "",
      read: false,
      createdAt: Date.now(),
    });
  } catch {
    /* لا نُفشل العملية الأساسية إن تعذّر الإشعار */
  }
}

export function listenNotifications(uid: string, cb: (list: AppNotification[]) => void) {
  const q = query(ref(rtdb, `notifications/${uid}`), limitToLast(50));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val).map(([id, n]: [string, any]) => ({ id, ...n })) as AppNotification[];
    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

export async function markNotificationsRead(uid: string, ids: string[]) {
  if (!ids.length) return;
  const updates: Record<string, boolean> = {};
  for (const id of ids) updates[`${id}/read`] = true;
  await update(ref(rtdb, `notifications/${uid}`), updates);
}

export async function clearNotifications(uid: string) {
  await remove(ref(rtdb, `notifications/${uid}`));
}

/* ═══════════════════════════════
   اقتراح الأصدقاء
═══════════════════════════════ */
export async function getFriendSuggestions(
  uid: string,
  track: string | null | undefined,
  excludeUids: Set<string>,
  limit = 6
): Promise<{ uid: string; name: string; track?: string }[]> {
  if (!track) return [];
  try {
    const snap = await get(
      query(
        ref(rtdb, "users"),
        orderByChild("track"),
        equalTo(track),
        limitToFirst(20)
      )
    );
    const val = (snap.val() as Record<string, any>) ?? {};
    return Object.entries(val)
      .filter(([id, u]) => id !== uid && !excludeUids.has(id) && u.name)
      .slice(0, limit)
      .map(([id, u]) => ({ uid: id, name: u.name, track: u.track }));
  } catch { return []; }
}
