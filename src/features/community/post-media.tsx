"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark, faDownload, faChevronLeft, faChevronRight,
  faMagnifyingGlassPlus, faMagnifyingGlassMinus, faPlay, faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { getPostAttachment, type PostMedia } from "@/features/community/social";

/* ════════════════════════════════════════════════════════════
   وسائط المنشور

   الشبكة تتكيّف مع عدد الصور (١ / ٢ / ٣ / ٤+) كما في الشبكات
   الاجتماعية، وتبقى متجاوبة على كل الأحجام.

   الأداء: القائمة تعرض النسخة المصغّرة فقط. النسخة الكاملة
   لا تُحمَّل إلا عند فتح العارض — فتصفّح عشرين منشوراً لا
   يستهلك إلا جزءاً يسيراً من حصّة التنزيل.
════════════════════════════════════════════════════════════ */

/* ─────────── جلب مرفق مع ذاكرة تمنع التكرار ─────────── */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function loadAttachment(id: string): Promise<string | null> {
  if (cache.has(id)) return cache.get(id)!;
  const running = inflight.get(id);
  if (running) return running;
  const p = getPostAttachment(id)
    .then((d) => { if (d) cache.set(id, d); return d ?? null; })
    .catch(() => null)
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

function useAttachment(id?: string) {
  const [src, setSrc] = useState<string | null>(id && cache.has(id) ? cache.get(id)! : null);
  useEffect(() => {
    if (!id || cache.has(id)) return;
    let alive = true;
    loadAttachment(id).then((d) => { if (alive) setSrc(d); });
    return () => { alive = false; };
  }, [id]);
  return src;
}

/* ─────────── روابط الفيديو ─────────── */
function videoEmbed(url: string): { type: "iframe" | "file"; src: string } | null {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtube.com" || h === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${v}` };
      if (u.pathname.startsWith("/shorts/")) {
        return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.split("/")[2]}` };
      }
    }
    if (h === "youtu.be") {
      return { type: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    }
    if (h === "vimeo.com") {
      return { type: "iframe", src: `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}` };
    }
    if (/\.(mp4|webm|ogg|mov)$/i.test(u.pathname)) return { type: "file", src: url };
    return null;
  } catch { return null; }
}

export function isSupportedVideoUrl(url: string) {
  return videoEmbed(url) !== null;
}

/* ─────────── مشغّل الفيديو ─────────── */
function VideoBlock({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const embed = videoEmbed(url);
  if (!embed) return null;

  if (embed.type === "file") {
    return (
      <video
        src={embed.src}
        controls
        preload="metadata"
        playsInline
        className="max-h-[70vh] w-full rounded-xl bg-black"
      />
    );
  }

  // لا نُحمّل إطار يوتيوب إلا بعد الضغط — يوفّر الشبكة ويمنع التتبّع المسبق
  if (!playing) {
    return (
      <button
        onClick={() => setPlaying(true)}
        className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-xl bg-black/85"
        aria-label="تشغيل الفيديو"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-primary shadow-xl transition group-hover:scale-110">
          <FontAwesomeIcon icon={faPlay} className="ml-0.5 h-5 w-5" />
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
          فيديو
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={`${embed.src}?autoplay=1`}
        title="فيديو"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}

/* ─────────── صورة مصغّرة داخل الشبكة ─────────── */
function Thumb({ m, onOpen, overlay }: { m: PostMedia; onOpen: () => void; overlay?: number }) {
  const src = useAttachment(m.thumbId);
  return (
    <button
      onClick={onOpen}
      className="relative block h-full w-full overflow-hidden bg-border"
      aria-label="تكبير الصورة"
    >
      {src ? (
        // صور base64 محلّية — next/image لا يضيف هنا شيئاً
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={m.name ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-text-muted" />
        </span>
      )}
      {!!overlay && overlay > 0 && (
        <span className="absolute inset-0 grid place-items-center bg-black/55 text-xl font-extrabold text-white">
          +{overlay}
        </span>
      )}
    </button>
  );
}

/* ─────────── الشبكة ─────────── */
export function PostMediaGrid({ media }: { media: PostMedia[] }) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (!media?.length) return null;

  const videos = media.filter((m) => m.kind === "video");
  const images = media.filter((m) => m.kind === "image");

  // فهارس الصور داخل المصفوفة الأصلية ليعمل التنقّل في العارض
  const imgIdx = media.map((m, i) => (m.kind === "image" ? i : -1)).filter((i) => i >= 0);
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;

  return (
    <>
      {videos.map((v, i) => (
        <div key={`v${i}`} className="mt-3">
          <VideoBlock url={v.url!} />
        </div>
      ))}

      {shown.length > 0 && (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${
            shown.length === 1 ? "grid-cols-1"
              : shown.length === 2 ? "grid-cols-2"
              : shown.length === 3 ? "grid-cols-2 grid-rows-2"
              : "grid-cols-2 grid-rows-2"
          }`}
          style={{ maxHeight: shown.length === 1 ? "70vh" : 380 }}
        >
          {shown.map((m, i) => (
            <div
              key={i}
              className={
                shown.length === 1 ? "aspect-auto max-h-[70vh]"
                  : shown.length === 3 && i === 0 ? "row-span-2 h-full"
                  : "h-full"
              }
              style={shown.length === 1 ? { minHeight: 200 } : { minHeight: 120 }}
            >
              <Thumb
                m={m}
                overlay={i === shown.length - 1 && extra > 0 ? extra : 0}
                onOpen={() => setViewer(imgIdx[i])}
              />
            </div>
          ))}
        </div>
      )}

      {viewer !== null && (
        <Lightbox
          media={media}
          startIndex={viewer}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}

/* ─────────── العارض: تكبير، سحب، تنقّل، تحميل ─────────── */
function Lightbox({ media, startIndex, onClose }: {
  media: PostMedia[]; startIndex: number; onClose: () => void;
}) {
  const imgIndexes = media.map((m, i) => (m.kind === "image" ? i : -1)).filter((i) => i >= 0);
  const [pos, setPos] = useState(Math.max(0, imgIndexes.indexOf(startIndex)));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const touchStart = useRef<number | null>(null);

  const current = media[imgIndexes[pos]];
  const src = useAttachment(current?.fullId);

  const go = useCallback((d: number) => {
    setPos((p) => (p + d + imgIndexes.length) % imgIndexes.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imgIndexes.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+") setZoom((z) => Math.min(z + 0.5, 4));
      else if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  function download() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = current?.name || `baczone-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10080] flex flex-col bg-black/95" role="dialog" aria-modal="true">
      {/* الشريط العلوي */}
      <div className="flex shrink-0 items-center gap-2 p-3">
        <button onClick={onClose} aria-label="إغلاق"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-white/70">{pos + 1} / {imgIndexes.length}</span>
        <div className="mr-auto flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))} disabled={zoom <= 1} aria-label="تصغير"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40">
            <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="h-4 w-4" />
          </button>
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 4))} disabled={zoom >= 4} aria-label="تكبير"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40">
            <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4" />
          </button>
          <button onClick={download} disabled={!src} aria-label="تحميل"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40">
            <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* الصورة */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={(e) => { if (zoom > 1) drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
        onPointerMove={(e) => { if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
        onTouchStart={(e) => { if (zoom === 1) touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (zoom !== 1 || touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 60) go(dx > 0 ? -1 : 1); // اتجاه عربي: السحب يميناً = السابق
          touchStart.current = null;
        }}
        onDoubleClick={() => { setZoom((z) => (z > 1 ? 1 : 2)); setPan({ x: 0, y: 0 }); }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={current?.name ?? ""}
            draggable={false}
            className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? "grab" : "zoom-in",
              transition: drag.current ? "none" : "transform .18s ease-out",
            }}
          />
        ) : (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70">
            <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" />
          </span>
        )}

        {imgIndexes.length > 1 && (
          <>
            <NavBtn side="right" onClick={() => go(-1)} icon={faChevronRight} />
            <NavBtn side="left" onClick={() => go(1)} icon={faChevronLeft} />
          </>
        )}
      </div>

      <p className="shrink-0 pb-3 text-center text-[11px] text-white/40">
        نقرتان للتكبير · اسحب للتنقّل
      </p>
    </div>,
    document.body
  );
}

function NavBtn({ side, onClick, icon }: {
  side: "left" | "right"; onClick: () => void; icon: typeof faChevronLeft;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "right" ? "السابق" : "التالي"}
      className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 ${
        side === "right" ? "right-3" : "left-3"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="h-4 w-4" />
    </button>
  );
}
