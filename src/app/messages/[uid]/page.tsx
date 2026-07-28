"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RichText } from "@/components/ui/linkify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight, faPaperPlane, faImage, faPaperclip, faFile, faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { LiveAvatar } from "@/components/ui/live-avatar";
import {
  listenDM, sendDM, sendDMAttachment, getDMAttachment, getUserName,
  type DMMessage, type Person,
} from "@/features/community/social";
import { playMessageSound } from "@/lib/sound";
import { prepareFile } from "@/lib/upload";
import { FileViewer } from "@/features/files/file-viewer";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { parseThreadUid, listenSupportMessages, sendSupportMessage } from "@/features/support/admin-chat";

/* مرفق محادثة — يُحمَّل عند العرض */
function DMAttachment({
  meUid, otherUid, msg, onZoom,
}: {
  meUid: string; otherUid: string; msg: DMMessage; onZoom: (url: string, name: string) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState(false);

  useEffect(() => {
    let alive = true;
    if (msg.attachmentId) getDMAttachment(meUid, otherUid, msg.attachmentId).then((d) => alive && setDataUrl(d));
    return () => { alive = false; };
  }, [meUid, otherUid, msg.attachmentId]);

  if (!dataUrl)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-muted">
        <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
        جارٍ التحميل...
      </div>
    );

  if (msg.type === "image")
    return (
      <button onClick={() => onZoom(dataUrl, msg.fileName || "image")} className="overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={msg.fileName || ""} className="max-h-56 max-w-full object-cover sm:max-w-[16rem]" />
      </button>
    );

  return (
    <>
      <button onClick={() => setViewFile(true)} className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:border-primary">
        <FontAwesomeIcon icon={faFile} className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{msg.fileName || "ملف"}</span>
      </button>
      {viewFile && <FileViewer dataUrl={dataUrl} name={msg.fileName || "ملف"} onClose={() => setViewFile(false)} />}
    </>
  );
}

export default function DMPage() {
  const { uid: rawUid } = useParams<{ uid: string }>();
  // خيط الدفع يُخزَّن بمفتاح ينتهي بـ _pay — نفكّه لنعرف الطرف الآخر والخيط معاً
  const { uid: otherUid, kind: chatKind } = parseThreadUid(rawUid);
  const isPayThread = chatKind === "payment";
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [otherName, setOtherName] = useState("طالب");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const lastCount = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    // الاسم يأتي من الرابط مباشرة (الأكثر موثوقية)، وإلا نجلبه
    const fromUrl = new URLSearchParams(window.location.search).get("name");
    if (fromUrl) setOtherName(fromUrl);
    else getUserName(otherUid).then((n) => n && setOtherName(n));
  }, [otherUid]);

  useEffect(() => {
    if (!user) return;
    if (isPayThread) {
      const unsub = listenSupportMessages(otherUid, user.uid, "payment", (msgs) =>
        setMessages(msgs.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text, createdAt: m.createdAt })))
      );
      return () => { if (typeof unsub === "function") unsub(); };
    }
    const unsub = listenDM(user.uid, otherUid, (msgs) => {
      setMessages(msgs);
    return () => { if (typeof unsub === "function") unsub(); };
      if (initialized.current && msgs.length > lastCount.current) {
        const latest = msgs[msgs.length - 1];
        if (latest && latest.senderId !== user.uid) playMessageSound();
      }
      lastCount.current = msgs.length;
      initialized.current = true;
    });
  }, [user, otherUid]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send() {
    if (!text.trim() || !user) return;
    const me: Person = { uid: user.uid, name: profile?.name || user.displayName || "طالب" };
    const other: Person = { uid: otherUid, name: otherName };
    setText("");
    if (isPayThread) {
      await sendSupportMessage(me, otherUid, otherName, "payment", text);
      return;
    }
    await sendDM(me, other, text);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const prepared = await prepareFile(file);
      const me: Person = { uid: user.uid, name: profile?.name || user.displayName || "طالب" };
      const other: Person = { uid: otherUid, name: otherName };
      await sendDMAttachment(me, other, { kind: prepared.kind, dataUrl: prepared.dataUrl, name: prepared.name });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الرفع.");
    } finally {
      setUploading(false);
    }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-2xl flex-col px-3 lg:h-[calc(100dvh-4.5rem)]">
        <div className="flex items-center gap-3 border-b border-border py-3">
          <button onClick={() => router.back()} aria-label="رجوع" className="text-text-muted hover:text-primary">
            <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
          </button>
          <LiveAvatar uid={otherUid} name={otherName} size="md" className="shrink-0" />
          <span className="truncate font-bold">{otherName}</span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto py-3">
          {messages.map((m) => {
            const mine = m.senderId === user.uid;
            const isAttachment = m.type === "image" || m.type === "file";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                {isAttachment ? (
                  <DMAttachment
                    meUid={user.uid}
                    otherUid={otherUid}
                    msg={m}
                    onZoom={(url, name) => setLightbox({ url, name })}
                  />
                ) : (
                  <div
                    className={`max-w-[85%] break-words rounded-lg px-3 py-2 text-sm sm:max-w-[75%] ${
                      mine ? "bg-gradient-primary text-white" : "border border-border bg-surface"
                    }`}
                  >
                    <RichText text={m.text ?? ""} compact />
                  </div>
                )}
              </div>
            );
          })}
          {messages.length === 0 && <p className="py-8 text-center text-sm text-text-muted">ابدأ المحادثة 👋</p>}
          <div ref={bottomRef} />
        </div>

        {/* شريط الإدخال */}
        <div className="flex items-center gap-1.5 border-t border-border py-3 sm:gap-2">
          <input ref={imageInput} type="file" accept="image/*" hidden onChange={handleUpload} />
          <input ref={fileInput} type="file" hidden onChange={handleUpload} />
          <button
            onClick={() => imageInput.current?.click()}
            disabled={uploading}
            aria-label="إرسال صورة"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <FontAwesomeIcon icon={uploading ? faSpinner : faImage} className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label="إرسال ملف"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="اكتب رسالتك..."
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button onClick={send} disabled={!text.trim()} aria-label="إرسال" className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-gradient-primary text-white disabled:opacity-50">
            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>

      {/* عارض الصور المكبّر */}
      {lightbox && (
        <FileViewer dataUrl={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </AppShell>
  );
}
