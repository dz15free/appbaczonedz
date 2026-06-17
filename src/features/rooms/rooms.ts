// عمليات الغرف والدردشة — Realtime Database (مجاني بلا فوترة)
import {
  ref,
  get,
  set,
  push,
  remove,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  onValue,
  update,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export type RoomType = "public" | "private" | "teacher";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  ownerId: string;
  ownerName: string;
  subject: string | null;
  createdAt: number | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text?: string;
  type: "text" | "image" | "file";
  attachmentId?: string;
  fileName?: string;
  createdAt: number | null;
}

// مُعرّف غرفة عشوائي وآمن (منفصل عن الاسم — يحلّ مشكلة التصادم في الكود القديم)
export function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export async function createRoom(input: {
  name: string;
  type: RoomType;
  subject?: string;
  ownerId: string;
  ownerName: string;
}): Promise<string> {
  const id = generateRoomId();
  await set(ref(rtdb, `rooms/${id}`), {
    name: input.name.trim(),
    type: input.type,
    subject: input.subject ?? null,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    createdAt: Date.now(),
  });
  return id;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const snap = await get(ref(rtdb, `rooms/${roomId}`));
  if (!snap.exists()) return null;
  return { id: roomId, ...(snap.val() as Omit<Room, "id">) };
}

// الغرف العامة (RTDB مفهرس على type في القواعد)
export async function listPublicRooms(): Promise<Room[]> {
  const q = query(ref(rtdb, "rooms"), orderByChild("type"), equalTo("public"));
  const snap = await get(q);
  const val = (snap.val() as Record<string, Omit<Room, "id">>) ?? {};
  return Object.entries(val)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export interface LiveRoom extends Room {
  activeCount: number;
}

const ACTIVE_WINDOW_MS = 60 * 1000; // دقيقة واحدة

// عدّ الحاضرين النشطين (آخر نبض خلال 5 دقائق) في خريطة حضور غرفة
function countActive(roomPresence: Record<string, { lastActive?: number }> | null): number {
  if (!roomPresence) return 0;
  const now = Date.now();
  return Object.values(roomPresence).filter(
    (m) => typeof m.lastActive === "number" && now - m.lastActive < ACTIVE_WINDOW_MS
  ).length;
}

// الغرف العامة النشطة فقط: بها شخص واحد على الأقل نشط خلال آخر 5 دقائق
export async function listLiveRooms(): Promise<LiveRoom[]> {
  const [rooms, presenceSnap] = await Promise.all([
    listPublicRooms(),
    get(ref(rtdb, "presence")),
  ]);
  const presence = (presenceSnap.val() as Record<string, Record<string, { lastActive?: number }>>) ?? {};
  return rooms
    .map((r) => ({ ...r, activeCount: countActive(presence[r.id]) }))
    .filter((r) => r.activeCount >= 1)
    .sort((a, b) => b.activeCount - a.activeCount);
}

// الانضمام بكتابة اسم الغرفة (يشمل الخاصة وغرف الأستاذ غير الظاهرة في القائمة)
export async function findRoomByName(name: string): Promise<Room | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const q = query(ref(rtdb, "rooms"), orderByChild("name"), equalTo(trimmed));
  const snap = await get(q);
  const val = (snap.val() as Record<string, Omit<Room, "id">>) ?? {};
  const matches = Object.entries(val).map(([id, v]) => ({ id, ...v }));
  if (matches.length === 0) return null;
  // عند تطابق عدة غرف بالاسم، نأخذ الأحدث
  return matches.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
}

export async function sendMessage(
  roomId: string,
  msg: { userId: string; userName: string; text: string }
) {
  await push(ref(rtdb, `rooms/${roomId}/messages`), {
    ...msg,
    type: "text",
    createdAt: Date.now(),
  });
}

export async function sendAttachment(
  roomId: string,
  msg: { userId: string; userName: string; kind: "image" | "file"; dataUrl: string; fileName: string }
) {
  // نخزّن المرفق (base64) في عقدة منفصلة، والرسالة تحمل مرجعه فقط (تبقى الدردشة خفيفة)
  const aRef = push(ref(rtdb, `rooms/${roomId}/attachments`));
  await set(aRef, msg.dataUrl);
  await push(ref(rtdb, `rooms/${roomId}/messages`), {
    userId: msg.userId,
    userName: msg.userName,
    type: msg.kind,
    attachmentId: aRef.key,
    fileName: msg.fileName,
    createdAt: Date.now(),
  });
}

