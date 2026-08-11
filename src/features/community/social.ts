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
import {
  pruneMentions, mentionTargets, type MentionMap,
} from "@/features/community/mentions";
import { awardActivity } from "@/features/gamification/points";
import { tryPushNotification } from "@/lib/push";
import { deleteBroadcastsFor } from "@/features/notifications/broadcast";

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
  /** الإشارات (@): معرّف ← اسم. النصّ يبقى نظيفاً والربط بالمعرّف. */
  mentions?: MentionMap;
}
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  text: string;
  createdAt: number;
  parentId?: string;
  mentions?: MentionMap;
}
export interface Person {
  uid: string;
  name: string;
  /** الدور — يُستعمل لمنع «إضافة صديق» للإدارة. اختياريّ فلا يكسر
      المواضع التي تبني `Person` من اسم ومعرّف وحدهما. */
  role?: string;
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
  media?: { kind: "image" | "video"; thumb?: string; full?: string; url?: string; name?: string }[],
  mentions?: MentionMap
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
  // ملاحظة: RTDB يرفض `undefined` ويُلغي الكتابة كاملةً، لذلك لا نضيف
  // حقل `name` إلا إن كان موجوداً فعلاً (الفيديو غالباً بلا اسم).
  if (media && media.length) {
    const saved: PostMedia[] = [];
    for (const m of media.slice(0, 6)) {
      if (m.kind === "video" && m.url) {
        const item: PostMedia = { kind: "video", url: m.url };
        if (m.name) item.name = m.name;
        saved.push(item);
        continue;
      }
      if (m.kind === "image" && m.thumb && m.full) {
        const tRef = push(ref(rtdb, "community/postAttachments"));
        const fRef = push(ref(rtdb, "community/postAttachments"));
        await Promise.all([set(tRef, m.thumb), set(fRef, m.full)]);
        const item: PostMedia = { kind: "image", thumbId: tRef.key!, fullId: fRef.key! };
        if (m.name) item.name = m.name;
        saved.push(item);
      }
    }
    if (saved.length) post.media = saved;
  }

  if (attachment) {
    const aRef = push(ref(rtdb, "community/postAttachments"));
    await set(aRef, attachment.dataUrl);
    post.attachmentId = aRef.key;
    post.attachmentKind = attachment.kind;
    if (attachment.name) post.fileName = attachment.name;
  }
  const clean = mentions ? pruneMentions(post.text as string, mentions) : {};
  if (Object.keys(clean).length) post.mentions = clean;

  // حماية أخيرة: أي `undefined` متبقٍّ يجعل RTDB يرفض الكتابة كاملةً
  const added = await push(ref(rtdb, "community/posts"), stripUndefined(post));
  await awardActivity(authorId, "post");

  /* إشعار المُشار إليهم — بعد نجاح النشر لا قبله، فلا يصل إشعار إلى
     منشور لم يُنشر. ولا يُشعر المُشير نفسه. */
  const targets = mentionTargets(clean, authorId);
  if (targets.length) {
    const who = await getUserName(authorId);
    await Promise.allSettled(targets.map((uid) => addNotification(uid, {
      type: "mention",
      text: `${who} أشار إليك في منشور`,
      link: `/community/${added.key}`,
    })));
  }

  // نُرجع المعرّف: المستدعي يربط به البثّ فيُحذف مع المنشور
  return added.key ?? "";
}

