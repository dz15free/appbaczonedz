/* ملفّ إثبات ملكيّة IndexNow.

   المعيار يشترط أن يكون المفتاح متاحاً على نطاقك كملفّ نصّي، ليتأكّد
   من أنّ من يُبلّغ عن الروابط يملك الموقع فعلاً. ولأنّ المفتاح يعيش
   في متغيّر بيئة (لا في المستودع) نُقدّمه من مسار بدل ملفّ ساكن. */

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const key = process.env.INDEXNOW_KEY || "";
  return new Response(key, {
    status: key ? 200 : 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
