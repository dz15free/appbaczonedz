import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/* ════════════════════════════════════════════════════════════
   إبطال التخزين المؤقّت عند النشر — هذا ما يُغنيك عن إعادة النشر

   الدورة التي طلبتها:
     لوحة الإدارة → حفظ → نشر → Firebase → **هذا المسار** → المقال حيّ

   بلا هذا المسار يبقى المقال مخفيّاً حتى تنتهي مدّة `revalidate`
   (عشر دقائق) — وهو انتظارٌ لا معنى له بعد ضغطة «نشر».

   ── الحماية ──
   المسار يُبطل تخزين صفحات عامّة، فلو تُرك مفتوحاً لأمكن قصفُه
   لإجبار الخادم على إعادة بناء الصفحات مراراً (استنزاف). فيُتحقّق من
   أنّ المستدعي **أدمن فعلاً** بقراءة دوره من قاعدة البيانات — وهو
   نفس الحارس المستعمل في `/api/indexnow`، لا اختراع جديد.

   ولا نكتفي برمز المصادقة: الرمز يُثبت الهويّة لا الصلاحية.
   ════════════════════════════════════════════════════════════ */

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const SECRET = process.env.FIREBASE_DB_SECRET || "";

/** يتحقّق أنّ صاحب المعرّف أدمن — بقراءة دوره من القاعدة */
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
  let body: { uid?: string; slug?: string; oldSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const uid = (body.uid ?? "").trim();
  if (!(await isAdmin(uid))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const paths = ["/blog"];
  if (body.slug) paths.push(`/blog/${body.slug}`);
  /* الرابط القديم يُبطَل أيضاً: بلا ذلك تبقى نسخته المخزّنة تعرض
     المقال بدل أن تُحوّل إلى رابطه الجديد. */
  if (body.oldSlug && body.oldSlug !== body.slug) paths.push(`/blog/${body.oldSlug}`);

  for (const p of paths) {
    try { revalidatePath(p); } catch { /* مسار غير مبنيّ بعد — لا ضرر */ }
  }
  /* خريطة الموقع تُبطَل كذلك، وإلّا بقي المقال الجديد خارجها */
  try { revalidatePath("/blog/sitemap.xml"); } catch { /* تجاهل */ }

  return NextResponse.json({ ok: true, revalidated: paths });
}
