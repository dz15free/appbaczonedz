// رفع الملفات إلى Google Drive الخاص بالمستخدم (مجاني — 15 جيغا لكل حساب)
// يستخدم النطاق غير الحسّاس drive.file (لا يحتاج مراجعة أمنية)

const SCOPE = "https://www.googleapis.com/auth/drive.file";

let gisLoaded = false;
let cachedToken: string | null = null;
let tokenExpiry = 0;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("تعذّر تحميل خدمة Google."));
    document.head.appendChild(s);
  });
}

async function ensureGis() {
  if (gisLoaded) return;
  await loadScript("https://accounts.google.com/gsi/client");
  gisLoaded = true;
}

export function isDriveConfigured() {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

// يطلب رمز وصول (نافذة موافقة أول مرّة فقط، ثم صامت)
export async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("لم يتم ضبط ربط Google Drive بعد.");
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;

  await ensureGis();
  return new Promise((resolve, reject) => {
    try {
      // @ts-expect-error GIS عام من السكربت
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
          if (resp.access_token) {
            cachedToken = resp.access_token;
            tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000;
            resolve(resp.access_token);
          } else {
            reject(new Error("تعذّر تسجيل الدخول بحساب Google."));
          }
        },
      });
      client.requestAccessToken({ prompt: cachedToken ? "" : "consent" });
    } catch {
      reject(new Error("تعذّر بدء تسجيل الدخول بـ Google."));
    }
  });
}

// رفع متواصل (resumable) يدعم الملفات الكبيرة بلا base64
export async function uploadToDrive(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string }> {
  const token = await getAccessToken();

  // 1) بدء جلسة الرفع
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

  // 2) رفع البايتات (مع تقدّم عبر XHR)
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

  // 3) جعل الملف قابلاً للعرض عبر الرابط (للجميع: قراءة فقط)
  await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return result;
}

export function drivePreviewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/preview`;
}
export function driveDownloadUrl(id: string) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}
