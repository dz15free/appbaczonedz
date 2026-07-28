"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeadset, faPaperPlane, faCreditCard, faComments } from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/features/auth/auth-provider";
import {
  type SupportKind, type SupportMessage,
  useSupportInfo, listenSupportMessages, sendSupportMessage,
} from "@/features/support/admin-chat";
import { RichText } from "@/components/ui/linkify";

/* ════════════════════════════════════════════════════════════
   زر التواصل مع الإدارة + لوحة الدردشة
   خيطان منفصلان: عام / دفع
════════════════════════════════════════════════════════════ */

export function SupportChatSheet({
  open, onClose, initialKind = "general",
}: {
  open: boolean; onClose: () => void; initialKind?: SupportKind;
}) {
  const { user } = useAuth();
  const info = useSupportInfo();
  const [kind, setKind] = useState<SupportKind>(initialKind);
  const [list, setList] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setKind(initialKind); }, [open, initialKind]);

  useEffect(() => {
    if (!open || !user || !info.adminUid) { setList([]); return; }
    const unsub = listenSupportMessages(user.uid, info.adminUid, kind, setList);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [open, user, info.adminUid, kind]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [list.length, open]);

  async function send() {
    if (!text.trim() || !user || !info.adminUid || busy) return;
    setBusy(true);
    const t = text;
    setText("");
    try {
      await sendSupportMessage(
        { uid: user.uid, name: user.displayName || "مستخدم" },
        info.adminUid, info.adminName, kind, t
      );
    } catch {
      setText(t);
      alert("تعذّر الإرسال. حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  const notConfigured = !info.adminUid;

  return (
    <BottomSheet open={open} onClose={onClose} title={`💬 ${info.adminName}`} maxHeight="88vh">
      {!user ? (
        <p className="py-10 text-center text-sm text-text-muted">سجّل الدخول لمراسلة الإدارة.</p>
      ) : notConfigured ? (
        <div className="py-8 text-center">
          <p className="text-sm font-bold text-text-primary">الدردشة المباشرة غير مُفعّلة بعد.</p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            يمكنك مراسلتنا على:<br />
            <span className="font-bold text-primary" dir="ltr">{info.adminEmail}</span>
          </p>
        </div>
      ) : (
        <div className="flex h-[70vh] flex-col">
          {/* تبديل الخيط */}
          <div className="flex shrink-0 gap-1.5 pb-2">
            <KindTab active={kind === "general"} icon={faComments} label="استفسار عام" onClick={() => setKind("general")} />
            <KindTab active={kind === "payment"} icon={faCreditCard} label="الدفع" onClick={() => setKind("payment")} />
          </div>

          {/* الرسائل */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background p-3">
            {list.length === 0 ? (
              <div className="py-10 text-center">
                <FontAwesomeIcon icon={faHeadset} className="h-7 w-7 text-text-muted" />
                <p className="mt-2 text-sm font-bold text-text-primary">
                  {kind === "payment" ? "استفسار عن الدفع" : "كيف يمكننا مساعدتك؟"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                  {kind === "payment"
                    ? "اكتب رقم طلبك أو اسم المحتوى الذي تريد شراءه، وسنرد عليك هنا."
                    : "اكتب رسالتك وسيصلك الرد في هذه الدردشة."}
                </p>
              </div>
            ) : (
              list.map((m) => {
                const mine = m.senderId === user.uid;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        mine
                          ? "rounded-br-sm bg-gradient-primary text-white"
                          : "rounded-bl-sm border border-border bg-surface text-text-primary"
                      }`}
                      dir="auto"
                    >
                      <RichText text={m.text} compact />
                      <span className={`mt-1 block text-[9px] ${mine ? "text-white/60" : "text-text-muted"}`}>
                        {new Date(m.createdAt).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* الإرسال */}
          <div className="flex shrink-0 items-end gap-2 pt-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              dir="auto"
              placeholder="اكتب رسالتك..."
              className="max-h-24 min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={send}
              disabled={!text.trim() || busy}
              aria-label="إرسال"
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-gradient-primary text-white transition active:scale-90 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function KindTab({ active, icon, label, onClick }: {
  active: boolean; icon: typeof faHeadset; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition active:scale-95 ${
        active ? "bg-gradient-primary text-white shadow" : "border border-border text-text-muted"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* الزر العائم — يجاور زر الخبّاشة دون أن يزاحمه */
export function SupportFloatingButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <>
      <div className="fixed bottom-40 left-4 z-30 lg:bottom-24">
        <button
          onClick={() => setOpen(true)}
          title="تواصل مع الإدارة"
          aria-label="تواصل مع الإدارة"
          className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface text-primary shadow-glass transition hover:scale-105 active:scale-95"
        >
          <FontAwesomeIcon icon={faHeadset} className="h-5 w-5" />
        </button>
      </div>
      <SupportChatSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
