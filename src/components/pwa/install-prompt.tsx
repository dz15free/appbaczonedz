"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark, faDownload, faArrowUpFromBracket, faSquarePlus, faCheck, faCopy, faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import {
  OPEN_EVENT, installMode, isEngaged, isInstalled, isSnoozed, isStandalone, markInstalled,
  notify, recordPageView, runNativePrompt, snooze, subscribeInstall, type InstallPromptEvent,
} from "@/features/pwa/install";

/* ════════════════════════════════════════════════════════════
   تجربة تثبيت التطبيق — مكوّن واحد على مستوى الموقع

   ١. بطاقة صغيرة تطفو أسفل الشاشة بعد تفاعل حقيقي وعشرين ثانية على
      الصفحة — لا فور الدخول، ولا داخل غرفة أو أثناء التسجيل.
   ٢. Chrome/Edge: زرّها يفتح نافذة التثبيت الأصلية مباشرة.
   ٣. Safari على iPhone/iPad: نافذة مصوّرة بالخطوتين (Apple لا تسمح بزرّ).
   ٤. أيّ مكان آخر (القائمة، التذييل) يفتح التدفّق نفسه عبر `openInstall()`.
   وتسجيل خادم الخدمة هنا أيضاً: بدونه لا تعمل صفحة «لا اتّصال».
   ════════════════════════════════════════════════════════════ */

type Sheet = null | "ios" | "ios-other" | "manual" | "installed";

const DAY = 24 * 60 * 60 * 1000;
const AUTO_DELAY_MS = 20_000;

