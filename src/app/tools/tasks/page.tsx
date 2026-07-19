"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck, faPlus, faTrash, faCheck, faRobot, faBroom, faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { AppShell } from "@/components/app-shell";
import {
  listenStudyTasks, addStudyTask, toggleStudyTask, deleteStudyTask,
  clearCompletedTasks, type StudyTask,
} from "@/features/study/study-tasks";
import { loginHrefFor } from "@/features/auth/use-require-auth";

export default function TasksPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => { if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search)); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    return listenStudyTasks(user.uid, setTasks);
  }, [user]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // تجميع حسب اليوم/المرحلة
  const groups = new Map<string, StudyTask[]>();
  for (const t of tasks) {
    const key = t.day || "مهام عامّة";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  async function add() {
    const text = newTask.trim();
    if (!text || !user) return;
    setNewTask("");
    await addStudyTask(user.uid, text, { source: "manual" });
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-6">
        {/* الرأس */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-white">
            <FontAwesomeIcon icon={faListCheck} className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">مهامي الدراسية</h1>
            <p className="text-sm text-text-muted">خطط الخباشة ومهامك في مكان واحد</p>
          </div>
        </div>

        {/* شريط التقدّم */}
        {total > 0 && (
          <div className="mb-5 rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold">التقدّم</span>
              <span className="font-bold text-primary">{done} / {total} ({pct}%)</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            {done === total && total > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-secondary">
                <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" /> أنجزت كل مهامك! عمل رائع 🎉
              </p>
            )}
          </div>
        )}

        {/* إضافة مهمة */}
        <div className="mb-5 flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="أضف مهمة جديدة..."
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button onClick={add} disabled={!newTask.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white transition hover:opacity-90 disabled:opacity-40">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          </button>
        </div>

        {/* القوائم */}
        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface py-12 text-center">
            <FontAwesomeIcon icon={faRobot} className="h-10 w-10 text-primary/40" />
            <p className="mt-3 font-semibold">لا مهام بعد</p>
            <p className="mt-1 text-sm text-text-muted">اطلب من الخباشة خطة مراجعة واحفظها كمهام، أو أضف مهمة يدوياً.</p>
            <Link href="/omibot" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              <FontAwesomeIcon icon={faRobot} className="h-4 w-4" /> اسأل الخباشة
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(groups.entries()).map(([day, items]) => (
              <div key={day}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-text-muted">
                  <span className="h-1 w-4 rounded-full bg-primary" /> {day}
                </h2>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div key={t.id}
                      className={`group flex items-center gap-3 rounded-xl border p-3 transition ${
                        t.done ? "border-border bg-background opacity-60" : "border-border bg-surface hover:border-primary/30"
                      }`}>
                      <button
                        onClick={() => toggleStudyTask(user.uid, t.id, !t.done)}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${
                          t.done ? "border-secondary bg-secondary text-white" : "border-border hover:border-primary"
                        }`}
                        aria-label="إنجاز"
                      >
                        {t.done && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                      </button>
                      <span className={`flex-1 text-sm leading-relaxed ${t.done ? "text-text-muted line-through" : ""}`}>
                        {t.text}
                      </span>
                      {t.source === "khabbasha" && (
                        <FontAwesomeIcon icon={faRobot} className="h-3.5 w-3.5 shrink-0 text-primary/40" title="من الخباشة" />
                      )}
                      <button
                        onClick={() => deleteStudyTask(user.uid, t.id)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                        aria-label="حذف"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* مسح المنجزة */}
            {done > 0 && (
              <button onClick={() => clearCompletedTasks(user.uid)}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:border-danger/30 hover:text-danger">
                <FontAwesomeIcon icon={faBroom} className="h-4 w-4" /> مسح المهام المُنجزة ({done})
              </button>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
