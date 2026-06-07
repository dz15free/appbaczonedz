// مساعد الاشتراك في إشعارات المتصفّح (Web Push)
import { ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function subscribePush(uid: string): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[BacZone push] لم يتم ضبط NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await set(ref(rtdb, `users/${uid}/pushSub`), JSON.parse(JSON.stringify(sub)));
    return true;
  } catch (err) {
    console.error("[BacZone push] فشل الاشتراك:", err);
    return false;
  }
}

export async function unsubscribePush(uid: string) {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await set(ref(rtdb, `users/${uid}/pushSub`), null);
  } catch { /* تجاهل */ }
}

export async function tryPushNotification(
  toUid: string,
  payload: { title: string; body: string; link: string }
) {
  try {
    const { ref: rtRef, get } = await import("firebase/database");
    const { rtdb: db } = await import("@/lib/firebase/config");
    const snap = await get(rtRef(db, `users/${toUid}/pushSub`));
    const subscription = snap.val();
    if (!subscription?.endpoint) return;
    fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, ...payload }),
    }).catch(() => {/* صامت */});
  } catch { /* صامت */ }
}
