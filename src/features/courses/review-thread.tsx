"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { listenReviewThread, postReviewMessage, type ReviewMessage } from "@/features/courses/courses";
import type { Course } from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   محادثة المراجعة

   «طلب تعديلات» ليس رفضاً: الإدارة تكتب ما تريد بالضبط، والأستاذ
   يردّ في المكان نفسه، ويبقى التاريخ كاملاً. رسالة عامّة مثل
   «مرفوضة» تُنتج دورة أخرى بالمشكلة نفسها.

   المحادثة ملحقة بالدورة، وقواعد القراءة تقصرها على صاحبها والإدارة.
   والطرفان يستعملان المكوّن نفسه — فلا تختلف الرسالة بين لوحتين.
════════════════════════════════════════════════════════════ */

export function CourseReviewThread({
  course, me, compact,
}: {
  course: Course;
  me: { uid: string; name: string; role: "admin" | "teacher" };
  compact?: boolean;
}) {
  const [list, setList] = useState<ReviewMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = listenReviewThread(course.id, setList);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [course.id]);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await postReviewMessage(course, me, text);
      setText("");
    } finally { setBusy(false); }
  }

  return (
    <div className={compact ? "" : "border-t border-border bg-background p-3"}>
      {list.length === 0 ? (
        <p className="text-[11.5px] text-text-muted">لا ملاحظات بعد.</p>
      ) : (
        <ul className="mb-2.5 max-h-64 space-y-2 overflow-y-auto">
          {list.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border p-2.5 ${
                m.byRole === "admin" ? "border-primary/30 bg-primary/5" : "border-border bg-surface"
              }`}
            >
              <p className="text-[10.5px] font-extrabold text-text-muted">
                {m.byRole === "admin" ? "الإدارة" : m.byName} ·{" "}
                {new Date(m.at).toLocaleDateString("ar-DZ")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-text-primary">{m.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
          placeholder={me.role === "admin" ? "اكتب ملاحظتك للأستاذ…" : "ردّك على الإدارة…"}
          aria-label="رسالة المراجعة"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-[12.5px] outline-none focus:border-primary"
        />
        <button
          onClick={send}
          disabled={!text.trim() || busy}
          aria-label="إرسال"
          className="grid h-10 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
