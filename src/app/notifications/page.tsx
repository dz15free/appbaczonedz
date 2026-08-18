"use client";

import { useEffect, useState } from "react";
import { listenBroadcasts, isBroadcastId, markBroadcastRead } from "@/features/notifications/broadcast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell, faUserPlus, faUserCheck, faMessage, faCheckDouble, faBellSlash,
  faComment, faReply, faArrowUp, faAt, faUsers, faCalendarCheck, faBookOpen,
  faCartShopping, faStar, faBullseye, faGraduationCap, faBullhorn, faHeadset,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { AppShell } from "@/components/app-shell";
import { isPushSupported, subscribePush, unsubscribePush } from "@/lib/push";
import {
  listenNotifications,
  markNotificationsRead,
  clearNotifications,
  type AppNotification,
} from "@/features/community/social";
import { loginHrefFor } from "@/features/auth/use-require-auth";
import { notifMeta, notifLink, type NotifIcon, type NotifTone } from "@/features/notifications/registry";

/* 🐛 كانت الأيقونة ثلاثة `if` وما بقي جرس عامّ — فلا يعرف الطالب صنف
   الاشعار قبل قراءته. الآن كل نوع أيقونته ونبرته من السجلّ الموحّد.
   والترجمة إلى FontAwesome تبقى **هنا** فقط، فلا يجرّ السجلّ مكتبة
   أيقونات معه ويبقى صالحاً للخادم. */
const ICONS: Record<NotifIcon, typeof faBell> = {
  userPlus: faUserPlus, userCheck: faUserCheck, message: faMessage,
  comment: faComment, reply: faReply, upvote: faArrowUp, at: faAt,
  room: faUsers, calendar: faCalendarCheck, course: faBookOpen,
  cart: faCartShopping, star: faStar, target: faBullseye,
  graduation: faGraduationCap, megaphone: faBullhorn, support: faHeadset,
  payment: faCreditCard, bell: faBell,
};

const TONES: Record<NotifTone, string> = {
  primary: "bg-primary/10 text-primary",
  green: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  red: "bg-red-500/10 text-red-600",
  violet: "bg-violet-500/10 text-violet-600",
  muted: "bg-text-muted/10 text-text-muted",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} يوم`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  /* البثّ الجماعي (@all) يُقرأ من مصدر مستقلّ ويُدمج مع الإشعارات
     الشخصية — سجلّ واحد للجميع بدل إشعار لكل مستخدم. */
  const [casts, setCasts] = useState<AppNotification[]>([]);
  const [pushPerm, setPushPerm] = useState<"granted" | "denied" | "default" | "na">("na");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenNotifications(user.uid, setItems);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // نطاقات المستخدم تُضاف لاحقاً؛ بثّ الموقع يصل للجميع الآن
    const unsub = listenBroadcasts(user.uid, [], setCasts);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  /* الدمج والترتيب في مكان واحد: الأحدث أوّلاً بغضّ النظر عن مصدره،
     فلا يشعر المستخدم بوجود قائمتين. */
  const merged = [...items, ...casts].sort((a, b) => b.createdAt - a.createdAt);
  const clearableCount = items.filter((n) => !n.persistent).length;

  useEffect(() => {
    if (!user || merged.length === 0) return;
    const unread = merged.filter((n) => !n.read && !n.persistent).map((n) => n.id);
    // البثّ يُعلَّم عند القارئ لا في السجلّ العامّ (لا صلاحية كتابة فيه)
    const own = unread.filter((id) => !isBroadcastId(id));
    if (own.length) markNotificationsRead(user.uid, own);
    for (const id of unread.filter(isBroadcastId)) void markBroadcastRead(user.uid, id);
  }, [user, merged.length]);

  useEffect(() => {
    if (!isPushSupported()) { setPushPerm("na"); return; }
    setPushPerm(Notification.permission as any);
  }, []);

  async function enablePush() {
    if (!user) return;
    setPushBusy(true);
    const ok = await subscribePush(user.uid);
    setPushPerm(ok ? "granted" : Notification.permission as any);
    setPushBusy(false);
  }
  async function disablePush() {
    if (!user) return;
    setPushBusy(true);
    await unsubscribePush(user.uid);
    setPushPerm("default");
    setPushBusy(false);
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="font-display text-xl font-extrabold">الإشعارات</h1>
          {clearableCount > 0 && (
            <button onClick={() => clearNotifications(user.uid)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-danger">
              <FontAwesomeIcon icon={faCheckDouble} className="h-4 w-4" /> مسح الإشعارات الأخرى
            </button>
          )}
        </div>

        {/* بطاقة إشعارات المتصفّح */}
        {pushPerm !== "na" && (
          <div className={`mb-4 flex items-center justify-between rounded-xl border p-3 ${pushPerm === "granted" ? "border-secondary/30 bg-secondary/5" : "border-primary/30 bg-primary/5"}`}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={pushPerm === "granted" ? faBell : faBellSlash} className={`h-5 w-5 ${pushPerm === "granted" ? "text-secondary" : "text-primary"}`} />
              <span className="text-sm font-semibold">
                {pushPerm === "granted" ? "إشعارات المتصفّح مفعّلة" : "فعّل الإشعارات لتصلك تنبيهات حتى حين تكون خارج التطبيق"}
              </span>
            </div>
            {pushPerm === "granted" ? (
              <button onClick={disablePush} disabled={pushBusy} className="rounded-md px-3 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-50">
                إيقاف
              </button>
            ) : pushPerm !== "denied" ? (
              <button onClick={enablePush} disabled={pushBusy} className="rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                {pushBusy ? "..." : "تفعيل"}
              </button>
            ) : (
              <span className="text-xs text-text-muted">محظور في المتصفّح</span>
            )}
          </div>
        )}

        {merged.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <FontAwesomeIcon icon={faBell} className="h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">لا إشعارات بعد.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {merged.map((n) => {
              const meta = notifMeta(n.type);
              const persistent = Boolean(n.persistent);
              const body = (
                <div className={`flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/40 ${persistent ? "border-amber-400/40 bg-amber-400/10" : n.read ? "border-border bg-surface" : "border-primary/40 bg-primary/5"}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONES[meta.tone]}`}>
                    <FontAwesomeIcon icon={ICONS[meta.icon]} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10.5px] font-extrabold text-text-muted">{meta.label}</span>
                      {persistent && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">يبقى حتى التأكيد</span>}
                    </div>
                    <p className="text-sm leading-relaxed">{n.text}</p>
                    <span className="text-xs text-text-muted">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && !persistent && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
              /* كل اشعار قابل للنقر الآن. وكان الاشعار بلا `link` يُعرض
                 `<div>` أصمّ — والحقل يُملأ بسلسلة فارغة افتراضياً في
                 `addNotification`، فكان أيّ منشئ ينسى الرابط يُنتج
                 اشعاراً ميّتاً. `notifLink` تضمن وجهةً دائماً. */
              return (
                <Link key={n.id} href={notifLink(n)}>{body}</Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
