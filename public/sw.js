// خادم الخدمة — BacZoneDZ
// يتعامل مع: Push Notifications + Offline Support

const CACHE_NAME = "baczone-v2";
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = [OFFLINE_URL];

/* ─── تثبيت: حفظ صفحة الأوفلاين في الكاش ─── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
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
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? new Response("Offline", { status: 503 }))
      )
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
