"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faDownload, faXmark, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { getPostAttachment, type Post } from "@/features/community/social";

export function PostAttachment({ post }: { post: Post }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let alive = true;
    if (post.attachmentId) getPostAttachment(post.attachmentId).then((d) => alive && setDataUrl(d));
    return () => {
      alive = false;
    };
  }, [post.attachmentId]);

  if (!post.attachmentId) return null;

  if (!dataUrl)
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
        <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />
        جارٍ التحميل...
      </div>
    );

  if (post.attachmentKind === "image")
    return (
      <>
        <button onClick={() => setZoom(true)} className="mt-3 block overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={post.fileName || ""} className="max-h-72 w-full object-cover" />
        </button>
        {zoom && (
          <div className="fixed inset-0 z-[70] flex flex-col bg-black/90" onClick={() => setZoom(false)}>
            <div className="flex justify-end gap-2 p-3">
              <a
                href={dataUrl}
                download={post.fileName}
                onClick={(e) => e.stopPropagation()}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
                aria-label="تحميل"
              >
                <FontAwesomeIcon icon={faDownload} className="h-5 w-5" />
              </a>
              <button
                onClick={() => setZoom(false)}
                aria-label="إغلاق"
                className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
              >
                <FontAwesomeIcon icon={faXmark} className="pointer-events-none h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt={post.fileName || ""} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        )}
      </>
    );

  return (
    <a
      href={dataUrl}
      download={post.fileName}
      className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary"
    >
      <FontAwesomeIcon icon={faFile} className="h-4 w-4 text-primary" />
      <span className="truncate">{post.fileName || "ملف"}</span>
      <FontAwesomeIcon icon={faDownload} className="h-3 w-3 text-text-muted" />
    </a>
  );
}
