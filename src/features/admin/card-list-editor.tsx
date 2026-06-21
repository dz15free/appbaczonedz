"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { ICON_KEYS } from "@/lib/icon-registry";

/** منتقي الأيقونة: شبكة أيقونات جاهزة + حقل إيموجي */
export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
            <DynamicIcon value={value} className="h-4 w-4" emojiClass="text-base" />
          </span>
          <span className="text-text-muted">{value || "اختر أيقونة"}</span>
        </span>
        <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 text-text-muted" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface p-3 shadow-glass">
          {/* حقل الإيموجي */}
          <div className="mb-2">
            <label className="mb-1 block text-xs font-semibold text-text-muted">أو اكتب إيموجي:</label>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="🎯 📚 ⏱️ ..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {/* شبكة الأيقونات */}
          <div className="grid max-h-44 grid-cols-7 gap-1 overflow-y-auto">
            {ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); setOpen(false); }}
                title={key}
                className={`grid h-9 place-items-center rounded-md border transition ${
                  value === key ? "border-primary bg-primary/10 text-primary" : "border-transparent text-text-muted hover:bg-background"
                }`}
              >
                <DynamicIcon value={key} className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-md bg-primary/10 py-1.5 text-xs font-bold text-primary">
            تم
          </button>
        </div>
      )}
    </div>
  );
}

interface FieldDef { key: string; label: string; type?: "text" | "textarea"; placeholder?: string }

/**
 * محرّر بطاقات عام: إضافة/حذف/تعديل بطاقات لها أيقونة وحقول نصّية.
 * generic عبر T extends { id: string; icon?: string }
 */
export function CardListEditor<T extends { id: string; icon?: string }>({
  title,
  items,
  onChange,
  fields,
  hasIcon = true,
  newItem,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: FieldDef[];
  hasIcon?: boolean;
  newItem: () => T;
}) {
  function update(id: string, patch: Partial<T>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }
  function add() {
    onChange([...items, newItem()]);
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold">{title}</h4>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{items.length}</span>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={it.id} className="rounded-xl border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="grid h-7 w-7 place-items-center rounded text-text-muted hover:text-primary disabled:opacity-20">▲</button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1}
                  className="grid h-7 w-7 place-items-center rounded text-text-muted hover:text-primary disabled:opacity-20">▼</button>
                <span className="text-xs font-bold text-text-muted">بطاقة {idx + 1}</span>
              </div>
              <button onClick={() => remove(it.id)} title="حذف البطاقة"
                className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition hover:bg-danger/10 hover:text-danger">
                <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
              </button>
            </div>

            {hasIcon && (
              <div className="mb-2">
                <label className="mb-1 block text-xs font-semibold text-text-muted">الأيقونة</label>
                <IconPicker value={it.icon ?? ""} onChange={(v) => update(it.id, { icon: v } as Partial<T>)} />
              </div>
            )}

            {fields.map((f) => (
              <div key={f.key} className="mb-2">
                <label className="mb-1 block text-xs font-semibold text-text-muted">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    value={(it as Record<string, unknown>)[f.key] as string ?? ""}
                    onChange={(e) => update(it.id, { [f.key]: e.target.value } as Partial<T>)}
                    placeholder={f.placeholder}
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                ) : (
                  <input
                    value={(it as Record<string, unknown>)[f.key] as string ?? ""}
                    onChange={(e) => update(it.id, { [f.key]: e.target.value } as Partial<T>)}
                    placeholder={f.placeholder}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={add}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-bold text-text-muted transition hover:border-primary hover:text-primary">
        <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
        إضافة بطاقة جديدة
      </button>
    </div>
  );
}
