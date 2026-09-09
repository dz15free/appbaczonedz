import { getFullscreenHost } from "@/lib/fullscreen";

/**
 * مضيف موحّد لنوافذ الغرفة (المؤقّت، الاستفتاء، المساعد العائم…).
 *
 * `#bz-room-overlay-root` يعيش داخل مسرح الغرفة ويعلو وضع التركيز،
 * ولذلك يصلح مضيفاً في الحالة العادية.
 *
 * 🐛 لكنّه يفشل حين يمتلئ سطحٌ **داخل** المسرح (قاعة الامتحان،
 * السبورة): ملء الشاشة الحقيقي يضع عنصره في الطبقة العليا، وكل ما
 * ليس داخله لا يُرسم إطلاقاً. فيصير المؤقّت والاستفتاء غير مرئيين في
 * اللحظة التي يحتاجهما فيها الطالب أكثر — أثناء الامتحان.
 *
 * القاعدة: إن كان هناك عنصر ممتلئ ولا يحتوي هذا المضيف، فالمضيف هو
 * العنصر الممتلئ نفسه. (`getFullscreenHost` يعالج الحقيقي والبديل
 * معاً — انظر `lib/fullscreen.ts`.)
 */
export function getRoomOverlayRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const root = document.getElementById("bz-room-overlay-root");
  const host = getFullscreenHost();

  // لا ملء شاشة ⇒ المضيف المعتاد
  if (!host || host === document.body) return root;

  // الممتلئ يحتوي المضيف ⇒ المضيف يُرى بداخله، فلا تغيير
  if (root && host.contains(root)) return root;

  // الممتلئ لا يحتويه ⇒ المضيف المعتاد خارج الطبقة، فلا يُرى
  return host;
}
