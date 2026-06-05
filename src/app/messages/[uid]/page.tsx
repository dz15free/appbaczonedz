"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { listenDM, sendDM, getUserName, type DMMessage, type Person } from "@/features/community/social";

export default function DMPage() {
  const { uid: otherUid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [otherName, setOtherName] = useState("طالب");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    // الاسم يأتي من الرابط مباشرة (الأكثر موثوقية)، وإلا نجلبه
    const fromUrl = new URLSearchParams(window.location.search).get("name");
    if (fromUrl) setOtherName(fromUrl);
    else getUserName(otherUid).then((n) => n && setOtherName(n));
  }, [otherUid]);

  useEffect(() => {
    if (!user) return;
    return listenDM(user.uid, otherUid, setMessages);
  }, [user, otherUid]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send() {
    if (!text.trim() || !user) return;
    const me: Person = { uid: user.uid, name: profile?.name || user.displayName || "طالب" };
    const other: Person = { uid: otherUid, name: otherName };
    setText("");
    await sendDM(me, other, text);
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-2xl flex-col px-3 lg:h-[calc(100dvh-4rem)]">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => router.push("/community")} aria-label="رجوع" className="text-text-muted">
            <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
          </button>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary font-bold text-white">
            {otherName.charAt(0)}
          </span>
          <span className="font-bold">{otherName}</span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto py-2">
          {messages.map((m) => {
            const mine = m.senderId === user.uid;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-gradient-primary text-white" : "border border-border bg-surface"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          {messages.length === 0 && <p className="py-8 text-center text-sm text-text-muted">ابدأ المحادثة 👋</p>}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="اكتب رسالتك..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button onClick={send} disabled={!text.trim()} aria-label="إرسال" className="grid h-11 w-11 place-items-center rounded-md bg-gradient-primary text-white disabled:opacity-50">
            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
