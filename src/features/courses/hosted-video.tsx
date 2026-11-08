"use client";

import { useCallback, useEffect, useState } from "react";
import { playLesson, VideoApiError } from "./video-client";
import type { LessonVideo } from "./types";
import { BzPlayer, BrandedEmbed } from "@/components/player/bz-player";

/* ════════════════════════════════════════════════════════════
   تشغيل فيديو مرفوع (BacZone أو Drive الأستاذ) في مشغّل المنصّة

   لا رابط دائم في الصفحة: يُطلب من الخادم رابطٌ مؤقّت بعد التحقّق من
   حقّ المشاهدة. وإن انتهت صلاحيته أثناء المشاهدة يُجدَّد تلقائياً،
   والمشغّل يُكمل من آخر موضع محفوظ («متابعة المشاهدة»).
   ════════════════════════════════════════════════════════════ */

export function HostedVideo({ courseId, lessonId, title, video }: {
  courseId: string; lessonId: string; title: string;
  /** معاينة المحرّر: الفيديو قبل حفظ الدرس */
  video?: LessonVideo;
}) {
  const [src, setSrc] = useState<{ kind: "file" | "embed"; url: string; type?: string; expiresAt?: number } | null>(null);
  const [error, setError] = useState("");

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
    void load();
  }, [load]);

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

  if (src.kind === "embed") return <BrandedEmbed url={src.url} title={title} />;

  return (
    <BzPlayer
      source={{ kind: "file", url: src.url, type: src.type }}
      title={title}
      resumeKey={video ? undefined : `${courseId}:${lessonId}`}
      onError={() => {
        /* انتهت صلاحية الرابط ← رابط جديد؛ المشغّل يُكمل من آخر موضع محفوظ */
        if (src.expiresAt && Date.now() > src.expiresAt - 60_000) void load();
        else setError("تعذّر تشغيل الفيديو. تحقّق من الإنترنت ثمّ أعد المحاولة.");
      }}
    />
  );
}
