"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { scheduleSession } from "@/features/rooms/rooms";
import { ROOM_SUBJECTS } from "@/features/rooms/create-room-dialog";
import { Input, Button } from "@/components/ui/field";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarPlus } from "@fortawesome/free-solid-svg-icons";

interface Props { onClose: () => void; }

// أقرب وقت مقترح: الساعة القادمة المُقرَّبة
function defaultDateTime(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export function ScheduleSessionDialog({ onClose }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [when, setWhen] = useState(defaultDateTime());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim() || !user) return;
    const ts = new Date(when).getTime();
    if (!ts || ts < Date.now() - 60_000) {
      setErr("اختر وقتاً في المستقبل.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await scheduleSession({
        name,
        subject: subject || undefined,
        ownerId: user.uid,
        ownerName: user.displayName || "طالب",
        scheduledAt: ts,
      });
      onClose();
    } catch {
      setErr("تعذّر الجدولة. حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-white">
            <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4" />
          </span>
          <h2 className="font-display text-xl font-extrabold">جدولة جلسة دراسية</h2>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          ستُنشَأ غرفة جاهزة، وتظهر في «الجلسات القادمة» لكل الطلاب حتى موعدها.
        </p>

        <div className="mt-5 space-y-4">
          <Input
            label="اسم الجلسة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: مراجعة شاملة — الدوال والمتتاليات"
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
            <span className="mb-2 block text-sm font-semibold">التاريخ والوقت</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-danger">{err}</p>}

        <div className="mt-6 flex gap-2">
          <Button onClick={submit} loading={loading} disabled={!name.trim()} className="flex-1">
            جدولة الجلسة
          </Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}
