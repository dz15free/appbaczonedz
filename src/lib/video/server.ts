import "server-only";
import { AwsClient } from "aws4fetch";
import { verifyFirebaseIdToken } from "@/lib/firebase/server-auth";
import { dbGet, dbSet, dbUpdate } from "@/lib/firebase/server-db";

/* ════════════════════════════════════════════════════════════
   فيديوهات الدورات على R2 — كلّ ما يخصّ الخادم

   • الملفّ لا يمرّ بالخادم: الخادم يُصدر روابط موقّعة (S3 SigV4)
     يرفع إليها المتصفّح القطع مباشرةً، ويُصدر روابط مشاهدة مؤقّتة.
   • واجهة S3 وحدها (aws4fetch) — لا ربط R2 خاصّ بـ Workers، فيبقى الكود
     صالحاً على أيّ استضافة.
   • المفتاح محصور بـ bucket الفيديو وحده (لا يلمس غيره).
   • الحصص (لكلّ أستاذ وللمنصّة) تُحسب هنا لا في الواجهة.

   عُقد قاعدة البيانات (يكتبها الخادم وحده بسرّ القاعدة؛ القواعد تمنع
   العملاء افتراضياً لأنّه لا قاعدة لها):
     videoObjects/$vid          سجلّ كلّ ملفّ: صاحبه، دورته، درسه، حجمه، حالته
     videoQuota/settings        teacherLimitBytes · platformLimitBytes
     videoQuota/teachers/$uid   usedBytes · limitBytes (استثناء لأستاذ بعينه)
     videoQuota/totalBytes      مجموع المنصّة (محجوز + مكتمل)
   ════════════════════════════════════════════════════════════ */

export const VIDEO_BUCKET = "baczone-course-videos";
export const PART_SIZE = 10 * 1024 * 1024;            // 10 MiB — كلّ القطع متساوية إلّا الأخيرة (شرط R2)
export const MAX_VIDEO_BYTES = 2 * 1024 ** 3;          // 2 GB للملفّ الواحد
export const DEFAULT_TEACHER_LIMIT = 2 * 1024 ** 3;    // 2 GB لكلّ أستاذ
export const DEFAULT_PLATFORM_LIMIT = 10 * 1024 ** 3;  // 10 GB = الشريحة المجانية
export const UPLOAD_URL_TTL = 24 * 3600;               // روابط رفع القطع: يوم
export const PLAY_URL_TTL = 3 * 3600;                  // روابط المشاهدة: 3 ساعات
export const STALE_UPLOAD_MS = 24 * 3600 * 1000;       // رفعٌ لم يكتمل خلال يوم يُعدّ متروكاً

export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

export interface VideoObject {
  uid: string;
  courseId: string;
  lessonId: string;
  key: string;
  size: number;
  type: string;
  name?: string;
  uploadId?: string;
  status: "uploading" | "done";
  createdAt: number;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ── R2 عبر S3 ── */

function r2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_VIDEO_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_VIDEO_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new HttpError(503, "رفع الفيديو غير مُفعّل على الخادم بعد.");
  }
  return {
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
    base: `https://${accountId}.r2.cloudflarestorage.com/${VIDEO_BUCKET}`,
  };
}

export function isVideoStorageReady() {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_VIDEO_ACCESS_KEY_ID && process.env.R2_VIDEO_SECRET_ACCESS_KEY);
}

const encKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

