"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { UserAvatar } from "@/components/ui/user-avatar";

/**
 * أفاتار يقرأ صورة المستخدم الحيّة من ملفه الشخصي عبر uid.
 * يعرض الصورة إن وُجدت، وإلا الحرف الأول من الاسم.
 * مع ذاكرة مؤقتة لتجنّب الجلب المتكرّر.
 */

const avatarCache = new Map<string, string | null>();

export function LiveAvatar({
  uid, name, size = "md", className = "",
}: {
  uid?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    uid ? (avatarCache.get(uid) ?? null) : null
  );

  useEffect(() => {
    if (!uid) return;
    const cached = avatarCache.get(uid);
    if (cached !== undefined) setAvatarUrl(cached);
    const unsub = onValue(ref(rtdb, `users/${uid}/avatarUrl`), (snap) => {
      const url = (snap.val() as string) ?? null;
      avatarCache.set(uid, url);
      setAvatarUrl(url);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  return <UserAvatar name={name} avatarUrl={avatarUrl} size={size} className={className} />;
}
