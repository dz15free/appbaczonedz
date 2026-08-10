"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass, faXmark, faUsers, faLayerGroup, faUser, faSpinner, faComment, faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import { ref, query, orderByChild, limitToFirst, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

interface Result {
  id: string;
  name: string;
  sub?: string;
  href: string;
  kind: "room" | "group" | "user" | "post" | "library";
}

const ICON = { room: faUsers, group: faLayerGroup, user: faUser, post: faComment, library: faBookOpen };
const LABEL = { room: "غرفة", group: "مجموعة", user: "مستخدم", post: "منشور", library: "مكتبة" };

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

async function searchPosts(q: string): Promise<Result[]> {
  const lower = q.toLowerCase();
  const snap = await get(query(ref(rtdb, "community/posts"), orderByChild("createdAt"), limitToLast(300)));
  const val = snap.val() ?? {};
  return Object.entries(val)
    .filter(([, p]: any) => p.text && String(p.text).toLowerCase().includes(lower))
    .reverse()
    .slice(0, 6)
    .map(([id, p]: any) => ({
      id,
      name: String(p.text).slice(0, 80),
      sub: p.authorName ? `بقلم ${p.authorName}` : undefined,
      href: `/community/${id}`, kind: "post" as const,
    }));
}

async function searchLibrary(q: string): Promise<Result[]> {
  const lower = q.toLowerCase();
  const snap = await get(query(ref(rtdb, "library"), orderByChild("createdAt"), limitToLast(300)));
  const val = snap.val() ?? {};
  return Object.entries(val)
    .filter(([, e]: any) =>
      (e.title && String(e.title).toLowerCase().includes(lower)) ||
      (e.description && String(e.description).toLowerCase().includes(lower)) ||
      (e.chapter && String(e.chapter).toLowerCase().includes(lower)))
    .reverse()
    .slice(0, 6)
    .map(([id, e]: any) => ({
      id, name: e.title ?? "ملف", sub: e.chapter ?? undefined,
      href: `/library`, kind: "library" as const,
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
        const [rooms, groups, users, posts, library] = await Promise.all([
          searchRooms(q.trim()),
          searchGroups(q.trim()),
          searchUsers(q.trim()),
          searchPosts(q.trim()),
          searchLibrary(q.trim()),
        ]);
        setResults([...users, ...rooms, ...groups, ...posts, ...library]);
      } finally { setLoading(false); }
    }, 300);
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
  const posts = results.filter((r) => r.kind === "post");
  const library = results.filter((r) => r.kind === "library");

  function Section({ title, items }: { title: string; items: Result[] }) {
    if (!items.length) return null;
    return (
      <div className="mb-3.5 last:mb-0">
        <p className="bz-srch-sec">{title}<span>{items.length}</span></p>
        <div className="space-y-1">
          {items.map((r) => (
            <Link key={r.id} href={r.href} onClick={onClose} className="bz-srch-row">
              <span className="bz-srch-ic" data-kind={r.kind}>
                <FontAwesomeIcon icon={ICON[r.kind]} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="bz-srch-t">{r.name}</span>
                {r.sub && <span className="bz-srch-s">{r.sub}</span>}
              </span>
              <span className="bz-srch-tag">{LABEL[r.kind]}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* اقتراحات جاهزة: نافذة بحث فارغة تُخبر المستخدم «اكتب» ولا تساعده.
     هذه الوجهات هي أكثر ما يُبحث عنه فعلاً. */
  const SUGGEST = [
    { href: "/courses", label: "الدورات" },
    { href: "/rooms", label: "غرف المراجعة" },
    { href: "/library", label: "المكتبة" },
    { href: "/specialties", label: "التخصّصات الجامعية" },
    { href: "/calculate", label: "حساب المعدّل" },
  ];

  return (
    <div className="bz-srch-back" onClick={onClose} role="dialog" aria-modal="true" aria-label="البحث">
      <div className="bz-srch" onClick={(e) => e.stopPropagation()}>
        {/* ــ حقل البحث ــ */}
        <div className="bz-srch-head">
          <span className="bz-srch-glass">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-[17px] w-[17px]" />
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن دورة، غرفة، ملخّص، أو زميل…"
            aria-label="ابحث في المنصّة"
            /* ١٦px إلزامي: أقلّ منه يجعل Safari على iPhone يُكبّر
               الصفحة لحظة اللمس فتخرج النافذة عن مكانها. */
            className="min-w-0 flex-1 bg-transparent text-[16px] font-bold outline-none placeholder:font-medium placeholder:text-text-muted"
          />
          {loading ? (
            <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : q ? (
            <button onClick={() => setQ("")} aria-label="مسح" className="bz-srch-x">
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
            </button>
          ) : (
            /* تلميح لوحة المفاتيح — يظهر على الحاسوب وحده */
            <kbd className="bz-srch-kbd">Esc</kbd>
          )}
        </div>

        {/* ــ النتائج ــ */}
        <div className="bz-srch-body">
          {q.trim().length < 2 ? (
            <div className="px-1 py-2">
              <p className="bz-srch-sec">وجهات سريعة</p>
              <div className="flex flex-wrap gap-2 px-1 pt-1">
                {SUGGEST.map((x) => (
                  <Link key={x.href} href={x.href} onClick={onClose} className="bz-srch-chip">
                    {x.label}
                  </Link>
                ))}
              </div>
              <p className="mt-4 px-1 text-[12px] font-semibold text-text-muted">
                اكتب حرفين على الأقل للبحث في الدورات والغرف والمكتبة والمنشورات والأعضاء.
              </p>
            </div>
          ) : loading && results.length === 0 ? (
            <div className="space-y-2 p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                  <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-border/70" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-border/70" />
                    <span className="block h-2.5 w-1/5 animate-pulse rounded bg-border/50" />
                  </span>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="h-5 w-5" />
              </span>
              <p className="text-[14.5px] font-extrabold text-text-primary">لا نتائج لـ «{q}»</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-text-muted">
                جرّب كلمة أقصر، أو تصفّح الوجهات السريعة.
              </p>
            </div>
          ) : (
            <>
              <Section title="المستخدمون" items={users} />
              <Section title="الغرف" items={rooms} />
              <Section title="المجموعات" items={groups} />
              <Section title="المنشورات" items={posts} />
              <Section title="المكتبة" items={library} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
