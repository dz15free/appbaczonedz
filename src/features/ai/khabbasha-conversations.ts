"use client";

import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export type KhabbashaAttachmentType = "image" | "pdf" | "docx" | "file";

export interface KhabbashaAttachment {
  id: string;
  type: KhabbashaAttachmentType;
  fileName: string;
  mimeType: string;
  size?: number;
  source: "rtdb-base64" | "drive";
  driveId?: string;
  previewDataUrl?: string;
}

export interface KhabbashaMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  attachments?: KhabbashaAttachment[];
}

export interface KhabbashaConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview: string;
  messageCount: number;
}

interface LegacyMessage {
  role: "user" | "assistant";
  text: string;
}

const MAX_TITLE = 80;
const MAX_PREVIEW = 140;
const MAX_MESSAGE_LENGTH = 20_000;
const LEGACY_ID = "legacy";

const conversationsPath = (uid: string) => `khabbashaConversations/${uid}`;
const conversationPath = (uid: string, conversationId: string) => `${conversationsPath(uid)}/${conversationId}`;
const messagesPath = (uid: string, conversationId: string) => `khabbashaMessages/${uid}/${conversationId}`;
const attachmentsPath = (uid: string, conversationId: string) => `khabbashaAttachments/${uid}/${conversationId}`;
const activePath = (uid: string) => `khabbashaActive/${uid}`;

function cleanTitle(title: string): string {
  const value = title.trim().replace(/\s+/g, " ");
  return (value || "محادثة جديدة").slice(0, MAX_TITLE);
}

function previewFor(message: Pick<KhabbashaMessage, "text" | "attachments">): string {
  const text = message.text.trim();
  if (text) return text.slice(0, MAX_PREVIEW);
  const firstFile = message.attachments?.[0]?.fileName;
  return firstFile ? `مرفق: ${firstFile}` : "محادثة جديدة";
}

function normalizeLegacyMessages(value: unknown): LegacyMessage[] {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
      : [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    const text = typeof item.text === "string" ? item.text.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    return role && text ? [{ role, text }] : [];
  });
}

function mapConversations(value: unknown): KhabbashaConversation[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([id, raw]) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      if (typeof item.title !== "string") return [];
      return [{
        id,
        title: cleanTitle(item.title),
        createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
        updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : 0,
        lastMessagePreview: typeof item.lastMessagePreview === "string" ? item.lastMessagePreview : "",
        messageCount: typeof item.messageCount === "number" ? item.messageCount : 0,
      }];
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function mapMessages(value: unknown): KhabbashaMessage[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([id, raw]) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      const role: KhabbashaMessage["role"] | null = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
      const text = typeof item.text === "string" ? item.text.slice(0, MAX_MESSAGE_LENGTH) : "";
      if (!role || (!text.trim() && !Array.isArray(item.attachments))) return [];
      return [{
        id,
        role,
        text,
        createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
        attachments: Array.isArray(item.attachments) ? item.attachments as KhabbashaAttachment[] : undefined,
      }];
    })
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function listenKhabbashaConversations(uid: string, cb: (items: KhabbashaConversation[]) => void) {
  return onValue(ref(rtdb, conversationsPath(uid)), (snapshot) => cb(mapConversations(snapshot.val())));
}

export async function getKhabbashaConversations(uid: string): Promise<KhabbashaConversation[]> {
  const snapshot = await get(ref(rtdb, conversationsPath(uid)));
  return mapConversations(snapshot.val());
}

export function listenKhabbashaMessages(uid: string, conversationId: string, cb: (items: KhabbashaMessage[]) => void) {
  return onValue(ref(rtdb, messagesPath(uid, conversationId)), (snapshot) => cb(mapMessages(snapshot.val())));
}

export async function getKhabbashaMessages(uid: string, conversationId: string): Promise<KhabbashaMessage[]> {
  const snapshot = await get(ref(rtdb, messagesPath(uid, conversationId)));
  return mapMessages(snapshot.val());
}

export async function getActiveKhabbashaConversation(uid: string): Promise<string | null> {
  const snapshot = await get(ref(rtdb, activePath(uid)));
  const value = snapshot.val();
  return typeof value === "string" ? value : value?.conversationId ?? null;
}

export async function setActiveKhabbashaConversation(uid: string, conversationId: string): Promise<void> {
  await set(ref(rtdb, activePath(uid)), { conversationId, updatedAt: Date.now() });
}

export async function createKhabbashaConversation(uid: string, title = "محادثة جديدة"): Promise<KhabbashaConversation> {
  const now = Date.now();
  const conversationRef = push(ref(rtdb, conversationsPath(uid)));
  if (!conversationRef.key) throw new Error("تعذّر إنشاء المحادثة.");
  const conversation: KhabbashaConversation = {
    id: conversationRef.key,
    title: cleanTitle(title),
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: "",
    messageCount: 0,
  };
  await set(conversationRef, conversation);
  await setActiveKhabbashaConversation(uid, conversation.id);
  return conversation;
}

export async function renameKhabbashaConversation(uid: string, conversationId: string, title: string): Promise<void> {
  await update(ref(rtdb, conversationPath(uid, conversationId)), {
    title: cleanTitle(title),
    updatedAt: Date.now(),
  });
}

