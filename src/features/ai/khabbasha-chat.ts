"use client";

import { get, ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export interface KhabbashaMessage {
  role: "user" | "assistant";
  text: string;
}

export interface KhabbashaChatRecord {
  messages: KhabbashaMessage[];
  updatedAt: number;
}

const chatPath = (uid: string) => `khabbashaChats/${uid}`;
const MAX_MESSAGE_LENGTH = 20_000;

function normalizeMessages(value: unknown): KhabbashaMessage[] {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
      : [];

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Record<string, unknown>;
    const role = candidate.role === "assistant" ? "assistant" : candidate.role === "user" ? "user" : null;
    const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
    return role && text ? [{ role, text: text.slice(0, MAX_MESSAGE_LENGTH) }] : [];
  });
}

export async function getKhabbashaChat(uid: string): Promise<KhabbashaChatRecord | null> {
  const snapshot = await get(ref(rtdb, chatPath(uid)));
  if (!snapshot.exists()) return null;

  const value = snapshot.val() as { messages?: unknown; updatedAt?: unknown } | null;
  const messages = normalizeMessages(value?.messages);
  return messages.length > 0
    ? { messages, updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : 0 }
    : null;
}

export async function saveKhabbashaChat(uid: string, messages: KhabbashaMessage[]): Promise<void> {
  const normalized = normalizeMessages(messages);
  if (normalized.length === 0) return;

  await set(ref(rtdb, chatPath(uid)), {
    messages: normalized,
    updatedAt: Date.now(),
  });
}
