"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, remove, query, orderByChild, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield, faFlag, faLayerGroup, faTrash,
  faChartBar, faCircleExclamation, faCheckCircle, faGear,
  faCalendarDays, faFloppyDisk, faLock, faLockOpen, faBullhorn,
  faPaperPlane, faMessage,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { useBacExamDate, setBacExamDate } from "@/features/settings/use-bac-date";
import { createPost, deletePost, setPostLocked, type Post } from "@/features/community/social";

interface Report {
  id: string;
  kind: string;
  reporterId: string;
  reporterName: string;
  reason?: string;
  createdAt: number;
}

interface StatCard { label: string; value: number | string; icon: any; color: string; }

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? "اليوم" : `منذ ${d} يوم`;
}

const TABS = [
  { id: "overview", label: "نظرة عامة", icon: faChartBar },
  { id: "settings", label: "الإعدادات", icon: faGear },
  { id: "posts", label: "المنشورات", icon: faMessage },
  { id: "reports", label: "البلاغات", icon: faFlag },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ groups: 0, posts: 0, users: "..." });
  const [tab, setTab] = useState<Tab>("overview");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // ─── إعدادات: تاريخ البكالوريا ───
  const bacDate = useBacExamDate();
  const [dateInput, setDateInput] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  // ─── منشورات: إعلان رسمي ───
  const [announceText, setAnnounceText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!loading && profile && profile.role !== "admin") router.replace("/home");
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (bacDate) setDateInput(bacDate);
  }, [bacDate]);

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    // تحميل البلاغات
    const unsub = onValue(query(ref(rtdb, "reports"), limitToLast(100)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, r]: [string, any]) => ({ id, ...r })) as Report[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setReports(list);
    });
    // إحصائيات
    get(ref(rtdb, "groups")).then((s) => setStats((st) => ({ ...st, groups: Object.keys(s.val() ?? {}).length })));
    get(query(ref(rtdb, "community/posts"), limitToLast(1000))).then((s) => setStats((st) => ({ ...st, posts: Object.keys(s.val() ?? {}).length })));
    return unsub;
  }, [user, profile]);

  // تحميل آخر المنشورات لتبويب "المنشورات"
  useEffect(() => {
    if (!user || profile?.role !== "admin" || tab !== "posts") return;
    return onValue(query(ref(rtdb, "community/posts"), orderByChild("createdAt"), limitToLast(40)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, p]: [string, any]) => ({ id, ...p, myVote: 0, score: p.score ?? 0 })) as Post[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(list);
    });
  }, [user, profile, tab]);

  if (loading || !user || !profile) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (profile.role !== "admin") return null;

  const statCards: StatCard[] = [
    { label: "المجموعات", value: stats.groups, icon: faLayerGroup, color: "text-primary bg-primary/10" },
    { label: "المنشورات (آخر 1000)", value: stats.posts, icon: faChartBar, color: "text-secondary bg-secondary/10" },
    { label: "البلاغات الفعّالة", value: reports.filter((r) => !dismissed.has(r.id)).length, icon: faFlag, color: "text-danger bg-danger/10" },
  ];

  async function dismissReport(id: string) {
    await remove(ref(rtdb, `reports/${id}`));
    setDismissed((d) => new Set([...d, id]));
  }

  async function saveBacDate() {
    if (!dateInput) return;
    setSavingDate(true);
    try {
      await setBacExamDate(dateInput);
    } finally {
      setSavingDate(false);
    }
  }

  async function publishAnnouncement() {
    if (!announceText.trim() || !user) return;
    setPosting(true);
    try {
      await createPost(user.uid, "📢 إدارة BacZoneDZ", announceText, undefined, "public");
      setAnnounceText("");
    } finally {
      setPosting(false);
    }
  }

  async function removePost(p: Post) {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    await deletePost(p);
    setPosts((list) => list.filter((x) => x.id !== p.id));
  }

  async function toggleLock(p: Post) {
    await setPostLocked(p.id, !p.locked);
    setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, locked: !p.locked } : x)));
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-white">
            <FontAwesomeIcon icon={faShield} className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold">لوحة الإدارة</h1>
            <p className="text-xs text-text-muted">للمؤسّس فقط — غير مرئية للمستخدمين</p>
          </div>
        </div>

        {/* تبويبات */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition ${tab === t.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"}`}>
              <FontAwesomeIcon icon={t.icon} className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "reports" && reports.length > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t.id ? "bg-white/20" : "bg-danger/10 text-danger"}`}>{reports.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════ نظرة عامة ═══════ */}
        {tab === "overview" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${s.color}`}>
                    <FontAwesomeIcon icon={s.icon} className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-3xl font-extrabold">{s.value}</p>
                  <p className="text-sm text-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-text-muted">
              <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4 text-warning" />{" "}
              لإدارة المستخدمين (حظر/ترقية) بشكل متقدّم، استخدم لوحة Firebase مباشرةً (RTDB).
            </div>
          </>
        )}

        {/* ═══════ الإعدادات ═══════ */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FontAwesomeIcon icon={faCalendarDays} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">تاريخ امتحان البكالوريا</p>
                  <p className="text-xs text-text-muted">يُستخدم في العدّ التنازلي على الصفحة الرئيسية لجميع الطلاب</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:flex-1"
                />
                <button
                  onClick={saveBacDate}
                  disabled={savingDate || !dateInput}
                  className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-gradient-primary text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:px-6"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                  {savingDate ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
              {bacDate && (
                <p className="mt-2 text-xs text-text-muted">
                  التاريخ الحالي المحفوظ: <span className="font-bold text-secondary">{bacDate}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══════ المنشورات ═══════ */}
        {tab === "posts" && (
          <div className="space-y-4">
            {/* إعلان رسمي */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faBullhorn} className="h-4 w-4 text-primary" />
                <span className="font-bold">نشر إعلان رسمي للمجتمع</span>
              </div>
              <textarea
                value={announceText}
                onChange={(e) => setAnnounceText(e.target.value)}
                rows={3}
                placeholder="اكتب إعلاناً يظهر باسم «📢 إدارة BacZoneDZ»..."
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={publishAnnouncement}
                disabled={posting || !announceText.trim()}
                className="mt-2 flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5 -scale-x-100" />
                {posting ? "جارٍ النشر..." : "نشر الإعلان"}
              </button>
            </div>

            {/* قائمة المنشورات */}
            <div>
              <p className="mb-2 text-xs font-bold text-text-muted">آخر المنشورات (40)</p>
              <div className="space-y-2">
                {posts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          {p.authorName}
                          {p.locked && <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-warning" />}
                          {p.subject && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{p.subject}</span>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{p.text || "(بدون نص)"}</p>
                        <p className="mt-1 text-[10px] text-text-muted">{timeAgo(p.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => toggleLock(p)}
                          title={p.locked ? "فتح التعليقات" : "إغلاق التعليقات"}
                          className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-warning/10 hover:text-warning"
                        >
                          <FontAwesomeIcon icon={p.locked ? faLockOpen : faLock} className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removePost(p)}
                          title="حذف"
                          className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-muted">لا منشورات.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ البلاغات ═══════ */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 && (
              <div className="grid place-items-center py-16 text-center text-text-muted">
                <FontAwesomeIcon icon={faCheckCircle} className="h-10 w-10 text-secondary" />
                <p className="mt-3 text-sm">لا بلاغات — المجتمع نظيف! 🎉</p>
              </div>
            )}
            {reports.map((r) => (
              <div key={r.id} className={`rounded-xl border p-4 ${dismissed.has(r.id) ? "opacity-40" : "border-border bg-surface"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faFlag} className="h-4 w-4 text-danger" />
                    <span className="font-semibold">
                      {r.kind === "post" ? "منشور" : r.kind === "comment" ? "تعليق" : r.kind} مُبلَّغ عنه
                    </span>
                  </div>
                  <button onClick={() => dismissReport(r.id)} aria-label="رفض"
                    className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  أبلغ عنه: <span className="font-semibold text-text-primary">{r.reporterName}</span>
                  {r.reason && <> · «{r.reason}»</>}
                </p>
                <p className="mt-1 text-xs text-text-muted">{timeAgo(r.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
