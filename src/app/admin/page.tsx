"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, remove, query, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield, faFlag, faUsers, faLayerGroup, faTrash,
  faChartBar, faCircleExclamation, faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";

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

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ groups: 0, posts: 0, users: "..." });
  const [tab, setTab] = useState<"reports" | "stats">("reports");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!loading && profile && profile.role !== "admin") router.replace("/home");
  }, [loading, user, profile, router]);

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
        <div className="mb-4 flex gap-2">
          {(["reports", "stats"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-primary/10 text-primary" : "text-text-muted"}`}>
              {t === "reports" ? `البلاغات (${reports.length})` : "الإحصائيات"}
            </button>
          ))}
        </div>

        {tab === "stats" && (
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
              لمنع المستخدمين أو حذف محتوى معيّن، استخدم لوحة Firebase مباشرةً (RTDB).
            </div>
          </>
        )}

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
