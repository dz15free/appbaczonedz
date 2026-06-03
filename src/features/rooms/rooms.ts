// عمليات الغرف والدردشة — Realtime Database (مجاني بلا فوترة)
import {
  ref,
  get,
  set,
  push,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  onValue,
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
  text: string;
  type: "text";
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

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 دقائق

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
