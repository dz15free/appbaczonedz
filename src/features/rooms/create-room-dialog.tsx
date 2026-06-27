"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, type RoomType } from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { Input, Button } from "@/components/ui/field";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";

const TYPES: { id: RoomType; label: string }[] = [
  { id: "public", label: "عامة" },
  { id: "private", label: "خاصة" },
  { id: "teacher", label: "👨‍🏫 أستاذ" },
];

export const ROOM_SUBJECTS = [
  { id: "", label: "عام (بدون مادة)" },
  { id: "arabic", label: "اللغة العربية" },
  { id: "islamic", label: "العلوم الإسلامية" },
  { id: "math", label: "الرياضيات" },
  { id: "science", label: "علوم الطبيعة والحياة" },
  { id: "physics", label: "العلوم الفيزيائية" },
  { id: "philosophy", label: "الفلسفة" },
  { id: "history-geo", label: "التاريخ والجغرافيا" },
  { id: "french", label: "اللغة الفرنسية" },
  { id: "english", label: "اللغة الإنجليزية" },
  { id: "amazigh", label: "اللغة الأمازيغية" },
  { id: "law", label: "القانون" },
  { id: "accounting", label: "التسيير المحاسبي والمالي" },
  { id: "economics", label: "الاقتصاد والمناجمنت" },
  { id: "spanish", label: "اللغة الإسبانية" },
  { id: "german", label: "اللغة الألمانية" },
  { id: "italian", label: "اللغة الإيطالية" },
  { id: "elec-eng", label: "الهندسة الكهربائية" },
  { id: "mech-eng", label: "الهندسة الميكانيكية" },
  { id: "process-eng", label: "هندسة الطرائق" },
  { id: "civil-eng", label: "الهندسة المدنية" },
  { id: "art-major", label: "مادة التخصص الفني" },
];

export function CreateRoomDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("public");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");

  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  // الأساتذة/الأدمن فقط يرون خيار "غرفة أستاذ"
  const availableTypes = TYPES.filter((t) => t.id !== "teacher" || isTeacher);

  async function handleCreate() {
    if (!name.trim() || !user) return;
    const priceNum = parseInt(price, 10);
    if (isPaid && isTeacher && (!priceNum || priceNum <= 0)) return;
    setLoading(true);
    const id = await createRoom({
      name,
      type,
      subject: subject || undefined,
      ownerId: user.uid,
      ownerName: user.displayName || profile?.name || "طالب",
      ownerRole: profile?.role === "teacher" || profile?.role === "admin" ? "teacher" : undefined,
      isPaid: isPaid && isTeacher,
      price: isPaid && isTeacher ? priceNum : undefined,
    });
    router.push(`/rooms/${id}`);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-extrabold">إنشاء غرفة دراسة</h2>
        <div className="mt-5 space-y-4">
          <Input
            label="اسم الغرفة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: مراجعة رياضيات بكالوريا"
          />
          <div>
            <span className="mb-2 block text-sm font-semibold">المادة</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {ROOM_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">نوع الغرفة</span>
            <div className="grid grid-cols-3 gap-2">
              {availableTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`rounded-md border px-3 py-2.5 text-sm font-semibold transition ${
                    type === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* غرفة مدفوعة (أستاذ/أدمن) */}
          {isTeacher && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-amber-500" />
                  غرفة مدفوعة (دخول بكود)
                </span>
                <button type="button" onClick={() => setIsPaid(!isPaid)}>
                  <FontAwesomeIcon icon={isPaid ? faToggleOn : faToggleOff} className={`h-7 w-7 ${isPaid ? "text-amber-500" : "text-text-muted"}`} />
                </button>
              </label>
              {isPaid && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-text-muted">السعر بالدينار الجزائري</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2000" min="1"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                  <p className="mt-1.5 text-[11px] text-text-muted">سيتواصل الطلاب مع الأدمن للدفع والحصول على كود الدخول.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={handleCreate} loading={loading} disabled={!name.trim()} className="flex-1">
            إنشاء ودخول
          </Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

