// رفع الملفات إلى Google Drive الخاص بالمستخدم (مجاني — 15 جيغا لكل حساب)
// النطاق غير الحسّاس drive.file (لا يحتاج مراجعة أمنية)

const SCOPE = "https://www.googleapis.com/auth/drive.file";

let scriptPromise: Promise<void> | null = null;
let tokenClient: any = null;
let cachedToken: string | null = null;
let tokenExpiry = 0;
let pendingResolve: ((t: string) => void) | null = null;
let pendingReject: ((e: Error) => void) | null = null;

export function isDriveConfigured() {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const src = "https://accounts.google.com/gsi/client";
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("تعذّر تحميل خدمة Google."));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// تهيئة مبكرة (عند فتح الصفحة) لتجهيز كل شيء قبل النقر
export async function initDrive(): Promise<boolean> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return false;
  await loadScript();
  if (!tokenClient) {
    // @ts-expect-error GIS عام من السكربت
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp: { access_token?: string; expires_in?: number }) => {
        if (resp.access_token) {
          cachedToken = resp.access_token;
          tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000;
          pendingResolve?.(resp.access_token);
        } else {
          pendingReject?.(new Error("تعذّر تسجيل الدخول بحساب Google."));
        }
        pendingResolve = null;
        pendingReject = null;
      },
    });
  }
  return true;
}

export function hasDriveToken() {
  return !!cachedToken && Date.now() < tokenExpiry - 60000;
}

// تُستدعى مباشرةً داخل معالج نقرة (وإلا يحجب المتصفّح النافذة)
export function connectDrive(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (hasDriveToken()) {
      resolve(cachedToken as string);
      return;
    }
    if (!tokenClient) {
      reject(new Error("لم تكتمل تهيئة Google بعد، أعد المحاولة بعد لحظات."));
      return;
    }
    pendingResolve = resolve;
    pendingReject = reject;
    try {
      tokenClient.requestAccessToken({ prompt: cachedToken ? "" : "consent" });
    } catch {
      pendingResolve = null;
      pendingReject = null;
      reject(new Error("تعذّر فتح نافذة Google."));
    }
  });
}

async function uploadFileToDrive(
  file: File,
  onProgress?: (pct: number) => void,
  makePublic = true,
): Promise<{ id: string; name: string }> {
  const token = cachedToken;
  if (!token) throw new Error("لم يتم ربط حساب Google بعد.");

  const init = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream" }),
    }
  );
  if (!init.ok) throw new Error("تعذّر بدء الرفع إلى Drive.");
  const sessionUrl = init.headers.get("Location");
  if (!sessionUrl) throw new Error("لم يصل رابط جلسة الرفع من Drive.");

  const result = await new Promise<{ id: string; name: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", sessionUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("ردّ غير متوقّع من Drive."));
        }
      } else {
        reject(new Error("فشل رفع الملف إلى Drive."));
      }
    };
    xhr.onerror = () => reject(new Error("خطأ شبكة أثناء الرفع."));
    xhr.send(file);
  });

  if (makePublic) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  }

  return result;
}

/** Public/shared Drive upload retained for Rooms and Groups. */
export async function uploadToDrive(file: File, onProgress?: (pct: number) => void) {
  return uploadFileToDrive(file, onProgress, true);
}

/** Private-by-default upload for personal Khabbasha conversation files. */
export async function uploadToDrivePrivate(file: File, onProgress?: (pct: number) => void) {
  return uploadFileToDrive(file, onProgress, false);
}

export function drivePreviewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/preview`;
}
export function driveDownloadUrl(id: string) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}
