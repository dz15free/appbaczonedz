"use client";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faNoteSticky } from "@fortawesome/free-solid-svg-icons";
import { saveRoomNotes, listenRoomNotes } from "@/features/rooms/rooms";

export function RoomNotes({ roomId, isOwner, roomName }: { roomId: string; isOwner: boolean; roomName: string }) {
  const [localNotes, setLocalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  useEffect(() => listenRoomNotes(roomId, (t) => {
    if (!isTyping.current) setLocalNotes(t);
  }), [roomId]);

  function handleChange(val: string) {
    setLocalNotes(val); isTyping.current = true; setSaving(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      await saveRoomNotes(roomId, val); setSaving(false); isTyping.current = false;
    }, 800);
  }

  function exportPDF() {
    const win = window.open("", "_blank"); if (!win) return;
    const html = localNotes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>ملاحظات — ${roomName}</title>
<style>body{font-family:Arial,sans-serif;direction:rtl;padding:40px;max-width:800px;margin:0 auto;color:#1a1a2e;line-height:1.8}
h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px;font-size:1.5rem}
.meta{color:#666;font-size:.85rem;margin-bottom:24px}.content{font-size:1rem}
@media print{body{padding:0}}</style></head><body>
<h1>📝 ملاحظات الغرفة — ${roomName}</h1>
<div class="meta">📅 ${new Date().toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
<div class="content">${html}</div>
<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5" style={{ background: "rgba(10,11,16,0.7)" }}>
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faNoteSticky} className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold" style={{ color: "var(--studio-text)" }}>ملاحظات مشتركة</span>
          {isOwner && saving && <span className="text-[10px] text-white/40">حفظ...</span>}
          {isOwner && !saving && localNotes && <span className="text-[10px] text-secondary/70">محفوظ ✓</span>}
        </div>
        {localNotes && (
          <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-400/10 transition">
            <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> تصدير PDF
          </button>
        )}
      </div>
      {isOwner ? (
        <textarea value={localNotes} onChange={(e) => handleChange(e.target.value)}
          placeholder={"اكتب ملخّص الدرس هنا... يظهر للطلاب في الوقت الفعلي 📝\n\n- يمكنك كتابة المعادلات والنقاط المهمة\n- الطلاب يرونها مباشرة\n- اضغط 'تصدير PDF' لحفظها"}
          className="flex-1 resize-none bg-transparent p-4 text-sm outline-none" dir="auto"
          style={{ color: "var(--studio-text)", caretColor: "#6366f1" }} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {localNotes ? (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed" dir="auto" style={{ color: "var(--studio-text)", fontFamily: "inherit" }}>{localNotes}</pre>
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <FontAwesomeIcon icon={faNoteSticky} className="h-10 w-10 text-amber-400 opacity-20" />
                <p className="mt-3 text-sm" style={{ color: "var(--studio-faint)" }}>سيكتب المعلّم ملاحظات الدرس هنا...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
