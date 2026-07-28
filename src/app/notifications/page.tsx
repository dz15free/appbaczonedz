"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faUserPlus, faUserCheck, faMessage, faCheckDouble, faBellSlash } from "@fortawesome/free-solid-svg-icons";
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

function icon(type: string) {
  if (type === "friend_request") return faUserPlus;
  if (type === "friend_accept") return faUserCheck;
  if (type === "dm") return faMessage;
  return faBell;
}

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
    if (!user || items.length === 0) return;
    const unread = items.filter((n) => !n.read).map((n) => n.id);
    if (unread.length) markNotificationsRead(user.uid, unread);
  }, [user, items]);

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
          {items.length > 0 && (
            <button onClick={() => clearNotifications(user.uid)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-danger">
              <FontAwesomeIcon icon={faCheckDouble} className="h-4 w-4" /> مسح الكل
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

        {items.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <FontAwesomeIcon icon={faBell} className="h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">لا إشعارات بعد.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const body = (
                <div className={`flex items-center gap-3 rounded-lg border p-3 ${n.read ? "border-border bg-surface" : "border-primary/40 bg-primary/5"}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <FontAwesomeIcon icon={icon(n.type)} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{n.text}</p>
                    <span className="text-xs text-text-muted">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link}>{body}</Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
