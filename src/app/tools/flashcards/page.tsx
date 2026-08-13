"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ref, push, remove, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { useAuth } from "@/features/auth/auth-provider";
import { STREAMS } from "@/features/study/curriculum";
import { listenCustomLessons, mergeLessons, listenHiddenSubjects, isSubjectHidden, type CustomLesson } from "@/features/study/curriculum-store";
import { useSiteSubjects } from "@/features/study/subjects-store";
import { AppShell } from "@/components/app-shell";
import { PublicBackButton } from "@/components/ui/public-back-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrash, faRotateLeft,
  faCheck, faXmark, faTrophy, faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { loginHrefFor } from "@/features/auth/use-require-auth";

/* 🐛 كانت هنا قائمة **مكتوبة في الشيفرة** بمعرّفات إنجليزية
   (`math` · `physics` …)، بينما البطاقة المحفوظة من السبورة تحمل
   **اسم المادّة العربي** من المنهج (`الرياضيات` · `العلوم الفيزيائية`).
   فلا يتطابقان أبداً: كل بطاقة تُحفظ من الغرفة تختفي من كل فلتر إلا
   «الكل» — والطالب لا يعرف لماذا.

   الآن المواد تُشتقّ من **شعبة الطالب** في المنهج، **مع ضمّ أي مادّة
   موجودة فعلاً في بطاقاته** — فلا تسقط بطاقة من مادّة قديمة أو من
   شعبة أخرى. */
const STREAM_KEY = "bz-stream";

interface Card { id: string; front: string; back: string; subject: string; createdAt: number; }

type Tab = "study" | "add" | "manage";

