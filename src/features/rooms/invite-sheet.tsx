"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass, faCheck, faPaperPlane, faUserGroup, faXmark, faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LiveAvatar } from "@/components/ui/live-avatar";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { listenFriends, addNotification, type Person } from "@/features/community/social";
import { tryPushNotification } from "@/lib/push";

/* ════════════════════════════════════════════════════════════
   دعوة الأصدقاء إلى الغرفة

   لم تكن هناك دعوة في المنصّة إطلاقاً: الطريقة الوحيدة لجمع طلبةٍ في
   غرفة كانت `shareRoomLink()` — نسخُ الرابط ثم إرساله بنفسك في تطبيق
   آخر. أستاذٌ عنده أربعون طالباً كان عليه أربعون لصقة.

   ── قرارات ثلاثة، ولكلٍّ سببه ──

   ١) **الدعوة إشعار، لا عقدة جديدة في قاعدة البيانات.**
      عقدة `roomInvites` تستلزم سطراً في قواعد RTDB، وتغيير القواعد
      ممنوع في هذه المرحلة. و`notifications/$uid` مسموح الكتابة فيه
      لأيّ مستخدم مصادَق — فالدعوة تصل بلا تغيير قاعدة واحدة. ومعها
      إشعار الهاتف، وهو ما يصل الطالب فعلاً وتطبيقه مغلق.

   ٢) **للمالك والمشرفين وحدهم.**
      «يدعو الأستاذ طلابه ومالك الغرفة أصدقاءه» — ولو أتحنا الدعوة لكل
      من في الغرفة لصارت أداة إزعاج جماعيّ: أربعون مشاركاً × قائمة
      أصدقاء كلٍّ منهم.

   ٣) **إرسال متسلسل بخمسة معاً لا بدفعة واحدة.**
      «تحديد الكل» على مئة صديق يعني مئة كتابة. دفعةٌ واحدة تُحدث
      انفجار طلبات قد يخنق اتصال الهاتف على 3G ويُسقط بعضها بصمت.
      فنُرسل على أفواج ونُظهر التقدّم — والطالب يرى ما وصل وما بقي.

   ── التجربة ──
   القائمة تُصفَّى بالبحث، و«تحديد الكل» يعمل على **المعروض** لا على
   الكلّ: من بحث عن «رياضيات» ثمّ ضغط «تحديد الكل» يقصد نتائج بحثه.
   وهذا أكثر ما يُخطئ فيه هذا النوع من الواجهات.
   ════════════════════════════════════════════════════════════ */

/** كم دعوة تُرسل معاً */
const BATCH = 5;

