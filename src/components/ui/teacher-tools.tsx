"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ref, onValue, query, orderByChild, equalTo, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare, faGraduationCap, faBookOpen, faUsers, faChalkboardUser,
  faArrowLeft, faFire, faMoneyBillWave, faDoorOpen,
} from "@fortawesome/free-solid-svg-icons";
import { LiveAvatar } from "@/components/ui/live-avatar";

/* ════════════════════════════════════════════════════════════
   أدوات الأستاذ

   الأستاذ لا يراجع للبكالوريا: بطاقات المراجعة ومتتبّع الدروس وحاسبة
   المعدّل أدوات **طالب**، وعرضها له يملأ شاشته بما لا يستعمله ويُخفي
   ما يستعمله. فبدلها أدواتُ تدريس: ينشر، يُنشئ دورة، يفتح غرفة، يرى
   طلبته وأرباحه.

   خمسة إجراءات لا خمسة عشر: القائمة الطويلة تُقرأ ولا تُستعمل. وكلّها
   روابط إلى أنظمة قائمة — لا نظام جديد خلف أيّ منها.
════════════════════════════════════════════════════════════ */

const TOOLS = [
  { href: "/community?compose=1", label: "أضف منشوراً", desc: "شارك نصيحة أو ملفّاً مع طلبتك", icon: faPenToSquare, tone: "bg-primary/10 text-primary" },
  { href: "/courses/new",         label: "أنشئ دورة",   desc: "دورة كاملة تمرّ بمراجعة الإدارة", icon: faGraduationCap, tone: "bg-secondary/10 text-secondary" },
  { href: "/rooms?create=1",      label: "غرفة مراجعة", desc: "افتح حصّة مباشرة الآن أو جدولها", icon: faChalkboardUser, tone: "bg-danger/10 text-danger" },
  { href: "/library",             label: "أضف ملخّصاً", desc: "ارفع ملخّصاً إلى مكتبة البكالوريا", icon: faBookOpen, tone: "bg-emerald-500/10 text-emerald-600" },
  { href: "/courses/teach",       label: "دوراتي",      desc: "حالة دوراتك وملاحظات المراجعة", icon: faGraduationCap, tone: "bg-amber-500/10 text-amber-600" },
] as const;

export function TeacherTools({ uid }: { uid?: string }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-text-primary">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white">
              <FontAwesomeIcon icon={faChalkboardUser} className="h-4 w-4" />
            </span>
            أدوات التدريس
          </h2>
          <p className="mt-0.5 text-[12px] text-text-muted">ما تحتاجه لإدارة محتواك وطلبتك.</p>
        </div>
        <Link href="/profile"
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-extrabold text-primary transition hover:bg-primary/5">
          <FontAwesomeIcon icon={faMoneyBillWave} className="h-3 w-3" /> أرباحي
        </Link>
      </div>

      <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t.tone}`}>
              <FontAwesomeIcon icon={t.icon} className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold text-text-primary group-hover:text-primary">{t.label}</span>
              <span className="block truncate text-[11px] text-text-muted">{t.desc}</span>
            </span>
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3 shrink-0 text-text-muted" />
          </Link>
        ))}
      </div>

      {uid && <MyStudents uid={uid} />}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   طلابي — من حضروا حصص الأستاذ فعلاً

   المصدر عقدة `attendance/{teacherUid}` القائمة (التي يستعملها نظام
   تقييم الأساتذة). فلا عقدة جديدة ولا عدّ مصطنع: من دخل غرفتك يظهر
   هنا، والأكثر حضوراً في الأعلى.
══════════════════════════════════════════════════════════ */
interface StudentRow { uid: string; name: string; since: number }

function MyStudents({ uid }: { uid: string }) {
  const [rows, setRows] = useState<StudentRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    const unsub = onValue(ref(rtdb, `attendance/${uid}`), async (snap) => {
      const val = (snap.val() as Record<string, { at?: number }> | null) ?? {};
      const ids = Object.keys(val).slice(0, 40);
      if (!ids.length) { if (alive) setRows([]); return; }

      // اسم كل طالب من عقدته — قراءة واحدة لكل طالب ومحدودة بأربعين
      const names = await Promise.all(
        ids.map((id) =>
          get(ref(rtdb, `users/${id}/name`)).then((s) => (s.val() as string) ?? "طالب").catch(() => "طالب"),
        ),
      );
      if (!alive) return;
      setRows(
        ids
          .map((id, i) => ({ uid: id, name: names[i], since: Number(val[id]?.at) || 0 }))
          // الأحدث حضوراً أوّلاً: عقدة الحضور تُكتب مرّة واحدة لكل طالب،
          // فلا عدد حصص فيها — وعرض رقم مُختلَق أسوأ من عدم عرضه.
          .sort((a, b) => b.since - a.since)
          .slice(0, 8),
      );
    }, () => { if (alive) setRows([]); });

    return () => { alive = false; if (typeof unsub === "function") unsub(); };
  }, [uid]);

  if (rows === null) return <div className="mt-3 h-20 animate-pulse rounded-2xl border border-border bg-background" />;

  return (
    <div className="mt-3.5 rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[13px] font-extrabold text-text-primary">
          <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 text-primary" /> طلابي
        </p>
        {rows.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <FontAwesomeIcon icon={faFire} className="h-2.5 w-2.5" /> آخر من حضر
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-[11.5px] leading-relaxed text-text-muted">
          <FontAwesomeIcon icon={faDoorOpen} className="h-3 w-3 shrink-0 text-text-muted" />
          لم يحضر أحد حصصك بعد — افتح غرفة مراجعة وسيظهر طلبتك هنا.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.uid}>
              <Link href={`/u/${r.uid}`}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-primary/5">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold ${
                  i === 0 ? "bg-amber-400/20 text-amber-600" : "bg-border text-text-muted"
                }`}>{i + 1}</span>
                <LiveAvatar uid={r.uid} name={r.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-text-primary">{r.name}</span>
                <span className="shrink-0 text-[11px] font-bold text-text-muted">
                  {r.since ? new Date(r.since).toLocaleDateString("ar-DZ", { day: "numeric", month: "short" }) : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
