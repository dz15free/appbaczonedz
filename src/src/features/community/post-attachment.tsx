"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { getPostAttachment, type Post } from "@/features/community/social";
import { FileViewer } from "@/features/files/file-viewer";

export function PostAttachment({ post }: { post: Post }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);

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

  const name = post.fileName || (post.attachmentKind === "image" ? "صورة" : "ملف");

  return (
    <>
      {post.attachmentKind === "image" ? (
        <button onClick={() => setViewer(true)} className="mt-3 block overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={name} className="max-h-72 w-full object-cover" />
        </button>
      ) : (
        <button
          onClick={() => setViewer(true)}
          className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary"
        >
          <FontAwesomeIcon icon={faFile} className="h-4 w-4 text-primary" />
          <span className="truncate">{name}</span>
          <span className="text-xs text-text-muted">عرض</span>
        </button>
      )}
      {viewer && <FileViewer dataUrl={dataUrl} name={name} onClose={() => setViewer(false)} />}
    </>
  );
}
