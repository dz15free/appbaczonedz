import { NextRequest } from "next/server";
import { dbGet, dbSet, dbUpdate } from "@/lib/firebase/server-db";
import {
  HttpError, requireUid, optionalUid, isId, assertCourseEditor, canWatch, roleOf,
  quotaOf, addUsage, releaseStaleUploads, getObject, markDone, removeVideo, newVid,
  createMultipart, presignPart, completeMultipart, headObject, deleteObject, listKeys, playUrl,
  driveStreamingEnabled, driveStreamToken, verifyDriveToken, driveMediaUrl, driveFileInfo,
  VIDEO_TYPES, PART_SIZE, MAX_VIDEO_BYTES, PLAY_URL_TTL, STALE_UPLOAD_MS, DEFAULT_TEACHER_LIMIT, DEFAULT_PLATFORM_LIMIT,
  type VideoObject,
} from "@/lib/video/server";

/* ════════════════════════════════════════════════════════════
   /api/videos/<action> — رفع فيديوهات الدورات ومشاهدتها

     POST start      يحجز المساحة ويبدأ رفعاً متعدّد الأجزاء، ويُرجع روابط القطع
     POST complete   يُنهي الرفع ويتحقّق من الحجم والنوع الفعليّين
     POST abort      يُلغي رفعاً ويُعيد المساحة
     POST delete     يحذف فيديو (أستاذ الدورة أو admin)
     POST purge      يحذف كلّ فيديوهات دورة (عند حذفها)
     POST play       رابط مشاهدة مؤقّت — بنفس شرط قراءة محتوى الدورة
     GET  quota      مساحة الأستاذ ومساحة المنصّة
     POST drive      التحقّق من ملفّ Drive قبل حفظه في الدرس
     GET  stream     تمرير فيديو Drive برمز مؤقّت (لا يُكشف معرّف الملفّ)
     POST admin      إعدادات الحصص وتنظيف الملفّات اليتيمة (admin)
   ════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

const ok = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function body<T>(req: NextRequest): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new HttpError(400, "طلب غير صالح."); }
}

function fail(e: unknown) {
  if (e instanceof HttpError) return ok({ error: e.message }, e.status);
  console.error("[videos]", e);
  return ok({ error: "حدث خطأ في الخادم. أعد المحاولة." }, 500);
}

const gb = (n: number) => (n / 1024 ** 3).toFixed(n < 1024 ** 3 ? 2 : 1);

/* ── الرفع ── */

async function start(req: NextRequest) {
  const uid = await requireUid(req);
  const b = await body<{ courseId?: string; lessonId?: string; name?: string; size?: number; type?: string }>(req);
  if (!isId(b.courseId) || !isId(b.lessonId)) throw new HttpError(400, "معرّف الدورة أو الدرس غير صالح.");
  await assertCourseEditor(uid, b.courseId);

  const ext = VIDEO_TYPES[String(b.type)];
  if (!ext) throw new HttpError(415, "الصيغ المقبولة: MP4 أو WebM فقط.");
  const size = Math.floor(Number(b.size));
  if (!(size > 0)) throw new HttpError(400, "حجم الملفّ غير صالح.");
  if (size > MAX_VIDEO_BYTES) throw new HttpError(413, `الحدّ الأقصى للملفّ الواحد ${gb(MAX_VIDEO_BYTES)} GB.`);

  await releaseStaleUploads(uid);
  const q = await quotaOf(uid);
  if (q.platformUsedBytes + size > q.platformLimitBytes) {
    throw new HttpError(507, "امتلأت مساحة الفيديو في المنصّة حالياً. ارفع الفيديو إلى Google Drive الخاص بك من الخيار الثاني.");
  }
  if (q.usedBytes + size > q.limitBytes) {
    throw new HttpError(507, `مساحتك ${gb(q.limitBytes)} GB ولم يبقَ منها ما يكفي (المستعمَل ${gb(q.usedBytes)} GB). احذف فيديو قديماً، أو ارفع إلى Google Drive الخاص بك.`);
  }

  const vid = newVid();
  const key = `courses/${b.courseId}/${b.lessonId}/${vid}.${ext}`;
  const uploadId = await createMultipart(key, String(b.type));
  const record: VideoObject = {
    uid, courseId: b.courseId, lessonId: b.lessonId, key, size, type: String(b.type),
    name: String(b.name ?? "").slice(0, 200), uploadId, status: "uploading", createdAt: Date.now(),
  };
  await dbSet(`videoObjects/${vid}`, record);
  await addUsage(uid, size);   // الحجز يسبق الرفع: لا يتجاوز رفعان متزامنان الحصّة

  const count = Math.ceil(size / PART_SIZE);
  const urls = await Promise.all(Array.from({ length: count }, (_, i) => presignPart(key, uploadId, i + 1)));
  return ok({ vid, uploadId, partSize: PART_SIZE, urls });
}

