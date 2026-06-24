"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowUp, faFile, faSpinner, faTrash,
  faLink, faArrowRight, faFileLines, faImage,
  faFilePdf, faTableCells, faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import {
  addRoomFile, listenRoomFiles, getAttachment, deleteRoomFile,
  setActiveFile, listenActiveFile, type RoomFile,
} from "@/features/rooms/rooms";
import { initDrive, connectDrive, uploadToDrive, hasDriveToken, isDriveConfigured } from "@/lib/gdrive";
import { SyncedPdfViewer } from "@/features/rooms/synced-pdf-viewer";

/* ─── مساعد: أيقونة ولون حسب امتداد الملف ─── */
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext))
    return { icon: faImage, color: "text-secondary" };
  if (ext === "pdf")
    return { icon: faFilePdf, color: "text-danger" };
  if (["doc","docx"].includes(ext))
    return { icon: faFileLines, color: "text-primary" };
  if (["xls","xlsx","csv"].includes(ext))
    return { icon: faTableCells, color: "text-secondary" };
  return { icon: faFile, color: "text-text-muted" };
}

/* ─── مؤشّر شريط الرفع ─── */
function UploadBar({ progress }: { progress: number }) {
  return (
    <div className="mx-4 mb-2 overflow-hidden rounded-full bg-border">
      <div
        className="h-1.5 bg-gradient-primary transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ─── عارض الملف المحدّد (داخل اللوحة) ─── */
function InlinePreview({
  file,
  roomId,
  isOwner,
  onClose,
}: {
  file: RoomFile;
  roomId: string;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [b64, setB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ملف Drive → يُعرض بالـ iframe مباشرةً (الملفات عامة بعد الرفع)
    // ملف قديم (base64) → نجلبه من RTDB
    if (!file.driveId && file.attachmentId) {
      setLoading(true);
      getAttachment(roomId, file.attachmentId)
        .then((d) => setB64(d))
        .finally(() => setLoading(false));
    }
  }, [file, roomId]);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext);
  const isPdf = ext === "pdf";

  return (
    <div className="flex h-full flex-col">
      {/* رأس المعاينة */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface/80 px-3 py-2">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
          <span className="hidden sm:inline">القائمة</span>
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</span>
        {/* زر التحميل — متاح للجميع */}
        {file.driveId ? (
          <a
            href={`https://drive.google.com/uc?export=download&id=${file.driveId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
          >
            <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تحميل</span>
          </a>
        ) : b64 ? (
          <a
            href={b64}
            download={file.name}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
          >
            <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تحميل</span>
          </a>
        ) : null}
      </div>

      {/* محتوى المعاينة */}
      <div className="flex-1 overflow-hidden bg-background">
        {loading && (
          <div className="grid h-full place-items-center">
            <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Drive iframe — يعمل لأن الملف عام */}
        {file.driveId && !loading && (
          <iframe
            src={`https://drive.google.com/file/d/${file.driveId}/preview`}
            className="h-full w-full border-0"
            allow="autoplay"
            title={file.name}
          />
        )}

        {/* ملف قديم base64 — صورة */}
        {!file.driveId && b64 && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b64}
            alt={file.name}
            className="h-full w-full object-contain p-2"
          />
        )}

        {/* ملف قديم base64 — PDF بعارض متزامن */}
        {!file.driveId && b64 && !isImage && isPdf && (
          <SyncedPdfViewer roomId={roomId} fileId={file.id} src={b64} isOwner={isOwner} />
        )}

        {/* ملف قديم base64 — غير PDF */}
        {!file.driveId && b64 && !isImage && !isPdf && (
          <iframe src={b64} className="h-full w-full border-0" title={file.name} />
        )}
      </div>
    </div>
  );
}

/* ─── المكوّن الرئيسي ─── */
export function RoomFiles({ roomId, isOwner = false }: { roomId: string; isOwner?: boolean }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<RoomFile | null>(null);
  const [mobileShowPreview, setMobileShowPreview] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => listenRoomFiles(roomId, setFiles), [roomId]);

  // مزامنة الملف المعروض للطلاب: المالك يختار، الطلاب يتابعون
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  useEffect(() => listenActiveFile(roomId, setActiveFileId), [roomId]);

  // عند تغيّر الملف النشط أو قائمة الملفات، طابق العرض عند الطلاب
  useEffect(() => {
    if (isOwner) return; // المالك يتحكّم محلياً
    if (!activeFileId) { setSelected(null); setMobileShowPreview(false); return; }
    const f = files.find((x) => x.id === activeFileId);
    if (f) { setSelected(f); setMobileShowPreview(true); }
  }, [activeFileId, files, isOwner]);

  useEffect(() => {
    if (!isDriveConfigured()) return;
    initDrive().then((ok) => { setReady(ok); setConnected(hasDriveToken()); });
  }, []);

  function selectFile(f: RoomFile) {
    setSelected(f);
    setMobileShowPreview(true);
    // المالك يبثّ اختياره لكل الطلاب
    if (isOwner) setActiveFile(roomId, f.id);
  }

  function backToList() {
    setMobileShowPreview(false);
    setTimeout(() => setSelected(null), 300);
    if (isOwner) setActiveFile(roomId, null);
  }

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
      await addRoomFile(roomId, {
        uploaderId: user.uid,
        uploaderName: user.displayName || "طالب",
        name: uploaded.name,
        driveId: uploaded.id,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل الرفع.");
    } finally {
      setUploading(false); setProgress(0);
    }
  }

  /* ──── واجهة الهاتف: إما القائمة أو المعاينة ──── */
  const mobileView = (
    <div className="flex h-full flex-col lg:hidden">
      {mobileShowPreview && selected ? (
        <InlinePreview file={selected} roomId={roomId} isOwner={isOwner} onClose={backToList} />
      ) : (
        <FileListPane
          files={files}
          isOwner={isOwner}
          uploading={uploading}
          progress={progress}
          connected={connected}
          ready={ready}
          selected={selected}
          input={input}
          user={user}
          roomId={roomId}
          onSelect={selectFile}
          onConnect={connect}
          onUploadClick={() => input.current?.click()}
        />
      )}
    </div>
  );

  /* ──── واجهة الحاسوب: القائمة + المعاينة جانباً ──── */
  const desktopView = (
    <div className="hidden h-full lg:flex">
      {/* القائمة — ثابتة العرض */}
      <div className="flex w-64 shrink-0 flex-col border-l border-border">
        <FileListPane
          files={files}
          isOwner={isOwner}
          uploading={uploading}
          progress={progress}
          connected={connected}
          ready={ready}
          selected={selected}
          input={input}
          user={user}
          roomId={roomId}
          onSelect={selectFile}
          onConnect={connect}
          onUploadClick={() => input.current?.click()}
        />
      </div>

      {/* منطقة المعاينة */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <InlinePreview file={selected} roomId={roomId} onClose={() => setSelected(null)} />
        ) : (
          <div className="grid h-full place-items-center text-center text-sm text-text-muted p-8">
            <div>
              <FontAwesomeIcon icon={faFile} className="h-12 w-12 opacity-20" />
              <p className="mt-3">اختر ملفاً من القائمة لعرضه هنا</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <input ref={input} type="file" hidden onChange={handleUpload} />
      {uploading && <UploadBar progress={progress} />}
      <div className="h-full">
        {mobileView}
        {desktopView}
      </div>
    </>
  );
}

/* ─── قائمة الملفات (مشتركة بين الهاتف والحاسوب) ─── */
function FileListPane({
  files, isOwner, uploading, progress, connected, ready, selected,
  input, user, roomId, onSelect, onConnect, onUploadClick,
}: {
  files: RoomFile[];
  isOwner: boolean;
  uploading: boolean;
  progress: number;
  connected: boolean;
  ready: boolean;
  selected: RoomFile | null;
  input: React.RefObject<HTMLInputElement | null>;
  user: any;
  roomId: string;
  onSelect: (f: RoomFile) => void;
  onConnect: () => void;
  onUploadClick: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* رأس القائمة */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-bold">ملفات الغرفة</h2>
        {isOwner && (
          isDriveConfigured() ? (
            !connected ? (
              <button
                onClick={onConnect}
                disabled={!ready}
                className="flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5" />
                ربط Google
              </button>
            ) : (
              <button
                onClick={onUploadClick}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={uploading ? faSpinner : faFileArrowUp} className={`h-3.5 w-3.5 ${uploading ? "animate-spin" : ""}`} />
                {uploading ? `${progress}%` : "رفع"}
              </button>
            )
          ) : null
        )}
      </div>

      {/* القائمة */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="py-10 text-center">
            <FontAwesomeIcon icon={faFile} className="h-8 w-8 text-text-muted opacity-30" />
            <p className="mt-2 text-xs text-text-muted">لا ملفات بعد</p>
          </div>
        ) : (
          files.map((f) => {
            const { icon, color } = fileIcon(f.name);
            const isSelected = selected?.id === f.id;
            const canDelete = isOwner || f.uploaderId === user?.uid;
            return (
              <div
                key={f.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-surface"
                }`}
                onClick={() => onSelect(f)}
              >
                <FontAwesomeIcon icon={icon} className={`h-5 w-5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{f.name}</p>
                  <p className="text-[10px] text-text-muted">{f.uploaderName}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("حذف الملف؟")) deleteRoomFile(roomId, f);
                    }}
                    aria-label="حذف"
                    className="hidden h-7 w-7 place-items-center rounded text-text-muted hover:bg-danger/10 hover:text-danger group-hover:grid"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
