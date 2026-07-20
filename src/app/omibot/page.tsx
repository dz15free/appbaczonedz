"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faSpinner, faRobot, faGraduationCap, faListCheck, faBookOpen, faClock, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { TRACKS } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { MarwaMessage } from "@/components/ui/marwa-message";
import { extractTasksFromPlan, addStudyTasksBatch } from "@/features/study/study-tasks";
import Link from "next/link";
import { ref, query, orderByChild, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { loginHrefFor } from "@/features/auth/use-require-auth";

interface Msg { role: "user" | "assistant"; text: string }

const GREETING =
  "أهلاً! أنا **الخباشة** 🌟 مساعدتك الآلية، وهنا لأساعدك في دراستك.\n\nاسألني عن أي درس، أو اطلب خطة مراجعة، أو دعني أختبرك! يمكنني أيضاً شرح المعادلات الرياضية خطوة بخطوة.";

const SUGGESTIONS = [
  { icon: faBookOpen, text: "أعطني أفضل ملخّص في المكتبة" },
  { icon: faListCheck, text: "ضع لي خطة مراجعة لأسبوع" },
  { icon: faGraduationCap, text: "اختبرني في مادة من اختياري" },
  { icon: faClock, text: "كيف أنظّم وقتي قبل الباك؟" },
];

/* زر حفظ خطة الخباشة كمهام قابلة للتتبّع */
function SavePlanButton({ text }: { text: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const count = extractTasksFromPlan(text).length;

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await addStudyTasksBatch(user.uid, extractTasksFromPlan(text));
      setSaved(true);
    } finally { setSaving(false); }
  }

  if (saved) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-secondary">
          <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> أُضيفت {count} مهمة لقائمتك
        </span>
        <Link href="/tools/tasks" className="text-xs font-bold text-primary hover:underline">عرض مهامي ←</Link>
      </div>
    );
  }

  return (
    <button
      onClick={save}
      disabled={saving}
      className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
    >
      <FontAwesomeIcon icon={saving ? faSpinner : faListCheck} className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
      احفظ كمهام ({count})
    </button>
  );
}

export default function OmibotPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const trackName = TRACKS.find((t) => t.id === profile?.track)?.name ?? "";
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  // سؤال قادم من السبورة عبر ?q= — نملأ الحقل ولا نرسله تلقائياً
  // ليبقى للطالب فرصة تعديله قبل الإرسال
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setInput(q.slice(0, 500));
  }, []);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const libRef = useRef<{ title: string; subject: string; chapter?: string; uploaderName?: string }[]>([]);

  // تحميل فهرس المكتبة مرّة واحدة لتزويد البوت بأفضل الملخّصات
  useEffect(() => {
    get(query(ref(rtdb, "library"), orderByChild("createdAt"), limitToLast(80)))
      .then((snap) => {
        const val = (snap.val() as Record<string, any>) ?? {};
        libRef.current = Object.values(val).map((e: any) => ({
          title: e.title, subject: e.subject, chapter: e.chapter, uploaderName: e.uploaderName,
        }));
      })
      .catch(() => { libRef.current = []; });
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, thinking]);

  // ضبط ارتفاع حقل الإدخال تلقائياً
  function autoGrow() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const next = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(next);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setThinking(true);
    try {
      const res = await fetch("/api/omibot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12), track: trackName, library: libRef.current }),
      });
      const data = await res.json();
      const replyText = res.ok
        ? (data.text && String(data.text).trim() ? data.text : "عذراً، لم أتمكّن من الإجابة. أعد المحاولة 🙏")
        : `⚠️ ${data.error || "تعذّر الرد."}`;
      setMessages((m) => [...m, { role: "assistant", text: replyText }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "⚠️ تعذّر الاتصال. تحقّق من الإنترنت." }]);
    } finally {
      setThinking(false);
    }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-2xl flex-col px-3 lg:h-[calc(100dvh-4.5rem)]">
        {/* الرأس */}
        <div className="flex items-center gap-3 border-b border-border py-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
            <FontAwesomeIcon icon={faRobot} className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-secondary" />
          </span>
          <div className="flex-1">
            <h1 className="font-display text-lg font-extrabold leading-tight">الخباشة</h1>
            <span className="flex items-center gap-1 text-xs text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> متّصلة الآن · مساعدتك الآلية
            </span>
          </div>
        </div>

        {/* الرسائل */}
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* أفاتار الخباشة */}
              {m.role === "assistant" && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-white">
                  <FontAwesomeIcon icon={faRobot} className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.role === "user"
                    ? "rounded-br-sm bg-gradient-primary text-white"
                    : "rounded-bl-sm border border-border bg-surface text-text-primary shadow-sm"
                }`}
              >
                {m.role === "assistant"
                  ? <MarwaMessage text={m.text} />
                  : <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>}
                {m.role === "assistant" && extractTasksFromPlan(m.text).length >= 3 && (
                  <SavePlanButton text={m.text} />
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-end gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-white">
                <FontAwesomeIcon icon={faRobot} className="h-3.5 w-3.5" />
              </span>
              <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* اقتراحات */}
        {messages.length <= 1 && (
          <div className="grid grid-cols-2 gap-2 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => send(s.text)}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-right text-xs font-medium transition hover:border-primary hover:bg-primary/5"
              >
                <FontAwesomeIcon icon={s.icon} className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="line-clamp-1">{s.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* الإدخال */}
        <div className="flex items-end gap-2 border-t border-border py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoGrow(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="اسأل الخباشة... (Shift+Enter لسطر جديد)"
            disabled={thinking}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={thinking || !input.trim()}
            aria-label="إرسال"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={thinking ? faSpinner : faPaperPlane} className={`h-4 w-4 ${thinking ? "animate-spin" : "-scale-x-100"}`} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