export async function getAttachment(roomId: string, attachmentId: string): Promise<string | null> {
  const snap = await get(ref(rtdb, `rooms/${roomId}/attachments/${attachmentId}`));
  return (snap.val() as string) ?? null;
}

// الاستماع اللحظي للرسائل (آخر 200)
export function listenMessages(roomId: string, cb: (messages: ChatMessage[]) => void) {
  const q = query(ref(rtdb, `rooms/${roomId}/messages`), limitToLast(200));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, Omit<ChatMessage, "id">>) ?? {};
    const msgs = Object.entries(val)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    cb(msgs);
  });
}

/* ───────── ملفات الغرفة ───────── */
export interface RoomFile {
  id: string;
  name: string;
  uploaderName: string;
  uploaderId?: string;
  attachmentId?: string; // قديم: base64
  driveId?: string; // جديد: Google Drive
  createdAt: number;
}

export async function addRoomFile(
  roomId: string,
  data: { uploaderId: string; uploaderName: string; name: string; driveId?: string; dataUrl?: string }
) {
  const meta: Record<string, unknown> = {
    name: data.name,
    uploaderId: data.uploaderId,
    uploaderName: data.uploaderName,
    createdAt: Date.now(),
  };
  if (data.driveId) {
    meta.driveId = data.driveId;
  } else if (data.dataUrl) {
    const aRef = push(ref(rtdb, `rooms/${roomId}/attachments`));
    await set(aRef, data.dataUrl);
    meta.attachmentId = aRef.key;
  }
  await push(ref(rtdb, `rooms/${roomId}/files`), meta);
}

export async function deleteRoomFile(roomId: string, file: RoomFile) {
  await remove(ref(rtdb, `rooms/${roomId}/files/${file.id}`));
  if (file.attachmentId) await remove(ref(rtdb, `rooms/${roomId}/attachments/${file.attachmentId}`));
}

export function listenRoomFiles(roomId: string, cb: (files: RoomFile[]) => void) {
  return onValue(ref(rtdb, `rooms/${roomId}/files`), (snap) => {
    const val = (snap.val() as Record<string, Omit<RoomFile, "id">>) ?? {};
    const list = Object.entries(val).map(([id, f]) => ({ id, ...f }));
    list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    cb(list);
  });
}

/* ══════════════════════════════════════════════════
   إدارة الغرفة: مشرفون — طرد — حظر — حذف رسائل
══════════════════════════════════════════════════ */

/** ترقية عضو إلى مشرف */
export async function promoteToMod(roomId: string, uid: string) {
  await set(ref(rtdb, `roomLive/${roomId}/mods/${uid}`), true);
}

/** إلغاء ترقية مشرف */
export async function demoteMod(roomId: string, uid: string) {
  await remove(ref(rtdb, `roomLive/${roomId}/mods/${uid}`));
}

/** استماع لقائمة المشرفين */
export function listenMods(roomId: string, cb: (mods: Set<string>) => void) {
  return onValue(ref(rtdb, `roomLive/${roomId}/mods`), (snap) => {
    cb(new Set(Object.keys(snap.val() ?? {})));
  });
}

/** طرد مؤقّت (إشارة → العميل يغادر تلقائياً) */
export async function kickUser(roomId: string, uid: string) {
  await set(ref(rtdb, `roomLive/${roomId}/kicked/${uid}`), Date.now());
  setTimeout(() => remove(ref(rtdb, `presence/${roomId}/${uid}`)), 1200);
}

/** استماع لإشارة الطرد */
export function listenKicked(roomId: string, uid: string, cb: (kicked: boolean) => void) {
  return onValue(ref(rtdb, `roomLive/${roomId}/kicked/${uid}`), (snap) => cb(snap.exists()));
}

/** حظر دائم */
export async function banUser(roomId: string, uid: string) {
  await set(ref(rtdb, `bannedUsers/${roomId}/${uid}`), true);
  await kickUser(roomId, uid);
}

/** فك الحظر */
export async function unbanUser(roomId: string, uid: string) {
  await remove(ref(rtdb, `bannedUsers/${roomId}/${uid}`));
}

/** استماع لقائمة المحظورين */
export function listenBanned(roomId: string, cb: (banned: Set<string>) => void) {
  return onValue(ref(rtdb, `bannedUsers/${roomId}`), (snap) => {
    cb(new Set(Object.keys(snap.val() ?? {})));
  });
}

/** حذف رسالة من الغرفة (للمالك فقط) */
export async function deleteRoomMessage(roomId: string, messageId: string) {
  await remove(ref(rtdb, `rooms/${roomId}/messages/${messageId}`));
}

