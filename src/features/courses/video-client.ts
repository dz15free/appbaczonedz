"use client";

import { auth } from "@/lib/firebase/config";
import type { LessonVideo } from "./types";

/* ════════════════════════════════════════════════════════════
   رفع فيديو الدرس من المتصفّح إلى R2 مباشرةً — مصمَّم لاتّصال ضعيف

   • قطع 10 MB، ثلاث في وقت واحد. فشل قطعة لا يُفشل الرفع: تُعاد
     حتى 6 مرّات بمهلٍ متزايدة، وتنتظر عودة الإنترنت إن انقطع.
   • استئناف بعد إغلاق الصفحة: القطع المكتملة تُحفظ في المتصفّح، فإن
     اختار الأستاذ الملفّ نفسه خلال 20 ساعة أكمل من حيث توقّف.
   • الإلغاء يوقف كلّ شيء ويُعيد المساحة فوراً.
   ════════════════════════════════════════════════════════════ */

export class VideoApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function token() {
  try { return (await auth?.currentUser?.getIdToken()) ?? ""; } catch { return ""; }
}

async function api<T>(action: string, body?: unknown, method = "POST"): Promise<T> {
  const t = await token();
  const res = await fetch(`/api/videos/${action}`, {
    method,
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new VideoApiError(data.error || "تعذّر الاتّصال بالخادم.", res.status);
  return data;
}

export interface Quota { usedBytes: number; limitBytes: number; platformUsedBytes: number; platformLimitBytes: number }

export const getQuota = () => api<Quota>("quota", undefined, "GET");
export const deleteVideo = (vid: string, courseId: string) => api("delete", { vid, courseId });
export const purgeCourseVideos = (courseId: string) => api("purge", { courseId });
export const checkDriveFile = (courseId: string, fileId: string) =>
  api<{ ok: boolean; reason?: string; mimeType?: string; size?: number; streaming?: boolean }>("drive", { courseId, fileId });
export const playLesson = (courseId: string, lessonId: string) =>
  api<{ kind: "file" | "embed"; url: string; type?: string; expiresAt?: number }>("play", { courseId, lessonId });
export const videoAdmin = <T = unknown>(body: Record<string, unknown>) => api<T>("admin", body);

export const MAX_VIDEO_BYTES = 2 * 1024 ** 3;
export const VIDEO_ACCEPT = "video/mp4,video/webm";

export interface UploadProgress {
  loaded: number;
  total: number;
  /** بايت/ثانية — متوسّط آخر ثوانٍ */
  speed: number;
  /** بالثواني، أو null إن لم يُعرف بعد */
  eta: number | null;
  state: "starting" | "uploading" | "waiting-network" | "finishing";
}

interface Saved { vid: string; urls: string[]; partSize: number; etags: Record<number, string>; at: number }

const RETRY = [1000, 2000, 4000, 8000, 15000, 30000];
const CONCURRENCY = 3;
const RESUME_TTL = 20 * 3600 * 1000;

const storeKey = (courseId: string, lessonId: string, f: File) =>
  `bz-video-upload:${courseId}:${lessonId}:${f.name}:${f.size}:${f.lastModified}`;

function load(k: string): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(k) ?? "null") as Saved | null;
    return s && Date.now() - s.at < RESUME_TTL ? s : null;
  } catch { return null; }
}
function save(k: string, s: Saved) { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* التخزين ممتلئ أو محجوب */ } }
function clear(k: string) { try { localStorage.removeItem(k); } catch { /* */ } }

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("aborted", "AbortError")); }, { once: true });
});

function waitOnline(signal: AbortSignal) {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const on = () => { window.removeEventListener("online", on); resolve(); };
    window.addEventListener("online", on);
    signal.addEventListener("abort", () => { window.removeEventListener("online", on); reject(new DOMException("aborted", "AbortError")); }, { once: true });
  });
}

/** قطعة واحدة عبر XHR (لا fetch): XHR وحده يُبلغ عن تقدّم الرفع */
function putPart(url: string, blob: Blob, signal: AbortSignal, onBytes: (n: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let sent = 0;
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => { onBytes(e.loaded - sent); sent = e.loaded; };
    xhr.onload = () => {
      const etag = xhr.getResponseHeader("ETag");
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      else { onBytes(-sent); reject(new Error(`part ${xhr.status}`)); }
    };
    xhr.onerror = () => { onBytes(-sent); reject(new Error("network")); };
    xhr.ontimeout = xhr.onerror;
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.onabort = () => { onBytes(-sent); reject(new DOMException("aborted", "AbortError")); };
    xhr.send(blob);
  });
}