/** يحذف كل الحقول ذات القيمة undefined (RTDB يرفضها ويُلغي الكتابة) */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
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
  /* بثّ `@all` المرتبط بالمنشور يُحذف معه: إشعار يقود إلى منشور محذوف
     أسوأ من غياب الإشعار. ولا نُوقف الحذف إن فشل — المنشور ذهب فعلاً. */
  try { await deleteBroadcastsFor(post.id); } catch { /* غير حرج */ }
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
        authorRole: p.authorRole,
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
        // كانت هذه الحقول تُكتب في القاعدة لكن لا تُقرأ أبداً،
        // فيظهر المنشور نصّاً فقط بلا صور ولا فيديو.
        media: p.media,
        /* 🐛 كانت `mentions` تُحفظ ولا تُقرأ — فيصل النصّ إلى العارض بلا
           خريطة، فيعرض «@الاسم» نصّاً عادياً. نفس صنف العطب الذي أصاب
           `media` سابقاً: الكتابة سليمة والقراءة ناقصة. */
        mentions: p.mentions,
        subject: p.subject,
        locked: p.locked,
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
      authorRole: p.authorRole,
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
      media: p.media,
      /* 🐛 كانت `mentions` تُحفظ ولا تُقرأ — فيصل النصّ إلى العارض بلا
         خريطة، فيعرض «@الاسم» نصّاً عادياً. نفس صنف العطب الذي أصاب
         `media` سابقاً: الكتابة سليمة والقراءة ناقصة. */
      mentions: p.mentions,
      subject: p.subject,
      locked: p.locked,
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
        authorRole: p.authorRole,
        media: p.media,
        /* 🐛 كانت `mentions` تُحفظ ولا تُقرأ — فيصل النصّ إلى العارض بلا
           خريطة، فيعرض «@الاسم» نصّاً عادياً. نفس صنف العطب الذي أصاب
           `media` سابقاً: الكتابة سليمة والقراءة ناقصة. */
        mentions: p.mentions,
        subject: p.subject,
        locked: p.locked,
      } as Post;
    });
    posts.sort((a, b) => b.createdAt - a.createdAt);
    cb(posts);
  });
}

/** (منشور:مصوّت) أُشعِر في هذه الجلسة — يمنع مصنع الاشعارات بالتذبذب */
const upvoteNotified = new Set<string>();

// تصويت: 1 (إعجاب/رفع) أو -1 (خفض)؛ الضغط مجدداً يلغي
export async function votePost(postId: string, uid: string, value: 1 | -1, current: number) {
  const r = ref(rtdb, `community/posts/${postId}/votes/${uid}`);
  if (current === value) { await remove(r); return; }
  await set(r, value);

  /* 🐛 لم يكن هناك أيّ إشعار للتصويت — يرفع الطلبة منشوراً فلا يعلم
     صاحبه. نُشعره الآن، وبأربعة قيود تمنع الإزعاج:

     ١) عند الرفع وحده. إشعار «أحدهم خفّض منشورك» عقاب لا خبر.
     ٢) عند التحوّل من «بلا تصويت» إلى رفع فقط — لا عند الانتقال من
        خفضٍ إلى رفع، وإلّا صار التذبذب على الزرّ مصنعَ اشعارات.
     ٣) لا يُشعر أحد نفسه.
     ٤) الفشل صامت: `addNotification` تكتم أخطاءها، والتصويت نفسه
        وقع قبلها فلا يُبطله فشل إشعار. */
  if (value !== 1 || current === 1 || current === -1) return;

  /* ولا يكفي شرط «من صفر إلى رفع»: الضغط المتكرّر يمرّ ١ ← ٠ ← ١ …
     فيصير الزرّ مصنع اشعارات. فنمنع التكرار لكل (منشور، مصوّت).

     ولماذا في الذاكرة لا في قاعدة البيانات؟ لأنّ قواعد RTDB تسمح
     بالكتابة تحت `community/posts/$id` في `votes/$uid` و`commentCount`
     و`locked` وحدها — فعلامةُ «أُشعِر» تحتاج سطراً في القواعد، وتغييرُ
     القواعد ممنوع في هذه المرحلة. وقراءة اشعارات الطرف الآخر ممنوعة
     أيضاً (كلٌّ يقرأ اشعاراته).

     فهذا يمنع التكرار داخل الجلسة — وهو موضع الإزعاج الفعليّ — ويبقى
     التكرار ممكناً بعد تحديث الصفحة. الحلّ الدائم سطرٌ واحد في القواعد
     (`voteNotified`)، وهو متاح متى أذنتَ به. */
  const once = `${postId}:${uid}`;
  if (upvoteNotified.has(once)) return;
  upvoteNotified.add(once);

  try {
    const snap = await get(ref(rtdb, `community/posts/${postId}`));
    const post = snap.val() as { authorId?: string; text?: string } | null;
    if (!post?.authorId || post.authorId === uid) return;
    const who = await getUserName(uid);
    await addNotification(post.authorId, {
      type: "post_upvote",
      text: `${who} صوّت لمنشورك`,
      link: `/community/${postId}`,
    });
  } catch {
    /* قراءة المنشور فشلت — لا نُفشل التصويت من أجل إشعار */
  }
}

