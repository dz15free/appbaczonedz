"use client";

/**
 * شارة الدور تظهر بجانب اسم المستخدم في المنشورات والتعليقات
 * - أستاذ: شارة خضراء
 * - إدارة: شارة بنفسجية (لون المنصة)
 * - طالب: شارة رمادية خفيفة
 */
export function RoleBadge({ role }: { role?: string }) {
  if (role === "teacher") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-bold text-secondary">
        👨‍🏫 أستاذ
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
        🛡️ إدارة BacZoneDZ
      </span>
    );
  }
  // الطالب (الافتراضي)
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-border px-1.5 py-0.5 text-[9px] font-bold text-text-muted">
      🎓 طالب
    </span>
  );
}
