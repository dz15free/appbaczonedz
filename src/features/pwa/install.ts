/* ════════════════════════════════════════════════════════════
   تثبيت التطبيق (PWA) — الحالة المشتركة

   • حدث `beforeinstallprompt` قد يصل قبل أن يعمل React، فيلتقطه
     سكربت صغير في `layout.tsx` ويحفظه في `window.__bzInstallEvt`،
     ثمّ نأخذه من هنا.
   • النافذة التلقائية لا تظهر فور الدخول: بعد تفاعل حقيقي (زيارة
     ثانية أو ثلاث صفحات في الزيارة نفسها)، ولا تعود لمن رفضها
     لمدّة (١٤ يوماً، ثمّ ٤٥ بعد الرفض الثاني).
   • لا شيء أبداً لمن ثبّت التطبيق.
   ════════════════════════════════════════════════════════════ */

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __bzInstallEvt?: InstallPromptEvent | null;
  }
}

/** كيف يُثبَّت التطبيق على هذا الجهاز */
export type InstallMode =
  | "prompt"      // Chrome/Edge/Samsung: زرّ تثبيت حقيقي
  | "ios-safari"  // آيفون/آيباد في Safari: خطوتان يدوياً
  | "ios-other"   // آيفون في متصفّح آخر أو تطبيق (إنستغرام…): يفتح Safari أوّلاً
  | "manual";     // متصفّح لا يدعم الزرّ (Firefox…): تعليمات عامّة

const K_SNOOZE = "bz-pwa-snooze-until";
const K_DISMISS_COUNT = "bz-pwa-dismissals";
const K_INSTALLED = "bz-pwa-installed";
const K_SESSIONS = "bz-pwa-sessions";
const K_LAST_SEEN = "bz-pwa-last-seen";
const S_VIEWS = "bz-pwa-views";
const SESSION_GAP_MS = 30 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

function lsGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* وضع خاصّ */ } }

/* ── المنصّة ── */

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isInstalled(): boolean {
  return isStandalone() || lsGet(K_INSTALLED) === "1";
}

function isIOS(): boolean {
  const ua = navigator.userAgent || "";
  /* iPadOS يقدّم نفسه «Macintosh» — نميّزه باللمس */
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent || "";
  /* متصفّحات iOS الأخرى وتطبيقات التواصل تحمل علامتها في UA */
  const other = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|GSA\/|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp/i;
  return /Safari/i.test(ua) && !other.test(ua);
}

export function getDeferredPrompt(): InstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__bzInstallEvt ?? null;
}

export function installMode(): InstallMode {
  if (getDeferredPrompt()) return "prompt";
  if (isIOS()) return isIOSSafari() ? "ios-safari" : "ios-other";
  return "manual";
}

/* ── التثبيت الفعليّ ── */

/** يفتح نافذة التثبيت الأصلية. يُرجع true إن قبل المستخدم. */
export async function runNativePrompt(): Promise<boolean> {
  const evt = getDeferredPrompt();
  if (!evt) return false;
  /* الحدث يُستعمل مرّة واحدة */
  window.__bzInstallEvt = null;
  notify();
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") { markInstalled(); return true; }
  } catch { /* أُغلق */ }
  return false;
}

export function markInstalled() {
  lsSet(K_INSTALLED, "1");
  notify();
}

/* ── التوقيت ── */

/** يُستدعى عند كلّ تنقّل: يعدّ الزيارات (جلسة جديدة بعد ٣٠ دقيقة غياب) والصفحات */
export function recordPageView() {
  const now = Date.now();
  const last = Number(lsGet(K_LAST_SEEN) || 0);
  if (!last || now - last > SESSION_GAP_MS) {
    lsSet(K_SESSIONS, String(Number(lsGet(K_SESSIONS) || 0) + 1));
  }
  lsSet(K_LAST_SEEN, String(now));
  try {
    sessionStorage.setItem(S_VIEWS, String(Number(sessionStorage.getItem(S_VIEWS) || 0) + 1));
  } catch { /* لا شيء */ }
}

/** تفاعل حقيقي: زيارة ثانية، أو ثلاث صفحات في الزيارة نفسها */
export function isEngaged(): boolean {
  const sessions = Number(lsGet(K_SESSIONS) || 0);
  let views = 0;
  try { views = Number(sessionStorage.getItem(S_VIEWS) || 0); } catch { /* لا شيء */ }
  return sessions >= 2 || views >= 3;
}

export function isSnoozed(): boolean {
  return Date.now() < Number(lsGet(K_SNOOZE) || 0);
}

/** «ليس الآن»: ١٤ يوماً، ثمّ ٤٥ يوماً من الرفض الثاني فصاعداً */
export function snooze() {
  const n = Number(lsGet(K_DISMISS_COUNT) || 0) + 1;
  lsSet(K_DISMISS_COUNT, String(n));
  lsSet(K_SNOOZE, String(Date.now() + (n >= 2 ? 45 : 14) * DAY));
}

/* ── اشتراك بسيط في التغيّرات (وصول الحدث، التثبيت) ── */

const listeners = new Set<() => void>();
export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function notify() { listeners.forEach((fn) => fn()); }

/** يفتح واجهة التثبيت من أيّ مكان (القائمة، التذييل…) */
export const OPEN_EVENT = "bz:install-open";
export function openInstall() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