async function presign(method: string, key: string, ttl: number, query = ""): Promise<string> {
  const { client, base } = r2();
  const url = `${base}/${encKey(key)}?${query ? query + "&" : ""}X-Amz-Expires=${ttl}`;
  const signed = await client.sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

export async function createMultipart(key: string, type: string): Promise<string> {
  const { client, base } = r2();
  const res = await client.fetch(`${base}/${encKey(key)}?uploads`, { method: "POST", headers: { "content-type": type } });
  const xml = await res.text();
  const id = /<UploadId>([^<]+)<\/UploadId>/.exec(xml)?.[1];
  if (!res.ok || !id) throw new HttpError(502, "تعذّر بدء الرفع عند التخزين.");
  return id;
}

export function presignPart(key: string, uploadId: string, partNumber: number) {
  return presign("PUT", key, UPLOAD_URL_TTL, `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`);
}

export async function completeMultipart(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]) {
  const { client, base } = r2();
  const body = "<CompleteMultipartUpload>" + parts
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag.replace(/[<>&]/g, "")}</ETag></Part>`)
    .join("") + "</CompleteMultipartUpload>";
  const res = await client.fetch(`${base}/${encKey(key)}?uploadId=${encodeURIComponent(uploadId)}`, {
    method: "POST", headers: { "content-type": "application/xml" }, body,
  });
  const xml = await res.text();
  if (!res.ok || /<Error>/.test(xml)) {
    const code = /<Code>([^<]+)<\/Code>/.exec(xml)?.[1] ?? res.status;
    throw new HttpError(502, `تعذّر إنهاء الرفع (${code}).`);
  }
}

export async function abortMultipart(key: string, uploadId: string) {
  const { client, base } = r2();
  await client.fetch(`${base}/${encKey(key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" }).catch(() => {});
}

export async function headObject(key: string): Promise<{ size: number; type: string } | null> {
  const { client, base } = r2();
  const res = await client.fetch(`${base}/${encKey(key)}`, { method: "HEAD" });
  if (!res.ok) return null;
  return { size: Number(res.headers.get("content-length") ?? 0), type: res.headers.get("content-type") ?? "" };
}

export async function deleteObject(key: string) {
  const { client, base } = r2();
  await client.fetch(`${base}/${encKey(key)}`, { method: "DELETE" });
}

export async function listKeys(prefix: string): Promise<string[]> {
  const { client, base } = r2();
  const keys: string[] = [];
  let token = "";
  for (let i = 0; i < 50; i++) {
    const q = `list-type=2&prefix=${encodeURIComponent(prefix)}${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`;
    const xml = await (await client.fetch(`${base}?${q}`)).text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1].replace(/&amp;/g, "&"));
    token = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "";
    if (!token) break;
  }
  return keys;
}

export function playUrl(key: string) {
  return presign("GET", key, PLAY_URL_TTL);
}

/* ── الهويّة والصلاحيات ── */

export async function requireUid(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const uid = token ? await verifyFirebaseIdToken(token) : null;
  if (!uid) throw new HttpError(401, "انتهت جلسة الدخول. أعد تسجيل الدخول.");
  return uid;
}

export async function optionalUid(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return token ? verifyFirebaseIdToken(token) : null;
}

export const isId = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(s);

export async function roleOf(uid: string) {
  return dbGet<string>(`users/${uid}/role`);
}

/** المالك أو admin — شرط الرفع والحذف */
export async function assertCourseEditor(uid: string, courseId: string): Promise<{ admin: boolean }> {
  const [role, teacherId] = await Promise.all([roleOf(uid), dbGet<string>(`courses/${courseId}/teacherId`)]);
  if (role === "admin") return { admin: true };
  if (!teacherId) throw new HttpError(404, "الدورة غير موجودة. احفظ المسوّدة أوّلاً.");
  if (role !== "teacher" || teacherId !== uid) throw new HttpError(403, "الرفع لأستاذ الدورة وحده.");
  return { admin: false };
}

/** شرط المشاهدة — نفسه حرفياً شرط قراءة `courseContent` في القواعد، مع دروس المعاينة */
export async function canWatch(uid: string | null, courseId: string, lessonId: string): Promise<boolean> {
  const pub = await dbGet<{ type?: string; status?: string; sections?: { lessons?: { id: string; preview?: boolean }[] }[] }>(
    `coursesPublic/${courseId}`,
  );
  const preview = (pub?.sections ?? []).some((s) => (s.lessons ?? []).some((l) => l.id === lessonId && l.preview));
  if (preview && pub?.status === "published") return true;
  if (!uid) return false;
  const [role, teacherId, purchase] = await Promise.all([
    roleOf(uid),
    dbGet<string>(`courses/${courseId}/teacherId`),
    dbGet(`purchases/${uid}/course/${courseId}`),
  ]);
  if (role === "admin" || teacherId === uid || purchase) return true;
  if (pub?.type === "free" && pub?.status === "published") {
    return Boolean(await dbGet(`courseEnrollments/${courseId}/${uid}`));
  }
  return false;
}

/* ── الحصص ── */

/** إضافة ذرّية لعدّاد عبر ETag في REST: لا يضيع تحديثان متزامنان */
async function dbAdd(path: string, delta: number): Promise<number> {
  const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
  const url = `${DB}/${path}.json?auth=${encodeURIComponent(process.env.FIREBASE_DB_SECRET || "")}`;
  for (let i = 0; i < 6; i++) {
    const cur = await fetch(url, { headers: { "X-Firebase-ETag": "true" }, cache: "no-store" });
    const etag = cur.headers.get("etag") ?? "";
    const value = Math.max(0, (Number(await cur.json()) || 0) + delta);
    const put = await fetch(url, { method: "PUT", headers: { "if-match": etag }, body: JSON.stringify(value) });
    if (put.ok) return value;
    if (put.status !== 412) throw new Error(`counter ${path}: ${put.status}`);
  }
  throw new Error(`counter ${path}: contention`);
}

