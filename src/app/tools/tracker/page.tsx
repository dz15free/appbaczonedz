"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { AppShell } from "@/components/app-shell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCircleCheck, faCircleHalfStroke, faCircle } from "@fortawesome/free-solid-svg-icons";
import { loginHrefFor } from "@/features/auth/use-require-auth";

type Status = "todo" | "partial" | "done";

const SUBJECTS: { id: string; name: string; color: string; topics: string[] }[] = [
  {
    id: "math", name: "الرياضيات", color: "text-primary",
    topics: ["النهايات والاستمرارية", "المشتقات", "التكامل", "الأعداد المركّبة", "المتتاليات", "الاحتمالات", "الهندسة في الفضاء"],
  },
  {
    id: "sciences", name: "العلوم الطبيعية", color: "text-secondary",
    topics: ["الخلية وتنظيمها", "الوراثة والتكاثر", "الجهاز العصبي", "التوازن الهرموني", "المناعة", "البيئة والتوازنات"],
  },
  {
    id: "physics", name: "الفيزياء والكيمياء", color: "text-warning",
    topics: ["الميكانيك", "الكهرباء", "الضوء والموجات", "التحولات النووية", "الكيمياء العضوية", "الكيمياء الجزيئية"],
  },
  {
    id: "arabic", name: "اللغة العربية", color: "text-danger",
    topics: ["التعبير والإنشاء", "فهم المكتوب", "الشعر والنثر", "النحو والصرف", "البلاغة والعروض"],
  },
  {
    id: "french", name: "اللغة الفرنسية", color: "text-primary",
    topics: ["Compréhension de l'écrit", "Production écrite", "Grammaire et conjugaison", "Vocabulaire"],
  },
  {
    id: "philosophy", name: "الفلسفة", color: "text-secondary",
    topics: ["منهجية الكتابة الفلسفية", "الفلسفة والعلم", "الحرية والقيم", "الفكر السياسي", "المنطق والاستدلال"],
  },
  {
    id: "history", name: "التاريخ والجغرافيا", color: "text-warning",
    topics: ["الحرب العالمية الثانية", "الحرب الباردة", "قضية الجزائر", "العالم بعد الحرب الباردة", "الجغرافيا الاقتصادية"],
  },
  {
    id: "english", name: "اللغة الإنجليزية", color: "text-danger",
    topics: ["Reading Comprehension", "Writing Skills", "Grammar", "Vocabulary", "Oral Expression"],
  },
];

const STATUS_META: Record<Status, { icon: typeof faCircle; color: string; label: string }> = {
  todo:    { icon: faCircle,          color: "text-border",     label: "لم أبدأ" },
  partial: { icon: faCircleHalfStroke, color: "text-warning",   label: "جارٍ" },
  done:    { icon: faCircleCheck,     color: "text-secondary",  label: "أتممته" },
};

function nextStatus(s: Status): Status {
  return s === "todo" ? "partial" : s === "partial" ? "done" : "todo";
}

export default function TrackerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("math");
  const [progress, setProgress] = useState<Record<string, Record<string, Status>>>({});

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(rtdb, `studyProgress/${user.uid}`), (snap) => {
      setProgress(snap.val() ?? {});
    });
  }, [user]);

  function toggle(subjectId: string, topicIdx: number) {
    if (!user) return;
    const key = `t${topicIdx}`;
    const cur: Status = (progress[subjectId]?.[key] as Status) ?? "todo";
    const next = nextStatus(cur);
    set(ref(rtdb, `studyProgress/${user.uid}/${subjectId}/${key}`), next);
  }

  function calcPercent(subjectId: string, total: number) {
    const p = progress[subjectId] ?? {};
    const done = Object.values(p).filter((v) => v === "done").length;
    const part = Object.values(p).filter((v) => v === "partial").length;
    return Math.round(((done + part * 0.5) / total) * 100);
  }

  const subject = SUBJECTS.find((s) => s.id === tab)!;
  const pct = calcPercent(tab, subject.topics.length);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-5 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-text-muted hover:text-primary">
            <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-extrabold">متتبّع التقدّم الدراسي</h1>
            <p className="text-xs text-text-muted">اضغط على كل موضوع لتحديث حالته</p>
          </div>
        </div>

        {/* تبويبات المواد */}
        <div className="mb-4 flex flex-wrap gap-2">
          {SUBJECTS.map((s) => {
            const pctS = calcPercent(s.id, s.topics.length);
            const isActive = tab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isActive ? "bg-gradient-primary text-white shadow" : "border border-border text-text-muted hover:border-primary hover:text-primary"
                }`}
              >
                {s.name}
                {pctS > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${isActive ? "bg-white/20" : "bg-secondary/10 text-secondary"}`}>
                    {pctS}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* شريط التقدّم */}
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className={`font-bold ${subject.color}`}>{subject.name}</span>
            <span className="font-extrabold">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
            {(["todo","partial","done"] as Status[]).map((s) => {
              const meta = STATUS_META[s];
              const count = subject.topics.filter((_,i) => ((progress[tab]?.[`t${i}`] as Status) ?? "todo") === s).length;
              return (
                <span key={s} className="flex items-center gap-1">
                  <FontAwesomeIcon icon={meta.icon} className={`h-3 w-3 ${meta.color}`} />
                  {count} {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* قائمة المواضيع */}
        <div className="space-y-2">
          {subject.topics.map((topic, i) => {
            const key = `t${i}`;
            const status: Status = (progress[tab]?.[key] as Status) ?? "todo";
            const meta = STATUS_META[status];
            return (
              <button
                key={i}
                onClick={() => toggle(tab, i)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-right transition hover:shadow-glass ${
                  status === "done"
                    ? "border-secondary/30 bg-secondary/5"
                    : status === "partial"
                    ? "border-warning/30 bg-warning/5"
                    : "border-border bg-surface hover:border-primary/30"
                }`}
              >
                <FontAwesomeIcon icon={meta.icon} className={`h-5 w-5 shrink-0 ${meta.color}`} />
                <span className={`flex-1 text-sm font-semibold ${status === "done" ? "line-through text-text-muted" : ""}`}>
                  {topic}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  status === "done" ? "bg-secondary/10 text-secondary" :
                  status === "partial" ? "bg-warning/10 text-warning" :
                  "bg-border text-text-muted"
                }`}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-text-muted">
          يُحفظ تقدّمك تلقائياً ويظهر على أجهزتك كلّها 📱
        </p>
      </section>
    </AppShell>
  );
}