export async function deleteKhabbashaConversation(uid: string, conversationId: string): Promise<void> {
  await Promise.all([
    remove(ref(rtdb, conversationPath(uid, conversationId))),
    remove(ref(rtdb, messagesPath(uid, conversationId))),
    remove(ref(rtdb, attachmentsPath(uid, conversationId))),
  ]);
}

export async function appendKhabbashaMessage(
  uid: string,
  conversationId: string,
  message: Omit<KhabbashaMessage, "id" | "createdAt">,
): Promise<KhabbashaMessage> {
  const messageRef = push(ref(rtdb, messagesPath(uid, conversationId)));
  if (!messageRef.key) throw new Error("تعذّر حفظ الرسالة.");
  const createdAt = Date.now();
  const saved: KhabbashaMessage = {
    ...message,
    id: messageRef.key,
    text: message.text.slice(0, MAX_MESSAGE_LENGTH),
    createdAt,
  };
  const metadata = await get(ref(rtdb, conversationPath(uid, conversationId)));
  const current = metadata.val() as Partial<KhabbashaConversation> | null;
  await update(ref(rtdb), {
    [`${messagesPath(uid, conversationId)}/${messageRef.key}`]: saved,
    [conversationPath(uid, conversationId)]: {
      id: conversationId,
      title: cleanTitle(typeof current?.title === "string" ? current.title : "محادثة جديدة"),
      createdAt: typeof current?.createdAt === "number" ? current.createdAt : createdAt,
      updatedAt: createdAt,
      lastMessagePreview: previewFor(saved),
      messageCount: (typeof current?.messageCount === "number" ? current.messageCount : 0) + 1,
    },
    [activePath(uid)]: { conversationId, updatedAt: createdAt },
  });
  return saved;
}

export async function saveKhabbashaAttachment(
  uid: string,
  conversationId: string,
  data: { dataUrl: string; previewDataUrl?: string; fileName: string; mimeType: string; size: number },
): Promise<string> {
  const attachmentRef = push(ref(rtdb, attachmentsPath(uid, conversationId)));
  if (!attachmentRef.key) throw new Error("تعذّر حفظ الصورة.");
  await set(attachmentRef, { ...data, createdAt: Date.now() });
  return attachmentRef.key;
}

export async function getKhabbashaAttachment(uid: string, conversationId: string, attachmentId: string): Promise<string | null> {
  const snapshot = await get(ref(rtdb, `${attachmentsPath(uid, conversationId)}/${attachmentId}/dataUrl`));
  return typeof snapshot.val() === "string" ? snapshot.val() : null;
}

export async function getKhabbashaAttachmentPreview(uid: string, conversationId: string, attachmentId: string): Promise<string | null> {
  const snapshot = await get(ref(rtdb, `${attachmentsPath(uid, conversationId)}/${attachmentId}/previewDataUrl`));
  return typeof snapshot.val() === "string" ? snapshot.val() : null;
}

/**
 * Preserve the legacy one-chat record. The old source is never deleted.
 * The fixed `legacy` id makes this operation safe to repeat from multiple tabs.
 */
export async function migrateLegacyKhabbashaChat(uid: string): Promise<KhabbashaConversation | null> {
  const [legacySnapshot, targetSnapshot] = await Promise.all([
    get(ref(rtdb, `khabbashaChats/${uid}`)),
    get(ref(rtdb, conversationPath(uid, LEGACY_ID))),
  ]);
  const legacy = legacySnapshot.val() as { messages?: unknown; updatedAt?: unknown } | null;
  const legacyMessages = normalizeLegacyMessages(legacy?.messages);
  if (legacyMessages.length <= 1 && !legacyMessages.some((m) => m.role === "user")) {
    return targetSnapshot.exists() ? mapConversations({ [LEGACY_ID]: targetSnapshot.val() })[0] ?? null : null;
  }

  const updatedAt = typeof legacy?.updatedAt === "number" ? legacy.updatedAt : Date.now();
  if (!targetSnapshot.exists()) {
    const conversation: KhabbashaConversation = {
      id: LEGACY_ID,
      title: "محادثة قديمة",
      createdAt: updatedAt,
      updatedAt,
      lastMessagePreview: legacyMessages.at(-1)?.text.slice(0, MAX_PREVIEW) ?? "",
      messageCount: legacyMessages.length,
    };
    const updates: Record<string, unknown> = {
      [conversationPath(uid, LEGACY_ID)]: conversation,
    };
    legacyMessages.forEach((message, index) => {
      updates[`${messagesPath(uid, LEGACY_ID)}/legacy-${index}`] = {
        id: `legacy-${index}`,
        ...message,
        createdAt: updatedAt + index,
      };
    });
    await update(ref(rtdb), updates);
    return conversation;
  }

  const existing = mapConversations({ [LEGACY_ID]: targetSnapshot.val() })[0];
  return existing ?? null;
}

export async function ensureKhabbashaConversations(uid: string): Promise<KhabbashaConversation[]> {
  await migrateLegacyKhabbashaChat(uid);
  return getKhabbashaConversations(uid);
}