export async function quotaOf(uid: string) {
  const [settings, mine, total] = await Promise.all([
    dbGet<{ teacherLimitBytes?: number; platformLimitBytes?: number }>("videoQuota/settings"),
    dbGet<{ usedBytes?: number; limitBytes?: number }>(`videoQuota/teachers/${uid}`),
    dbGet<number>("videoQuota/totalBytes"),
  ]);
  return {
    usedBytes: mine?.usedBytes ?? 0,
    limitBytes: mine?.limitBytes ?? settings?.teacherLimitBytes ?? DEFAULT_TEACHER_LIMIT,
    platformUsedBytes: total ?? 0,
    platformLimitBytes: settings?.platformLimitBytes ?? DEFAULT_PLATFORM_LIMIT,
  };
}

export async function addUsage(uid: string, delta: number) {
  if (!delta) return;
  await dbAdd(`videoQuota/teachers/${uid}/usedBytes`, delta);
  await dbAdd("videoQuota/totalBytes", delta);
}

/** يحرّر حجوزات الرفع المتروكة لهذا الأستاذ (أُغلقت الصفحة ولم يُلغَ ولم يكتمل) */
export async function releaseStaleUploads(uid: string) {
  const all = await dbGet<Record<string, VideoObject>>(`videoObjects`).catch(() => null);
  if (!all) return;
  const now = Date.now();
  for (const [vid, o] of Object.entries(all)) {
    if (o.uid !== uid || o.status !== "uploading" || now - o.createdAt < STALE_UPLOAD_MS) continue;
    if (o.uploadId) await abortMultipart(o.key, o.uploadId);
    await dbSet(`videoObjects/${vid}`, null);
    await addUsage(uid, -o.size);
  }
}

export async function getObject(vid: string) {
  return isId(vid) ? dbGet<VideoObject>(`videoObjects/${vid}`) : null;
}

export async function markDone(vid: string, size: number) {
  await dbUpdate(`videoObjects/${vid}`, { status: "done", size, uploadId: null });
}

/** حذف ملفّ وإرجاع مساحته — آمن للتكرار */
export async function removeVideo(vid: string) {
  const o = await getObject(vid);
  if (!o) return;
  if (o.status === "uploading" && o.uploadId) await abortMultipart(o.key, o.uploadId);
  else await deleteObject(o.key);
  await dbSet(`videoObjects/${vid}`, null);
  await addUsage(o.uid, -o.size);
}

export function newVid() {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/* ── Google Drive عبر مشغّلنا ──
   الخادم يجلب الملفّ من Drive بمفتاح API ويمرّره للتلميذ برمز مؤقّت
   منّا، فلا يرى التلميذ معرّف ملفّ Drive. يعمل فقط إن ضُبط
   GOOGLE_DRIVE_API_KEY؛ وإلّا يُعرض مشغّل Google داخل إطارنا. */

export const driveStreamingEnabled = () => Boolean(process.env.GOOGLE_DRIVE_API_KEY && process.env.VIDEO_STREAM_SECRET);

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(process.env.VIDEO_STREAM_SECRET || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function driveStreamToken(fileId: string) {
  const exp = Math.floor(Date.now() / 1000) + PLAY_URL_TTL;
  const payload = `${fileId}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyDriveToken(token: string): Promise<string | null> {
  const [fileId, exp, sig] = token.split(".");
  if (!fileId || !exp || !sig || !/^[\w-]{10,200}$/.test(fileId)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return (await hmac(`${fileId}.${exp}`)) === sig ? fileId : null;
}

export function driveMediaUrl(fileId: string) {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(process.env.GOOGLE_DRIVE_API_KEY || "")}`;
}

export async function driveFileInfo(fileId: string): Promise<{ ok: boolean; mimeType?: string; size?: number; reason?: string }> {
  if (!process.env.GOOGLE_DRIVE_API_KEY) return { ok: true, reason: "unchecked" };
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=mimeType,size&supportsAllDrives=true&key=${encodeURIComponent(process.env.GOOGLE_DRIVE_API_KEY)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return { ok: false, reason: "الملفّ غير موجود أو غير مُشارَك «لأيّ شخص لديه الرابط»." };
  if (!res.ok) return { ok: false, reason: "تعذّر التحقّق من الملفّ عند Google." };
  const j = (await res.json()) as { mimeType?: string; size?: string };
  if (!j.mimeType?.startsWith("video/")) return { ok: false, reason: "الملفّ ليس فيديو." };
  return { ok: true, mimeType: j.mimeType, size: Number(j.size ?? 0) };
}
