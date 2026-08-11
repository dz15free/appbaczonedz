import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site-url";

/* ════════════════════════════════════════════════════════════
   IndexNow — إبلاغ محرّكات البحث فور النشر

   المشكلة التي يحلّها: صفحة تكتبها في لوحة الإدارة قد تنتظر أسابيع
   قبل أن يمرّ عليها الزاحف. خريطة الموقع تُعرّفه بوجودها، لكنّها لا
   تُخبره أنّ شيئاً **تغيّر الآن**.

   IndexNow معيار مفتوح (Bing · Yandex · Seznam · Naver) يقبل قائمة
   روابط ويُبلّغ الشبكة كاملة بها. Google لا يشارك فيه رسمياً، لكنّ
   خريطتنا صارت ديناميكية و`lastModified` فيها حقيقي — وهو ما يعتمد
   عليه زاحف Google.

   المفتاح يُقدَّم من `/indexnow-key.txt` ومحتواه المفتاح نفسه —
   هكذا يثبت المعيار أنّك تملك النطاق. يُولَّد مرّة ويوضع في
   `INDEXNOW_KEY`.

   ⚠️ محميّ بدور الأدمن: المسار يقبل الاستدعاء من لوحة الإدارة وحدها
   بعد التحقّق من الدور في قاعدة البيانات — وإلّا صار بوقاً مفتوحاً
   يستطيع أي أحد قصف محرّكات البحث به باسم موقعك.
   ════════════════════════════════════════════════════════════ */

/* العنوان من المصدر الوحيد */
const SITE = SITE_URL;
const KEY = process.env.INDEXNOW_KEY || "";
const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const SECRET = process.env.FIREBASE_DB_SECRET || "";

/** يتحقّق أنّ المستدعي أدمن فعلاً — بقراءة دوره من قاعدة البيانات */
async function isAdmin(uid: string): Promise<boolean> {
  if (!uid || !DB || !SECRET) return false;
  try {
    const res = await fetch(
      `${DB}/users/${encodeURIComponent(uid)}/role.json?auth=${encodeURIComponent(SECRET)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return false;
    return (await res.json()) === "admin";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!KEY) {
    return NextResponse.json(
      { ok: false, error: "لم يُضبط INDEXNOW_KEY في متغيّرات البيئة." },
      { status: 501 },
    );
  }

  let body: { uid?: string; urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }

  if (!(await isAdmin(body.uid ?? ""))) {
    return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });
  }

  /* الروابط تُقيَّد بنطاقنا: المعيار يرفض ما هو خارج النطاق أصلاً،
     ونحن نرفضه قبله كي لا نُرسل شيئاً لا نملكه. */
  const urls = (body.urls ?? [])
    .map((u) => (u.startsWith("http") ? u : `${SITE}${u.startsWith("/") ? u : `/${u}`}`))
    .filter((u) => u.startsWith(SITE))
    .slice(0, 10000);

  if (!urls.length) {
    return NextResponse.json({ ok: false, error: "لا روابط صالحة." }, { status: 400 });
  }

  const host = new URL(SITE).host;
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: KEY,
        keyLocation: `${SITE}/indexnow-key.txt`,
        urlList: urls,
      }),
    });
    // ٢٠٠ أو ٢٠٢ كلاهما نجاح في هذا المعيار
    const ok = res.status === 200 || res.status === 202;
    return NextResponse.json({ ok, status: res.status, count: urls.length });
  } catch {
    return NextResponse.json({ ok: false, error: "تعذّر الاتصال بـ IndexNow." }, { status: 502 });
  }
}

/** يُرجع قائمة الروابط المرشّحة للإبلاغ — تقرؤها لوحة الإدارة */
export async function GET() {
  const urls: string[] = [`${SITE}/`, `${SITE}/specialties`, `${SITE}/calculate`, `${SITE}/courses`];
  if (DB) {
    try {
      const res = await fetch(`${DB}/guide/specialities.json`, { cache: "no-store" });
      if (res.ok) {
        const val = (await res.json()) as Record<string, { permalink?: string; intro?: string; draft?: boolean }> | null;
        for (const [id, c] of Object.entries(val ?? {})) {
          if (!c?.intro?.trim() || c?.draft === true) continue;
          urls.push(`${SITE}/specialties/${(c.permalink?.trim() || id).replace(/^\/+|\/+$/g, "")}`);
        }
      }
    } catch { /* نتجاهل: القائمة الأساسية تكفي */ }
  }
  return NextResponse.json({ urls, ready: Boolean(KEY) });
}
