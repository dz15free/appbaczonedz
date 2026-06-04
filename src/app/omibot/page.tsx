"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faPaperPlane, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { AppShell } from "@/components/app-shell";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const GREETING =
  "أهلاً! أنا Omibot 🌟 طالبة تحصّلت على 18+ في الباك، وهنا لأساعدك. اسألني عن أي درس، أو اطلب خطة مراجعة، أو دعني أختبرك!";

const SUGGESTIONS = [
  "اشرح لي مبرهنة فيثاغورس",
  "ضع لي خطة مراجعة لأسبوع",
  "اختبرني في الرياضيات",
  "كيف أنظّم وقتي قبل الباك؟",
];

export default function OmibotPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, thinking]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const next = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/omibot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // نرسل آخر 12 رسالة فقط لتوفير الحصة
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.ok ? data.text : `⚠️ ${data.error || "تعذّر الرد."}` },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "⚠️ تعذّر الاتصال. تحقّق من الإنترنت." }]);
    } finally {
      setThinking(false);
    }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-2xl flex-col px-3 lg:h-[calc(100dvh-4rem)]">
        {/* الرأس */}
        <div className="flex items-center gap-3 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-white">
            <FontAwesomeIcon icon={faRobot} className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display font-extrabold leading-tight">Omibot</h1>
            <span className="text-xs text-text-muted">مساعدتك الدراسية الذكية</span>
          </div>
        </div>

        {/* الرسائل */}
        <div className="flex-1 space-y-3 overflow-y-auto py-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-start"}`}>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-primary text-white"
                    : "border border-border bg-surface text-text-primary"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
              Omibot تكتب...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* اقتراحات */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:border-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* الإدخال */}
        <div className="flex items-center gap-2 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="اسأل Omibot..."
            disabled={thinking}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={thinking || !input.trim()}
            aria-label="إرسال"
            className="grid h-11 w-11 place-items-center rounded-md bg-gradient-primary text-white disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
