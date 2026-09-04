"use client";

import { useEffect, useMemo, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { useMediaQuery } from "@/lib/use-media";
import { Icon } from "@/components/ui/icon";
import type { PresenceMember } from "@/features/rooms/use-presence";
import type { RaisedHand } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   رفّ الصفّ — الحضور ظاهر بلا كاميرا

   ── لماذا يوجد ──
   لم يكن في الغرفة أيّ إحساس بأنّ هناك صفّاً: عدد مجرّد في الشريط
   («24 متصل»)، والأسماء مدفونة في تبويب أو ورقة سفلية. والأيدي
   المرفوعة كانت خلف زرّ وورقة — فيرفع الطالب يده ولا يشعر الأستاذ
   إلّا إن فتح الدرج.

   الرفّ يجعل الثلاثة مرئية دائماً في 56 بكسل: من في الصفّ، ومن
   رفع يده وبأيّ ترتيب، ومن ميكروفونه مفتوح.

   ── ولماذا لا صور فيديو ──
   المنصّة صوتية بالتصميم: لا كاميرا ولا مشاركة شاشة، لأنّ الحصّة
   يجب أن تصمد على شبكة هاتف جزائرية. فالحضور يُصوَّر بالصورة
   الرمزية وحالة الميكروفون لا بمربّع فيديو فارغ.

   ── من أين البيانات ──
   الحضور من `presence/$roomId` (موجود)، والأيدي من
   `roomLive/$roomId/hands` (موجود)، وحالة الميكروفون من
   `roomLive/$roomId/voice` — وهي عقدة يكتبها مدير الصوت أصلاً،
   فنقرؤها قراءةً واحدة بلا أيّ اتصال WebRTC ثانٍ.

   الترتيب مقصود: الأستاذ، ثمّ من رفع يده بترتيب الرفع، ثمّ من
   ميكروفونه مفتوح، ثمّ البقيّة. فما يحتاج انتباه الأستاذ يقف
   أوّلاً دائماً.
   ════════════════════════════════════════════════════════════ */

interface VoiceEntry { name?: string; muted?: boolean }

/* كم بطاقة تظهر قبل «+N».
   ليس رقماً واحداً: البطاقة على الهاتف صورة رمزية وحدها (≈48px)،
   ومن 640px تُضاف الأسماء فتصير (≈115px). فرقمٌ ثابت إمّا يقصّ
   البطاقات على اللوح أو يهدر العرض على الحاسوب.

     360px → 4 صور   ·  640px → 5 ببطاقات
     1024px → 6      ·  1440px → 8

   والباقي ليس مخفياً: «+N» تفتح قائمة الصفّ كاملة. */
function useShownCount() {
  const xl = useMediaQuery("(min-width: 1440px)");
  const lg = useMediaQuery("(min-width: 1024px)");
  const sm = useMediaQuery("(min-width: 640px)");
  return xl ? 8 : lg ? 6 : sm ? 5 : 4;
}

export function SpeakerRail({
  roomId, members, hands, mods, ownerId, myUid, isOwner,
  onGrantMic, onLowerHand, onOpenClass,
}: {
  roomId: string;
  members: PresenceMember[];
  hands: RaisedHand[];
  mods: Set<string>;
  ownerId: string;
  myUid?: string;
  isOwner: boolean;
  onGrantMic?: (uid: string) => void;
  onLowerHand?: (uid: string) => void;
  onOpenClass: () => void;
}) {
  const [voice, setVoice] = useState<Record<string, VoiceEntry>>({});
  const shownCount = useShownCount();

  useEffect(() => {
    if (!roomId) return;
    const unsub = onValue(ref(rtdb, `roomLive/${roomId}/voice`), (snap) => {
      setVoice((snap.val() as Record<string, VoiceEntry>) ?? {});
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [roomId]);

  const handOrder = useMemo(() => {
    const m = new Map<string, number>();
    hands.forEach((h, i) => m.set(h.uid, i + 1));
    return m;
  }, [hands]);

  const ordered = useMemo(() => {
    const rank = (m: PresenceMember) => {
      if (m.uid === ownerId) return 0;
      if (handOrder.has(m.uid)) return 1;
      if (voice[m.uid] && !voice[m.uid]?.muted) return 2;
      if (voice[m.uid]) return 3;
      if (mods.has(m.uid)) return 4;
      return 5;
    };
    return [...members].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      const ha = handOrder.get(a.uid) ?? 0, hb = handOrder.get(b.uid) ?? 0;
      if (ha && hb) return ha - hb;
      return (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
    });
  }, [members, ownerId, handOrder, voice, mods]);

  const shown = ordered.slice(0, shownCount);
  const rest = ordered.length - shown.length;
  const firstHand = hands[0];

  function roleOf(m: PresenceMember) {
    if (m.uid === ownerId) return "الأستاذ";
    if (mods.has(m.uid)) return "مشرف";
    if (m.uid === myUid) return "أنت";
    return "تلميذ";
  }

  return (
    <div className="bz-rail-wrap bz-rail flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border bg-surface py-1.5 sm:gap-2">
      {shown.map((m) => {
        const order = handOrder.get(m.uid);
        const v = voice[m.uid];
        const live = v && !v.muted;
        return (
          <button
            key={m.uid}
            type="button"
            onClick={onOpenClass}
            title={`${m.name}${order ? ` — رفع يده (${order})` : ""}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-1.5 py-1 transition sm:px-2 ${
              order
                ? "border-[var(--bz-amber)] bg-[var(--bz-amber-050)]"
                : live
                  ? "border-[var(--bz-green)]/50 bg-[var(--bz-green)]/10"
                  : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <span className="relative shrink-0">
              <LiveAvatar uid={m.uid} name={m.name || "ط"} size="sm" />
              {order ? (
                <span className="absolute -bottom-1 -left-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--bz-amber)] px-0.5 text-[9px] font-extrabold text-white ring-2 ring-[var(--bz-surface)]">
                  {order}
                </span>
              ) : v ? (
                <span
                  className={`absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full ring-2 ring-[var(--bz-surface)] ${
                    live ? "bg-[var(--bz-green)] text-white" : "bg-border text-text-muted"
                  }`}
                >
                  <Icon name={live ? "mic" : "micOff"} size={9} />
                </span>
              ) : null}
              {m.visible === false && !order && (
                <span
                  title="تبويبه غير مفتوح"
                  className="absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full bg-[var(--bz-amber)] ring-2 ring-[var(--bz-surface)]"
                />
              )}
            </span>
            <span className="hidden min-w-0 text-start sm:block">
              <span className="block max-w-[86px] truncate text-[11px] font-bold leading-tight text-[var(--bz-ink)]">
                {m.uid === myUid ? "أنت" : m.name}
              </span>
              <span className="block text-[9.5px] leading-tight text-[var(--bz-ink-3)]">
                {order ? `رفع يده · ${order}` : roleOf(m)}
              </span>
            </span>
          </button>
        );
      })}

      {rest > 0 && (
        <button
          type="button"
          onClick={onOpenClass}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1 text-[11px] font-bold text-text-muted transition hover:border-primary/40 hover:text-primary"
        >
          <Icon name="users" size={13} />+{rest}
        </button>
      )}

      <span className="flex-1" />

      {/* الأيدي المرفوعة: فعلٌ مباشر في الرفّ لا خلف ورقة سفلية */}
      {hands.length > 0 && (
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-xl border border-[var(--bz-amber)] bg-[var(--bz-amber-050)] px-2 py-1 text-[11px] font-extrabold text-[var(--bz-amber)]">
            <Icon name="hand" size={13} />
            {hands.length === 1 ? "يد مرفوعة" : `${hands.length} أيدٍ`}
          </span>
          {isOwner && firstHand && (
            <>
              <button
                type="button"
                onClick={() => onGrantMic?.(firstHand.uid)}
                className="shrink-0 rounded-xl bg-[var(--bz-blue)] px-2.5 py-1.5 text-[11px] font-extrabold text-white transition hover:brightness-110 active:scale-95"
              >
                <span className="hidden sm:inline">الميكروفون لـ</span> {firstHand.name.split(" ")[0]}
              </button>
              <button
                type="button"
                onClick={() => onLowerHand?.(firstHand.uid)}
                title="إنزال اليد"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-border text-text-muted transition hover:border-danger hover:text-danger"
              >
                <Icon name="close" size={13} />
              </button>
            </>
          )}
        </span>
      )}
    </div>
  );
}
