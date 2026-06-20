"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

/**
 * شارة الدور تظهر بجانب اسم المستخدم في المنشورات والتعليقات.
 * تقرأ الدور الحيّ من بيانات المستخدم عبر uid (دقيق ومحدَّث دائماً)،
 * مع إمكانية تمرير role مباشرة كقيمة احتياطية فورية.
 *
 * - أستاذ: شارة خضراء
 * - إدارة: شارة بنفسجية (لون المنصة)
 * - طالب: شارة رمادية خفيفة
 */

// ذاكرة مؤقتة بسيطة لتجنّب جلب نفس المستخدم مراراً
const roleCache = new Map<string, string>();

export function RoleBadge({ uid, role }: { uid?: string; role?: string }) {
  const [liveRole, setLiveRole] = useState<string | undefined>(
    role ?? (uid ? roleCache.get(uid) : undefined)
  );

  useEffect(() => {
    if (!uid) return;
    // إن وُجد في الذاكرة استخدمه فوراً
    const cached = roleCache.get(uid);
    if (cached) setLiveRole(cached);
    // واقرأ القيمة الحيّة من قاعدة البيانات
    const unsub = onValue(ref(rtdb, `users/${uid}/role`), (snap) => {
      const r = (snap.val() as string) ?? "student";
      roleCache.set(uid, r);
      setLiveRole(r);
    });
    return () => unsub();
  }, [uid]);

  const r = liveRole ?? role ?? "student";

  if (r === "teacher") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-bold text-secondary">
        👨‍🏫 أستاذ
      </span>
    );
  }
  if (r === "admin") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
        🛡️ إدارة BacZoneDZ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-border px-1.5 py-0.5 text-[9px] font-bold text-text-muted">
      🎓 طالب
    </span>
  );
}
