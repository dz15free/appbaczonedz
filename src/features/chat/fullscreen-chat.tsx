"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faPaperPlane, faXmark, faFile, faSpinner, faImage, faPaperclip, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { listenMessages, sendMessage, sendAttachment, getAttachment, deleteRoomMessage, type ChatMessage } from "@/features/rooms/rooms";
import { prepareFile } from "@/lib/upload";
import { ImageZoom } from "@/components/ui/image-zoom";
import { Linkify } from "@/components/ui/linkify";

/* ─── مرفق داخل الدردشة (صورة/ملف) ─── */
function FsAttachment({ roomId, msg }: { roomId: string; msg: ChatMessage }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let alive = true;
    if (msg.attachmentId) getAttachment(roomId, msg.attachmentId).then((d) => alive && setDataUrl(d));
    return () => { alive = false; };
  }, [roomId, msg.attachmentId]);

  if (!dataUrl) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/60">
        <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" /> تحميل...
      </span>
    );
  }

  if (msg.type === "image") {
    return (
      <>
        <button onClick={() => setZoom(true)} className="overflow-hidden rounded-lg border border-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="" className="max-h-40 max-w-[200px] object-cover" />
        </button>
        {zoom && <ImageZoom src={dataUrl} onClose={() => setZoom(false)} />}
      </>
    );
  }

  return (
    <a href={dataUrl} download={msg.fileName || "ملف"}
      className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20">
      <FontAwesomeIcon icon={faFile} className="h-4 w-4 text-indigo-300" />
      <span className="truncate max-w-[140px]">{msg.fileName || "ملف"}</span>
      <span className="text-xs text-white/50">تنزيل</span>
    </a>
  );
}

/* ─── لوحة ألوان دراسية لكل مرسل ─── */
const CHIPS = [
  "bg-indigo-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500",  "bg-sky-500",    "bg-rose-500",
  "bg-purple-500", "bg-cyan-500",
];
function chipColor(uid: string) {
  const h = uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHIPS[h % CHIPS.length];
}

interface Props { roomId: string; isOwner: boolean; canModerate?: boolean; }

