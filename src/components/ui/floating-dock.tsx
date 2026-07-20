"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faXmark, faHeadset } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { SupportChatSheet } from "@/features/support/support-chat";

/* ════════════════════════════════════════════════════════════
   الأزرار العائمة — عمود واحد

   كانت فقاعة الخبّاشة تُرسم فوق زرّها بموضع مطلق، وهو نفس
   المكان الذي يجلس فيه زر التواصل، فيتراكبان.

   الحل هنا بنيوي لا تجميلي: كل شيء داخل عمود flex واحد،
   فيدفع بعضه بعضاً تلقائياً ويستحيل التصادم مهما تغيّرت
   الأحجام أو أُضيف زر ثالث لاحقاً.
════════════════════════════════════════════════════════════ */

const MSG_PRIMARY = "كِشما تحتاج، راني هنا! 👋";
const MSG_SECONDARY = "الخباشة — متحصّلة على معدّل 18 في الباك 🎓";
const FAB = "h-14 w-14";

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
      {/* العمود: الفقاعة أعلى، ثم التواصل، ثم الخبّاشة في الأسفل */}
      <div className="fixed bottom-24 left-4 z-30 flex flex-col items-start gap-2.5 lg:bottom-6">
        {/* فقاعة الخبّاشة — في تدفّق العمود، لا بموضع مطلق */}
        {visible && !dismissed && (
          <div
            key={animKey}
            className="animate-bubble-in relative w-max max-w-[190px] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-1.5 shadow-glass sm:max-w-[220px]"
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
            <span className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-l border-border bg-surface" />
          </div>
        )}

        {/* زر التواصل مع الإدارة — بعلامة تشرح وظيفته */}
        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSupportOpen(true)}
              aria-label="تواصل مع إدارة الموقع"
              className={`group relative grid ${FAB} place-items-center rounded-full border border-border bg-surface text-primary shadow-glass transition hover:scale-105 active:scale-95`}
            >
              <FontAwesomeIcon icon={faHeadset} className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-secondary" />
            </button>
            <span className="pointer-events-none rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-text-primary shadow-glass">
              الإدارة
            </span>
          </div>
        )}

        {/* زر الخبّاشة */}
        <div className="flex items-center gap-2">
          <Link
            href="/omibot"
            aria-label="الخباشة — المساعد الذكي"
            className={`group relative grid ${FAB} place-items-center rounded-full bg-gradient-primary text-white shadow-glow transition hover:scale-105 active:scale-95`}
          >
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping-slow" />
            <FontAwesomeIcon icon={faRobot} className="relative h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-secondary" />
          </Link>
          <span className="pointer-events-none rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-text-primary shadow-glass">
            الخبّاشة
          </span>
        </div>
      </div>

      <SupportChatSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
