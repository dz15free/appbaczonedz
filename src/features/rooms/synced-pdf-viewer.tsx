"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faSpinner, faMagnifyingGlassPlus, faMagnifyingGlassMinus } from "@fortawesome/free-solid-svg-icons";
import { ref, onValue, set } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/* eslint-disable @typescript-eslint/no-explicit-any */

// تحميل PDF.js من CDN مرّة واحدة
let pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
    s.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) lib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      resolve(lib);
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return pdfjsPromise;
}

/**
 * عارض PDF متزامن: المعلّم يتنقّل بين الصفحات فيتبعه الطلاب تلقائياً.
 * src: رابط base64 (data:application/pdf;...) أو رابط مباشر.
 */
export function SyncedPdfViewer({ roomId, fileId, src, isOwner }: {
  roomId: string; fileId: string; src: string; isOwner: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const renderingRef = useRef(false);

  const pagePath = `roomLive/${roomId}/pdfSync/${fileId}/page`;

  // تحميل ملف PDF
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    loadPdfJs().then(async (lib) => {
      if (!lib || cancelled) { if (!cancelled) setError(true); return; }
      try {
        const doc = await lib.getDocument(src).promise;
        if (cancelled) return;
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) setError(true);
      }
    });
    return () => { cancelled = true; };
  }, [src]);

  // مزامنة الصفحة: الطلاب يتبعون المعلّم
  useEffect(() => {
    if (isOwner) return;
    return onValue(ref(rtdb, pagePath), (snap) => {
      const p = snap.val() as number | null;
      if (typeof p === "number" && p > 0) setPage(p);
    });
  }, [pagePath, isOwner]);

  // رسم الصفحة الحالية
  useEffect(() => {
    const doc = pdfRef.current;
    if (!doc || loading) return;
    let cancelled = false;
    (async () => {
      if (renderingRef.current) return;
      renderingRef.current = true;
      try {
        const pg = await doc.getPage(Math.min(page, doc.numPages));
        if (cancelled) return;
        const viewport = pg.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pg.render({ canvasContext: ctx, viewport }).promise;
      } catch { /* تجاهل */ } finally {
        renderingRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [page, scale, loading, numPages]);

  function gotoPage(p: number) {
    const clamped = Math.max(1, Math.min(p, numPages || 1));
    setPage(clamped);
    // المعلّم يبثّ الصفحة للطلاب
    if (isOwner) set(ref(rtdb, pagePath), clamped);
  }

  if (error) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-text-muted">
        <div>
          <p className="text-sm">تعذّر عرض ملف PDF بالعارض المتزامن.</p>
          <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold text-primary hover:underline">فتح الملف في تبويب جديد</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-neutral-800">
      {/* منطقة العرض */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="grid h-full place-items-center">
            <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-white/70" />
          </div>
        ) : (
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="max-w-full rounded-lg bg-white shadow-xl" />
          </div>
        )}
      </div>

      {/* شريط التحكّم */}
      <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-neutral-900 px-3 py-2">
        {/* تكبير/تصغير */}
        <button onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="تصغير">
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="تكبير">
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-5 w-px bg-white/15" />

        {/* تنقّل الصفحات (للمعلّم فقط، الطلاب يتبعون) */}
        {isOwner ? (
          <>
            <button onClick={() => gotoPage(page - 1)} disabled={page <= 1}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30" aria-label="السابقة">
              <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-16 text-center text-xs font-bold text-white">{page} / {numPages}</span>
            <button onClick={() => gotoPage(page + 1)} disabled={page >= numPages}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 disabled:opacity-30" aria-label="التالية">
              <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
            تتابع المعلّم — صفحة {page} / {numPages}
          </span>
        )}
      </div>
    </div>
  );
}
