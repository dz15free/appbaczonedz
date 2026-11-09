// خادم الخدمة — BacZoneDZ
// يتعامل مع: Push Notifications + Offline Support

const CACHE_NAME = "baczone-v3";
const OFFLINE_URL = "/offline";

/* صفحة «لا اتّصال» تُحفظ **مع ملفّات CSS التي تطلبها** وأيقونة المنصّة —
   بدونها كانت تظهر بلا تنسيق. أسماء ملفّات CSS تتغيّر مع كلّ نشر، فنقرؤها
   من الصفحة نفسها، والموقع يطلب تحديثها مرّة في اليوم (رسالة refresh-offline). */
async function cacheOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch(OFFLINE_URL, { cache: "no-store" });
  if (!res.ok) return;
  const html = await res.clone().text();
  const css = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]);
  await cache.put(OFFLINE_URL, res);
  await Promise.all([...new Set([...css, "/icon-192.png?v=3"])].map((u) =>
    cache.add(u).catch(() => {})
  ));
}

/* ─── تثبيت: حفظ صفحة الأوفلاين في الكاش ─── */
self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePage().catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "refresh-offline") {
    event.waitUntil(cacheOfflinePage().catch(() => {}));
  }
});

/* ─── تفعيل: تنظيف الكاش القديم ─── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ─── اعتراض الطلبات: اعرض Offline عند انقطاع الشبكة ─── */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? new Response("Offline", { status: 503 }))
      )
    );
    return;
  }
  /* ملفّات صفحة «لا اتّصال» وحدها تُخدَم من الكاش عند انقطاع الشبكة */
  const url = new URL(req.url);
  const offlineAsset =
    url.origin === self.location.origin &&
    ((url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".css")) || url.pathname === "/icon-192.png");
  if (req.method === "GET" && offlineAsset) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r ?? Response.error()))
    );
  }
});

/* ─── Push Notifications ─── */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "BacZoneDZ", body: event.data.text() }; }

  const { title = "BacZoneDZ", body = "لديك إشعار جديد", link = "/notifications" } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      data: { link },
      dir: "rtl",
      lang: "ar",
      vibrate: [200, 100, 200],
    })
  );
});

/* ─── نقر على الإشعار ─── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
