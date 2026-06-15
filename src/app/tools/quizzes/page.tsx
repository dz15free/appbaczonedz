"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { awardQuiz } from "@/features/gamification/points";
import { QUIZ_BANKS, type Question } from "@/features/quizzes/question-bank";
import { AppShell } from "@/components/app-shell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight, faCheck, faXmark, faTrophy, faQuestionCircle,
  faRotateLeft, faStar, faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";

const QUIZ_SIZE = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizzesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  function startQuiz(id: string) {
    const bank = QUIZ_BANKS.find((b) => b.id === id);
    if (!bank) return;
    const picked = shuffle(bank.questions).slice(0, Math.min(QUIZ_SIZE, bank.questions.length));
    setQuestions(picked);
    setQIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setAwarded(false);
    setSubjectId(id);
  }

  function answer(i: number) {
    if (selected !== null) return; // مرة واحدة فقط
    setSelected(i);
    if (i === questions[qIdx].correct) setScore((s) => s + 1);
  }

  async function next() {
    if (qIdx + 1 >= questions.length) {
      setDone(true);
      if (!awarded && user) {
        const pct = Math.round((score / questions.length) * 100);
        await awardQuiz(user.uid, pct);
        setAwarded(true);
      }
      return;
    }
    setQIdx((i) => i + 1);
    setSelected(null);
  }

  const subject = QUIZ_BANKS.find((b) => b.id === subjectId);
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-4">
        {/* الرأس */}
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => (subjectId ? setSubjectId(null) : router.back())}
            className="text-text-muted hover:text-primary"
          >
            <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-extrabold">اختبارات تجريبية</h1>
            <p className="text-xs text-text-muted">
              {subject ? subject.name : `${questions.length || QUIZ_SIZE} أسئلة عشوائية لكل مادة`}
            </p>
          </div>
        </div>

        {/* ══════ اختيار المادة ══════ */}
        {!subjectId && (
          <div className="grid gap-3 sm:grid-cols-2">
            {QUIZ_BANKS.map((b) => (
              <button
                key={b.id}
                onClick={() => startQuiz(b.id)}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-right transition hover:border-primary/40 hover:shadow-glass"
              >
                <div>
                  <p className="font-bold">{b.name}</p>
                  <p className="mt-1 text-xs text-text-muted">{b.questions.length} سؤال متوفّر</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-white">
                  <FontAwesomeIcon icon={faQuestionCircle} className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ══════ سؤال نشط ══════ */}
        {subjectId && !done && questions[qIdx] && (
          <div className="flex flex-col gap-5">
            {/* شريط التقدّم */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted">
                <span>السؤال {qIdx + 1} من {questions.length}</span>
                <span className="font-bold text-primary">{score} صحيحة</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                  style={{ width: `${(qIdx / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* السؤال */}
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-lg font-bold leading-relaxed">{questions[qIdx].q}</p>
            </div>

            {/* الخيارات */}
            <div className="space-y-2.5">
              {questions[qIdx].options.map((opt, i) => {
                const isCorrect = i === questions[qIdx].correct;
                const isPicked = i === selected;
                let style = "border-border bg-surface hover:border-primary/40";
                if (selected !== null) {
                  if (isCorrect) style = "border-secondary bg-secondary/10";
                  else if (isPicked) style = "border-danger bg-danger/10";
                  else style = "border-border bg-surface opacity-60";
                }
                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    disabled={selected !== null}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right text-sm font-semibold transition ${style}`}
                  >
                    <span>{opt}</span>
                    {selected !== null && isCorrect && (
                      <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-secondary" />
                    )}
                    {selected !== null && isPicked && !isCorrect && (
                      <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-danger" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* التفسير + التالي */}
            {selected !== null && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm leading-relaxed text-text-primary">
                  <span className="font-bold text-primary">التفسير: </span>
                  {questions[qIdx].explain}
                </p>
                <button
                  onClick={next}
                  className="mt-3 w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white"
                >
                  {qIdx + 1 >= questions.length ? "عرض النتيجة" : "السؤال التالي"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════ النتيجة النهائية ══════ */}
        {subjectId && done && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <FontAwesomeIcon
              icon={pct >= 50 ? faTrophy : faGraduationCap}
              className={`h-14 w-14 ${pct >= 50 ? "text-warning" : "text-primary"}`}
            />
            <h2 className="font-display text-2xl font-extrabold">
              {pct === 100 ? "علامة كاملة! 🌟" : pct >= 50 ? "أحسنت! 👏" : "استمر في المحاولة 💪"}
            </h2>
            <p className="text-4xl font-extrabold text-primary">{pct}%</p>
            <p className="text-text-muted">
              أجبت بشكل صحيح على {score} من {questions.length} أسئلة
            </p>
            {pct >= 50 && (
              <p className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-bold text-secondary">
                <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5" />
                +{pct === 100 ? 25 : 15} نقطة أُضيفت لحسابك
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => startQuiz(subjectId)}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-2.5 text-sm font-bold text-white"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                اختبار جديد
              </button>
              <button
                onClick={() => setSubjectId(null)}
                className="rounded-md border border-border px-6 py-2.5 text-sm font-bold hover:bg-surface"
              >
                مادة أخرى
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
