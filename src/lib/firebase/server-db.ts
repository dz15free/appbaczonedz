/* ════════════════════════════════════════════════════════════
   قراءة/كتابة قاعدة البيانات من الخادم

   🐛 **سبب خطأ 500 في الدفع**: استعملت حزمة Firebase **الخاصّة
   بالمتصفّح** داخل مسار خادم. تلك الحزمة تعمل بهويّة المستخدم، وقواعدك
   تشترط `auth != null` — والخادم بلا هويّة، فتُرفض القراءة ويُرمى
   استثناء يظهر 500.

   والويب هوك أسوأ: يناديه Chargily لا المستخدم، فلا هويّة أصلاً.

   الحلّ هنا: واجهة REST الخاصّة بقاعدة البيانات مع **سرّ قاعدة
   البيانات** (Realtime Database Secret) — يتجاوز القواعد، وهو الطريق
   المعتمد للخوادم بلا تكلفة ولا حزمة إدارية ثقيلة.

   ⚠️ السرّ على الخادم فقط. لا يبدأ بـ`NEXT_PUBLIC_` أبداً.
════════════════════════════════════════════════════════════ */

const DB = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/+$/, "");
const SECRET = process.env.FIREBASE_DB_SECRET || "";

export function isServerDbReady() {
  return Boolean(DB && SECRET);
}

function url(path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${DB}/${clean}.json?auth=${encodeURIComponent(SECRET)}`;
}

export async function dbGet<T = unknown>(path: string): Promise<T | null> {
  const res = await fetch(url(path), { cache: "no-store" });
  if (!res.ok) throw new Error(`db get ${path}: ${res.status}`);
  return (await res.json()) as T | null;
}

/** يستبدل القيمة كاملة */
export async function dbSet(path: string, value: unknown): Promise<void> {
  const res = await fetch(url(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`db set ${path}: ${res.status}`);
}

/** يُحدّث الحقول المذكورة فقط */
export async function dbUpdate(path: string, value: Record<string, unknown>): Promise<void> {
  const res = await fetch(url(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`db update ${path}: ${res.status}`);
}

/** يُنشئ سجلّاً بمفتاح تلقائي ويُرجع المفتاح */
export async function dbPush(path: string, value: unknown): Promise<string> {
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`db push ${path}: ${res.status}`);
  const data = (await res.json()) as { name?: string };
  return data.name ?? "";
}
