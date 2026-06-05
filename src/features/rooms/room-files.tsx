"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp, faFile, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { addRoomFile, listenRoomFiles, getAttachment, type RoomFile } from "@/features/rooms/rooms";
import { prepareFile } from "@/lib/upload";

export function RoomFiles({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => listenRoomFiles(roomId, setFiles), [roomId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const prepared = await prepareFile(file);
      await addRoomFile(roomId, {
        uploaderName: user.displayName || "طالب",
        dataUrl: prepared.dataUrl,
        name: prepared.name,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الرفع.");
    } finally {
      setUploading(false);
    }
  }

  async function download(f: RoomFile) {
    setBusy(f.id);
    try {
      const dataUrl = await getAttachment(roomId, f.attachmentId);
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = f.name;
        a.click();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">ملفات الغرفة</h2>
        <input ref={input} type="file" hidden onChange={handleUpload} />
        <button
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          <FontAwesomeIcon icon={uploading ? faSpinner : faFileArrowUp} className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
          {uploading ? "جارٍ الرفع..." : "رفع ملف"}
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {files.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">لا ملفات بعد. ارفع ملفاً ليشاركه الجميع.</p>
        ) : (
          files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <FontAwesomeIcon icon={faFile} className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{f.name}</span>
                <span className="text-xs text-text-muted">رفعه {f.uploaderName}</span>
              </div>
              <button
                onClick={() => download(f)}
                disabled={busy === f.id}
                aria-label="تحميل"
                className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"
              >
                <FontAwesomeIcon icon={busy === f.id ? faSpinner : faDownload} className={`h-4 w-4 ${busy === f.id ? "animate-spin" : ""}`} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="mt-2 text-center text-xs text-text-muted">الحدّ الأقصى للملف 5 ميجابايت (الصور تُضغط تلقائياً).</p>
    </div>
  );
}
