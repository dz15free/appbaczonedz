// عمليات الغرف — Firestore (دائم) للبيانات، RTDB (لحظي) للحضور
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export type RoomType = "public" | "private" | "teacher";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  ownerId: string;
  ownerName: string;
  subject: string | null;
  createdAt: Timestamp | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  type: "text";
  createdAt: Timestamp | null;
}

// مُعرّف غرفة عشوائي وآمن (منفصل عن الاسم — يحلّ مشكلة التصادم في الكود القديم)
export function generateRoomId(): string {
  return (
    Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6)
  );
}

export async function createRoom(input: {
  name: string;
  type: RoomType;
  subject?: string;
  ownerId: string;
  ownerName: string;
}): Promise<string> {
  const id = generateRoomId();
  await setDoc(doc(db, "rooms", id), {
    name: input.name.trim(),
    type: input.type,
    subject: input.subject ?? null,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const snap = await getDoc(doc(db, "rooms", roomId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Room, "id">) };
}

// الغرف العامة (نرتّبها في العميل لتجنّب فهرس مركّب في Firestore)
export async function listPublicRooms(): Promise<Room[]> {
  const q = query(collection(db, "rooms"), where("type", "==", "public"), limit(50));
  const snap = await getDocs(q);
  const rooms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, "id">) }));
  return rooms.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}

// إرسال رسالة دردشة
export async function sendMessage(
  roomId: string,
  msg: { userId: string; userName: string; text: string }
) {
  await addDoc(collection(db, "rooms", roomId, "messages"), {
    ...msg,
    type: "text",
    createdAt: serverTimestamp(),
  });
}

// الاستماع اللحظي للرسائل
export function listenMessages(roomId: string, cb: (messages: ChatMessage[]) => void) {
  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) })));
  });
}