export function FullscreenChatOverlay({ roomId, isOwner, canModerate = false }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop sidebar toggle
  const bottomRef = useRef<HTMLDivElement>(null);
  const mobileBottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const initRef   = useRef(false);
  const lastRef   = useRef(0);

  useEffect(() => listenMessages(roomId, (msgs) => {
    setMessages(msgs);
    initRef.current = true;
    lastRef.current = msgs.length;
  }), [roomId]);

  // تمرير للأسفل عند رسائل جديدة (desktop فقط)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    mobileBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || !user) return;
    const t = text; setText("");
    inputRef.current?.blur(); // إخفاء لوحة المفاتيح بعد الإرسال
    await sendMessage(roomId, {
      userId: user.uid,
      userName: user.displayName || "طالب",
      text: t,
    });
  }

  function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
    // امنع إلغاء وضع الشاشة الكاملة أثناء فتح المنتقي
    (window as any).__bzIgnoreFSExit = true;
    ref.current?.click();
    // أزل العلامة بعد فترة كافية لاختيار الملف
    setTimeout(() => { (window as any).__bzIgnoreFSExit = false; }, 1500);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    (window as any).__bzIgnoreFSExit = false;
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
    } catch {
      alert("تعذّر رفع الملف.");
    } finally {
      setUploading(false);
    }
  }

  const textMsgs = messages.filter((m) => m.type === "text" || m.type === "image" || m.type === "file");

  return (
    <>
      {/* ══════════════════════════════════════
          الحاسوب — شريط جانبي شفاف
      ══════════════════════════════════════ */}
      <div
        className={`pointer-events-auto absolute inset-y-0 right-0 z-[100] hidden flex-col transition-all duration-300 lg:flex ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
        style={{ background: "rgba(10,10,20,0.72)", backdropFilter: "blur(12px)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* رأس الشريط */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-bold text-white">الدردشة</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-md text-white/50 hover:text-white hover:bg-white/10">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        {/* الرسائل */}
        <div className="flex-1 overflow-y-auto space-y-2 px-3 py-3
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
          {textMsgs.length === 0 && (
            <p className="py-8 text-center text-xs text-white/30">لا رسائل بعد</p>
          )}
          {textMsgs.map((m) => {
            const isMe = m.userId === user?.uid;
            const canDelete = canModerate || isOwner || isMe;
            return (
              <div key={m.id} className="group flex flex-col gap-0.5 animate-msg-in">
                <span className="flex items-center gap-1.5">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${chipColor(m.userId)}`}>
                    {m.userName}
                  </span>
                  {canDelete && (
                    <button onClick={() => deleteRoomMessage(roomId, m.id)} aria-label="حذف"
                      className="hidden h-5 w-5 place-items-center rounded text-white/40 hover:text-red-400 group-hover:grid">
                      <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
                {m.text && (
                  <p className={`rounded-xl px-3 py-1.5 text-sm leading-snug text-white ${
                    isMe ? "bg-indigo-600/70" : "bg-white/10"
                  }`}>
                    <Linkify text={m.text ?? ""} />
                  </p>
                )}
                {(m.type === "image" || m.type === "file") && (
                  <div className="mt-0.5"><FsAttachment roomId={roomId} msg={m} /></div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* حقل الإدخال */}
        <div className="flex shrink-0 items-center gap-1.5 border-t px-3 py-3"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <input ref={imageInput} type="file" accept="image/*" hidden onChange={handleUpload} />
          <input ref={fileInput} type="file" hidden onChange={handleUpload} />
          <button onClick={() => openPicker(imageInput)} disabled={uploading} aria-label="صورة"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30">
            <FontAwesomeIcon icon={uploading ? faSpinner : faImage} className={`h-3.5 w-3.5 ${uploading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => openPicker(fileInput)} disabled={uploading} aria-label="ملف"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30">
            <FontAwesomeIcon icon={faPaperclip} className="h-3.5 w-3.5" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="اكتب رسالة..."
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-white/40"
            style={{ background: "rgba(255,255,255,0.08)", color: "white", WebkitTextFillColor: "white" }}
          />
          <button onClick={send} disabled={!text.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500 text-white disabled:opacity-30 hover:bg-indigo-400 transition">
            <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5 -scale-x-100" />
          </button>
        </div>
      </div>

      {/* زر إعادة فتح الشريط — حاسوب */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          className="pointer-events-auto absolute bottom-20 right-3 z-[100] hidden lg:flex items-center gap-2 rounded-full bg-indigo-500/80 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm hover:bg-indigo-500">
          <FontAwesomeIcon icon={faComments} className="h-4 w-4" />
          الدردشة
        </button>
      )}

      {/* ══════════════════════════════════════
          الجوال — دردشة سفلية قابلة للتمرير
      ══════════════════════════════════════ */}

      {/* لوحة الدردشة السفلية (الجزء السفلي من الشاشة) */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[90] flex flex-col lg:hidden"
        style={{
          height: "42%",
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 80%, rgba(0,0,0,0.7) 100%)",
        }}>
        {/* الرسائل — قابلة للتمرير بالإصبع دون بانر */}
        <div className="bz-hide-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 pt-4 pb-2"
          style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          {textMsgs.map((m) => {
            const isMe = m.userId === user?.uid;
            const hasAttachment = m.type === "image" || m.type === "file";
            const canDelete = canModerate || isOwner || isMe;
            return (
              <div key={m.id} className={`flex w-fit max-w-[85%] items-end gap-1.5 ${isMe ? "ms-auto flex-row-reverse" : ""}`}>
                <span className={`shrink-0 self-end rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${chipColor(m.userId)}`}>
                  {m.userName.split(" ")[0]}
                </span>
                {hasAttachment ? (
                  <FsAttachment roomId={roomId} msg={m} />
                ) : (
                  <span
                    className="rounded-2xl px-3 py-1.5 text-sm font-medium leading-snug text-white"
                    style={{
                      background: isMe ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.14)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Linkify text={m.text ?? ""} />
                  </span>
                )}
                {canDelete && (
                  <button onClick={() => deleteRoomMessage(roomId, m.id)} aria-label="حذف"
                    className="grid h-6 w-6 shrink-0 self-end place-items-center rounded-full text-white/40 active:text-red-400">
                    <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          <div ref={mobileBottomRef} />
        </div>

        {/* شريط الإدخال — ضمن نفس العمود فلا يغطّي الرسائل */}
        <div className="flex shrink-0 items-center gap-1.5 px-3 pt-2"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
          <button onClick={() => openPicker(imageInput)} disabled={uploading} aria-label="صورة"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <FontAwesomeIcon icon={uploading ? faSpinner : faImage} className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => openPicker(fileInput)} disabled={uploading} aria-label="ملف"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="💬 شارك برأيك..."
            enterKeyHint="send"
            className="flex-1 rounded-full py-2.5 px-4 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.15)", color: "white", WebkitTextFillColor: "white" }}
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40"
            style={{ background: "rgba(99,102,241,0.95)" }}
          >
            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>
    </>
  );
}
