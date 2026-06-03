"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, type RoomType } from "@/features/rooms/rooms";
import { useAuth } from "@/features/auth/auth-provider";
import { Input, Button } from "@/components/ui/field";

const TYPES: { id: RoomType; label: string }[] = [
  { id: "public", label: "عامة" },
  { id: "private", label: "خاصة" },
];

export function CreateRoomDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("public");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !user) return;
    setLoading(true);
    const id = await createRoom({
      name,
      type,
      ownerId: user.uid,
      ownerName: user.displayName || "طالب",
    });
    router.push(`/rooms/${id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-extrabold">إنشاء غرفة دراسة</h2>
        <div className="mt-5 space-y-4">
          <Input
            label="اسم الغرفة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: مراجعة رياضيات بكالوريا"
          />
          <div>
            <span className="mb-2 block text-sm font-semibold">نوع الغرفة</span>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
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
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={handleCreate} loading={loading} disabled={!name.trim()} className="flex-1">
            إنشاء ودخول
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}
