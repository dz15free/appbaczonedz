"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon, isEmoji } from "@/lib/icon-registry";

/**
 * يعرض أيقونة من السجلّ (معرّف نصّي) أو إيموجي مباشرة.
 * value يمكن أن يكون: "robot" (معرّف) أو "🎯" (إيموجي).
 */
export function DynamicIcon({ value, className = "h-5 w-5", emojiClass = "text-xl" }: { value?: string; className?: string; emojiClass?: string }) {
  if (!value) return null;
  if (isEmoji(value)) {
    return <span className={emojiClass}>{value}</span>;
  }
  const icon = getIcon(value);
  if (icon) return <FontAwesomeIcon icon={icon} className={className} />;
  // نص غير معروف → اعرضه كما هو (احتياط)
  return <span className={emojiClass}>{value}</span>;
}
