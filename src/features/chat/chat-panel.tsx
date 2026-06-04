"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faImage,
  faPaperclip,
  faDownload,
  faXmark,
  faFile,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {
  listenMessages,
  sendMessage,
  sendAttachment,
  type ChatMessage,
} from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";
import { playMessageSound } from "@/lib/sound";
import { uploadFile } from "@/lib/upload";

export function ChatPanel({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const lastCount = useRef(0);

  useEffect(
    () =>
      listenMessages(roomId, (msgs) => {
        setMessages(msgs);
        if (initialized.current && msgs.length > lastCount.current) {
          const latest = msgs[msgs.length - 1];
          if (latest && latest.userId !== user?.uid) playMessageSound();
        }
        lastCount.current = msgs.length;
        initialized.current = true;
      }),
    [roomId, user?.uid]
  );

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setText("");
    await sendMessage(roomId, {
      userId: user.uid,
      userName: user.displayName || "طالب",
      text: trimmed,
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const up = await uploadFile(file);
      await sendAttachment(roomId, {
        userId: user.uid,
        userName: user.displayName || "طالب",
        kind: up.kind,
        url: up.url,
        fileName: up.name,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الرفع.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-text-muted">لا رسائل بعد — كن أول من يكتب 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.userId === user?.uid;
          return (
            <div key={m.id} className="flex flex-col items-start">
              <span className="text-xs font-bold text-primary">{m.userName}</span>

              {m.type === "text" && (
                <div
                  className={`mt-1 max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    mine ? "bg-gradient-primary text-white" : "bg-background text-text-primary"
                  }`}
                >
                  {m.text}
                </div>
              )}

              {m.type === "image" && m.url && (
                <button
                  onClick={() => setLightbox({ url: m.url!, name: m.fileName || "image" })}
                  className="mt-1 overflow-hidden rounded-md border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.fileName || ""} className="max-h-48 max-w-[12rem] object-cover" />
                </button>
              )}

              {m.type === "file" && m.url && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={m.fileName}
                  className="mt-1 flex max-w-[85%] items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary"
                >
                  <FontAwesomeIcon icon={faFile} className="h-4 w-4 text-primary" />
                  <span className="truncate">{m.fileName || "ملف"}</span>
                  <FontAwesomeIcon icon={faDownload} className="h-3 w-3 text-text-muted" />
                </a>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* أدوات الإدخال */}
      <div className="flex items-center gap-2 border-t border-border p-3">
        <input ref={imageInput} type="file" accept="image/*" hidden onChange={handleUpload} />
        <input ref={fileInput} type="file" hidden onChange={handleUpload} />

        <button
          onClick={() => imageInput.current?.click()}
          disabled={uploading}
          aria-label="إرسال صورة"
          className="grid h-10 w-10 place-items-center rounded-md text-text-muted hover:bg-primary/10 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label="إرسال ملف"
          className="grid h-10 w-10 place-items-center rounded-md text-text-muted hover:bg-primary/10 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={uploading ? "جارٍ الرفع..." : "اكتب رسالتك..."}
          disabled={uploading}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          aria-label="إرسال"
          className="grid h-10 w-10 place-items-center rounded-md bg-gradient-primary text-white transition hover:opacity-90"
        >
          <FontAwesomeIcon
            icon={uploading ? faSpinner : faPaperPlane}
            className={`h-4 w-4 ${uploading ? "animate-spin" : "-scale-x-100"}`}
          />
        </button>
      </div>

      {/* عارض الصور (زوم + تحميل) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-end gap-2 p-3">
            <a
              href={lightbox.url}
              target="_blank"
              rel="noopener noreferrer"
              download={lightbox.name}
              onClick={(e) => e.stopPropagation()}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
              aria-label="تحميل"
            >
              <FontAwesomeIcon icon={faDownload} className="h-5 w-5" />
            </a>
            <button
              onClick={() => setLightbox(null)}
              aria-label="إغلاق"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
            >
              <FontAwesomeIcon icon={faXmark} className="pointer-events-none h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
