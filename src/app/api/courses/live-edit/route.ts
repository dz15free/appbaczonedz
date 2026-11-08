import { NextRequest } from "next/server";
import { dbGet, dbSet, dbUpdate, dbPush } from "@/lib/firebase/server-db";
import { HttpError, requireUid, isId, roleOf } from "@/lib/video/server";

/* ════════════════════════════════════════════════════════════
   POST /api/courses/live-edit — تعديل مباشر لدورة منشورة

   الأستاذ يحفظ تعديلاته على دورته المنشورة (القواعد تسمح له بتعديل
   `courses` و`courseContent` دون تغيير الحالة)، ثمّ يُنادي هذا المسار:

   1) يُعيد بناء النسخة العامّة `coursesPublic` من الدورة نفسها — بالطريقة
      ذاتها التي ينشر بها الأدمن (روابط دروس المعاينة وحدها). الكتابة
      هناك للخادم وحده، فلا يكتب الأستاذ في السوق مباشرةً.
   2) يُسجّل ما تغيّر في `courseEdits/$courseId/log`.
   3) يُبلغ الأدمن بملخّص التغيير — مرّة كلّ 10 دقائق على الأكثر لكلّ دورة،
      فالحفظ المتكرّر (حفظٌ تلقائي بعد كلّ رفع) لا يُغرق إشعاراته.
   ════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE = new Set(["published", "approved", "unpublished"]);
const NOTIFY_EVERY_MS = 10 * 60 * 1000;

type Lesson = { id: string; title?: string; kind?: string; preview?: boolean; url?: string; [k: string]: unknown };
type Section = { id: string; title?: string; lessons?: Lesson[] };
type CourseRow = {
  title?: string; teacherId?: string; teacherName?: string; status?: string; type?: string;
  price?: number | null; shortDesc?: string | null; fullDesc?: string | null; coverUrl?: string | null;
  sections?: Section[]; publishedAt?: number; rejectReason?: unknown; [k: string]: unknown;
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function lessonsOf(c?: CourseRow | null) {
  return (c?.sections ?? []).flatMap((s) => s.lessons ?? []);
}

/** ملخّص قصير بالعربية لما تغيّر — يقرؤه الأدمن في الإشعار */
function summarize(before: CourseRow | null, after: CourseRow): string {
  if (!before) return "أُعيد نشر الدورة";
  const out: string[] = [];
  if (before.title !== after.title) out.push(`العنوان ← «${after.title}»`);
  if ((before.type ?? "") !== (after.type ?? "")) out.push(after.type === "paid" ? "صارت مدفوعة" : "صارت مجّانية");
  if ((before.price ?? null) !== (after.price ?? null)) out.push(`السعر ${before.price ?? 0} ← ${after.price ?? 0} دج`);
  if ((before.shortDesc ?? "") !== (after.shortDesc ?? "") || (before.fullDesc ?? "") !== (after.fullDesc ?? "")) out.push("الوصف");
  if ((before.coverUrl ?? "") !== (after.coverUrl ?? "")) out.push("الغلاف");
  const b = new Map(lessonsOf(before).map((l) => [l.id, l]));
  const a = new Map(lessonsOf(after).map((l) => [l.id, l]));
  const added = [...a.keys()].filter((k) => !b.has(k)).length;
  const removed = [...b.keys()].filter((k) => !a.has(k)).length;
  const renamed = [...a.entries()].filter(([k, l]) => b.has(k) && b.get(k)!.title !== l.title).length;
  if (added) out.push(`+${added} درس`);
  if (removed) out.push(`−${removed} درس`);
  if (renamed) out.push(`تعديل عنوان ${renamed} درس`);
  if ((before.sections ?? []).length !== (after.sections ?? []).length) out.push("ترتيب الأقسام");
  return out.length ? out.join(" · ") : "تعديل في محتوى الدروس";
}

async function adminUids(): Promise<string[]> {
  const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
  const url = `${DB}/users.json?orderBy=${encodeURIComponent('"role"')}&equalTo=${encodeURIComponent('"admin"')}&auth=${encodeURIComponent(process.env.FIREBASE_DB_SECRET || "")}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return Object.keys(((await res.json()) as Record<string, unknown> | null) ?? {});
}

export async function POST(req: NextRequest) {
  try {
    const uid = await requireUid(req);
    let courseId = "";
    try { courseId = String(((await req.json()) as { courseId?: string }).courseId ?? ""); } catch { /* */ }
    if (!isId(courseId)) throw new HttpError(400, "معرّف الدورة غير صالح.");

    const course = await dbGet<CourseRow>(`courses/${courseId}`);
    if (!course) throw new HttpError(404, "الدورة غير موجودة.");
    if (course.teacherId !== uid && (await roleOf(uid)) !== "admin") throw new HttpError(403, "ليست دورتك.");
    if (!LIVE.has(String(course.status))) return json({ ok: true, skipped: "not-live" });

    const before = await dbGet<CourseRow>(`coursesPublic/${courseId}`);
    let summary = "تعديل (الدورة غير منشورة حالياً)";

    if (course.status === "published") {
      /* نفس `publishCourse`: الروابط تُحذف من النسخة العامّة إلّا لدروس المعاينة */
      const content = (await dbGet<Record<string, { url?: string }>>(`courseContent/${courseId}`)) ?? {};
      const sections = (course.sections ?? []).map((s) => ({
        ...s,
        lessons: (s.lessons ?? []).map((l) => {
          const out: Lesson = { ...l };
          delete out.url;
          if (l.preview && content[l.id]?.url) out.url = content[l.id]!.url;
          return out;
        }),
      }));
      const pub: CourseRow = { ...course, sections, status: "published", publishedAt: course.publishedAt ?? before?.publishedAt ?? Date.now() };
      delete pub.rejectReason;
      await dbSet(`coursesPublic/${courseId}`, pub);
      summary = summarize(before, pub);
    }

    const now = Date.now();
    await dbPush(`courseEdits/${courseId}/log`, { at: now, uid, summary: summary.slice(0, 500) });

    const last = await dbGet<number>(`courseEdits/${courseId}/lastNotifiedAt`);
    if (!last || now - last > NOTIFY_EVERY_MS) {
      const text = `✏️ عدّل ${course.teacherName || "الأستاذ"} دورته «${course.title}»: ${summary}`.slice(0, 400);
      await Promise.all((await adminUids()).map((a) =>
        dbPush(`notifications/${a}`, { type: "course-edited", text, link: `/admin?tab=courses&course=${courseId}`, read: false, createdAt: now })
          .catch(() => {}),
      ));
      await dbUpdate(`courseEdits/${courseId}`, { lastNotifiedAt: now });
    }
    return json({ ok: true, summary });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("[live-edit]", e);
    return json({ error: "تعذّر نشر التعديلات. أعد المحاولة." }, 500);
  }
}