async function ownUpload(uid: string, vid: unknown) {
  const o = await getObject(String(vid));
  if (!o) throw new HttpError(404, "الرفع غير موجود أو انتهت صلاحيته.");
  if (o.uid !== uid && (await roleOf(uid)) !== "admin") throw new HttpError(403, "ليس رفعك.");
  return o;
}

async function complete(req: NextRequest) {
  const uid = await requireUid(req);
  const b = await body<{ vid?: string; parts?: { partNumber: number; etag: string }[] }>(req);
  const o = await ownUpload(uid, b.vid);
  if (o.status === "done") return ok({ video: { source: "r2", vid: b.vid, size: o.size, type: o.type, name: o.name } });
  const parts = (b.parts ?? []).filter((p) => Number.isInteger(p.partNumber) && typeof p.etag === "string");
  if (parts.length !== Math.ceil(o.size / PART_SIZE)) throw new HttpError(400, "أجزاء الملفّ ناقصة.");

  await completeMultipart(o.key, o.uploadId!, parts);
  const head = await headObject(o.key);
  /* لا نثق بما صرّح به المتصفّح: الحجم الفعلي يُقاس بعد الرفع */
  if (!head || head.size > o.size || head.size > MAX_VIDEO_BYTES) {
    await deleteObject(o.key);
    await dbSet(`videoObjects/${b.vid}`, null);
    await addUsage(o.uid, -o.size);
    throw new HttpError(422, "حجم الملفّ المرفوع لا يطابق المُعلَن. أعد الرفع.");
  }
  await markDone(String(b.vid), head.size);
  await addUsage(o.uid, head.size - o.size);
  return ok({ video: { source: "r2", vid: b.vid, size: head.size, type: o.type, name: o.name } });
}

async function abort(req: NextRequest) {
  const uid = await requireUid(req);
  const b = await body<{ vid?: string }>(req);
  const o = await getObject(String(b.vid));
  if (!o) return ok({ ok: true });
  if (o.uid !== uid) throw new HttpError(403, "ليس رفعك.");
  if (o.status === "uploading") await removeVideo(String(b.vid));
  return ok({ ok: true });
}

async function del(req: NextRequest) {
  const uid = await requireUid(req);
  const b = await body<{ vid?: string; courseId?: string }>(req);
  const o = await getObject(String(b.vid));
  if (!o) return ok({ ok: true });
  if (o.courseId !== b.courseId) throw new HttpError(400, "الفيديو لا يخصّ هذه الدورة.");
  await assertCourseEditor(uid, o.courseId);
  /* لا يُحذف فيديو ما زال درسٌ محفوظ يستعمله */
  const used = await dbGet<{ vid?: string }>(`courseContent/${o.courseId}/${o.lessonId}/video`);
  if (used?.vid === b.vid) throw new HttpError(409, "الفيديو ما زال مستعملاً في درس محفوظ.");
  await removeVideo(String(b.vid));
  return ok({ ok: true });
}

async function purge(req: NextRequest) {
  const uid = await requireUid(req);
  const b = await body<{ courseId?: string }>(req);
  if (!isId(b.courseId)) throw new HttpError(400, "معرّف الدورة غير صالح.");
  await assertCourseEditor(uid, b.courseId);
  const keys = await listKeys(`courses/${b.courseId}/`);
  for (const key of keys) {
    const vid = /\/([0-9a-f]{24})\.\w+$/.exec(key)?.[1];
    if (vid && (await getObject(vid))) await removeVideo(vid);
    else await deleteObject(key);
  }
  return ok({ ok: true, deleted: keys.length });
}

