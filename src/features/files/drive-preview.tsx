"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faDownload, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { drivePreviewUrl, driveDownloadUrl } from "@/lib/gdrive";

export function DrivePreview({
  fileId,
  name,
  onClose,
}: {
  fileId: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/90">
      <div
        className="flex items-center justify-between gap-2 p-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <span className="truncate text-sm text-white/90">{name}</span>
        <div className="flex items-center gap-2">
          <a
            href={driveDownloadUrl(fileId)}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
            aria-label="تحميل"
          >
            <FontAwesomeIcon icon={faDownload} className="h-5 w-5" />
          </a>
          <a
            href={`https://drive.google.com/file/d/${fileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"
            aria-label="فتح في Drive"
          >
            <FontAwesomeIcon icon={faUpRightFromSquare} className="h-5 w-5" />
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

      {/* عارض Google الأصلي — يقرأ PDF / Word / Excel / PowerPoint / الصور مع زوم */}
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          src={drivePreviewUrl(fileId)}
          title={name}
          className="h-full w-full"
          allow="autoplay"
        />
      </div>
    </div>
  );
}
