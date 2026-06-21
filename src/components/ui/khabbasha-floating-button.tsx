"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faXmark } from "@fortawesome/free-solid-svg-icons";

/**
 * زر الخباشة العائم مع فقاعة كلام احترافية.
 * تعرض رسالتين بالتناوب ثم تستقرّ على الأولى:
 *   1) "كِشما تحتاج، راني هنا! 👋"  (الرسالة الثابتة)
 *   2) "الخباشة — متحصّلة على معدّل 18 في الباك 🎓" (تظهر مؤقتاً ثم تختفي)
 */

const MSG_PRIMARY = "كِشما تحتاج، راني هنا! 👋";
const MSG_SECONDARY = "الخباشة — متحصّلة على معدّل 18 في الباك 🎓";

export function KhabbashaFloatingButton() {
  const [visible, setVisible] = useState(false);   // ظهور الفقاعة أصلاً
  const [showSecondary, setShowSecondary] = useState(false); // أيّ رسالة تُعرض
  const [dismissed, setDismissed] = useState(false);
  const [animKey, setAnimKey] = useState(0); // لإعادة تشغيل حركة الكتابة

  useEffect(() => {
    if (dismissed) return;
    // تظهر الفقاعة بعد ثانية من تحميل الصفحة
    const t1 = setTimeout(() => { setVisible(true); setShowSecondary(false); setAnimKey((k) => k + 1); }, 1200);
    // بعد ~3.5 ثانية تتحوّل إلى الرسالة الثانية
    const t2 = setTimeout(() => { setShowSecondary(true); setAnimKey((k) => k + 1); }, 4700);
    // ثم تعود وتستقرّ على الرسالة الأولى
    const t3 = setTimeout(() => { setShowSecondary(false); setAnimKey((k) => k + 1); }, 8200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dismissed]);

  return (
    <div className="fixed bottom-24 left-4 z-30 lg:bottom-6">
      {/* فقاعة الكلام — تظهر فوق الأيقونة على اليمين */}
      {visible && !dismissed && (
        <div
          key={animKey}
          className="animate-bubble-in absolute bottom-full left-0 mb-2 w-max max-w-[180px] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-1.5 shadow-glass sm:max-w-[210px]"
        >
          {/* زر إغلاق */}
          <button
            onClick={(e) => { e.preventDefault(); setDismissed(true); }}
            aria-label="إغلاق"
            className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full border border-border bg-background text-text-muted transition hover:text-danger"
          >
            <FontAwesomeIcon icon={faXmark} className="h-2 w-2" />
          </button>

          <p className={`text-[11px] font-bold leading-snug text-text-primary sm:text-xs ${showSecondary ? "" : "whitespace-nowrap"}`}>
            {showSecondary ? MSG_SECONDARY : MSG_PRIMARY}
          </p>

          {/* ذيل الفقاعة باتجاه الأيقونة (أسفل اليسار) */}
          <span className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 border-b border-l border-border bg-surface" />
        </div>
      )}

      {/* الزر */}
      <Link
        href="/omibot"
        aria-label="الخباشة"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow transition hover:scale-105"
      >
        {/* حلقة نبض */}
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping-slow" />
        <FontAwesomeIcon icon={faRobot} className="relative h-6 w-6" />
        {/* نقطة "متّصلة" */}
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-secondary" />
      </Link>
    </div>
  );
}