/* ───────── التعليقات ───────── */
export async function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  text: string,
  parentId?: string,
  authorRole?: string,
  mentions?: MentionMap
) {
  const data: Record<string, unknown> = {
    authorId,
    authorName,
    text: text.trim(),
    createdAt: Date.now(),
  };
  if (authorRole) data.authorRole = authorRole;
  if (parentId) data.parentId = parentId;
  const cleanMentions = mentions ? pruneMentions(text.trim(), mentions) : {};
  if (Object.keys(cleanMentions).length) data.mentions = cleanMentions;
  const added = await push(ref(rtdb, `community/comments/${postId}`), data);
  await update(ref(rtdb, `community/posts/${postId}`), { commentCount: increment(1) });
  await awardActivity(authorId, "comment");

  /* 🐛 لم يكن هناك أيّ إشعار للتعليقات ولا للردود — يُعلّق أحدهم على
     منشورك أو يردّ على تعليقك فلا تعلم إلّا إن عدتَ إلى المنشور بنفسك.

     ونُرسل **إشعاراً واحداً لكل شخص** لا اثنين: من يردّ على تعليقٍ
     داخل منشوره صاحبُه يجب أن يصله «ردّ على تعليقك» وحده، لا هو
     و«تعليق على منشورك» معه. `seen` تحرس ذلك، وتحرس أيضاً ألّا يُشعر
     المعلّق نفسه. */
  try {
    const commentId = added.key ?? "";
    const link = commentId ? `/community/${postId}#c-${commentId}` : `/community/${postId}`;
    const who = await getUserName(authorId);
    const seen = new Set<string>([authorId]);

    /* الإشارة أوّلاً وأخصّ: من أُشير إليه صراحةً يصله «أشار إليك» لا
       «علّق على منشورك». إشعاران عن فعلٍ واحد يُقرأان خللاً. */
    for (const uid of mentionTargets(cleanMentions, authorId)) {
      if (seen.has(uid)) continue;
      seen.add(uid);
      await addNotification(uid, {
        type: "mention",
        text: `${who} أشار إليك في تعليق`,
        link,
      });
    }

    if (parentId) {
      const ps = await get(ref(rtdb, `community/comments/${postId}/${parentId}`));
      const parent = ps.val() as { authorId?: string } | null;
      if (parent?.authorId && !seen.has(parent.authorId)) {
        seen.add(parent.authorId);
        await addNotification(parent.authorId, {
          type: "comment_reply",
          text: `${who} ردّ على تعليقك`,
          link,
        });
      }
    }

    const snap = await get(ref(rtdb, `community/posts/${postId}`));
    const post = snap.val() as { authorId?: string } | null;
    if (post?.authorId && !seen.has(post.authorId)) {
      await addNotification(post.authorId, {
        type: "post_comment",
        text: `${who} علّق على منشورك`,
        link,
      });
    }
  } catch {
    /* التعليق نُشر فعلاً — لا نُفشله من أجل إشعار */
  }
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
      if (uid !== myUid) out.set(uid, { uid, name: u.name ?? "طالب", role: u.role });
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
      /* 🐛 كان `/community` فيهبط المستقبِل على تبويب المنشورات وواجهة
         القبول في تبويب «الأشخاص» لا يصل إليه. والوجهة مفروضة أيضاً في
         `notif-registry` فتُصلَح الاشعارات المخزَّنة من قبل. */
      link: "/community?tab=people",
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
    link: "/community?tab=people",
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

/* 🐛 هذه الدالّة كانت مكتوبة ومكتملة و**لا تُستدعى من أيّ مكان** —
   لا زرّ في المنصّة كلّها يحذف صداقة. صارت الآن معروضة في صفحة الملفّ
   الشخصي وفي قائمة «أصدقائي». */
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
      /* الإدارة تُستثنى من الاقتراحات: التواصل معها بالدعم لا بالصداقة،
         فاقتراحُها يدفع الطالب إلى طلبٍ لا يُقبل أبداً. */
      .filter(([id, u]) => id !== uid && !excludeUids.has(id) && u.name && u.role !== "admin")
      .slice(0, limit)
      .map(([id, u]) => ({ uid: id, name: u.name, track: u.track }));
  } catch { return []; }
}
