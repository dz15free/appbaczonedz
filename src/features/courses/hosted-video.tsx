"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playLesson, VideoApiError } from "./video-client";
import type { LessonVideo } from "./types";

/* ════════════════════════════════════════════════════════════
   تشغيل فيديو مرفوع (BacZone أو Drive الأستاذ)

   لا رابط دائم في الصفحة: يُطلب من الخادم رابطٌ مؤقّت بعد التحقّق من
   حقّ المشاهدة. وإن انتهت صلاحيته أثناء المشاهدة (درس طويل، أو صفحة
   تُركت مفتوحة) يُجدَّد تلقائياً ويُستأنف من اللحظة نفسها.
   المرحلة 3 ستستبدل واجهة المشغّل كلّها؛ المنطق هنا يبقى.
   ════════════════════════════════════════════════════════════ */

export function HostedVideo({ courseId, lessonId, title, video }: {
  courseId: string; lessonId: string; title: string;
  /** معاينة المحرّر: الفيديو قبل حفظ الدرس */
  video?: LessonVideo;
}) {
  const [src, setSrc] = useState<{ kind: "file" | "embed"; url: string; type?: string; expiresAt?: number } | null>(null);
  const [error, setError] = useState("");
  const resumeAt = useRef(0);
  const el = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setSrc(await playLesson(courseId, lessonId, video));
    } catch (e) {
      const status = e instanceof VideoApiError ? e.status : 0;
      setError(status === 404 ? "محتوى هذا الدرس غير متاح حالياً." : (e as Error).message || "تعذّر تحميل الفيديو.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId, video?.source === "r2" ? video.vid : video?.source === "drive" ? video.fileId : ""]);

  useEffect(() => {
    setSrc(null);
    resumeAt.current = 0;
    void load();
  }, [load]);

  /* انتهت صلاحية الرابط ← رابط جديد من اللحظة نفسها */
  const onError = () => {
    if (src?.expiresAt && Date.now() > src.expiresAt - 60_000) {
      resumeAt.current = el.current?.currentTime ?? 0;
      void load();
    } else {
      setError("تعذّر تشغيل الفيديو. تحقّق من الإنترنت ثمّ أعد المحاولة.");
    }
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center">
        <p className="text-[13px] font-bold text-text-primary">{error}</p>
        <button type="button" onClick={() => void load()}
          className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 text-[12.5px] font-bold text-text-primary">
          أعد المحاولة
        </button>
      </div>
    );
  }

  if (!src) {
    return <div className="aspect-video w-full animate-pulse rounded-3xl bg-border/60" aria-label="جارٍ تحميل الفيديو" />;
  }

  if (src.kind === "embed") {
    return (
      <div className="overflow-hidden rounded-3xl border border-border bg-black">
        <iframe src={src.url} title={title} loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen className="aspect-video w-full" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-black">
      <video
        ref={el}
        key={src.url}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={() => { if (resumeAt.current && el.current) { el.current.currentTime = resumeAt.current; resumeAt.current = 0; } }}
        onError={onError}
        className="aspect-video w-full"
      >
        <source src={src.url} type={src.type} />
      </video>
    </div>
  );
}
