"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp, faFile, faEye, faSpinner, faTrash, faLink } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { addRoomFile, listenRoomFiles, getAttachment, deleteRoomFile, type RoomFile } from "@/features/rooms/rooms";
import { initDrive, connectDrive, uploadToDrive, hasDriveToken, isDriveConfigured } from "@/lib/gdrive";
import { DrivePreview } from "@/features/files/drive-preview";
import { FileViewer } from "@/features/files/file-viewer";

export function RoomFiles({ roomId, isOwner = false }: { roomId: string; isOwner?: boolean }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [drive, setDrive] = useState<{ id: string; name: string } | null>(null);
  const [legacy, setLegacy] = useState<{ dataUrl: string; name: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => listenRoomFiles(roomId, setFiles), [roomId]);

  // تهيئة Google مبكراً (قبل أي نقرة) لتفادي حجب النافذة
  useEffect(() => {
    if (!isDriveConfigured()) return;
    initDrive().then((ok) => {
      setReady(ok);
      setConnected(hasDriveToken());
    });
  }, []);

  // ربط الحساب — يجب أن يكون داخل نقرة مباشرة
  async function connect() {
    try {
      await connectDrive();
      setConnected(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذّر ربط Google.");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadToDrive(file, setProgress);
      await addRoomFile(roomId, {
        uploaderId: user.uid,
        uploaderName: user.displayName || "طالب",
        name: uploaded.name,
        driveId: uploaded.id,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الرفع.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function open(f: RoomFile) {
    if (f.driveId) {
      setDrive({ id: f.driveId, name: f.name });
      return;
    }
    if (f.attachmentId) {
      setBusy(f.id);
      try {
        const dataUrl = await getAttachment(roomId, f.attachmentId);
        if (dataUrl) setLegacy({ dataUrl, name: f.name });
      } finally {
        setBusy(null);
      }
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">ملفات الغرفة</h2>
        {isOwner && (
          <>
            <input ref={input} type="file" hidden onChange={handleUpload} />
            {!isDriveConfigured() ? (
              <span className="text-xs text-text-muted">الرفع غير مُفعّل بعد</span>
            ) : !connected ? (
              <button
                onClick={connect}
                disabled={!ready}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faLink} className="h-4 w-4" />
                ربط حساب Google
              </button>
            ) : (
              <button
                onClick={() => input.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={uploading ? faSpinner : faFileArrowUp} className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
                {uploading ? `جارٍ الرفع ${progress}%` : "رفع ملف"}
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {files.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">لا ملفات بعد. ارفع ملفاً ليشاركه الجميع.</p>
        ) : (
          files.map((f) => {
            const canDelete = isOwner || f.uploaderId === user?.uid;
            return (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 transition hover:border-primary">
                <button onClick={() => open(f)} className="flex min-w-0 flex-1 items-center gap-3 text-right">
                  <FontAwesomeIcon icon={faFile} className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.name}</span>
                    <span className="text-xs text-text-muted">رفعه {f.uploaderName} · اضغط للعرض</span>
                  </div>
                  <FontAwesomeIcon
                    icon={busy === f.id ? faSpinner : faEye}
                    className={`h-4 w-4 text-text-muted ${busy === f.id ? "animate-spin" : ""}`}
                  />
                </button>
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm("حذف هذا الملف من الغرفة؟")) deleteRoomFile(roomId, f);
                    }}
                    aria-label="حذف"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="mt-2 text-center text-xs text-text-muted">
        تُرفع الملفات إلى Google Drive الخاص بك وتُعرض داخل المنصّة (PDF / Word / Excel / PowerPoint / صور).
      </p>

      {drive && <DrivePreview fileId={drive.id} name={drive.name} onClose={() => setDrive(null)} />}
      {legacy && <FileViewer dataUrl={legacy.dataUrl} name={legacy.name} onClose={() => setLegacy(null)} />}
    </div>
  );
}
