"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass, faXmark, faUsers, faLayerGroup, faUser, faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { ref, query, orderByChild, limitToFirst, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

interface Result {
  id: string;
  name: string;
  sub?: string;
  href: string;
  kind: "room" | "group" | "user";
}

const ICON = { room: faUsers, group: faLayerGroup, user: faUser };
const LABEL = { room: "غرفة", group: "مجموعة", user: "مستخدم" };

async function searchRooms(q: string): Promise<Result[]> {
  const lower = q.toLowerCase();
  const snap = await get(query(ref(rtdb, "rooms"), orderByChild("name"), limitToFirst(200)));
  const val = snap.val() ?? {};
  return Object.entries(val)
    .filter(([, r]: any) => r.name && String(r.name).toLowerCase().includes(lower))
    .slice(0, 6)
    .map(([id, r]: any) => ({
      id, name: r.name, sub: r.subject ?? undefined,
      href: `/rooms/${id}`, kind: "room" as const,
    }));
}

async function searchGroups(q: string): Promise<Result[]> {
  const lower = q.toLowerCase();
  const snap = await get(query(ref(rtdb, "groups"), orderByChild("name"), limitToFirst(200)));
  const val = snap.val() ?? {};
  return Object.entries(val)
    .filter(([, g]: any) => g.name && String(g.name).toLowerCase().includes(lower))
    .slice(0, 6)
    .map(([id, g]: any) => ({
      id, name: g.name, sub: g.subject ?? undefined,
      href: `/groups/${id}`, kind: "group" as const,
    }));
}

async function searchUsers(q: string): Promise<Result[]> {
  const lower = q.toLowerCase();
  const snap = await get(query(ref(rtdb, "users"), orderByChild("name"), limitToFirst(400)));
  const val = snap.val() ?? {};
  return Object.entries(val)
    .filter(([, u]: any) => u.name && String(u.name).toLowerCase().includes(lower))
    .slice(0, 8)
    .map(([id, u]: any) => ({
      id, name: u.name, sub: u.track ?? undefined,
      href: `/u/${id}?name=${encodeURIComponent(u.name)}`, kind: "user" as const,
    }));
}

interface Props { onClose: () => void; }

export function SearchModal({ onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [rooms, groups, users] = await Promise.all([
          searchRooms(q.trim()),
          searchGroups(q.trim()),
          searchUsers(q.trim()),
        ]);
        setResults([...rooms, ...groups, ...users]);
      } finally { setLoading(false); }
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q]);

  // Escape يُغلق
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const rooms = results.filter((r) => r.kind === "room");
  const groups = results.filter((r) => r.kind === "group");
  const users = results.filter((r) => r.kind === "user");

  function Section({ title, items }: { title: string; items: Result[] }) {
    if (!items.length) return null;
    return (
      <div className="mb-3">
        <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">{title}</p>
        <div className="space-y-1">
          {items.map((r) => (
            <Link key={r.id} href={r.href} onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-primary/5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <FontAwesomeIcon icon={ICON[r.kind]} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                {r.sub && <p className="text-xs text-text-muted">{r.sub}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[10px] text-text-muted">
                {LABEL[r.kind]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-4 pt-[10vh]"
      onClick={onClose}>
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* حقل البحث */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="h-5 w-5 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن غرفة أو مجموعة أو مستخدم..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-text-muted"
          />
          {loading
            ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-text-muted" />
            : q && <button onClick={() => setQ("")} className="text-text-muted hover:text-primary">
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
          }
        </div>

        {/* النتائج */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {q.trim().length < 2 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              اكتب كلمتين على الأقل للبحث
            </p>
          ) : !loading && results.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              لا نتائج لـ «{q}»
            </p>
          ) : (
            <>
              <Section title="الغرف" items={rooms} />
              <Section title="المجموعات" items={groups} />
              <Section title="المستخدمون" items={users} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
