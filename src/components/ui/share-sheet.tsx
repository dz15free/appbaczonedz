"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShareNodes, faLink, faCheck, faPaperPlane, faPenToSquare, faShareFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { listenFriends, sendDM, createPost, type Person } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   المشاركة — مكوّن واحد للمنشورات وعناصر المكتبة

   ثلاث وجهات:
     • نسخ الرابط (يعمل خارج المنصّة، ويعيد الزائر إلى نفس الصفحة بعد الدخول)
     • إرسال إلى صديق (رسالة خاصة)
     • النشر على صفحتي

   الرابط المنسوخ مطلق (يحوي النطاق) حتى يعمل في ماسنجر وواتساب.
════════════════════════════════════════════════════════════ */

export interface ShareTarget {
  /** المسار الداخلي، مثل /community/abc أو /library?item=xyz */
  path: string;
  title: string;
  /** نص يُرافق المشاركة */
  summary?: string;
}

export function ShareSheet({ open, onClose, target }: {
  open: boolean; onClose: () => void; target: ShareTarget;
}) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Person[]>([]);
  const [copied, setCopied] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const unsub = listenFriends(user.uid, setFriends);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [open, user]);

  useEffect(() => {
    if (!open) { setCopied(false); setSentTo(null); setPosted(false); setNote(""); }
  }, [open]);

  const url = typeof window !== "undefined" ? `${window.location.origin}${target.path}` : target.path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt("انسخ الرابط:", url);
    }
  }

  // مشاركة النظام (واتساب، ماسنجر...) إن دعمها الجهاز
  async function nativeShare() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (!nav.share) { copy(); return; }
    try {
      await nav.share({ title: target.title, url });
    } catch { /* ألغى المستخدم */ }
  }

  async function sendTo(f: Person) {
    if (!user || busy) return;
    setBusy(true);
    try {
      const text = `${note.trim() ? `${note.trim()}\n` : ""}${target.title}\n${url}`;
      await sendDM(
        { uid: user.uid, name: user.displayName || "مستخدم" },
        { uid: f.uid, name: f.name },
        text
      );
      setSentTo(f.uid);
      setTimeout(() => setSentTo(null), 1800);
    } finally { setBusy(false); }
  }

  async function shareAsPost() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const text = `${note.trim() ? `${note.trim()}\n\n` : ""}${target.title}\n${url}`;
      await createPost(user.uid, user.displayName || "مستخدم", text, undefined, "public");
      setPosted(true);
      setTimeout(onClose, 1200);
    } catch {
      alert("تعذّر النشر. حاول مجدداً.");
    } finally { setBusy(false); }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="مشاركة" maxHeight="86vh">
      <div className="pb-2">
        <p className="truncate rounded-xl bg-primary/5 px-3 py-2 text-xs font-bold text-text-primary" dir="auto">
          {target.title}
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          rows={2}
          dir="auto"
          placeholder="أضف كلمة قبل المشاركة (اختياري)"
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        {/* الوجهات السريعة */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <ActionTile icon={copied ? faCheck : faLink} label={copied ? "نُسخ ✓" : "نسخ الرابط"} onClick={copy} />
          <ActionTile icon={faShareFromSquare} label="مشاركة" onClick={nativeShare} />
          <ActionTile
            icon={posted ? faCheck : faPenToSquare}
            label={posted ? "نُشر ✓" : "على صفحتي"}
            onClick={shareAsPost}
            disabled={busy || posted}
          />
        </div>

        {/* الأصدقاء */}
        <p className="mt-4 text-xs font-bold text-text-muted">إرسال إلى صديق</p>
        {friends.length === 0 ? (
          <p className="mt-1.5 rounded-xl border border-dashed border-border px-3 py-3 text-center text-[11px] text-text-muted">
            لا أصدقاء بعد. أضف أصدقاء من المجتمع لتشاركهم مباشرة.
          </p>
        ) : (
          <div className="mt-1.5 max-h-56 space-y-1.5 overflow-y-auto">
            {friends.map((f) => (
              <button
                key={f.uid}
                onClick={() => sendTo(f)}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-right transition active:scale-[0.98] hover:border-primary disabled:opacity-50"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {f.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{f.name}</span>
                <FontAwesomeIcon
                  icon={sentTo === f.uid ? faCheck : faPaperPlane}
                  className={`h-3.5 w-3.5 shrink-0 ${sentTo === f.uid ? "text-secondary" : "text-text-muted"}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function ActionTile({ icon, label, onClick, disabled }: {
  icon: typeof faLink; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border px-2 py-3 transition active:scale-95 hover:border-primary hover:text-primary disabled:opacity-50"
    >
      <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

/* زر مشاركة جاهز — يفتح اللوحة بنفسه */
export function ShareButton({ target, className, compact }: {
  target: ShareTarget; className?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        title="مشاركة"
        aria-label="مشاركة"
        className={className ?? "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary"}
      >
        <FontAwesomeIcon icon={faShareNodes} className="h-3.5 w-3.5" />
        {!compact && "مشاركة"}
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} target={target} />
    </>
  );
}
