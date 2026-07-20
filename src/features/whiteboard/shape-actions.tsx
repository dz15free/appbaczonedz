"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup, faCopy, faRobot, faTrash, faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { saveFlashcard } from "@/features/study/save-flashcard";
import { describeShape, type GeoShape } from "@/features/whiteboard/shape-geometry";
import { TAGS, tagInfo, type MarkTag } from "@/features/whiteboard/marks";

/* ════════════════════════════════════════════════════════════
   إجراءات العنصر المحدَّد على السبورة

   تفتحها ضغطة مطوّلة على الهاتف، أو زر ⋯ على الحاسوب.

   قرار مقصود: البطاقة تُحفظ **نصاً** لا صورة، كما اتفقنا.
   عنصر النص يملأ وجه البطاقة تلقائياً، أما الرسم فلا نصّ له
   فيكتبه الطالب بنفسه — وهذا ما ستحلّه مرحلة OCR لاحقاً.
   لم أزيّف الأمر بحفظ صورة، لأن بطاقة صورة لا تُراجَع ولا تُبحث.
════════════════════════════════════════════════════════════ */

export function ShapeActionsSheet({
  open, onClose, shape, uid, roomName, subject, canDelete, onDelete, canMark, currentTag, onMark,
}: {
  open: boolean;
  onClose: () => void;
  shape: GeoShape | null;
  uid: string;
  roomName?: string;
  subject?: string | null;
  canDelete: boolean;
  onDelete: () => void;
  canMark?: boolean;
  currentTag?: MarkTag | null;
  onMark?: (tag: MarkTag | null) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "card">("menu");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const isText = shape?.kind === "text" && !!shape.text;

  useEffect(() => {
    if (!open) { setMode("menu"); setDone(null); return; }
    setFront(isText ? (shape?.text ?? "") : "");
    setBack("");
  }, [open, isText, shape?.text]);

  function flash(msg: string) {
    setDone(msg);
    setTimeout(() => setDone(null), 1500);
  }

  async function save() {
    if (!front.trim()) return;
    await saveFlashcard({
      uid,
      front: front.trim(),
      back: back.trim() || front.trim(),
      subject: subject || "general",
      source: roomName ? `سبورة ${roomName}` : "السبورة",
    });
    flash("حُفظت في بطاقاتك ✓");
    setTimeout(onClose, 900);
  }

  function copyText() {
    if (!shape?.text) return;
    navigator.clipboard?.writeText(shape.text)
      .then(() => flash("نُسخ ✓"))
      .catch(() => {});
  }

  function askAi() {
    if (!shape?.text) return;
    // نمرّر السؤال عبر الرابط — صفحة الخبّاشة تلتقطه
    router.push(`/omibot?q=${encodeURIComponent(`اشرح لي هذا: ${shape.text}`)}`);
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={shape ? describeShape(shape) : "عنصر"}
      maxHeight="80vh"
    >
      {done && (
        <p className="mb-2 rounded-xl bg-secondary/10 px-3 py-2 text-center text-xs font-bold text-secondary">
          {done}
        </p>
      )}

      {mode === "menu" ? (
        <div className="space-y-1.5 pb-2">
          <Row
            icon={faLayerGroup}
            label="حفظ كبطاقة مراجعة"
            hint={isText ? "النص جاهز — راجعه وأضف الجواب" : "اكتب السؤال بنفسك"}
            onClick={() => setMode("card")}
          />
          {isText && (
            <>
              <Row icon={faCopy} label="نسخ النص" onClick={copyText} />
              <Row icon={faRobot} label="اسأل الخبّاشة عنه" onClick={askAi} />
            </>
          )}
          {canMark && onMark && (
            <div className="rounded-2xl border border-border p-2.5">
              <p className="mb-2 px-1 text-[11px] font-bold text-text-muted">
                تعليم العنصر — تنتقل العلامة إلى بطاقات الطلاب
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => {
                  const active = currentTag === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { onMark(active ? null : t.id); flash(active ? "أُزيلت العلامة" : `${t.emoji} ${t.label}`); }}
                      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95"
                      style={
                        active
                          ? { background: `${t.color}1f`, borderColor: t.color, color: t.color }
                          : { borderColor: "var(--bz-border)", color: "var(--bz-text-muted)" }
                      }
                    >
                      <span className="leading-none">{t.emoji}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {canDelete && (
            <Row
              icon={faTrash}
              label="حذف من السبورة"
              danger
              onClick={() => { onDelete(); onClose(); }}
            />
          )}
          {!isText && (
            <p className="px-2 pt-2 text-[11px] leading-relaxed text-text-muted">
              هذا رسم لا نصّ فيه، فلا يمكن نسخه أو سؤال الخبّاشة عنه بعد.
            </p>
          )}
        </div>
      ) : (
        <div className="pb-2">
          <label className="block text-xs font-bold text-text-muted">وجه البطاقة (السؤال)</label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={2}
            dir="auto"
            autoFocus={!isText}
            placeholder="ما الذي تريد أن تتذكّره؟"
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />

          <label className="mt-3 block text-xs font-bold text-text-muted">ظهر البطاقة (الجواب)</label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={3}
            dir="auto"
            placeholder="اتركه فارغاً ليُنسخ وجه البطاقة"
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setMode("menu")}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-text-muted"
            >
              رجوع
            </button>
            <button
              onClick={save}
              disabled={!front.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
              حفظ البطاقة
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function Row({ icon, label, hint, onClick, danger }: {
  icon: typeof faCopy; label: string; hint?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition active:scale-[0.98] ${
        danger ? "hover:bg-danger/10" : "hover:bg-primary/5"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
        danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
      }`}>
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${danger ? "text-danger" : "text-text-primary"}`}>{label}</span>
        {hint && <span className="block text-[11px] text-text-muted">{hint}</span>}
      </span>
    </button>
  );
}
