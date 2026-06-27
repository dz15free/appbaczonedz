"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMobileScreen, faArrowUpFromBracket, faSquarePlus, faDownload } from "@fortawesome/free-solid-svg-icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DISMISS_KEY = "bz-pwa-dismissed";

export function InstallAppBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // إن كان مثبّتاً مسبقاً (standalone) لا نعرض شيئاً
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // أُغلق سابقاً؟
    try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch {}

    // كشف الهاتف فقط (لا حاسوب)
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (!isMobile) return;

    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsIOS(ios);

    // أندرويد: التقاط حدث التثبيت
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS لا يدعم beforeinstallprompt → نعرض التعليمات مباشرة
    if (ios) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 to-secondary/5 p-4 lg:hidden">
      <button onClick={dismiss} aria-label="إغلاق"
        className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-text-muted hover:bg-black/5 hover:text-danger">
        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
          <FontAwesomeIcon icon={faMobileScreen} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1 pe-6">
          <h3 className="font-display text-base font-extrabold">ثبّت BacZoneDZ على هاتفك 📲</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
            تجربة أسرع وأكثر احترافية — مثل تطبيق حقيقي على شاشتك الرئيسية.
          </p>

          {isIOS ? (
            <div className="mt-3 space-y-1.5 rounded-xl bg-surface/80 p-3 text-xs">
              <p className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">1</span>
                اضغط زر المشاركة <FontAwesomeIcon icon={faArrowUpFromBracket} className="h-3 w-3 text-primary" /> في أسفل المتصفّح
              </p>
              <p className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">2</span>
                اختر <span className="font-bold">«إضافة إلى الشاشة الرئيسية»</span> <FontAwesomeIcon icon={faSquarePlus} className="h-3 w-3 text-primary" />
              </p>
            </div>
          ) : (
            <button onClick={install}
              className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
              <FontAwesomeIcon icon={faDownload} className="h-4 w-4" /> تثبيت التطبيق
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