function FlipCard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px" }} className="w-full cursor-pointer" onClick={() => setFlipped((f) => !f)}>
      <div
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(.4,0,.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          position: "relative",
          minHeight: "180px",
        }}
      >
        {/* الوجه الأمامي */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-primary/30 bg-surface p-6 text-center shadow-glass"
        >
          <p className="text-xs font-bold text-primary mb-3 uppercase">السؤال — اضغط للكشف</p>
          <p className="text-lg font-bold leading-relaxed">{front}</p>
        </div>
        {/* الوجه الخلفي */}
        <div
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-secondary/30 bg-secondary/5 p-6 text-center shadow-glass"
        >
          <p className="text-xs font-bold text-secondary mb-3 uppercase">الجواب</p>
          <p className="text-lg font-bold leading-relaxed text-secondary">{back}</p>
        </div>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [tab, setTab] = useState<Tab>("study");
  const [subject, setSubject] = useState("all");
  const [stream, setStream] = useState<string>(STREAMS[0] ?? "");
  const [custom, setCustom] = useState<CustomLesson[]>([]);
  const [hiddenSubs, setHiddenSubs] = useState<Set<string>>(new Set());
  const siteSubjects = useSiteSubjects();

  useEffect(() => {
    try { const v = localStorage.getItem(STREAM_KEY); if (v) setStream(v); } catch { /* معطّل */ }
  }, []);

  useEffect(() => {
    const unsub = listenCustomLessons(setCustom);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  /* المواد التي أخفاها الأدمن تختفي من هنا أيضاً — مصدر واحد للقرار،
     فلا تظهر مادّة في صفحة وتغيب عن أخرى. */
  useEffect(() => {
    const unsub = listenHiddenSubjects(setHiddenSubs);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [newSubject, setNewSubject] = useState("math");
  const [saving, setSaving] = useState(false);

  // وضع الدراسة
  const [queue, setQueue] = useState<Card[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState({ correct: 0, again: 0 });
  const [done, setDone] = useState(false);
  const [studying, setStudying] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(rtdb, `flashcards/${user.uid}`), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, c]: any) => ({ id, ...c })) as Card[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setCards(list);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  /* مواد الشعبة + كل مادّة لها بطاقات فعلاً. الضمّ ضروري: بطاقة من
     شعبة سابقة أو مادّة حُذفت من المنهج يجب أن تبقى قابلة للوصول. */
  const SUBJECTS = useMemo(() => {
    const all = mergeLessons(custom);
    /* ثلاثة مصادر: مواد الموقع التي يديرها الأدمن · مواد المنهج لشعبة
       الطالب · وكل مادّة لها بطاقات فعلاً. الأخيرة تضمن ألّا تختفي
       بطاقة بسبب تغيير في القوائم. */
    const fromSite = siteSubjects.map((x) => x.name);
    const fromCurriculum = [...new Set(all.filter((l) => l.stream === stream).map((l) => l.subject))]
      .filter((sub) => !isSubjectHidden(hiddenSubs, stream, sub));
    const fromCards = [...new Set(cards.map((c) => c.subject).filter(Boolean))];
    const names = [...new Set([...fromSite, ...fromCurriculum, ...fromCards])];
    return [{ id: "all", name: "الكل" }, ...names.map((n) => ({ id: n, name: n }))];
  }, [custom, stream, cards, hiddenSubs, siteSubjects]);

  const filtered = subject === "all" ? cards : cards.filter((c) => c.subject === subject);

  function startStudy() {
    const deck = [...filtered].sort(() => Math.random() - 0.5);
    if (!deck.length) return;
    setQueue(deck);
    setQIdx(0);
    setScore({ correct: 0, again: 0 });
    setDone(false);
    setStudying(true);
  }

  function answer(correct: boolean) {
    setScore((s) => ({ ...s, correct: s.correct + (correct ? 1 : 0), again: s.again + (correct ? 0 : 1) }));
    if (qIdx + 1 >= queue.length) setDone(true);
    else setQIdx((i) => i + 1);
  }

  async function addCard() {
    if (!front.trim() || !back.trim() || !user) return;
    setSaving(true);
    try {
      await push(ref(rtdb, `flashcards/${user.uid}`), {
        front: front.trim(), back: back.trim(), subject: newSubject, createdAt: Date.now(),
      });
      setFront(""); setBack("");
    } finally { setSaving(false); }
  }

  async function deleteCard(id: string) {
    if (!user) return;
    await remove(ref(rtdb, `flashcards/${user.uid}/${id}`));
  }

  /* حذف كلّي: مسح العقدة **مرّة واحدة** لا حلقة على كل بطاقة.
     مئة بطاقة = مئة طلب في الحلقة، وطلب واحد هنا — والفرق يظهر على
     حصّة Firebase وعلى شبكة الطالب معاً. */
  async function deleteAll() {
    if (!user || cards.length === 0) return;
    const n = subject === "all" ? cards.length : filtered.length;
    const what = subject === "all" ? "كل بطاقاتك" : `بطاقات «${subjectName(subject)}»`;
    if (!confirm(`حذف ${what} (${n} بطاقة)؟ لا يمكن التراجع.`)) return;
    if (subject === "all") {
      await remove(ref(rtdb, `flashcards/${user.uid}`));
      return;
    }
    // حذف مادّة واحدة: لا مفرّ من المرور على بطاقاتها
    for (const c of filtered) await remove(ref(rtdb, `flashcards/${user.uid}/${c.id}`));
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const subjectName = (id: string) => (SUBJECTS.find((s) => s.id === id)?.name ?? id) || "عامّ";

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        {/* الرأس */}
        <div className="mb-5 flex items-center gap-3">
          {studying ? <button type="button" onClick={() => setStudying(false)} className="bz-public-back" aria-label="الخروج من وضع الدراسة"><span>←</span><span>الخروج</span></button> : <PublicBackButton fallbackHref="/tools" fallbackLabel="الأدوات" />}
          <div>
            <h1 className="font-display text-xl font-extrabold">بطاقات المراجعة</h1>
            <p className="text-xs text-text-muted">{cards.length} بطاقة محفوظة</p>
          </div>
        </div>

        {/* تبويبات */}
        {!studying && (
          <div className="mb-4 flex gap-2">
            {(["study", "add", "manage"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"}`}>
                {t === "study" ? "مراجعة" : t === "add" ? "إضافة" : "بطاقاتي"}
              </button>
            ))}
          </div>
        )}

        {/* ══════ وضع الدراسة النشط ══════ */}
        {studying && !done && queue[qIdx] && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex w-full items-center justify-between text-sm text-text-muted">
              <span>{qIdx + 1} / {queue.length}</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {subjectName(queue[qIdx].subject)}
              </span>
            </div>
            {/* شريط تقدّم */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full bg-gradient-primary transition-all duration-500"
                style={{ width: `${((qIdx) / queue.length) * 100}%` }} />
            </div>
            <FlipCard front={queue[qIdx].front} back={queue[qIdx].back} />
            <div className="flex w-full gap-3">
              <button onClick={() => answer(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-danger/30 bg-danger/5 py-4 text-base font-bold text-danger hover:bg-danger/10">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" /> راجعه
              </button>
              <button onClick={() => answer(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-secondary/30 bg-secondary/5 py-4 text-base font-bold text-secondary hover:bg-secondary/10">
                <FontAwesomeIcon icon={faCheck} className="h-5 w-5" /> عرفته
              </button>
            </div>
          </div>
        )}

        {/* ══════ نهاية الجلسة ══════ */}
        {studying && done && (
          <div className="flex flex-col items-center gap-5 text-center py-8">
            <FontAwesomeIcon icon={faTrophy} className="h-14 w-14 text-warning" />
            <h2 className="font-display text-2xl font-extrabold">أحسنت! 🎉</h2>
            <div className="flex gap-6 text-lg">
              <div><span className="block text-3xl font-extrabold text-secondary">{score.correct}</span><span className="text-sm text-text-muted">عرفتها</span></div>
              <div><span className="block text-3xl font-extrabold text-danger">{score.again}</span><span className="text-sm text-text-muted">تحتاج مراجعة</span></div>
            </div>
            <p className="text-text-muted text-sm">
              {score.correct === queue.length ? "ممتاز! أتقنت البطاقات كلّها 🌟" : `${Math.round((score.correct / queue.length) * 100)}% صحيح`}
            </p>
            <div className="flex gap-3">
              <button onClick={startStudy}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-2.5 text-sm font-bold text-white">
                <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" /> مراجعة مجدّداً
              </button>
              <button onClick={() => setStudying(false)}
                className="rounded-md border border-border px-6 py-2.5 text-sm font-bold hover:bg-surface">
                العودة
              </button>
            </div>
          </div>
        )}

        {/* ══════ تبويب المراجعة ══════ */}
        {!studying && tab === "study" && (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {SUBJECTS.map((s) => {
                const cnt = s.id === "all" ? cards.length : cards.filter((c) => c.subject === s.id).length;
                return (
                  <button key={s.id} onClick={() => setSubject(s.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${subject === s.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:border-primary hover:text-primary"}`}>
                    {s.name}
                    <span className={`rounded-full px-1.5 ${subject === s.id ? "bg-white/20" : "bg-border"}`}>{cnt}</span>
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FontAwesomeIcon icon={faLayerGroup} className="h-12 w-12 text-text-muted opacity-30" />
                <p className="mt-3 text-sm text-text-muted">لا بطاقات بعد — أضف بعض البطاقات أولاً!</p>
              </div>
            ) : (
              <button onClick={startStudy}
                className="w-full rounded-2xl bg-gradient-primary py-5 text-center font-display text-lg font-extrabold text-white shadow-glow hover:opacity-90">
                🚀 ابدأ المراجعة ({filtered.length} بطاقة)
              </button>
            )}
          </div>
        )}

        {/* ══════ تبويب الإضافة ══════ */}
        {!studying && tab === "add" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">المادة</label>
              <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                {SUBJECTS.filter((s) => s.id !== "all").map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">السؤال (الوجه الأمامي)</label>
              <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={3}
                placeholder="اكتب السؤال أو المصطلح..."
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">الجواب (الوجه الخلفي)</label>
              <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3}
                placeholder="اكتب الجواب أو الشرح..."
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <button onClick={addCard} disabled={saving || !front.trim() || !back.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary py-3 text-sm font-bold text-white disabled:opacity-50">
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "إضافة البطاقة"}
            </button>
          </div>
        )}

        {/* ══════ تبويب الإدارة ══════ */}
        {!studying && tab === "manage" && (
          <div>
            {cards.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-text-muted">
                  {subject === "all" ? `${cards.length} بطاقة` : `${filtered.length} في هذه المادّة`}
                </span>
                <button
                  onClick={deleteAll}
                  className="ms-auto flex items-center gap-1.5 rounded-lg border border-[#F3C9C6] bg-[var(--bz-red-050)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--bz-red)] transition hover:brightness-95"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  {subject === "all" ? "حذف كل البطاقات" : "حذف بطاقات هذه المادّة"}
                </button>
              </div>
            )}

            {cards.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">لا بطاقات بعد.</p>
            ) : (
              <div className="space-y-2">
                {cards.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.front}</p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{c.back}</p>
                      <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {subjectName(c.subject)}
                      </span>
                    </div>
                    <button onClick={() => { if (confirm("حذف هذه البطاقة؟")) deleteCard(c.id); }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                      <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
