"use client";

import { Icon } from "@/components/ui/icon";
import { unbanUser } from "@/features/rooms/rooms";

/* ════════════════════════════════════════════════════════════
   رصيف الغرفة — لوحة جانبية واحدة بتبويبات

   ── ما يُصلحه ──
   • الأسئلة المجهولة كانت في ورقة سفلية للمالك وحده، فتُنسى.
   • قائمة المحظورين كانت داخل درج **لا يُفتح أبداً**: الحالة
     `showParticipants` لا تُضبط `true` في أيّ موضع من الصفحة، أي أنّ
     «فكّ الحظر» كان غير قابل للوصول إطلاقاً. عادت هنا في مكان ظاهر.
   • على الهاتف كان لكل لوحة نافذتها: درج دردشة بـ`fixed inset-0`،
     وورقة للحاضرين، وأخرى للأسئلة. الآن نفس المكوّن يُستعمل جانباً
     على الحاسوب وداخل ورقة واحدة على الهاتف.

   المكوّن لا يجلب بيانات: يستقبل اللوحات جاهزة من الصفحة، فلا
   مستمع RTDB مكرّر ولا حالة ثانية للشيء نفسه.
   ════════════════════════════════════════════════════════════ */

export type DockTab = "chat" | "class" | "questions";

export function RoomDock({
  tab, onTab, chatEnabled, handsCount, unreadChat, unansweredAnon,
  chatPanel, classPanel, questionsPanel, showQuestions,
  roomId, banned, isOwner,
}: {
  tab: DockTab;
  onTab: (t: DockTab) => void;
  chatEnabled: boolean;
  handsCount: number;
  unreadChat: number;
  unansweredAnon: number;
  chatPanel: React.ReactNode;
  classPanel: React.ReactNode;
  questionsPanel?: React.ReactNode;
  showQuestions: boolean;
  roomId: string;
  banned: Set<string>;
  isOwner: boolean;
}) {
  const tabs: { id: DockTab; label: string; icon: Parameters<typeof Icon>[0]["name"]; badge?: number; on: boolean }[] = [
    { id: "chat", label: "الدردشة", icon: "chat", badge: unreadChat, on: chatEnabled },
    { id: "class", label: "الصفّ", icon: "users", badge: handsCount, on: true },
    { id: "questions", label: "الأسئلة", icon: "anon", badge: unansweredAnon, on: showQuestions },
  ];
  const visible = tabs.filter((t) => t.on);
  const active = visible.some((t) => t.id === tab) ? tab : visible[0]?.id ?? "class";

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 gap-1 border-b border-border px-1.5 pt-1.5">
        {visible.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={`bz-dock-tab relative flex flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2 text-[11.5px] font-extrabold transition ${
              active === t.id
                ? "bg-[var(--bz-blue-050)] text-[var(--bz-blue-700)]"
                : "text-text-muted hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
            {!!t.badge && t.badge > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {active === "chat" && chatEnabled && chatPanel}
        {active === "class" && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">{classPanel}</div>
            {/* المحظورون — كانت هذه القائمة غير قابلة للوصول */}
            {isOwner && banned.size > 0 && (
              <div className="shrink-0 border-t border-border p-2.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold text-danger">
                  <Icon name="lock" size={12} /> المحظورون ({banned.size})
                </p>
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {[...banned].map((uid) => (
                    <div key={uid} className="flex items-center justify-between gap-2 rounded-lg bg-danger/5 px-2.5 py-1.5">
                      <span className="truncate font-mono text-[10.5px] text-text-muted" dir="ltr">{uid.slice(0, 12)}…</span>
                      <button
                        type="button"
                        onClick={() => unbanUser(roomId, uid)}
                        className="shrink-0 rounded-lg bg-secondary/10 px-2 py-0.5 text-[10.5px] font-extrabold text-secondary transition hover:bg-secondary/20"
                      >
                        فكّ الحظر
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {active === "questions" && showQuestions && (
          <div className="h-full overflow-y-auto p-2.5">{questionsPanel}</div>
        )}
      </div>
    </div>
  );
}