/* صفحات لا نقاطع فيها أحداً */
function isQuietPath(p: string | null) {
  if (!p) return true;
  return (
    /^\/rooms\/[^/]+/.test(p) ||
    /^\/(login|register|onboarding|pay|offline|voice-check|admin)(\/|$)/.test(p) ||
    p.startsWith("/tools/exam-simulator") ||
    /^\/courses\/[^/]+\/learn/.test(p)
  );
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [card, setCard] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  /* هل فُتح التدفّق تلقائياً؟ رفضه حينها يؤجّل الظهور القادم */
  const fromAuto = useRef(false);

  /* خادم الخدمة + تحديث نسخة صفحة «لا اتّصال» مرّة في اليوم */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const run = () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        let last = 0;
        try { last = Number(localStorage.getItem("bz-offline-refreshed") || 0); } catch { /* لا شيء */ }
        if (Date.now() - last < DAY) return;
        const sw = reg.active || reg.waiting || reg.installing;
        sw?.postMessage({ type: "refresh-offline" });
        try { localStorage.setItem("bz-offline-refreshed", String(Date.now())); } catch { /* لا شيء */ }
      }).catch(() => { /* المتصفّح يرفض — الموقع يعمل كما هو */ });
    };
    const later = () => window.setTimeout(run, 3000);
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  }, []);

  /* الأحداث: وصول زرّ التثبيت، اكتماله، وطلب الفتح من القائمة */
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__bzInstallEvt = e as InstallPromptEvent;
      notify();
    };
    const onInstalled = () => { markInstalled(); setCard(false); setSheet(null); };
    const onOpen = () => { fromAuto.current = false; void start(); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_EVENT, onOpen);
    const unsub = subscribeInstall(bump);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_EVENT, onOpen);
      unsub();
    };
  }, []);

  useEffect(() => { recordPageView(); }, [pathname]);

  /* الظهور التلقائي */
  useEffect(() => {
    if (card || sheet) return;
    if (isInstalled() || isSnoozed() || isQuietPath(pathname)) return;
    const t = window.setTimeout(() => {
      if (!isEngaged() || isInstalled() || isSnoozed() || isQuietPath(window.location.pathname)) return;
      const m = installMode();
      if (m === "prompt" || m === "ios-safari") { fromAuto.current = true; setCard(true); }
    }, AUTO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname, card, sheet, version]);

  async function start() {
    setCard(false);
    if (isStandalone()) { setSheet("installed"); return; }
    const m = installMode();
    if (m === "prompt") {
      const ok = await runNativePrompt();
      if (!ok && fromAuto.current) snooze();
      return;
    }
    setSheet(m === "ios-safari" ? "ios" : m);
  }

  function notNow() {
    setCard(false);
    snooze();
  }

  function closeSheet() {
    if (fromAuto.current && sheet !== "installed") snooze();
    fromAuto.current = false;
    setSheet(null);
  }

  const ios = typeof window !== "undefined" && installMode() !== "prompt";

  return (
    <>
      {card && (
        <div className="bz-install-card" role="dialog" aria-label="ثبّت تطبيق BacZone">
          <button type="button" className="bz-install-x" onClick={notNow} aria-label="إغلاق">
            <FontAwesomeIcon icon={faXmark} />
          </button>
          <div className="bz-install-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png?v=3" alt="" width={52} height={52} className="bz-install-icon" />
            <div className="min-w-0">
              <p className="bz-install-title">ثبّت BacZone على {ios ? "هاتفك" : "جهازك"}</p>
              <p className="bz-install-text">يفتح كتطبيق من شاشتك الرئيسية، أسرع وبلا شريط المتصفّح، وتصلك الإشعارات.</p>
            </div>
          </div>
          <div className="bz-install-actions">
            <button type="button" className="bz-install-primary" onClick={() => void start()}>
              <FontAwesomeIcon icon={faDownload} /> {ios ? "كيف أثبّته؟" : "ثبّت التطبيق"}
            </button>
            <button type="button" className="bz-install-ghost" onClick={notNow}>ليس الآن</button>
          </div>
        </div>
      )}

      {sheet && (
        <div className="bz-install-overlay" onClick={closeSheet}>
          <div className="bz-install-sheet" role="dialog" aria-modal="true" aria-labelledby="bz-install-h"
            onClick={(e) => e.stopPropagation()}>
            <button type="button" className="bz-install-x" onClick={closeSheet} aria-label="إغلاق">
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <div className="bz-install-sheet-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png?v=3" alt="" width={60} height={60} className="bz-install-icon" />
              <h2 id="bz-install-h">
                {sheet === "installed" ? "التطبيق مثبّت ✓" : "أضف BacZone إلى شاشتك الرئيسية"}
              </h2>
              <p>
                {sheet === "installed"
                  ? "أنت تستعمل BacZone كتطبيق الآن. لا حاجة لأيّ خطوة."
                  : "يفتح كتطبيق، بلا شريط المتصفّح، وتصلك الإشعارات."}
              </p>
            </div>

            {sheet === "ios" && <IosSteps />}
            {sheet === "ios-other" && <IosOtherBrowser />}
            {sheet === "manual" && <ManualSteps />}

            <button type="button" className="bz-install-primary bz-install-done" onClick={closeSheet}>
              {sheet === "installed" ? "حسناً" : "فهمت"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── آيفون/آيباد في Safari: الخطوات مع رسم لكلّ خطوة ── */
function IosSteps() {
  return (
    <ol className="bz-install-steps">
      <li>
        <span className="bz-install-n">1</span>
        <div className="min-w-0 flex-1">
          <p>اضغط زرّ <b>المشاركة</b> <FontAwesomeIcon icon={faArrowUpFromBracket} className="bz-install-inline" /> في شريط Safari.</p>
          <small>في iOS 26: اضغط <FontAwesomeIcon icon={faEllipsis} className="bz-install-inline" /> أوّلاً ثمّ «مشاركة».</small>
          <SafariBarArt />
        </div>
      </li>
      <li>
        <span className="bz-install-n">2</span>
        <div className="min-w-0 flex-1">
          <p>مرّر للأسفل واختر <b>«إضافة إلى الشاشة الرئيسية»</b> <FontAwesomeIcon icon={faSquarePlus} className="bz-install-inline" />.</p>
          <ShareSheetArt />
        </div>
      </li>
      <li>
        <span className="bz-install-n">3</span>
        <div className="min-w-0 flex-1">
          <p>اضغط <b>«إضافة»</b> في الأعلى. ستجد أيقونة BacZone على شاشتك — افتحه منها.</p>
        </div>
      </li>
    </ol>
  );
}

/* شريط Safari السفلي وزرّ المشاركة مُبرَز */
function SafariBarArt() {
  return (
    <svg className="bz-install-art" viewBox="0 0 280 64" role="img" aria-label="شريط Safari وزرّ المشاركة في وسطه">
      <rect x="1" y="1" width="278" height="62" rx="16" className="art-bg" />
      <g className="art-muted" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 32 l8 -8 M34 32 l8 8" />
        <path d="M86 24 l8 8 l-8 8" />
        <path d="M184 22 h-4 a8 8 0 0 0 -8 8 v12 a2 2 0 0 0 2 2 h12" />
        <rect x="226" y="23" width="18" height="18" rx="4" />
        <rect x="230" y="19" width="18" height="18" rx="4" />
      </g>
      <circle cx="140" cy="32" r="22" className="art-ring" />
      <g className="art-accent" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M133 30 h-3 a2 2 0 0 0 -2 2 v11 a2 2 0 0 0 2 2 h20 a2 2 0 0 0 2 -2 v-11 a2 2 0 0 0 -2 -2 h-3" />
        <path d="M140 37 v-17 M134 25 l6 -6 l6 6" />
      </g>
    </svg>
  );
}

/* قائمة المشاركة وسطر «إضافة إلى الشاشة الرئيسية» مُبرَز */
function ShareSheetArt() {
  return (
    <svg className="bz-install-art" viewBox="0 0 280 118" role="img" aria-label="قائمة المشاركة وفيها إضافة إلى الشاشة الرئيسية">
      <rect x="1" y="1" width="278" height="116" rx="16" className="art-bg" />
      <rect x="12" y="12" width="256" height="28" rx="9" className="art-row" />
      <text x="256" y="31" className="art-txt" textAnchor="end">نسخ</text>
      <rect x="12" y="45" width="256" height="30" rx="9" className="art-hl" />
      <text x="256" y="65" className="art-txt art-txt-strong" textAnchor="end">إضافة إلى الشاشة الرئيسية</text>
      <g className="art-accent" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <rect x="24" y="51" width="18" height="18" rx="5" />
        <path d="M33 55 v10 M28 60 h10" />
      </g>
      <rect x="12" y="80" width="256" height="28" rx="9" className="art-row" />
      <text x="256" y="99" className="art-txt" textAnchor="end">إضافة إلى المفضّلة</text>
    </svg>
  );
}

/* آيفون في Chrome أو داخل تطبيق: التثبيت من Safari وحده */
function IosOtherBrowser() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/home");
      setCopied(true);
    } catch { /* لا حافظة */ }
  }
  return (
    <div className="bz-install-note">
      <p>على آيفون يُثبَّت التطبيق من <b>Safari</b>. افتح الموقع فيه ثمّ اتبع الخطوتين.</p>
      <button type="button" className="bz-install-ghost" onClick={() => void copy()}>
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} /> {copied ? "نُسخ الرابط — الصقه في Safari" : "انسخ رابط الموقع"}
      </button>
    </div>
  );
}

/* متصفّح بلا زرّ تثبيت */
function ManualSteps() {
  return (
    <ul className="bz-install-note bz-install-list">
      <li><b>أندرويد (Chrome أو Samsung):</b> افتح القائمة <FontAwesomeIcon icon={faEllipsis} className="bz-install-inline rotate-90" /> ثمّ «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</li>
      <li><b>الحاسوب (Chrome أو Edge):</b> اضغط أيقونة التثبيت في آخر شريط العنوان، أو من القائمة «تثبيت BacZone».</li>
      <li><b>آيفون:</b> من Safari ← زرّ المشاركة ← «إضافة إلى الشاشة الرئيسية».</li>
    </ul>
  );
}

/* ── الخيار الدائم في القوائم والتذييل ── */
export function InstallAppButton({ className = "", onClick, children }: {
  className?: string;
  /** مثلاً: إغلاق القائمة قبل فتح النافذة */
  onClick?: () => void;
  children: React.ReactNode;
}) {
  /* يُقرَّر بعد التحميل وحده (لا يُعرف الوضع على الخادم) */
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(!isStandalone()); }, []);
  if (!visible) return null;
  return (
    <button type="button" className={className}
      onClick={() => { onClick?.(); window.dispatchEvent(new Event(OPEN_EVENT)); }}>
      {children}
    </button>
  );
}
