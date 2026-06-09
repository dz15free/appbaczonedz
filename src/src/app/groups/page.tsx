"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUsers, faXmark, faSearch, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import {
  createGroup,
  listenGroups,
  listenUserGroupIds,
  GROUP_SUBJECTS,
  SUBJECT_COLOR,
  type StudyGroup,
} from "@/features/groups/groups";

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? "اليوم" : `منذ ${d} يوم`;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "general", description: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => listenGroups(setGroups), []);
  useEffect(() => {
    if (!user) return;
    return listenUserGroupIds(user.uid, setMyIds);
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const me = { uid: user.uid, name: profile?.name || user.displayName || "طالب" };

  async function create() {
    if (!form.name.trim()) { setErr("اسم المجموعة مطلوب."); return; }
    setSaving(true); setErr("");
    try {
      const id = await createGroup(me, form);
      setCreating(false);
      setForm({ name: "", subject: "general", description: "" });
      router.push(`/groups/${id}`);
    } catch { setErr("تعذّر الإنشاء."); }
    finally { setSaving(false); }
  }

  const shown = groups
    .filter((g) => tab === "mine" ? myIds.has(g.id) : true)
    .filter((g) => !search || g.name.includes(search) || g.description.includes(search));

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="font-display text-xl font-extrabold">مجموعات المواد</h1>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" /> إنشاء مجموعة
          </button>
        </div>

        {/* تبويبات */}
        <div className="mb-3 flex gap-2">
          {(["all", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-primary/10 text-primary" : "text-text-muted"}`}
            >
              {t === "all" ? "كل المجموعات" : "مجموعاتي"}
            </button>
          ))}
        </div>

        {/* بحث */}
        <div className="relative mb-4">
          <FontAwesomeIcon icon={faSearch} className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في المجموعات..."
            className="w-full rounded-md border border-border bg-surface pe-10 ps-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* القائمة */}
        {shown.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <FontAwesomeIcon icon={faLayerGroup} className="h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">
              {tab === "mine" ? "لم تنضم لأي مجموعة بعد." : "لا مجموعات بعد — كن أول من ينشئ!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((g) => {
              const subj = GROUP_SUBJECTS.find((s) => s.id === g.subject);
              const color = SUBJECT_COLOR[g.subject] ?? "bg-primary/10 text-primary";
              const isMember = myIds.has(g.id);
              return (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="block rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-glass"
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl font-extrabold ${color}`}>
                      {g.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{g.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>
                          {subj?.name ?? g.subject}
                        </span>
                        {isMember && <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">عضو</span>}
                      </div>
                      {g.description && <p className="mt-0.5 truncate text-sm text-text-muted">{g.description}</p>}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faUsers} className="h-3 w-3" /> {g.ownerName}
                        </span>
                        <span>{timeAgo(g.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* نافذة الإنشاء */}
      {creating && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">إنشاء مجموعة جديدة</h2>
              <button onClick={() => setCreating(false)} className="text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-1 block text-sm font-semibold">اسم المجموعة *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: مجموعة مراجعة الرياضيات"
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <label className="mb-1 block text-sm font-semibold">الشعبة / المادة</label>
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {GROUP_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <label className="mb-1 block text-sm font-semibold">وصف مختصر (اختياري)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="عمّ تتحدّث هذه المجموعة..."
              className="mb-4 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {err && <p className="mb-3 text-sm text-danger">{err}</p>}
            <button onClick={create} disabled={saving} className="w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "جارٍ الإنشاء..." : "إنشاء المجموعة"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
