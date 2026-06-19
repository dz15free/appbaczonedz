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
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
  listenMessages,
  sendMessage,
  sendAttachment,
  getAttachment,
  deleteRoomMessage,
  type ChatMessage,
} from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";
import { playMessageSound } from "@/lib/sound";
import { prepareFile } from "@/lib/upload";
import { FileViewer } from "@/features/files/file-viewer";

// مرفق يُحمَّل عند العرض فقط (يبقي الدردشة خفيفة)
function Attachment({
  roomId,
  msg,
  onZoom,
}: {
  roomId: string;
  msg: ChatMessage;
  onZoom: (url: string, name: string) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState(false);

  useEffect(() => {
    let alive = true;
    if (msg.attachmentId) getAttachment(roomId, msg.attachmentId).then((d) => alive && setDataUrl(d));
    return () => {
      alive = false;
    };
  }, [roomId, msg.attachmentId]);

  if (!dataUrl)
    return (
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
        <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
        جارٍ التحميل...
      </div>
    );

  if (msg.type === "image")
    return (
      <button
        onClick={() => onZoom(dataUrl, msg.fileName || "image")}
        className="mt-1 overflow-hidden rounded-md border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={msg.fileName || ""} className="max-h-48 max-w-[12rem] object-cover" />
      </button>
    );

  return (
    <>
      <button
        onClick={() => setViewFile(true)}
        className="mt-1 flex max-w-[85%] items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary"
      >
        <FontAwesomeIcon icon={faFile} className="h-4 w-4 text-primary" />
        <span className="truncate">{msg.fileName || "ملف"}</span>
        <span className="text-xs text-text-muted">عرض</span>
      </button>
      {viewFile && <FileViewer dataUrl={dataUrl} name={msg.fileName || "ملف"} onClose={() => setViewFile(false)} />}
    </>
  );
}

export function ChatPanel({ roomId, isOwner = false }: { roomId: string; isOwner?: boolean }) {
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
    await sendMessage(roomId, { userId: user.uid, userName: user.displayName || "طالب", text: trimmed });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const prepared = await prepareFile(file);
      await sendAttachment(roomId, {
        userId: user.uid,
        userName: user.displayName || "طالب",
        kind: prepared.kind,
        dataUrl: prepared.dataUrl,
        fileName: prepared.name,
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
            <div key={m.id} className="group flex flex-col items-start">
              <div className="flex w-full items-center justify-between gap-1">
                <span className="text-xs font-bold text-primary">{m.userName}</span>
                {isOwner && (
                  <button
                    onClick={() => deleteRoomMessage(roomId, m.id)}
                    aria-label="حذف الرسالة"
                    className="hidden h-6 w-6 place-items-center rounded text-text-muted hover:bg-danger/10 hover:text-danger group-hover:grid"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </button>
                )}
              </div>
              {m.type === "text" && (
                <div
                  className={`mt-1 max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    mine ? "bg-gradient-primary text-white" : "bg-background text-text-primary"
                  }`}
                >
                  {m.text}
                </div>
              )}
              {(m.type === "image" || m.type === "file") && (
                <Attachment roomId={roomId} msg={m} onZoom={(url, name) => setLightbox({ url, name })} />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

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
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary disabled:opacity-50"
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

      {lightbox && (
        <ImageZoom src={lightbox.url} alt={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