export function InviteSheet({
  open,
  onClose,
  roomId,
  roomName,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}) {
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const [friends, setFriends] = useState<Person[]>([]);
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(0);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(0);
  /* من دُعي في هذه الجلسة — فلا يُدعى مرّتين بالخطأ */
  const invited = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    const unsub = listenFriends(user.uid, setFriends);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [open, user]);

  /* إعادة التصفير عند كل فتح: درجٌ يُفتح على تحديد قديم يُرسل دعوات
     لم يقصدها المستخدم. */
  useEffect(() => {
    if (open) return;
    setTerm(""); setPicked(new Set()); setSending(false);
    setDone(0); setSentCount(null); setFailed(0);
  }, [open]);

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = t ? friends.filter((f) => f.name.toLowerCase().includes(t)) : friends;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [friends, term]);

  const selectable = shown.filter((f) => !invited.current.has(f.uid));
  const allShownPicked = selectable.length > 0 && selectable.every((f) => picked.has(f.uid));

  function toggle(uid: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  /* «تحديد الكل» يعمل على المعروض بعد البحث لا على القائمة كلّها */
  function toggleAll() {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allShownPicked) selectable.forEach((f) => next.delete(f.uid));
      else selectable.forEach((f) => next.add(f.uid));
      return next;
    });
  }

  async function send() {
    if (!user || picked.size === 0 || sending) return;
    const me = profile?.name || user.displayName || "صديقك";
    const targets = [...picked];
    setSending(true); setDone(0); setFailed(0);

    let okCount = 0;
    let failCount = 0;
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map(async (uid) => {
          await addNotification(uid, {
            type: "room_invite",
            text: `${me} دعاك إلى غرفة «${roomName}»`,
            link: `/rooms/${roomId}`,
          });
          /* إشعار الهاتف لا يُنتظر: فشله لا يُلغي الدعوة الواصلة */
          tryPushNotification(uid, {
            title: "دعوة إلى غرفة دراسة 📚",
            body: `${me} دعاك إلى «${roomName}»`,
            link: `/rooms/${roomId}`,
          });
          invited.current.add(uid);
        }),
      );
      okCount += results.filter((r) => r.status === "fulfilled").length;
      failCount += results.filter((r) => r.status === "rejected").length;
      setDone(Math.min(i + chunk.length, targets.length));
    }

    setSentCount(okCount);
    setFailed(failCount);
    setPicked(new Set());
    setSending(false);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="دعوة أصدقاء إلى الغرفة">
      <div className="space-y-3">
        {/* نتيجة الإرسال — تبقى ظاهرة حتى يُغلق الدرج */}
        {sentCount !== null && (
          <div
            className={`flex items-start gap-2 rounded-xl border p-3 text-[13px] font-bold ${
              failed
                ? "border-amber-400/40 bg-amber-400/10 text-amber-700"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
            }`}
            role="status"
          >
            <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              وصلت الدعوة إلى {sentCount} {sentCount === 1 ? "صديق" : "أصدقاء"}.
              {failed > 0 && ` وتعذّر إرسال ${failed} — أعد المحاولة.`}
            </span>
          </div>
        )}

        {friends.length === 0 ? (
          /* لا أصدقاء: نُرشد إلى المكان الذي يُضافون منه بدل قائمة فارغة */
          <div className="rounded-xl border border-border bg-surface p-5 text-center">
            <FontAwesomeIcon icon={faUserGroup} className="h-8 w-8 text-text-muted opacity-30" />
            <p className="mt-2.5 text-[13.5px] font-bold text-text">لا أصدقاء في قائمتك بعد</p>
            <p className="mt-1 text-[12.5px] text-text-muted">
              أضف أصدقاءك أوّلاً لتستطيع دعوتهم بضغطة واحدة.
            </p>
            <Link
              href="/community?tab=people"
              onClick={onClose}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-gradient-primary px-4 text-[13px] font-extrabold text-white"
            >
              <FontAwesomeIcon icon={faUserGroup} className="h-3.5 w-3.5" />
              ابحث عن أصدقاء
            </Link>
            <p className="mt-3 text-[12px] text-text-muted">
              أو انسخ رابط الغرفة وأرسله من «مشاركة الرابط».
            </p>
          </div>
        ) : (
          <>
            {/* البحث + تحديد الكل */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="pointer-events-none absolute inset-y-0 end-3 my-auto h-3.5 w-3.5 text-text-muted"
                />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="ابحث في أصدقائك…"
                  aria-label="ابحث في أصدقائك"
                  className="h-10 w-full rounded-lg border border-border bg-background pe-9 ps-3 text-[13px] outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={toggleAll}
                disabled={selectable.length === 0 || sending}
                className="min-h-10 shrink-0 whitespace-nowrap rounded-lg border border-border px-3 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
              >
                {allShownPicked ? "إلغاء التحديد" : "تحديد الكل"}
              </button>
            </div>

            {term && (
              <p className="text-[11.5px] text-text-muted">
                «تحديد الكل» يشمل نتائج البحث المعروضة ({selectable.length}) فقط.
              </p>
            )}

            {/* القائمة — ارتفاع محدود فيبقى زرّ الإرسال ظاهراً على الهاتف */}
            <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-border">
              {shown.length === 0 ? (
                <p className="p-4 text-center text-[13px] text-text-muted">لا نتائج لبحثك.</p>
              ) : (
                <ul>
                  {shown.map((f) => {
                    const already = invited.current.has(f.uid);
                    const on = picked.has(f.uid);
                    return (
                      <li key={f.uid} className="border-b border-border last:border-b-0">
                        <button
                          onClick={() => !already && toggle(f.uid)}
                          disabled={already || sending}
                          aria-pressed={on}
                          className={`flex w-full items-center gap-2.5 p-2.5 text-start transition ${
                            already ? "opacity-50" : "hover:bg-primary/[0.04]"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                              on
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-background"
                            }`}
                          >
                            {on && <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />}
                          </span>
                          <LiveAvatar uid={f.uid} name={f.name} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text">
                            {f.name}
                          </span>
                          {already && (
                            <span className="shrink-0 text-[11px] font-bold text-emerald-600">
                              دُعي
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* الإرسال */}
            <div className="flex items-center gap-2">
              <button
                onClick={send}
                disabled={picked.size === 0 || sending}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 text-[13.5px] font-extrabold text-white transition active:scale-[0.98] disabled:opacity-45"
              >
                <FontAwesomeIcon icon={sending ? faPaperPlane : faPaperPlane} className="h-4 w-4" />
                {sending
                  ? `يُرسل… ${done}/${picked.size || done}`
                  : picked.size === 0
                    ? "اختر من تدعوه"
                    : `أرسل الدعوة (${picked.size})`}
              </button>
              {picked.size > 0 && !sending && (
                <button
                  onClick={() => setPicked(new Set())}
                  aria-label="إلغاء التحديد"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-text-muted transition hover:border-danger/40 hover:text-danger"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
