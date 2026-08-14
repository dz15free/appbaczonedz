/**
 * مضيف موحّد لنوافذ الغرفة.
 *
 * يُوضع في نهاية صفحة الغرفة ويعلو المسرح ووضع التركيز. مكوّنات الغرفة
 * تستعمله بدل document.body حتى تبقى النوافذ مرئية داخل الشاشة الكاملة.
 * خارج صفحة الغرفة يعود السلوك إلى body كي لا تتأثر بقية المنصة.
 */
export function getRoomOverlayRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("bz-room-overlay-root");
}
