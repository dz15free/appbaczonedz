"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ref, get, set, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers, faLock, faBell, faClock, faArrowLeft, faCircleInfo,
  faComments, faKey, faSpinner, faCheck, faDoorOpen,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { ChargilyPayButton } from "@/features/paid/chargily-button";
import { SupportChatSheet } from "@/features/support/support-chat";
import { redeemCode, listenHasAccess } from "@/features/paid/paid-access";
import { addNotification } from "@/features/community/social";
import type { Room, ScheduledSession } from "@/features/rooms/rooms";
import { branchLabel, matchesBranch, isExactBranchMatch, type BranchMap } from "@/features/feed/targeting";

/* ════════════════════════════════════════════════════════════
   «من يراجع الآن؟» — اكتشاف غرف المراجعة

   الأرقام حقيقية بالكامل: عدد الحاضرين من عقدة `presence` نفسها التي
   تُغذّي قائمة الغرف القائمة. لا رقم مُختلَق ولا «١٢ طالباً» ثابتة —
   الإلحاح المصطنع يُكتشف مرّة واحدة فيسقط معه كل ما بعده.

   **لا مستمع دائم على كل الغرف.** قراءة واحدة كل ٤٥ ثانية للغرف
   والحضور معاً، وثلاث بطاقات على الأكثر. مستمعٌ لكل غرفة عند كل طالب
   يعني آلاف الاتصالات على منصّة لحظية — وهو أوّل ما يُسقط الأداء.

   والحالة صريحة لا موحية: مباشر · قريباً · مجّانية · مدفوعة. الغرفة
   المجدولة لا تُعرض «مباشرة» قبل أن تبدأ.
════════════════════════════════════════════════════════════ */

const REFRESH_MS = 45_000;
const ACTIVE_WINDOW_MS = 60_000;

export interface DiscoveryRoom extends Room {
  branches?: BranchMap | null;
  activeCount: number;
  /** غرفة مجدولة لم تبدأ بعد */
  upcoming?: ScheduledSession | null;
}

/** قراءة واحدة تجمع الغرف والحضور والجلسات المجدولة */
async function readDiscovery(): Promise<DiscoveryRoom[]> {
  const [roomsSnap, presSnap, sessSnap] = await Promise.all([
    get(ref(rtdb, "rooms")),
    get(ref(rtdb, "presence")),
    get(ref(rtdb, "scheduledSessions")),
  ]);

  const rooms = (roomsSnap.val() as Record<string, Omit<DiscoveryRoom, "id" | "activeCount">> | null) ?? {};
  const presence = (presSnap.val() as Record<string, Record<string, { lastActive?: number }>> | null) ?? {};
  const sessions = (sessSnap.val() as Record<string, Omit<ScheduledSession, "id">> | null) ?? {};

  const now = Date.now();
  const byRoom = new Map<string, ScheduledSession>();
  for (const [id, s] of Object.entries(sessions)) {
    // الجلسة القادمة فقط: ما مضى وقته بأكثر من ساعة لم يعد «قريباً»
    if (s.scheduledAt > now - 3_600_000) byRoom.set(s.roomId, { id, ...s });
  }

  return Object.entries(rooms)
    .filter(([, r]) => r.type !== "private")
    .map(([id, r]) => {
      const members = presence[id] ?? {};
      const activeCount = Object.values(members).filter(
        (m) => typeof m.lastActive === "number" && now - m.lastActive < ACTIVE_WINDOW_MS,
      ).length;
      const sess = byRoom.get(id) ?? null;
      return { id, ...r, activeCount, upcoming: activeCount === 0 && sess && sess.scheduledAt > now ? sess : null };
    })
    .filter((r) => r.activeCount > 0 || r.upcoming);
}

/**
 * ترتيب الغرف: المباشر أوّلاً، ثمّ ما يخصّ شعبة الطالب، ثمّ الأكثر
 * حضوراً. عشر غرف بواحد لا تساوي غرفةً بعشرة.
 */
