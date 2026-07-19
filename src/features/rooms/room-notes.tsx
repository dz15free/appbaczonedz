"use client";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf, faNoteSticky, faHeading, faBold, faUnderline, faListUl,
  faSquareRootVariable, faArrowRightLong, faMinus, faQuoteRight, faEye, faPen, faHighlighter,
} from "@fortawesome/free-solid-svg-icons";
import { saveRoomNotes, listenRoomNotes } from "@/features/rooms/rooms";

declare global {
  interface Window { katex?: any; renderMathInElement?: any; }
}

function useKatex() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.katex && window.renderMathInElement) { setReady(true); return; }
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css"; link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
      document.head.appendChild(link);
    }
    const load = (src: string) => new Promise<void>((res, rej) => {
      const s = document.createElement("script"); s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s);
    });
    load("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js")
      .then(() => load("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"))
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);
  return ready;
}

function renderMarkdown(src: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = src.split("\n");
  let html = "";
  let inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };

  const inline = (s: string): string => {
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<u>$1</u>");
    s = s.replace(/==(.+?)==/g, "<mark>$1</mark>");
    s = s.replace(/-&gt;/g, "→").replace(/=&gt;/g, "⇒").replace(/&lt;-/g, "←");
    return s;
  };

  for (const line of lines) {
    if (/^###\s+/.test(line)) { closeList(); html += `<h3>${inline(esc(line.replace(/^###\s+/, "")))}</h3>`; continue; }
    if (/^##\s+/.test(line)) { closeList(); html += `<h2>${inline(esc(line.replace(/^##\s+/, "")))}</h2>`; continue; }
    if (/^#\s+/.test(line)) { closeList(); html += `<h1>${inline(esc(line.replace(/^#\s+/, "")))}</h1>`; continue; }
    if (/^>\s+/.test(line)) { closeList(); html += `<blockquote>${inline(esc(line.replace(/^>\s+/, "")))}</blockquote>`; continue; }
    if (/^---\s*$/.test(line)) { closeList(); html += `<hr/>`; continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(esc(line.replace(/^[-*]\s+/, "")))}</li>`; continue;
    }
    closeList();
    if (line.trim() === "") { html += "<br/>"; continue; }
    html += `<p>${inline(esc(line))}</p>`;
  }
  closeList();
  return html;
}

export function RoomNotes({ roomId, isOwner, roomName }: { roomId: string; isOwner: boolean; roomName: string }) {
  const [localNotes, setLocalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(!isOwner);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const katexReady = useKatex();

  useEffect(() => listenRoomNotes(roomId, (t) => {
    if (!isTyping.current) setLocalNotes(t);
  }), [roomId]);

  useEffect(() => {
    if (!katexReady || !previewRef.current || !window.renderMathInElement) return;
    try {
      window.renderMathInElement(previewRef.current, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    } catch { /* تجاهل */ }
  }, [localNotes, preview, katexReady]);

  function handleChange(val: string) {
    setLocalNotes(val); isTyping.current = true; setSaving(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      await saveRoomNotes(roomId, val); setSaving(false); isTyping.current = false;
    }, 800);
  }

  function wrap(before: string, after = before, placeholder = "") {
    const ta = taRef.current; if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = localNotes.slice(start, end) || placeholder;
    const next = localNotes.slice(0, start) + before + sel + after + localNotes.slice(end);
    handleChange(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  }
  function prefix(p: string, placeholder = "") {
    const ta = taRef.current; if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = localNotes.lastIndexOf("\n", start - 1) + 1;
    const sel = localNotes.slice(lineStart, ta.selectionEnd) || placeholder;
    const next = localNotes.slice(0, lineStart) + p + sel + localNotes.slice(ta.selectionEnd);
    handleChange(next);
    setTimeout(() => ta.focus(), 0);
  }
  function insert(text: string) {
    const ta = taRef.current; if (!ta) return;
    const start = ta.selectionStart;
    const next = localNotes.slice(0, start) + text + localNotes.slice(ta.selectionEnd);
    handleChange(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); }, 0);
  }

  function exportPDF() {
    const win = window.open("", "_blank"); if (!win) return;
    const body = renderMarkdown(localNotes);
    const dateStr = new Date().toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>ملاحظات — ${roomName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<style>
*{box-sizing:border-box}
body{font-family:'Segoe UI','Tajawal',Arial,sans-serif;direction:rtl;padding:48px 56px;max-width:820px;margin:0 auto;color:#1a1a2e;line-height:1.9}
.head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:14px;margin-bottom:8px}
.head h1{color:#2563eb;font-size:1.6rem;margin:0}
.brand{font-weight:800;color:#2563eb;font-size:1.1rem}
.meta{color:#64748b;font-size:.85rem;margin-bottom:28px}
h1,h2,h3{color:#1e3a8a;margin:1.2em 0 .5em}
h1{font-size:1.5rem;border-bottom:2px solid #dbeafe;padding-bottom:6px}
h2{font-size:1.25rem}h3{font-size:1.08rem}
p{margin:.5em 0}ul{margin:.5em 1.5em}li{margin:.3em 0}
blockquote{border-inline-start:4px solid #2563eb;background:#f0f7ff;margin:.8em 0;padding:.6em 1em;border-radius:8px;color:#334155}
mark{background:#fef08a;padding:0 3px;border-radius:3px}
hr{border:none;border-top:2px dashed #cbd5e1;margin:1.5em 0}
u{text-decoration-color:#2563eb;text-decoration-thickness:2px}
.foot{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:center;color:#94a3b8;font-size:.75rem}
@media print{body{padding:24px}}
</style></head><body>
<div class="head"><h1>📝 ملاحظات الدرس</h1><span class="brand">BacZone</span></div>
<div class="meta">📚 ${roomName} · 📅 ${dateStr}</div>
<div class="content">${body}</div>
<div class="foot">تمّ إنشاؤه عبر منصّة BacZone</div>
<script>window.onload=function(){renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false});setTimeout(function(){window.print();},400);};</script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background/50 px-2 py-1.5">
      <ToolBtn icon={faHeading} title="عنوان رئيسي" onClick={() => prefix("# ", "عنوان")} />
      <ToolBtn label="ع٢" title="عنوان ثانوي" onClick={() => prefix("## ", "عنوان ثانوي")} />
      <ToolBtn label="ع٣" title="عنوان فرعي" onClick={() => prefix("### ", "عنوان فرعي")} />
      <Div />
      <ToolBtn icon={faBold} title="عريض" onClick={() => wrap("**", "**", "نص")} />
      <ToolBtn icon={faUnderline} title="تسطير" onClick={() => wrap("__", "__", "نص")} />
      <ToolBtn icon={faHighlighter} title="تظليل" onClick={() => wrap("==", "==", "نص")} />
      <Div />
      <ToolBtn icon={faListUl} title="قائمة" onClick={() => prefix("- ", "عنصر")} />
      <ToolBtn icon={faQuoteRight} title="اقتباس" onClick={() => prefix("> ", "اقتباس")} />
      <ToolBtn icon={faMinus} title="خط فاصل" onClick={() => insert("\n---\n")} />
      <ToolBtn icon={faArrowRightLong} title="سهم" onClick={() => insert(" → ")} />
      <Div />
      <ToolBtn icon={faSquareRootVariable} title="معادلة رياضية" onClick={() => wrap("$", "$", "x^2")} />
      <ToolBtn label="∑" title="معادلة مستقلّة" onClick={() => insert("\n$$ \\sum_{i=1}^{n} i $$\n")} />
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faNoteSticky} className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-text-primary">ملاحظات مشتركة</span>
          {isOwner && saving && <span className="text-[10px] text-text-muted">حفظ...</span>}
          {isOwner && !saving && localNotes && <span className="text-[10px] text-secondary">محفوظ ✓</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {isOwner && (
            <button onClick={() => setPreview((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition">
              <FontAwesomeIcon icon={preview ? faPen : faEye} className="h-3.5 w-3.5" />
              {preview ? "تحرير" : "معاينة"}
            </button>
          )}
          {localNotes && (
            <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition">
              <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> PDF
            </button>
          )}
        </div>
      </div>

      {isOwner && !preview && toolbar}

      {isOwner && !preview ? (
        <textarea ref={taRef} value={localNotes} onChange={(e) => handleChange(e.target.value)}
          placeholder={"اكتب ملخّص الدرس... استعمل شريط الأدوات للتنسيق 📝\n\n# عنوان رئيسي\n## عنوان ثانوي\n- نقطة مهمّة\n**عريض**  __مُسطّر__  ==مُظلّل==\n\nمعادلة: $E = mc^2$\n$$ \\frac{a}{b} = c $$"}
          className="flex-1 resize-none bg-transparent p-4 text-sm leading-relaxed text-text-primary outline-none" dir="auto" style={{ caretColor: "rgb(var(--bz-primary, 37 99 235))" }} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {localNotes ? (
            <div ref={previewRef} className="bz-notes-preview text-sm leading-relaxed text-text-primary" dir="auto"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(localNotes) }} />
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <FontAwesomeIcon icon={faNoteSticky} className="h-10 w-10 text-amber-400 opacity-20" />
                <p className="mt-3 text-sm text-text-muted">{isOwner ? "ابدأ الكتابة..." : "سيكتب المعلّم ملاحظات الدرس هنا..."}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, title, onClick }: { icon?: typeof faBold; label?: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} type="button"
      className="grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-xs font-bold text-text-muted transition hover:bg-primary/10 hover:text-primary">
      {icon ? <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" /> : <span>{label}</span>}
    </button>
  );
}
function Div() { return <span className="mx-0.5 h-5 w-px bg-border" />; }