/* ── المشاهدة ── */

async function play(req: NextRequest) {
  const uid = await optionalUid(req);
  const b = await body<{ courseId?: string; lessonId?: string; vid?: string; fileId?: string }>(req);
  if (!isId(b.courseId) || !isId(b.lessonId)) throw new HttpError(400, "طلب غير صالح.");

  /* معاينة المحرّر: الأستاذ يرى فيديوه فور رفعه، قبل حفظ الدرس */
  if ((b.vid || b.fileId) && uid) {
    await assertCourseEditor(uid, b.courseId);
    if (b.vid) {
      const o = await getObject(b.vid);
      if (!o || o.courseId !== b.courseId || o.status !== "done") throw new HttpError(404, "الفيديو غير متوفّر.");
      return ok({ kind: "file", url: await playUrl(o.key), type: o.type, expiresAt: Date.now() + PLAY_URL_TTL * 1000 });
    }
    if (!/^[\w-]{10,200}$/.test(String(b.fileId))) throw new HttpError(400, "معرّف Drive غير صالح.");
    if (driveStreamingEnabled()) {
      const t = await driveStreamToken(String(b.fileId));
      return ok({ kind: "file", url: `/api/videos/stream?t=${encodeURIComponent(t)}`, expiresAt: Date.now() + PLAY_URL_TTL * 1000 });
    }
    return ok({ kind: "embed", url: `https://drive.google.com/file/d/${b.fileId}/preview` });
  }

  if (!(await canWatch(uid, b.courseId, b.lessonId))) {
    throw new HttpError(uid ? 403 : 401, uid ? "هذا الدرس للمشتركين في الدورة." : "سجّل الدخول لمشاهدة الدرس.");
  }
  const video = await dbGet<{ source?: string; vid?: string; fileId?: string }>(`courseContent/${b.courseId}/${b.lessonId}/video`);
  if (video?.source === "r2" && video.vid) {
    const o = await getObject(video.vid);
    /* الملفّ يجب أن يخصّ هذه الدورة نفسها — لا يُستعار فيديو دورة مدفوعة من دورة أخرى */
    if (!o || o.courseId !== b.courseId || o.status !== "done") throw new HttpError(404, "الفيديو غير متوفّر.");
    return ok({ kind: "file", url: await playUrl(o.key), type: o.type, expiresAt: Date.now() + PLAY_URL_TTL * 1000 });
  }
  if (video?.source === "drive" && video.fileId && /^[\w-]{10,200}$/.test(video.fileId)) {
    if (driveStreamingEnabled()) {
      const t = await driveStreamToken(video.fileId);
      return ok({ kind: "file", url: `/api/videos/stream?t=${encodeURIComponent(t)}`, expiresAt: Date.now() + PLAY_URL_TTL * 1000 });
    }
    return ok({ kind: "embed", url: `https://drive.google.com/file/d/${video.fileId}/preview` });
  }
  throw new HttpError(404, "لا فيديو مرفوع لهذا الدرس.");
}

