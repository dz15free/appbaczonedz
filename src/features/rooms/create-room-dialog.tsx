"use client";

import { useState } from "react";
import { ALL_SUBJECTS } from "@/lib/constants";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { BranchPicker } from "@/features/feed/admin-feed";
import type { BranchMap } from "@/features/feed/targeting";
import { useRouter } from "next/navigation";
import { createRoom, type RoomType } from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { Input, Button } from "@/components/ui/field";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faGraduationCap,
  faGlobe,
  faLock,
  faToggleOff,
  faToggleOn,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const TYPES: { id: RoomType; label: string; description: string; icon: typeof faGlobe }[] = [
  { id: "public", label: "عامة", description: "تظهر للطلاب المتصلين", icon: faGlobe },
  { id: "private", label: "خاصة", description: "بالاسم أو الرابط فقط", icon: faLock },
  { id: "teacher", label: "أستاذ", description: "مساحة يقودها أستاذ", icon: faGraduationCap },
];

/* ROOM_SUBJECTS بقيت كقيمة احتياطية فقط — القائمة الحيّة تأتي من سجلّ
   المواد فيتحكّم بها الأدمن. */
/* نُبقي `label` إلى جانب `name`: مستهلكون آخرون (صفحة الغرف · جدولة
   حصّة · الحصص القادمة) يقرؤون `label`، وتغييرها كان سيكسرهم بلا داعٍ. */
export const ROOM_SUBJECTS = ALL_SUBJECTS.map((s) => ({ id: s.id, name: s.name, label: s.name }));

export function CreateRoomDialog({ onClose }: { onClose: () => void }) {
  const siteSubjects = useSiteSubjects();
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfile(user?.uid);
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("public");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [branches, setBranches] = useState<BranchMap>({ all: true });
  const [error, setError] = useState("");

  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  const availableTypes = TYPES.filter((t) => t.id !== "teacher" || isTeacher);

  async function handleCreate() {
    if (!user) return;
    const cleanName = name.trim();
    const priceNum = parseInt(price, 10);

    if (!cleanName) {
      setError("اكتب اسم الغرفة أولاً.");
      return;
    }
    if (isPaid && isTeacher && (!priceNum || priceNum <= 0)) {
      setError("أدخل سعراً صحيحاً بالدينار الجزائري.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const id = await createRoom({
        name: cleanName,
        type,
        subject: subject || undefined,
        ownerId: user.uid,
        ownerName: user.displayName || profile?.name || "طالب",
        ownerRole: profile?.role === "teacher" || profile?.role === "admin" ? "teacher" : undefined,
        isPaid: isPaid && isTeacher,
        price: isPaid && isTeacher ? priceNum : undefined,
        branches,
      });
      router.push(`/rooms/${id}`);
    } catch {
      setLoading(false);
      setError("تعذّر إنشاء الغرفة الآن. حاول مرة أخرى.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-border bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7 sm:pt-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="create-room-title" className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
              إنشاء غرفة دراسة
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-muted sm:text-sm">
              جهّز مساحة مناسبة للمراجعة وابدأ مباشرة مع الطلاب.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-text-muted transition hover:bg-border hover:text-text-primary active:scale-95"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          <div className="space-y-6">
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-text-primary">بيانات الغرفة</h3>
                  <p className="mt-0.5 text-[11px] text-text-muted">اختر اسماً واضحاً يساعد الطلاب على العثور عليها.</p>
                </div>
                <span className="text-[10px] font-bold text-text-muted">الخطوة 1</span>
              </div>
              <Input
                label="اسم الغرفة"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="مثال: مراجعة رياضيات بكالوريا"
                className="h-12"
              />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-text-primary">نوع الغرفة</h3>
                  <p className="mt-0.5 text-[11px] text-text-muted">يمكنك تغيير طريقة وصول الطلاب إلى المساحة.</p>
                </div>
                <span className="text-[10px] font-bold text-text-muted">الخطوة 2</span>
              </div>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                {availableTypes.map((t) => {
                  const selected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      aria-pressed={selected}
                      className={`relative flex min-h-[78px] items-center gap-3 rounded-2xl border p-3 text-right transition active:scale-[.98] min-[420px]:block min-[420px]:text-center ${
                        selected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background text-text-primary hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <span className={`mx-0 grid h-9 w-9 shrink-0 place-items-center rounded-xl min-[420px]:mx-auto ${selected ? "bg-primary text-white" : "bg-border text-text-muted"}`}>
                        <FontAwesomeIcon icon={t.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 min-[420px]:mt-2">
                        <span className="block text-sm font-extrabold">{t.label}</span>
                        <span className={`mt-0.5 block text-[10px] leading-tight ${selected ? "text-primary/80" : "text-text-muted"}`}>{t.description}</span>
                      </span>
                      {selected && (
                        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-white min-[420px]:right-2">
                          <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-text-primary">المادة</h3>
                    <p className="mt-0.5 text-[11px] text-text-muted">اختيار اختياري لتنظيم الغرفة.</p>
                  </div>
                  <span className="text-[10px] font-bold text-text-muted">الخطوة 3</span>
                </div>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">مراجعة عامّة (بلا مادّة)</option>
                  {siteSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-2">
                  <h3 className="text-sm font-extrabold text-text-primary">الفئة المستهدفة</h3>
                  <p className="mt-0.5 text-[11px] text-text-muted">حدد الشعبة التي تناسب هذه المراجعة.</p>
                </div>
                <BranchPicker value={branches} onChange={setBranches} label="لأي شعبة هذه الغرفة؟" />
              </div>
            </section>

            {isTeacher && (
              <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-600">
                    <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-text-primary">غرفة مدفوعة</h3>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">أنشئ غرفة بدخول خاص عبر كود بعد إتمام الدفع.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsPaid((v) => !v); setError(""); }}
                        aria-pressed={isPaid}
                        aria-label={isPaid ? "إيقاف الغرفة المدفوعة" : "تفعيل الغرفة المدفوعة"}
                        className="shrink-0 rounded-lg active:scale-95"
                      >
                        <FontAwesomeIcon icon={isPaid ? faToggleOn : faToggleOff} className={`h-8 w-8 ${isPaid ? "text-amber-500" : "text-text-muted"}`} />
                      </button>
                    </div>
                    {isPaid && (
                      <div className="mt-4 rounded-xl border border-amber-400/20 bg-surface/70 p-3">
                        <label className="mb-1.5 block text-xs font-bold text-text-muted" htmlFor="room-price">السعر بالدينار الجزائري</label>
                        <input
                          id="room-price"
                          type="number"
                          inputMode="numeric"
                          value={price}
                          onChange={(e) => { setPrice(e.target.value); setError(""); }}
                          placeholder="2000"
                          min="1"
                          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">سيتواصل الطلاب مع الإدارة للدفع والحصول على كود الدخول.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
          </div>
        </div>

        <footer
          className="flex shrink-0 flex-col gap-2.5 border-t border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:px-7"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            onClick={handleCreate}
            loading={loading}
            disabled={!name.trim() || loading}
            className="order-1 min-h-12 w-full min-w-0 px-4 text-[15px] shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:order-2 sm:h-12 sm:flex-1 sm:w-auto"
          >
            <span>إنشاء ودخول</span>
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 -scale-x-100" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="order-2 min-h-11 w-full min-w-0 px-4 text-sm sm:order-1 sm:h-12 sm:w-28"
          >
            إلغاء
          </Button>
        </footer>
      </div>
    </div>
  );
}
