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
  limitToLast,
  increment,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
  score: number;
  myVote: number; // 1 | -1 | 0
  commentCount: number;
  attachmentId?: string;
  attachmentKind?: "image" | "file";
  fileName?: string;
}
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
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
}

/* ───────── المنشورات ───────── */
export async function createPost(
  authorId: string,
  authorName: string,
  text: string,
  attachment?: { kind: "image" | "file"; dataUrl: string; name: string }
) {
  const post: Record<string, unknown> = {
    authorId,
    authorName,
    text: text.trim(),
    createdAt: Date.now(),
  };
  if (attachment) {
    const aRef = push(ref(rtdb, "community/postAttachments"));
    await set(aRef, attachment.dataUrl);
    post.attachmentId = aRef.key;
    post.attachmentKind = attachment.kind;
    post.fileName = attachment.name;
  }
  await push(ref(rtdb, "community/posts"), post);
}

export async function getPostAttachment(attachmentId: string): Promise<string | null> {
  const snap = await get(ref(rtdb, `community/postAttachments/${attachmentId}`));
  return (snap.val() as string) ?? null;
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
      attachmentId: p.attachmentId,
      attachmentKind: p.attachmentKind,
      fileName: p.fileName,
    });
  });
}

// تصويت: 1 (إعجاب/رفع) أو -1 (خفض)؛ الضغط مجدداً يلغي
export async function votePost(postId: string, uid: string, value: 1 | -1, current: number) {
  const r = ref(rtdb, `community/posts/${postId}/votes/${uid}`);
  if (current === value) await remove(r);
  else await set(r, value);
}

/* ───────── التعليقات ───────── */
export async function addComment(postId: string, authorId: string, authorName: string, text: string) {
  await push(ref(rtdb, `community/comments/${postId}`), {
    authorId,
    authorName,
    text: text.trim(),
    createdAt: Date.now(),
  });
  await update(ref(rtdb, `community/posts/${postId}`), { commentCount: increment(1) });
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
  const q = query(ref(rtdb, "users"), orderByChild("name"), startAt(t), endAt(t + "\uf8ff"), limitToLast(20));
  const snap = await get(q);
  const val = (snap.val() as Record<string, any>) ?? {};
  return Object.entries(val)
    .map(([uid, u]: [string, any]) => ({ uid, name: u.name ?? "طالب" }))
    .filter((p) => p.uid !== myUid);
}

/* ───────── الصداقات ───────── */
export async function sendFriendRequest(from: Person, toUid: string) {
  await set(ref(rtdb, `friendRequests/${toUid}/${from.uid}`), {
    name: from.name,
    createdAt: Date.now(),
  });
}

export async function acceptFriendRequest(me: Person, other: Person) {
  await update(ref(rtdb), {
    [`friends/${me.uid}/${other.uid}`]: { name: other.name },
    [`friends/${other.uid}/${me.uid}`]: { name: me.name },
    [`friendRequests/${me.uid}/${other.uid}`]: null,
  });
}

export async function rejectFriendRequest(myUid: string, fromUid: string) {
  await remove(ref(rtdb, `friendRequests/${myUid}/${fromUid}`));
}

export async function removeFriend(myUid: string, otherUid: string) {
  await update(ref(rtdb), {
    [`friends/${myUid}/${otherUid}`]: null,
    [`friends/${otherUid}/${myUid}`]: null,
  });
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
  await update(ref(rtdb), {
    [`dmThreads/${me.uid}/${other.uid}`]: { name: other.name, lastText: trimmed, lastAt: Date.now() },
    [`dmThreads/${other.uid}/${me.uid}`]: { name: me.name, lastText: trimmed, lastAt: Date.now() },
  });
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