async function stream(req: NextRequest) {
  if (!driveStreamingEnabled()) return new Response("disabled", { status: 404 });
  const fileId = await verifyDriveToken(req.nextUrl.searchParams.get("t") ?? "");
  if (!fileId) return new Response("expired", { status: 403 });
  const range = req.headers.get("range");
  const upstream = await fetch(driveMediaUrl(fileId), { headers: range ? { Range: range } : {} });
  if (!upstream.ok && upstream.status !== 206) return new Response("unavailable", { status: 502 });
  const headers = new Headers({ "Cache-Control": "private, no-store", "Accept-Ranges": "bytes" });
  for (const h of ["content-type", "content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

/* ── الحصّة و Drive ── */

async function quota(req: NextRequest) {
  const uid = await requireUid(req);
  return ok(await quotaOf(uid));
}

async function drive(req: NextRequest) {
  const uid = await requireUid(req);
  const b = await body<{ courseId?: string; fileId?: string }>(req);
  if (!isId(b.courseId) || !/^[\w-]{10,200}$/.test(String(b.fileId))) throw new HttpError(400, "رابط Drive غير صالح.");
  await assertCourseEditor(uid, b.courseId);
  return ok({ ...(await driveFileInfo(String(b.fileId))), streaming: driveStreamingEnabled() });
}

/* ── الإدارة ── */

async function admin(req: NextRequest) {
  const uid = await requireUid(req);
  if ((await roleOf(uid)) !== "admin") throw new HttpError(403, "للإدارة فقط.");
  const b = await body<{ op?: string; teacherLimitGb?: number; platformLimitGb?: number; teacherUid?: string; limitGb?: number | null }>(req);

  if (b.op === "settings") {
    const t = Number(b.teacherLimitGb), p = Number(b.platformLimitGb);
    if (!(t > 0 && t <= 1000 && p > 0 && p <= 10000)) throw new HttpError(400, "قيم غير صالحة.");
    await dbUpdate("videoQuota/settings", { teacherLimitBytes: Math.round(t * 1024 ** 3), platformLimitBytes: Math.round(p * 1024 ** 3) });
    return ok({ ok: true });
  }
  if (b.op === "teacher") {
    if (!isId(b.teacherUid)) throw new HttpError(400, "معرّف الأستاذ غير صالح.");
    const v = b.limitGb == null ? null : Math.round(Number(b.limitGb) * 1024 ** 3);
    await dbSet(`videoQuota/teachers/${b.teacherUid}/limitBytes`, v && v > 0 ? v : null);
    return ok({ ok: true });
  }
  if (b.op === "cleanup") {
    /* يتيم = مكتمل لا يستعمله أيّ درس محفوظ، أو رفعٌ متروك — وكلاهما أقدم من يوم */
    const all = (await dbGet<Record<string, VideoObject>>("videoObjects")) ?? {};
    let removed = 0, freed = 0;
    for (const [vid, o] of Object.entries(all)) {
      if (Date.now() - o.createdAt < STALE_UPLOAD_MS) continue;
      const used = o.status === "done" && (await dbGet<{ vid?: string }>(`courseContent/${o.courseId}/${o.lessonId}/video`))?.vid === vid;
      if (used) continue;
      await removeVideo(vid);
      removed++; freed += o.size;
    }
    return ok({ ok: true, removed, freedBytes: freed });
  }
  /* overview */
  const [settings, teachers, total, objects] = await Promise.all([
    dbGet<{ teacherLimitBytes?: number; platformLimitBytes?: number }>("videoQuota/settings"),
    dbGet<Record<string, { usedBytes?: number; limitBytes?: number }>>("videoQuota/teachers"),
    dbGet<number>("videoQuota/totalBytes"),
    dbGet<Record<string, VideoObject>>("videoObjects"),
  ]);
  const names = await Promise.all(Object.keys(teachers ?? {}).map((id) => dbGet<string>(`users/${id}/name`).catch(() => null)));
  return ok({
    teacherLimitBytes: settings?.teacherLimitBytes ?? DEFAULT_TEACHER_LIMIT,
    platformLimitBytes: settings?.platformLimitBytes ?? DEFAULT_PLATFORM_LIMIT,
    platformUsedBytes: total ?? 0,
    files: Object.keys(objects ?? {}).length,
    teachers: Object.entries(teachers ?? {}).map(([id, t], i) => ({ uid: id, name: names[i] ?? "", usedBytes: t.usedBytes ?? 0, limitBytes: t.limitBytes ?? null })),
  });
}

const POSTS: Record<string, (req: NextRequest) => Promise<Response>> = {
  start, complete, abort, delete: del, purge, play, drive, admin,
};

export async function POST(req: NextRequest, ctx: Ctx) {
  const fn = POSTS[(await ctx.params).action];
  if (!fn) return ok({ error: "غير موجود." }, 404);
  try { return await fn(req); } catch (e) { return fail(e); }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const action = (await ctx.params).action;
  try {
    if (action === "quota") return await quota(req);
    if (action === "stream") return await stream(req);
    return ok({ error: "غير موجود." }, 404);
  } catch (e) { return fail(e); }
}
