"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LiveAvatar } from "@/components/ui/live-avatar";
import {
  activeMentionQuery, applyMention, pruneMentions,
  type MentionMap,
} from "@/features/community/mentions";
import type { Person } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   حقل كتابة يدعم الإشارة (@)

   منتقٍ يظهر فور كتابة `@` ويُصفّى بما بعده. والمعرّف يُسجَّل **لحظة
   الاختيار** لا بتحليل النصّ بعده — فلا يُخطئ حين يتشابه اسمان.

   ── تفاصيل صغيرة تفرّق بين منتقٍ يُستعمل وآخر يُتحمَّل ──

   • **لا يُفتح داخل بريد إلكتروني.** `@` بعد حرف (كما في
     `ahmed@site.com`) ليست إشارة، والمنتقي لا يظهر لها.
   • **لوحة المفاتيح تكفي:** الأسهم للتنقّل، Enter أو Tab للاختيار،
     Escape للإغلاق. من يكتب بسرعة لا يرفع يده إلى الشاشة.
   • **Enter لا يُرسل ما دام المنتقي مفتوحاً** — وإلّا أُرسل التعليق
     ناقصاً في اللحظة التي أراد فيها اختيار الاسم.
   • **يُقلب أعلى الحقل إن ضاق ما تحته** — على الهاتف تفتح لوحة المفاتيح
     فلا يبقى تحت الحقل مكان، فتُغطّي القائمةَ لوحةُ المفاتيح.
   • القائمة محدودة بستّة أسماء: قائمة أطول تُغطّي ما يكتبه المستخدم.
   ════════════════════════════════════════════════════════════ */

const MAX_SHOWN = 6;

export function MentionInput({
  value,
  onChange,
  candidates,
  onMentionsChange,
  onSubmit,
  placeholder,
  rows = 3,
  className = "",
  disabled,
  ariaLabel,
  textareaRef,
}: {
  value: string;
  onChange: (next: string) => void;
  /** من يمكن الإشارة إليهم: أصدقاء، أو أعضاء المجموعة */
  candidates: Person[];
  /** يُنادى بالخريطة المنقّاة عند كل تغيير — يحفظها الأب مع النصّ */
  onMentionsChange?: (m: MentionMap) => void;
  /** Enter بلا Shift يُرسل — ولا يُرسل ما دام المنتقي مفتوحاً */
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** مرجع خارجي — بعض المواضع تُركّز الحقل من زرّ بعيد عنه */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? own;
  const [caret, setCaret] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [flip, setFlip] = useState(false);
  /* كل من اختاره المستخدم في هذه الجلسة — يُنقّى عند الإرسال */
  const picked = useRef<MentionMap>({});

  const probe = useMemo(() => activeMentionQuery(value, caret), [value, caret]);

  const matches = useMemo(() => {
    if (!probe) return [];
    const q = probe.query.trim().toLowerCase();
    const list = q
      ? candidates.filter((c) => c.name.toLowerCase().includes(q))
      : candidates;
    return list.slice(0, MAX_SHOWN);
  }, [probe, candidates]);

  useEffect(() => {
    const should = Boolean(probe) && matches.length > 0;
    setOpen(should);
    setActive(0);
    if (should && ref.current) {
      /* قياس لا تخمين: إن كان ما تحت الحقل أقلّ من ٢٢٠px نقلب القائمة */
      const box = ref.current.getBoundingClientRect();
      setFlip(window.innerHeight - box.bottom < 220);
    }
  }, [probe, matches.length]);

  function emit(next: string) {
    onChange(next);
    onMentionsChange?.(pruneMentions(next, picked.current));
  }

  function choose(p: Person) {
    if (!probe) return;
    const res = applyMention(value, probe.at, caret, p.name);
    picked.current = { ...picked.current, [p.uid]: p.name };
    emit(res.text);
    setOpen(false);
    /* إعادة المؤشّر بعد الاسم — بلاها يعود إلى آخر النصّ فيفقد المستخدم
       موضعه في منتصف جملة. */
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(res.caret, res.caret);
      setCaret(res.caret);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (open && matches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); choose(matches[active]); return; }
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && onSubmit && !open) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => { setCaret(e.target.selectionStart ?? 0); emit(e.target.value); }}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={className}
      />

      {open && (
        <ul
          role="listbox"
          aria-label="أشِر إلى شخص"
          className={`absolute z-40 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-surface shadow-lg ${
            flip ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {matches.map((m, i) => (
            <li key={m.uid} role="option" aria-selected={i === active}>
              <button
                type="button"
                /* `onMouseDown` لا `onClick`: النقر يُفقد التركيز أوّلاً
                   فيُغلق `onBlur` القائمة قبل أن تصل النقرة. */
                onMouseDown={(e) => { e.preventDefault(); choose(m); }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-start transition ${
                  i === active ? "bg-primary/10" : "hover:bg-primary/5"
                }`}
              >
                <LiveAvatar uid={m.uid} name={m.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
