"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowUp, faFile, faEye, faSpinner, faTrash, faLink } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { addGroupFile, listenGroupFiles, deleteGroupFile, type GroupFile } from "@/features/groups/groups";
import { initDrive, connectDrive, uploadToDrive, hasDriveToken, isDriveConfigured } from "@/lib/gdrive";
import { DrivePreview } from "@/features/files/drive-preview";

interface Props {
  groupId: string;
  isOwner: boolean;
  isMember: boolean;
}

export function GroupFiles({ groupId, isOwner, isMember }: Props) {
  const { user } = useAuth();
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewer, setViewer] = useState<{ id: string; name: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = listenGroupFiles(groupId, setFiles);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [groupId]);

  useEffect(() => {
    if (!isDriveConfigured()) return;
    initDrive().then((ok) => { setReady(ok); setConnected(hasDriveToken()); });
  }, []);

  async function connect() {
    try { await connectDrive(); setConnected(true); }
    catch (err) { alert(err instanceof Error ? err.message : "تعذّر ربط Google."); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true); setProgress(0);
    try {
      const uploaded = await uploadToDrive(file, setProgress);
      await addGroupFile(groupId, {
        uploaderId: user.uid,
        uploaderName: user.displayName || "طالب",
        name: uploaded.name,
        driveId: uploaded.id,
      });
    } catch (err) { alert(err instanceof Error ? err.message : "فشل الرفع."); }
    finally { setUploading(false); setProgress(0); }
  }

  return (
    <div className="flex h-full flex-col p-4">
      {isMember && (
        <div className="mb-3 flex items-center justify-end">
          <input ref={input} type="file" hidden onChange={handleUpload} />
          {!isDriveConfigured() ? (
            <span className="text-xs text-text-muted">رفع الملفات غير مُفعّل بعد</span>
          ) : !connected ? (
            <button onClick={connect} disabled={!ready} className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <FontAwesomeIcon icon={faLink} className="h-4 w-4" /> ربط حساب Google
            </button>
          ) : (
            <button onClick={() => input.current?.click()} disabled={uploading} className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <FontAwesomeIcon icon={uploading ? faSpinner : faFileArrowUp} className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
              {uploading ? `جارٍ الرفع ${progress}%` : "رفع ملف"}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {files.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">لا ملفات بعد. {isMember ? "ارفع أوّل ملف للمجموعة!" : "انضم للمجموعة لرفع الملفات."}</p>
        ) : files.map((f) => {
          const canDelete = isOwner || f.uploaderId === user?.uid;
          return (
            <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3">
              <button onClick={() => f.driveId && setViewer({ id: f.driveId, name: f.name })} className="flex min-w-0 flex-1 items-center gap-3 text-right">
                <FontAwesomeIcon icon={faFile} className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{f.name}</span>
                  <span className="text-xs text-text-muted">رفعه {f.uploaderName}</span>
                </div>
                <FontAwesomeIcon icon={faEye} className="h-4 w-4 text-text-muted" />
              </button>
              {canDelete && (
                <button onClick={() => { if (confirm("حذف؟")) deleteGroupFile(groupId, f.id); }} aria-label="حذف" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                  <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-text-muted">تُعرض الملفات عبر عارض Google (PDF / Word / Excel / PowerPoint / صور).</p>
      {viewer && <DrivePreview fileId={viewer.id} name={viewer.name} onClose={() => setViewer(null)} />}
    </div>
  );
}
