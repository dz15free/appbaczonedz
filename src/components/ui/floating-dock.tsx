"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faXmark, faHeadset } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { SupportChatSheet } from "@/features/support/support-chat";

/* ════════════════════════════════════════════════════════════
   الأزرار العائمة — زرّان مستقلّان، تحت كل أيقونة عنوانها

   يفهم الزائر فوراً وظيفة كل زر:
     • الخبّاشة → مساعد ذكي (شات بوت) — الأبرز
     • الإدارة  → تواصل مباشر مع إدارة الموقع

   الفقاعة التعريفية تظهر عند زر الخبّاشة تحديداً (لا فوق الإدارة).
   الصفّ يرتفع فوق شريط التنقّل السفلي عبر safe-area، فلا تصادم.
════════════════════════════════════════════════════════════ */

const MSG_PRIMARY = "كِشما تحتاج، راني هنا! 👋";
const MSG_SECONDARY = "الخبّاشة — متحصّلة على معدّل 18 في الباك 🎓";

export function FloatingDock() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const t1 = setTimeout(() => { setVisible(true); setShowSecondary(false); setAnimKey((k) => k + 1); }, 1200);
    const t2 = setTimeout(() => { setShowSecondary(true); setAnimKey((k) => k + 1); }, 4700);
    const t3 = setTimeout(() => { setShowSecondary(false); setAnimKey((k) => k + 1); }, 8200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dismissed]);

  return (
    <>
      {/* الهاتف: مرفوعة فوق شريط التنقّل السفلي.
          الحاسوب: قريبة من الزاوية السفلية كالمواقع الاحترافية (لا شريط سفلي هناك). */}
      <div className="bz-dock fixed left-4 z-30 flex items-end gap-3 lg:left-6">
        {/* ── الخبّاشة (الشات بوت) — الأبرز، وفوقه الفقاعة ── */}
        <div className="relative flex flex-col items-center gap-1.5">
          {/* الفقاعة التعريفية — ملتصقة بزر الخبّاشة */}
          {visible && !dismissed && (
            <div
              key={animKey}
              className="animate-bubble-in absolute bottom-full mb-2 w-max max-w-[190px] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-1.5 shadow-glass sm:max-w-[220px]"
            >
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
              <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-l border-border bg-surface" />
            </div>
          )}

          <Link
            href="/aibot"
            aria-label="الخبّاشة — المساعد الذكي"
            className="group relative grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-white shadow-glow transition hover:scale-105 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping-slow" />
            <FontAwesomeIcon icon={faRobot} className="relative h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-secondary" />
          </Link>
          <span className="text-[10px] font-extrabold text-primary">الخبّاشة</span>
        </div>

        {/* ── الإدارة (للمستخدم المسجّل) ── */}
        {user && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => setSupportOpen(true)}
              aria-label="تواصل مع إدارة الموقع"
              className="group relative grid h-[46px] w-[46px] place-items-center rounded-full border border-border bg-surface text-primary shadow-glass transition hover:scale-105 active:scale-95"
            >
              <FontAwesomeIcon icon={faHeadset} className="h-[18px] w-[18px]" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-secondary" />
            </button>
            <span className="text-[10px] font-extrabold text-text-muted">الإدارة</span>
          </div>
        )}
      </div>

      <SupportChatSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
