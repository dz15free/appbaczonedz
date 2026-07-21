"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faXmark, faHeadset, faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { SupportChatSheet } from "@/features/support/support-chat";

/* ════════════════════════════════════════════════════════════
   الأزرار العائمة — زرّ واحد رئيسي (الخبّاشة) يفتح قائمة صغيرة

   التصميم السابق كوّم زرّين بحجم 56px فوق بعضهما في الزاوية،
   فبدا مزدحماً وتصادم مع شريط التنقّل السفلي على الهاتف.

   الآن: زرّ رئيسي واحد للخبّاشة، وزرّ صغير ⋮ يفتح إجراءً واحداً
   (التواصل مع الإدارة) فوقه. الشاشة تبقى نظيفة، ويتّسع التصميم
   لإجراءات إضافية لاحقاً دون أي تصادم.

   الموضع يرفع العمود فوق شريط التنقّل السفلي (hidden على lg)
   عبر safe-area + مسافة كافية، ثم يعود للأسفل على الحاسوب.
════════════════════════════════════════════════════════════ */

const MSG_PRIMARY = "كِشما تحتاج، راني هنا! 👋";
const MSG_SECONDARY = "الخبّاشة — متحصّلة على معدّل 18 في الباك 🎓";

export function FloatingDock() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // فقاعة التعريف: تظهر مرّة، تتبدّل الرسالة، ثم تستقرّ
  useEffect(() => {
    if (dismissed) return;
    const t1 = setTimeout(() => { setVisible(true); setShowSecondary(false); setAnimKey((k) => k + 1); }, 1200);
    const t2 = setTimeout(() => { setShowSecondary(true); setAnimKey((k) => k + 1); }, 4700);
    const t3 = setTimeout(() => { setShowSecondary(false); setAnimKey((k) => k + 1); }, 8200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dismissed]);

  // إغلاق القائمة عند النقر خارجها أو ضغط Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // فتح الفقاعة يُلغى بمجرّد فتح القائمة حتى لا يتراكبا
  useEffect(() => { if (menuOpen) setDismissed(true); }, [menuOpen]);

  return (
    <>
      <div
        ref={menuRef}
        className="fixed left-4 z-30 flex flex-col items-start gap-2.5"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        {/* فقاعة التعريف — تظهر فقط قبل فتح القائمة */}
        {visible && !dismissed && !menuOpen && (
          <div
            key={animKey}
            className="animate-bubble-in relative mb-0.5 w-max max-w-[190px] rounded-2xl rounded-bl-sm border border-border bg-surface px-3 py-1.5 shadow-glass sm:max-w-[220px]"
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

        {/* إجراءات القائمة — تظهر فوق الزرّ الرئيسي عند الفتح */}
        {menuOpen && user && (
          <div className="bz-radial-in flex flex-col items-start gap-2">
            <button
              onClick={() => { setSupportOpen(true); setMenuOpen(false); }}
              className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-2 pr-2 pl-4 shadow-glass transition active:scale-95"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <FontAwesomeIcon icon={faHeadset} className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap text-sm font-bold text-text-primary">تواصل مع الإدارة</span>
            </button>
          </div>
        )}

        {/* صفّ الزرّ الرئيسي: الخبّاشة + مفتاح القائمة الصغير */}
        <div className="flex items-end gap-2">
          <Link
            href="/aibot"
            aria-label="الخبّاشة — المساعد الذكي"
            className="group relative grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-white shadow-glow transition hover:scale-105 active:scale-95"
          >
            {!menuOpen && <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping-slow" />}
            <FontAwesomeIcon icon={faRobot} className="relative h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-secondary" />
          </Link>

          {/* مفتاح القائمة — يظهر فقط للمستخدم المسجّل (لأنّ الإدارة تتطلّب تسجيلاً) */}
          {user && (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "إغلاق القائمة" : "خيارات إضافية"}
              aria-expanded={menuOpen}
              className={`mb-1 grid h-9 w-9 place-items-center rounded-full border shadow-glass transition active:scale-90 ${
                menuOpen
                  ? "rotate-90 border-danger/40 bg-danger/10 text-danger"
                  : "border-border bg-surface text-text-muted hover:text-primary"
              }`}
            >
              <FontAwesomeIcon icon={menuOpen ? faXmark : faEllipsisVertical} className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <SupportChatSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
