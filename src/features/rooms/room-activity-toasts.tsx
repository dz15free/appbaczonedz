"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHand, faUserPlus, faChartBar, faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import type { PresenceMember } from "@/features/rooms/use-presence";
import type { RoomPoll } from "@/features/rooms/rooms";

interface Hand { uid: string; name: string }

interface Props {
  members: PresenceMember[];
  hands: Hand[];
  mods: Set<string>;
  activePoll: RoomPoll | null;
  isOwner: boolean;
  isMod: boolean;
  myUid?: string;
}

interface Toast {
  id: string;
  icon: typeof faHand;
  text: string;
  accent: "primary" | "amber" | "emerald";
}

let toastSeq = 0;

export function RoomActivityToasts({ members, hands, mods, activePoll, isOwner, isMod, myUid }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevMembers = useRef<Set<string> | null>(null);
  const prevHands = useRef<Set<string>>(new Set());
  const prevMods = useRef<Set<string>>(new Set());
  const prevPollId = useRef<number | null>(null);
  const initialized = useRef(false);

  function push(t: Omit<Toast, "id">) {
    const id = `t${++toastSeq}`;
    setToasts((list) => [...list.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4500);
  }

  // الانضمام للغرفة
  useEffect(() => {
    const ids = new Set(members.map((m) => m.uid));
    if (!initialized.current) {
      prevMembers.current = ids;
      initialized.current = true;
      return;
    }
    const prev = prevMembers.current!;
    for (const m of members) {
      if (!prev.has(m.uid) && m.uid !== myUid) {
        push({ icon: faUserPlus, text: `${m.name || "طالب"} انضمّ إلى الغرفة`, accent: "emerald" });
      }
    }
    prevMembers.current = ids;
  }, [members, myUid]);

  // رفع الأيدي — تظهر فقط للمالك/المشرف
  useEffect(() => {
    if (!isOwner && !isMod) return;
    const ids = new Set(hands.map((h) => h.uid));
    for (const h of hands) {
      if (!prevHands.current.has(h.uid)) {
        push({ icon: faHand, text: `${h.name} رفع يده`, accent: "amber" });
      }
    }
    prevHands.current = ids;
  }, [hands, isOwner, isMod]);

  // ترقية/إلغاء مشرف
  useEffect(() => {
    if (prevMods.current.size === 0 && mods.size === 0) { prevMods.current = mods; return; }
    for (const uid of mods) {
      if (!prevMods.current.has(uid)) {
        const name = members.find((m) => m.uid === uid)?.name ?? "عضو";
        push({ icon: faUserShield, text: `${name} أصبح مشرفاً`, accent: "primary" });
      }
    }
    prevMods.current = new Set(mods);
  }, [mods, members]);

  // بدء استفتاء
  useEffect(() => {
    if (activePoll?.open && activePoll.createdAt !== prevPollId.current) {
      if (prevPollId.current !== null) {
        push({ icon: faChartBar, text: `استفتاء جديد: ${activePoll.question}`, accent: "primary" });
      }
      prevPollId.current = activePoll.createdAt;
    }
    if (!activePoll) prevPollId.current = null;
  }, [activePoll]);

  if (toasts.length === 0) return null;

  /* 🐛 كانت البطاقة مصبوغة داكنةً بأرقام ثابتة (`rgba(19,21,31,.85)`
     ونصّ `#f5f6f8`) داخل غرفة ذات هوية فاتحة، فتبدو كأنّها من تطبيق
     آخر. صارت من متغيّرات التصميم نفسها، فتتبع النسق الفاتح والداكن
     معاً بلا فرعٍ في الشيفرة. */
  const ACCENT = {
    primary: { bg: "var(--bz-blue-050)", icon: "var(--bz-blue)" },
    amber:   { bg: "var(--bz-amber-050)", icon: "var(--bz-amber)" },
    emerald: { bg: "color-mix(in srgb, var(--bz-green) 14%, transparent)", icon: "var(--bz-green)" },
  } as const;

  return (
    /* ⚠️ الموضع: بطاقة «يتحدّث الآن» في شريط الصوت تجلس في الزاوية
       نفسها (`inset-inline-end: 12px`) فكانتا تتراكبان. التنبيهات
       تُزاح إلى **يسار** المسرح (بداية السطر في RTL هي اليمين، فهذه
       الجهة تبقى للصوت وحده)، وتحت الرفّ لا فوقه. */
    <div
      className="pointer-events-none absolute top-3 z-30 flex flex-col gap-2"
      style={{ maxWidth: "min(86vw, 320px)", insetInlineStart: 12, insetInlineEnd: "auto" }}
    >
      {toasts.map((t) => {
        const a = ACCENT[t.accent];
        return (
          <div
            key={t.id}
            className="animate-msg-in flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold shadow-lg backdrop-blur-md"
            style={{
              background: "var(--bz-surface)",
              border: "1px solid var(--bz-line)",
              color: "var(--bz-ink)",
              boxShadow: "0 8px 24px -12px rgba(19,23,34,.35)",
            }}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
              style={{ background: a.bg, color: a.icon }}
            >
              <FontAwesomeIcon icon={t.icon} className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
