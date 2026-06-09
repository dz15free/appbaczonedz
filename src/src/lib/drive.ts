// رفع الملفات إلى Google Drive الخاص بالمستخدم (مجاني، 15 جيغا لكل حساب)
// يستعمل Google Identity Services للحصول على رمز وصول، ثم Drive REST API مباشرة من المتصفّح.

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";

let accessToken: string | null = null;
let tokenExpiry = 0;
let scriptLoaded: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (scriptLoaded) return scriptLoaded;
  scriptLoaded = new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("بيئة غير صالحة."));
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("تعذّر تحميل Google."));
    document.head.appendChild(s);
  });
  return scriptLoaded;
}

export function isDriveConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

async function getToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("لم يتم ضبط Google Drive بعد.");
  await loadGis();
  if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;

  return new Promise<string>((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
        if (resp.error || !resp.access_token) {
          reject(new Error("تم إلغاء ربط Google Drive."));
          return;
        }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000;
        resolve(accessToken);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export interface DriveFile {
  id: string;
  name: string;
}

export async function uploadToDrive(file: File): Promise<DriveFile> {
  const token = await getToken();

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({ name: file.name })], { type: "application/json" })
  );
  form.append("file", file);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error("فشل الرفع إلى Google Drive.");
  const data = (await res.json()) as DriveFile;

  // جعل الملف قابلاً للعرض لأي شخص لديه الرابط (ليراه بقية أعضاء الغرفة)
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return { id: data.id, name: data.name };
}

export const drivePreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
export const driveDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;
