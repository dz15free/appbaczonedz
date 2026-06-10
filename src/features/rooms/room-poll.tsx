"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChartBar, faCheck } from "@fortawesome/free-solid-svg-icons";
import { closePoll, castVote, type RoomPoll } from "@/features/rooms/rooms";

interface Props {
  roomId: string;
  poll: RoomPoll;
  isOwner: boolean;
  myUid: string;
}

export function RoomPollPanel({ roomId, poll, isOwner, myUid }: Props) {
  const myVote = poll.votes?.[myUid] ?? -1;
  const hasVoted = myVote >= 0;

  // حساب الأصوات لكل خيار
  const voteCounts = poll.options.map((_, i) =>
    Object.values(poll.votes ?? {}).filter((v) => v === i).length
  );
  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

  async function vote(idx: number) {
    if (hasVoted || !poll.open) return;
    await castVote(roomId, myUid, idx);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-surface p-5 shadow-glass">
        {/* رأس الاستفتاء */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChartBar} className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase">استفتاء مباشر</span>
          </div>
          {isOwner && (
            <button
              onClick={() => closePoll(roomId)}
              className="grid h-7 w-7 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger"
              aria-label="إغلاق الاستفتاء"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          )}
        </div>

        <h2 className="mb-4 text-lg font-bold">{poll.question}</h2>

        {/* الخيارات */}
        <div className="space-y-2.5">
          {poll.options.map((option, i) => {
            const count = voteCounts[i];
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMyChoice = myVote === i;

            return (
              <button
                key={i}
                onClick={() => vote(i)}
                disabled={hasVoted || !poll.open}
                className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-right transition-all ${
                  isMyChoice
                    ? "border-primary bg-primary/10"
                    : hasVoted
                    ? "border-border bg-background opacity-80"
                    : "border-border bg-background hover:border-primary hover:bg-primary/5"
                }`}
              >
                {/* شريط النتيجة في الخلفية */}
                {(hasVoted || isOwner) && (
                  <div
                    className="absolute inset-y-0 right-0 bg-primary/10 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isMyChoice && <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-primary" />}
                    <span className={`text-sm font-semibold ${isMyChoice ? "text-primary" : ""}`}>{option}</span>
                  </div>
                  {(hasVoted || isOwner) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-text-muted">{count} صوت</span>
                      <span className="text-xs font-bold text-primary">{pct}%</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ملاحظة أسفل */}
        <p className="mt-3 text-center text-xs text-text-muted">
          {poll.open
            ? hasVoted
              ? `صوّتَ ${totalVotes} شخص — في انتظار المزيد`
              : "اضغط على خيارك للتصويت"
            : `انتهى الاستفتاء — ${totalVotes} تصويت`}
        </p>
      </div>
    </div>
  );
}

/* ─── نموذج إنشاء استفتاء (للمالك فقط) ─── */
export function CreatePollModal({
  roomId,
  onClose,
}: {
  roomId: string;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!question.trim() || options.filter((o) => o.trim()).length < 2) return;
    setLoading(true);
    try {
      const { createPoll } = await import("@/features/rooms/rooms");
      await createPoll(roomId, question, options);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">إنشاء استفتاء سريع</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-sm font-semibold">السؤال *</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="مثال: هل فهمتم الدرس؟"
          className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <label className="mb-1 block text-sm font-semibold">الخيارات (2-4)</label>
        <div className="space-y-2 mb-3">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => {
                  const copy = [...options];
                  copy[i] = e.target.value;
                  setOptions(copy);
                }}
                placeholder={`الخيار ${i + 1}`}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {options.length > 2 && (
                <button
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button
              onClick={() => setOptions([...options, ""])}
              className="w-full rounded-md border border-dashed border-border py-2 text-sm text-text-muted hover:border-primary hover:text-primary"
            >
              + إضافة خيار
            </button>
          )}
        </div>

        <button
          onClick={submit}
          disabled={loading || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "جارٍ الإنشاء..." : "🚀 إطلاق الاستفتاء"}
        </button>
      </div>
    </div>
  );
}