export function rankRooms(rooms: DiscoveryRoom[], track?: string | null, subject?: string | null): DiscoveryRoom[] {
  const eligible = rooms.filter((r) => matchesBranch(r, track));
  return eligible
    .map((r) => {
      let s = 0;
      if (r.activeCount > 0) s += 100 + Math.min(40, r.activeCount * 4);
      if (isExactBranchMatch(r, track)) s += 35;
      if (subject && r.subject === subject) s += 15;
      if (r.upcoming) s += Math.max(0, 30 - (r.upcoming.scheduledAt - Date.now()) / 3_600_000);
      return { r, s };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r);
}

export function useRoomDiscovery(track?: string | null, subject?: string | null, max = 3) {
  const [rooms, setRooms] = useState<DiscoveryRoom[] | null>(null);

  const refresh = useCallback(() => {
    void readDiscovery().then((list) => setRooms(rankRooms(list, track, subject))).catch(() => setRooms([]));
  }, [track, subject]);

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, REFRESH_MS);
    // لا نُحدّث والصفحة في الخلفية — استهلاك بلا قارئ
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);

  return { rooms: rooms ? rooms.slice(0, max) : null, total: rooms?.length ?? 0, refresh };
}

/* ══════════════════════════════════════════════════════════
   القسم كاملاً
══════════════════════════════════════════════════════════ */
export function RoomDiscovery({
  uid, track, subject, max = 3, compact,
}: {
  uid?: string;
  track?: string | null;
  subject?: string | null;
  max?: number;
  compact?: boolean;
}) {
  const { rooms, total } = useRoomDiscovery(track, subject, max);

  if (rooms === null) {
    return (
      <div className="space-y-2.5">
        {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />)}
      </div>
    );
  }
  if (!rooms.length) return null;

  const liveCount = rooms.filter((r) => r.activeCount > 0).length;

  return (
    <section className={compact ? "" : "rounded-3xl border border-border bg-surface p-4 sm:p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-text-primary">
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
              <FontAwesomeIcon icon={faDoorOpen} className="h-4 w-4" />
              {liveCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-danger ring-2 ring-surface" />
              )}
            </span>
            من يراجع الآن؟
          </h2>
          <p className="mt-0.5 text-[12px] text-text-muted">
            {liveCount > 0 ? "غرف مراجعة مفتوحة هذه اللحظة" : "غرف مراجعة قادمة قريباً"}
          </p>
        </div>
        <Link href="/rooms"
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-extrabold text-primary transition hover:bg-primary/5">
          كل الغرف <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 space-y-2.5">
        {rooms.map((r) => <LiveRoomCard key={r.id} room={r} uid={uid} track={track} />)}
      </div>

      {total > rooms.length && (
        <Link href="/rooms" className="mt-2.5 block text-center text-[12px] font-bold text-primary hover:underline">
          استكشف {total - rooms.length} غرفة أخرى
        </Link>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   بطاقة الغرفة
══════════════════════════════════════════════════════════ */
export function LiveRoomCard({ room, uid, track }: { room: DiscoveryRoom; uid?: string; track?: string | null }) {
  const subjects = useSiteSubjects();
  const subjectName = room.subject ? (subjects.find((s) => s.id === room.subject)?.name ?? room.subject) : null;
  const [hasAccess, setHasAccess] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reminded, setReminded] = useState(false);

  const isLive = room.activeCount > 0;
  const paid = Boolean(room.isPaid);
  const relevant = isExactBranchMatch(room, track);
  const sessionId = room.upcoming?.id;

  useEffect(() => {
    if (!uid || !paid) { setHasAccess(false); return; }
    const unsub = listenHasAccess(uid, "room", room.id, setHasAccess);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid, paid, room.id]);

  useEffect(() => {
    if (!uid || !sessionId) return;
    const unsub = onValue(ref(rtdb, `sessionReminders/${sessionId}/${uid}`), (s) => setReminded(s.exists()), () => {});
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid, sessionId]);

  async function toggleReminder() {
    if (!uid || !sessionId) return;
    const r = ref(rtdb, `sessionReminders/${sessionId}/${uid}`);
    if (reminded) await remove(r);
    else await set(r, Date.now());
  }

  const canEnter = !paid || hasAccess;

  return (
    <article className={`overflow-hidden rounded-2xl border bg-surface transition ${
      isLive ? "border-danger/30" : "border-border"
    }`}>
      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-0.5 text-[10px] font-extrabold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> مباشر الآن
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
              <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5" /> قريباً
            </span>
          )}
          {paid ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600">
              <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" /> مدفوعة {room.price ? `· ${room.price} دج` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">مجّانية</span>
          )}
          {relevant && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">لشعبتك</span>
          )}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[14px] font-extrabold leading-snug text-text-primary">{room.name}</h3>

        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-text-muted">
          <span>{room.ownerName}</span>
          <span className="opacity-40">·</span>
          <span>{branchLabel(room.branches)}</span>
          {subjectName && (<><span className="opacity-40">·</span><span>{subjectName}</span></>)}
        </p>

        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-text-primary">
          {isLive ? (
            <>
              <FontAwesomeIcon icon={faUsers} className="h-3 w-3 text-danger" />
              {room.activeCount} {room.activeCount === 1 ? "طالب يراجع الآن" : "طلاب يراجعون الآن"}
            </>
          ) : room.upcoming ? (
            <>
              <FontAwesomeIcon icon={faClock} className="h-3 w-3 text-primary" />
              تبدأ {formatWhen(room.upcoming.scheduledAt)}
            </>
          ) : null}
        </p>
      </div>

      <div className="flex gap-2 border-t border-border p-2.5">
        {isLive ? (
          canEnter ? (
            <Link href={`/rooms/${room.id}`}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white">
              انضمّ الآن
            </Link>
          ) : (
            <button onClick={() => setPayOpen(true)}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[13px] font-extrabold text-white">
              <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5" /> احصل على الدخول
            </button>
          )
        ) : (
          <>
            <button
              onClick={toggleReminder}
              disabled={!uid || !sessionId}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-extrabold transition disabled:opacity-40 ${
                reminded ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "bg-gradient-primary text-white"
              }`}
            >
              <FontAwesomeIcon icon={reminded ? faCheck : faBell} className="h-3.5 w-3.5" />
              {reminded ? "سأُذكِّرك" : "ذكّرني"}
            </button>
            <Link href={`/rooms/${room.id}`}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-border px-4 text-[12.5px] font-extrabold text-text-muted transition hover:border-primary hover:text-primary">
              التفاصيل
            </Link>
          </>
        )}
      </div>

      {uid && paid && (
        <RoomAccessSheet room={room} uid={uid} open={payOpen} onClose={() => setPayOpen(false)} />
      )}
    </article>
  );
}

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `اليوم ${time}`;
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (d.toDateString() === tomorrow.toDateString()) return `غداً ${time}`;
  return `${d.toLocaleDateString("ar-DZ", { day: "numeric", month: "long" })} ${time}`;
}

/* ══════════════════════════════════════════════════════════
   لوح الحصول على غرفة مدفوعة — نظام الدفع القائم نفسه
══════════════════════════════════════════════════════════ */
export function RoomAccessSheet({
  room, uid, open, onClose,
}: { room: Room; uid: string; open: boolean; onClose: () => void }) {
  const [support, setSupport] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function activate() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr("");
    const e = await redeemCode(code, uid, "");
    setBusy(false);
    if (e) { setErr(e); return; }
    setDone(true);
    setCode("");
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="الدخول إلى الغرفة" maxHeight="88vh">
      <div className="space-y-3.5 pb-2">
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-sm font-extrabold text-text-primary">{room.name}</p>
          <p className="mt-0.5 text-[11.5px] text-text-muted">{room.ownerName}</p>
          <p className="mt-2 text-2xl font-extrabold text-text-primary">
            {(room.price ?? 0).toLocaleString("en-US")} دج
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <FontAwesomeIcon icon={faCheck} className="h-6 w-6 text-emerald-600" />
            <p className="mt-2 text-sm font-extrabold text-emerald-700">تمّ تفعيل دخولك — انضمّ الآن.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="mb-2 text-[12px] font-extrabold text-text-primary">١ · الدفع الإلكتروني</p>
              <ChargilyPayButton itemType="room" itemId={room.id} price={room.price ?? 0} uid={uid} />
            </div>

            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="mb-1.5 text-[12px] font-extrabold text-text-primary">٢ · الدفع عبر التواصل مع الإدارة</p>
              <button onClick={() => setSupport(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 text-[12.5px] font-extrabold text-primary transition hover:bg-primary/10">
                <FontAwesomeIcon icon={faComments} className="h-3.5 w-3.5" /> تواصل مع الإدارة
              </button>

              <div className="mt-3">
                <label htmlFor="bz-room-code" className="mb-1 block text-[11px] font-bold text-text-muted">
                  عندك كود وصول؟
                </label>
                <div className="flex gap-2">
                  <input id="bz-room-code" value={code} onChange={(e) => setCode(e.target.value)}
                    placeholder="BZ-XXXX-XXXX" dir="ltr"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                  <button onClick={activate} disabled={busy || !code.trim()}
                    className="shrink-0 rounded-xl bg-gradient-primary px-4 text-xs font-extrabold text-white disabled:opacity-50">
                    {busy ? <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
                      : <><FontAwesomeIcon icon={faKey} className="me-1 h-3 w-3" />تفعيل</>}
                  </button>
                </div>
                {err && <p className="mt-1.5 text-[11px] font-bold text-danger">{err}</p>}
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-text-muted">
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              الدخول يُفتح فور تأكّد الدفع، ويبقى صالحاً لهذه الغرفة.
            </p>
          </>
        )}
      </div>
      <SupportChatSheet open={support} onClose={() => setSupport(false)} initialKind="payment" />
    </BottomSheet>
  );
}

/* ══════════════════════════════════════════════════════════
   تذكير الجلسات — يعمل عند فتح الطالب للمنصّة

   بلا خادم لا يمكن دفع إشعار في لحظة بعينها. فحين يفتح الطالب المنصّة
   نفحص الجلسات التي طلب تذكيرها وحان وقتها ولم يصله إشعارها بعد،
   فنكتبه في نظام الإشعارات القائم. هذا حدّ معروف لا سهو.
══════════════════════════════════════════════════════════ */
export function useSessionReminders(uid?: string) {
  useEffect(() => {
    if (!uid) return;
    let alive = true;

    void (async () => {
      try {
        const [remSnap, sessSnap, sentSnap] = await Promise.all([
          get(ref(rtdb, "sessionReminders")),
          get(ref(rtdb, "scheduledSessions")),
          get(ref(rtdb, `activity/${uid}/reminded`)),
        ]);
        if (!alive) return;

        const rem = (remSnap.val() as Record<string, Record<string, number>> | null) ?? {};
        const sessions = (sessSnap.val() as Record<string, ScheduledSession> | null) ?? {};
        const sent = (sentSnap.val() as Record<string, number> | null) ?? {};
        const now = Date.now();

        for (const [sid, users] of Object.entries(rem)) {
          if (!users?.[uid] || sent[sid]) continue;
          const s = sessions[sid];
          if (!s) continue;
          // بدأت خلال آخر ثلاث ساعات — أقدم من ذلك تذكيرٌ فات أوانه
          if (s.scheduledAt > now || now - s.scheduledAt > 3 * 3_600_000) continue;
          await set(ref(rtdb, `activity/${uid}/reminded/${sid}`), now);
          await addNotification(uid, {
            type: "room",
            text: `🔴 بدأت غرفة «${s.name}» التي طلبت تذكيرك بها.`,
            link: `/rooms/${s.roomId}`,
          });
        }
      } catch { /* التذكير مساعد لا شرط */ }
    })();

    return () => { alive = false; };
  }, [uid]);
}

/** الغرف الحيّة كبطاقة واحدة داخل التغذية — لا تُكرَّر ولا تُلحّ */
export function useTopLiveRoom(track?: string | null, subject?: string | null) {
  const { rooms } = useRoomDiscovery(track, subject, 1);
  return useMemo(() => (rooms && rooms.length ? rooms[0] : null), [rooms]);
}