export async function uploadVideoToR2(opts: {
  courseId: string;
  lessonId: string;
  file: File;
  signal: AbortSignal;
  onProgress: (p: UploadProgress) => void;
}): Promise<LessonVideo> {
  const { courseId, lessonId, file, signal, onProgress } = opts;
  if (!/^video\/(mp4|webm)$/.test(file.type)) throw new VideoApiError("الصيغ المقبولة: MP4 أو WebM فقط.");
  if (file.size > MAX_VIDEO_BYTES) throw new VideoApiError("الحدّ الأقصى للملفّ الواحد 2 GB.");

  const k = storeKey(courseId, lessonId, file);
  onProgress({ loaded: 0, total: file.size, speed: 0, eta: null, state: "starting" });

  let s = load(k);
  if (!s) {
    const r = await api<{ vid: string; urls: string[]; partSize: number }>("start", {
      courseId, lessonId, name: file.name, size: file.size, type: file.type,
    });
    s = { vid: r.vid, urls: r.urls, partSize: r.partSize, etags: {}, at: Date.now() };
    save(k, s);
  }
  const state = s;

  /* التقدّم: بايتات القطع المكتملة + ما أُرسل من القطع الجارية */
  let loaded = Object.keys(state.etags).reduce((n, i) => n + Math.min(state.partSize, file.size - (Number(i) - 1) * state.partSize), 0);
  const samples: { t: number; b: number }[] = [{ t: performance.now(), b: loaded }];
  let waiting = false;
  const report = () => {
    const now = performance.now();
    samples.push({ t: now, b: loaded });
    while (samples.length > 2 && now - samples[0].t > 6000) samples.shift();
    const dt = (now - samples[0].t) / 1000;
    const speed = dt > 0.5 ? Math.max(0, (loaded - samples[0].b) / dt) : 0;
    onProgress({
      loaded, total: file.size, speed,
      eta: speed > 0 ? Math.round((file.size - loaded) / speed) : null,
      state: waiting ? "waiting-network" : "uploading",
    });
  };
  const tick = setInterval(report, 500);

  try {
    const queue = state.urls.map((_, i) => i + 1).filter((n) => !state.etags[n]);
    const worker = async () => {
      for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
        const blob = file.slice((n - 1) * state.partSize, Math.min(n * state.partSize, file.size));
        for (let attempt = 0; ; attempt++) {
          if (signal.aborted) throw new DOMException("aborted", "AbortError");
          try {
            waiting = !navigator.onLine;
            await waitOnline(signal);
            waiting = false;
            state.etags[n] = await putPart(state.urls[n - 1], blob, signal, (d) => { loaded += d; });
            save(k, state);
            break;
          } catch (e) {
            if ((e as Error).name === "AbortError") throw e;
            if (attempt >= RETRY.length) throw new VideoApiError("انقطع الرفع مراراً. تحقّق من الإنترنت ثمّ اختر الملفّ نفسه لتُكمل من حيث توقّفت.");
            await sleep(RETRY[attempt], signal);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker));

    onProgress({ loaded: file.size, total: file.size, speed: 0, eta: 0, state: "finishing" });
    const parts = Object.entries(state.etags).map(([n, etag]) => ({ partNumber: Number(n), etag }));
    const done = await api<{ video: LessonVideo }>("complete", { vid: state.vid, parts });
    clear(k);
    return done.video;
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      clear(k);
      await api("abort", { vid: state.vid }).catch(() => {});
    }
    throw e;
  } finally {
    clearInterval(tick);
  }
}

/* ── عرض الأرقام ── */

export function fmtBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(n >= 100 * 1024 ** 2 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function fmtEta(sec: number | null) {
  if (sec == null) return "…";
  if (sec < 60) return `${sec} ث`;
  if (sec < 3600) return `${Math.round(sec / 60)} د`;
  return `${Math.floor(sec / 3600)} س ${Math.round((sec % 3600) / 60)} د`;
}
