"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faDownload,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faFile,
} from "@fortawesome/free-solid-svg-icons";

function ext(name: string) {
  return (name.split(".").pop() || "").toLowerCase();
}
const IMG = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

function dataUrlToBlobUrl(dataUrl: string): string {
  const [meta, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}

export function FileViewer({
  dataUrl,
  name,
  onClose,
}: {
  dataUrl: string;
  name: string;
  onClose: () => void;
}) {
  const e = ext(name);
  const isImage = IMG.includes(e) || dataUrl.startsWith("data:image");
  const isPdf = e === "pdf" || dataUrl.startsWith("data:application/pdf");
  const [scale, setScale] = useState(1);

  // PDF يُعرض عبر blob URL (أكثر موثوقية من data URL)
  const blobUrl = useMemo(() => (isPdf ? dataUrlToBlobUrl(dataUrl) : null), [dataUrl, isPdf]);
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/90">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between gap-2 p-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <span className="truncate text-sm text-white/90">{name}</span>
        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <button
                onClick={() => setScale((s) => Math.max(1, +(s - 0.5).toFixed(1)))}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
                aria-label="تصغير"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="h-5 w-5" />
              </button>
              <button
                onClick={() => setScale((s) => Math.min(4, +(s + 0.5).toFixed(1)))}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
                aria-label="تكبير"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-5 w-5" />
              </button>
            </>
          )}
          <a
            href={dataUrl}
            download={name}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
            aria-label="تحميل"
          >
            <FontAwesomeIcon icon={faDownload} className="h-5 w-5" />
          </a>
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
            aria-label="إغلاق"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* المحتوى */}
      <div className="flex-1 overflow-auto">
        {isImage ? (
          <div className="flex min-h-full items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt={name}
              style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
              className="max-h-full max-w-full object-contain transition-transform"
            />
          </div>
        ) : isPdf && blobUrl ? (
          <iframe src={blobUrl} title={name} className="h-full w-full bg-white" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white/80">
            <FontAwesomeIcon icon={faFile} className="h-12 w-12" />
            <p className="text-sm">
              لا يمكن عرض هذا النوع داخل المتصفح مباشرة.
              <br />
              حمّله لفتحه ببرنامجه (Word / Excel / PowerPoint).
            </p>
            <a href={dataUrl} download={name} className="rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white">
              تحميل الملف
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