/* ══════════════════════════════════════════
   استفتاء سريع (Quick Poll) في الغرفة
══════════════════════════════════════════ */

export interface RoomPoll {
  question: string;
  options: string[];
  votes: Record<string, number>;
  open: boolean;
  createdAt: number;
}

export async function createPoll(roomId: string, question: string, options: string[]) {
  await set(ref(rtdb, `roomLive/${roomId}/poll`), {
    question: question.trim(),
    options: options.map((o) => o.trim()).filter(Boolean),
    votes: {},
    open: true,
    createdAt: Date.now(),
  });
}

export async function closePoll(roomId: string) {
  await set(ref(rtdb, `roomLive/${roomId}/poll/open`), false);
}

export async function castVote(roomId: string, uid: string, optionIdx: number) {
  await set(ref(rtdb, `roomLive/${roomId}/poll/votes/${uid}`), optionIdx);
}

export function listenPoll(roomId: string, cb: (poll: RoomPoll | null) => void) {
  return onValue(ref(rtdb, `roomLive/${roomId}/poll`), (snap) => {
    cb((snap.val() as RoomPoll | null) ?? null);
  });
}

/* ══════════════════════════════════════════
   جدول الجلسات الدراسية القادمة
══════════════════════════════════════════ */

export interface ScheduledSession {
  id: string;
  name: string;
  subject: string | null;
  roomId: string;
  ownerId: string;
  ownerName: string;
  scheduledAt: number;
  createdAt: number;
}

const SESSION_HIDE_AFTER_MS = 60 * 60 * 1000; // أخفِ الجلسة بعد مرور ساعة من وقتها

export async function scheduleSession(input: {
  name: string;
  subject?: string;
  ownerId: string;
  ownerName: string;
  scheduledAt: number;
}): Promise<string> {
  // أنشئ غرفة الجلسة فوراً (تصبح جاهزة للانضمام عند حلول الوقت)
  const roomId = await createRoom({
    name: input.name,
    type: "public",
    subject: input.subject,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
  });

  const sRef = push(ref(rtdb, "scheduledSessions"));
  await set(sRef, {
    name: input.name.trim(),
    subject: input.subject ?? null,
    roomId,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    scheduledAt: input.scheduledAt,
    createdAt: Date.now(),
  });
  return roomId;
}

export async function listUpcomingSessions(): Promise<ScheduledSession[]> {
  const snap = await get(ref(rtdb, "scheduledSessions"));
  const val = (snap.val() as Record<string, Omit<ScheduledSession, "id">>) ?? {};
  const now = Date.now();
  return Object.entries(val)
    .map(([id, s]) => ({ id, ...s }))
    .filter((s) => s.scheduledAt > now - SESSION_HIDE_AFTER_MS)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export function listenUpcomingSessions(cb: (sessions: ScheduledSession[]) => void) {
  return onValue(ref(rtdb, "scheduledSessions"), (snap) => {
    const val = (snap.val() as Record<string, Omit<ScheduledSession, "id">>) ?? {};
    const now = Date.now();
    const list = Object.entries(val)
      .map(([id, s]) => ({ id, ...s }))
      .filter((s) => s.scheduledAt > now - SESSION_HIDE_AFTER_MS)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
    cb(list);
  });
}

export async function deleteScheduledSession(id: string) {
  await remove(ref(rtdb, `scheduledSessions/${id}`));
}

/* ══════════════════════════════════════════
   مؤقّت الغرفة (Lesson Timer)
══════════════════════════════════════════ */
export interface RoomTimer {
  duration: number; startedAt: number; active: boolean; label?: string;
}
export async function setRoomTimer(roomId: string, timer: RoomTimer | null) {
  await set(ref(rtdb, `roomLive/${roomId}/timer`), timer);
}
export function listenRoomTimer(roomId: string, cb: (t: RoomTimer | null) => void) {
  return onValue(ref(rtdb, `roomLive/${roomId}/timer`), (snap) => {
    cb((snap.val() as RoomTimer | null) ?? null);
  });
}
/* ══════════════════════════════════════════
   الملاحظات المشتركة (Shared Notes)
══════════════════════════════════════════ */
export async function saveRoomNotes(roomId: string, text: string) {
  await set(ref(rtdb, `roomLive/${roomId}/notes`), text);
}
export function listenRoomNotes(roomId: string, cb: (text: string) => void) {
  return onValue(ref(rtdb, `roomLive/${roomId}/notes`), (snap) => {
    cb((snap.val() as string) ?? "");
  });
}
