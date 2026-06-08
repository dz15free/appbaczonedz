// مجموعات المواد الدراسية — Firebase RTDB مجاني
import {
  ref,
  push,
  set,
  get,
  remove,
  update,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import type { Person } from "@/features/community/social";

export interface StudyGroup {
  id: string;
  name: string;
  subject: string; // track id أو "general"
  description: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
}

export interface GroupMember {
  uid: string;
  name: string;
  joinedAt: number;
  role: "admin" | "member";
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

// SUBJECTS للاختيار (الشعب + عام)
export const GROUP_SUBJECTS = [
  { id: "general", name: "عامة" },
  { id: "sciences", name: "علوم تجريبية" },
  { id: "math", name: "رياضيات" },
  { id: "tech", name: "تقني رياضي" },
  { id: "literature", name: "آداب وفلسفة" },
  { id: "languages", name: "لغات أجنبية" },
  { id: "management", name: "تسيير واقتصاد" },
];

export const SUBJECT_COLOR: Record<string, string> = {
  general: "bg-primary/10 text-primary",
  sciences: "bg-secondary/10 text-secondary",
  math: "bg-warning/10 text-warning",
  tech: "bg-danger/10 text-danger",
  literature: "bg-primary/20 text-primary",
  languages: "bg-secondary/20 text-secondary",
  management: "bg-warning/20 text-warning",
};

/* ───────── عمليات المجموعات ───────── */

export async function createGroup(
  owner: Person,
  data: { name: string; subject: string; description: string }
): Promise<string> {
  const gRef = push(ref(rtdb, "groups"));
  const id = gRef.key!;
  await set(gRef, {
    name: data.name.trim(),
    subject: data.subject,
    description: data.description.trim(),
    ownerId: owner.uid,
    ownerName: owner.name,
    createdAt: Date.now(),
  });
  await set(ref(rtdb, `groupMembers/${id}/${owner.uid}`), {
    name: owner.name,
    joinedAt: Date.now(),
    role: "admin",
  });
  await set(ref(rtdb, `userGroups/${owner.uid}/${id}`), true);
  return id;
}

export async function joinGroup(uid: string, name: string, groupId: string) {
  await set(ref(rtdb, `groupMembers/${groupId}/${uid}`), {
    name,
    joinedAt: Date.now(),
    role: "member",
  });
  await set(ref(rtdb, `userGroups/${uid}/${groupId}`), true);
}

export async function leaveGroup(uid: string, groupId: string) {
  await remove(ref(rtdb, `groupMembers/${groupId}/${uid}`));
  await remove(ref(rtdb, `userGroups/${uid}/${groupId}`));
}

export async function deleteGroup(groupId: string) {
  // استخدام remove منفصلة لكل مسار بدل multi-path update (يتجنّب permission_denied)
  await remove(ref(rtdb, `groups/${groupId}`));
  await remove(ref(rtdb, `groupMembers/${groupId}`));
  await remove(ref(rtdb, `groupMessages/${groupId}`));
}

export async function sendGroupMessage(
  groupId: string,
  sender: { uid: string; name: string },
  text: string
) {
  await push(ref(rtdb, `groupMessages/${groupId}`), {
    senderId: sender.uid,
    senderName: sender.name,
    text: text.trim(),
    createdAt: Date.now(),
  });
}

export function listenGroups(cb: (list: StudyGroup[]) => void) {
  const q = query(ref(rtdb, "groups"), orderByChild("createdAt"), limitToLast(100));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val)
      .map(([id, g]: [string, any]) => ({ id, ...g }) as StudyGroup)
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

export function listenUserGroupIds(uid: string, cb: (ids: Set<string>) => void) {
  return onValue(ref(rtdb, `userGroups/${uid}`), (snap) => {
    const val = (snap.val() as Record<string, boolean>) ?? {};
    cb(new Set(Object.keys(val)));
  });
}

export function listenGroupMembers(groupId: string, cb: (list: GroupMember[]) => void) {
  return onValue(ref(rtdb, `groupMembers/${groupId}`), (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val).map(([uid, m]: [string, any]) => ({ uid, ...m })) as GroupMember[];
    list.sort((a, b) => a.joinedAt - b.joinedAt);
    cb(list);
  });
}

export function listenGroupMessages(groupId: string, cb: (list: GroupMessage[]) => void) {
  const q = query(ref(rtdb, `groupMessages/${groupId}`), orderByChild("createdAt"), limitToLast(80));
  return onValue(q, (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val)
      .map(([id, m]: [string, any]) => ({ id, ...m })) as GroupMessage[];
    list.sort((a, b) => a.createdAt - b.createdAt);
    cb(list);
  });
}

export async function getGroup(groupId: string): Promise<StudyGroup | null> {
  const snap = await get(ref(rtdb, `groups/${groupId}`));
  if (!snap.exists()) return null;
  return { id: groupId, ...snap.val() } as StudyGroup;
}

/* ───────── ملفات المجموعة ───────── */
export interface GroupFile {
  id: string;
  name: string;
  uploaderId: string;
  uploaderName: string;
  driveId?: string;
  attachmentId?: string;
  createdAt: number;
}

export async function addGroupFile(
  groupId: string,
  data: { uploaderId: string; uploaderName: string; name: string; driveId?: string }
) {
  await push(ref(rtdb, `groupFiles/${groupId}`), {
    name: data.name,
    uploaderId: data.uploaderId,
    uploaderName: data.uploaderName,
    driveId: data.driveId ?? null,
    createdAt: Date.now(),
  });
}

export function listenGroupFiles(groupId: string, cb: (files: GroupFile[]) => void) {
  return onValue(ref(rtdb, `groupFiles/${groupId}`), (snap) => {
    const val = (snap.val() as Record<string, any>) ?? {};
    const list = Object.entries(val).map(([id, f]: [string, any]) => ({ id, ...f })) as GroupFile[];
    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

export async function deleteGroupFile(groupId: string, fileId: string) {
  await remove(ref(rtdb, `groupFiles/${groupId}/${fileId}`));
}
