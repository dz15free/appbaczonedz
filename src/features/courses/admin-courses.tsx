"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck, faXmark, faPen, faEye, faUpRightFromSquare, faLayerGroup,
  faUsers, faStar, faChevronDown, faSpinner, faGlobe, faBan, faComments,
  faCircleInfo, faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";
import {
  listenAllCourses, listenCourseContent, setCourseStatus, publishCourse,
  unpublishCourse, deleteCourse,
} from "@/features/courses/courses";
import { CourseReviewThread } from "@/features/courses/review-thread";
import { CourseCover, CourseStatusBadge, CoursePrice } from "@/features/courses/course-ui";
import { useCourseReviews } from "@/features/courses/reviews";
import { listenEnrollCount } from "@/features/courses/enrollment";
import { createAccessCode, splitAmount, getCommissionPct } from "@/features/paid/paid-access";
import {
  type Course, type CourseStatus, type LessonContent,
  COURSE_STATUS_LABEL, LESSON_KIND_LABEL, branchLabel, formatDuration, levelName,
} from "@/features/courses/types";

/* ════════════════════════════════════════════════════════════
   مراجعة الدورات — داخل لوحة الإدارة القائمة

   لا لوحة ثانية: تبويب إضافي بجانب «المكتبة» و«البلاغات» بالتصميم
   نفسه. لوحة منفصلة تعني مكاناً ثانياً يُنسى فتتراكم فيه الدورات.

   والمراجعة عمل لا زرّ: الأدمن يرى الروابط الفعلية للدروس قبل أن
   يوافق — لأنّ الموافقة على دورة لم تُفتح دروسها موافقة على لا شيء.
════════════════════════════════════════════════════════════ */

const TABS: { id: "pending" | CourseStatus; label: string }[] = [
  { id: "pending", label: "بانتظار المراجعة" },
  { id: "review", label: "قيد المراجعة" },
  { id: "changes", label: "تعديلات مطلوبة" },
  { id: "approved", label: "مقبولة" },
  { id: "published", label: "منشورة" },
  { id: "rejected", label: "مرفوضة" },
  { id: "draft", label: "مسوّدات" },
];

export function AdminCourses({ admin }: { admin: { uid: string; name: string } }) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [tab, setTab] = useState<"pending" | CourseStatus>("pending");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenAllCourses(setCourses);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of courses ?? []) c[x.status] = (c[x.status] ?? 0) + 1;
    c.pending = c.submitted ?? 0;
    return c;
  }, [courses]);

  const list = (courses ?? []).filter((c) =>
    tab === "pending" ? c.status === "submitted" : c.status === tab);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
        <p className="text-xs font-bold text-text-primary">🎓 إدارة الدورات</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
          الأستاذ يُنشئ ويُرسل، والإدارة وحدها تنشر. «طلب تعديلات» يفتح محادثة مع الأستاذ
          بدل رفض بلا سبب. النشر يُخرج نسخة عامّة من الدورة يراها الزوّار ومحرّكات البحث.
        </p>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              tab === t.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"
            }`}>
            {t.label}
            {counts[t.id] ? (
              <span className={`rounded-full px-1.5 ${tab === t.id ? "bg-white/20" : "bg-danger/10 text-danger"}`}>
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {courses === null ? (
        <p className="py-10 text-center text-sm text-text-muted">جارٍ التحميل…</p>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-text-muted">
          لا دورات في هذا التبويب.
        </p>
      ) : (
        <div className="space-y-2.5">
          {list.map((c) => (
            <AdminCourseRow
              key={c.id}
              course={c}
              admin={admin}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCourseRow({
  course, admin, open, onToggle,
}: {
  course: Course;
  admin: { uid: string; name: string };
  open: boolean;
  onToggle: () => void;
}) {
  const [busy, setBusy] = useState<string>("");
  const [students, setStudents] = useState(0);
  const [content, setContent] = useState<Record<string, LessonContent>>({});
  const [grantUid, setGrantUid] = useState("");
  const [grantCode, setGrantCode] = useState("");
  const [commission, setCommission] = useState(10);
  const { count, avg } = useCourseReviews(course.id);

  useEffect(() => {
    const unsub = listenEnrollCount(course.id, setStudents);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [course.id]);

  useEffect(() => {
    if (!open) return;
    const unsub = listenCourseContent(course.id, setContent);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [open, course.id]);

  useEffect(() => {
    void getCommissionPct().then(setCommission);
  }, []);

  async function act(name: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(name);
    try { await fn(); } finally { setBusy(""); }
  }

  /* منح وصول يدوي بعد دفع مؤكَّد: يُنشئ **كود وصول** بنفس نظام
     الأكواد القائم. لا مسار جانبي — والكود يبقى أثراً قابلاً للتدقيق
     في السجلّ المالي. */
  async function generateCode() {
    await act("code", async () => {
      const code = await createAccessCode({
        itemType: "course",
        itemId: course.id,
        itemTitle: course.title,
        price: course.price ?? 0,
        ownerId: course.teacherId,
        ownerName: course.teacherName,
        createdBy: admin.uid,
      });
      setGrantCode(code);
    });
  }

  const split = splitAmount(course.price ?? 0, commission);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex gap-3 p-3">
        <div className="w-20 shrink-0 overflow-hidden rounded-lg sm:w-28">
          <CourseCover course={course} className="aspect-[16/10] object-cover" rounded="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CourseStatusBadge status={course.status} />
            <CoursePrice course={course} />
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] font-extrabold leading-snug text-text-primary">{course.title || "بلا عنوان"}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            <Link href={`/u/${course.teacherId}`} className="font-bold text-primary hover:underline">{course.teacherName}</Link>
            {" · "}{branchLabel(course.branches)}{" · "}{levelName(course.level)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-text-muted">
            <span><FontAwesomeIcon icon={faLayerGroup} className="me-1 h-2.5 w-2.5" />{course.lessonCount ?? 0} درساً</span>
            <span><FontAwesomeIcon icon={faUsers} className="me-1 h-2.5 w-2.5" />{students}</span>
            <span><FontAwesomeIcon icon={faStar} className="me-1 h-2.5 w-2.5 text-amber-500" />{count ? avg.toFixed(1) : "—"}</span>
            <span>{formatDuration(course.totalDuration)}</span>
          </div>
        </div>
        <button onClick={onToggle} aria-expanded={open} aria-label="تفاصيل الدورة"
          className="grid h-9 w-9 shrink-0 place-items-center self-start rounded-lg border border-border text-text-muted transition hover:border-primary hover:text-primary">
          <FontAwesomeIcon icon={faChevronDown} className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* إجراءات سريعة */}
      <div className="flex flex-wrap gap-1.5 border-t border-border p-2.5">
        {course.status === "submitted" && (
          <ActionBtn label="بدء المراجعة" icon={faEye} busy={busy === "review"}
            onClick={() => act("review", () => setCourseStatus(course, "review"))} />
        )}
        {(course.status === "submitted" || course.status === "review" || course.status === "changes") && (
          <>
            <ActionBtn label="موافقة" icon={faCheck} tone="ok" busy={busy === "approve"}
              onClick={() => act("approve", () => setCourseStatus(course, "approved"))} />
            <ActionBtn label="طلب تعديلات" icon={faPen} tone="warn" busy={busy === "changes"}
              onClick={() => act("changes", () => setCourseStatus(course, "changes"))} />
            <ActionBtn label="رفض" icon={faXmark} tone="bad" busy={busy === "reject"}
              onClick={() => {
                const reason = prompt("سبب الرفض (يصل للأستاذ):") ?? "";
                if (reason === null) return;
                void act("reject", () => setCourseStatus(course, "rejected", { reason }));
              }} />
          </>
        )}
        {(course.status === "approved" || course.status === "unpublished") && (
          <ActionBtn label="نشر الدورة" icon={faGlobe} tone="ok" busy={busy === "publish"}
            onClick={() => act("publish", () => publishCourse(course))} />
        )}
        {course.status === "published" && (
          <ActionBtn label="إيقاف النشر" icon={faBan} tone="bad" busy={busy === "unpublish"}
            onClick={() => { if (confirm("إيقاف نشر هذه الدورة؟ ستختفي من السوق ويحتفظ المشتركون بوصولهم.")) void act("unpublish", () => unpublishCourse(course)); }} />
        )}
        <Link href={`/courses/${course.id}`} target="_blank"
          className="ms-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-bold text-text-muted transition hover:border-primary hover:text-primary">
          <FontAwesomeIcon icon={faUpRightFromSquare} className="h-2.5 w-2.5" /> فتح الصفحة
        </Link>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border bg-background p-3">
          {course.shortDesc && (
            <p className="text-[12px] leading-relaxed text-text-muted"><b className="text-text-primary">الوصف: </b>{course.shortDesc}</p>
          )}
          {course.fullDesc && (
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-muted">{course.fullDesc}</p>
          )}

          {/* المنهج مع الروابط — جوهر المراجعة */}
          <div>
            <p className="mb-1.5 text-[12px] font-extrabold text-text-primary">المحتوى وروابطه</p>
            <div className="space-y-2">
              {course.sections.map((s, si) => (
                <div key={s.id} className="rounded-lg border border-border bg-surface">
                  <p className="border-b border-border px-2.5 py-1.5 text-[11.5px] font-extrabold text-text-primary">
                    {si + 1}. {s.title}
                  </p>
                  <ul className="divide-y divide-border">
                    {(s.lessons ?? []).map((l) => {
                      const url = content[l.id]?.url;
                      return (
                        <li key={l.id} className="px-2.5 py-2">
                          <p className="text-[11.5px] font-bold text-text-primary">
                            {l.title}
                            <span className="ms-1.5 font-normal text-text-muted">
                              ({LESSON_KIND_LABEL[l.kind]}{l.duration ? ` · ${formatDuration(l.duration)}` : ""})
                            </span>
                            {l.preview && <span className="ms-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-600">معاينة</span>}
                          </p>
                          {l.kind === "text" ? (
                            <p className="mt-0.5 line-clamp-2 text-[10.5px] text-text-muted">{content[l.id]?.text || "— لا نصّ —"}</p>
                          ) : url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" dir="ltr"
                              className="mt-0.5 block truncate font-mono text-[10px] text-primary hover:underline">{url}</a>
                          ) : (
                            <p className="mt-0.5 text-[10.5px] font-bold text-danger">— لا رابط —</p>
                          )}
                          {content[l.id]?.resourceUrl && (
                            <a href={content[l.id]!.resourceUrl} target="_blank" rel="noopener noreferrer" dir="ltr"
                              className="block truncate font-mono text-[10px] text-text-muted hover:underline">
                              مرفق: {content[l.id]!.resourceUrl}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* المالية */}
          {course.type === "paid" && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5">
              <p className="text-[11.5px] font-extrabold text-text-primary">
                <FontAwesomeIcon icon={faMoneyBillWave} className="me-1.5 h-3 w-3 text-amber-500" />
                توزيع المبلغ (عمولة المنصّة {commission}%)
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                السعر {course.price ?? 0} دج · عمولة المنصّة {split.commission} دج · حصّة الأستاذ {split.owner} دج
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-text-muted">
                <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" />
                العمولة تُجمَّد لحظة الدفع لا وقت العرض — تعديلها لاحقاً لا يغيّر عمليات سابقة.
              </p>

              <div className="mt-2.5">
                <p className="text-[11px] font-bold text-text-primary">منح وصول بعد دفع يدوي</p>
                <div className="mt-1.5 flex gap-2">
                  <input value={grantUid} onChange={(e) => setGrantUid(e.target.value)}
                    placeholder="ملاحظة/اسم الطالب (اختياري)" aria-label="ملاحظة"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 text-[11.5px] outline-none focus:border-primary" />
                  <button onClick={generateCode} disabled={Boolean(busy)}
                    className="shrink-0 rounded-lg bg-gradient-primary px-3 text-[11.5px] font-extrabold text-white disabled:opacity-50">
                    {busy === "code" ? <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" /> : "توليد كود"}
                  </button>
                </div>
                {grantCode && (
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-surface p-2">
                    <code dir="ltr" className="flex-1 text-center text-[12.5px] font-extrabold tracking-wider text-primary">{grantCode}</code>
                    <button onClick={() => navigator.clipboard?.writeText(grantCode)}
                      className="rounded bg-primary/10 px-2 py-1 text-[10.5px] font-bold text-primary">نسخ</button>
                  </div>
                )}
                <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
                  أعطِ الكود للطالب بعد تأكّدك من الدفع — يُستعمل مرّة واحدة ويُقفل على حسابه،
                  ويُسجَّل في السجلّ المالي تلقائياً.
                </p>
              </div>
            </div>
          )}

          {/* محادثة المراجعة */}
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <p className="mb-2 text-[11.5px] font-extrabold text-text-primary">
              <FontAwesomeIcon icon={faComments} className="me-1.5 h-3 w-3 text-primary" />
              محادثة المراجعة مع الأستاذ
            </p>
            <CourseReviewThread course={course} me={{ ...admin, role: "admin" }} compact />
          </div>

          {course.status === "draft" && (
            <button
              onClick={() => { if (confirm(`حذف مسوّدة «${course.title}» نهائياً؟`)) void deleteCourse(course.id, course.teacherId); }}
              className="text-[11px] font-bold text-danger hover:underline">
              حذف هذه المسوّدة نهائياً
            </button>
          )}

          {course.status === "rejected" && course.rejectReason && (
            <p className="rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger">
              سبب الرفض المسجَّل: {course.rejectReason}
            </p>
          )}

          <p className="text-[10px] text-text-muted">
            الحالة الحالية: {COURSE_STATUS_LABEL[course.status]} · آخر تحديث{" "}
            {new Date(course.updatedAt ?? course.createdAt).toLocaleString("ar-DZ")}
          </p>
        </div>
      )}
    </article>
  );
}

function ActionBtn({
  label, icon, onClick, busy, tone = "default",
}: {
  label: string;
  icon: typeof faCheck;
  onClick: () => void;
  busy?: boolean;
  tone?: "default" | "ok" | "warn" | "bad";
}) {
  const cls =
    tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
      : tone === "warn" ? "border-amber-400/50 bg-amber-400/10 text-amber-600 hover:bg-amber-400/20"
      : tone === "bad" ? "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
      : "border-border text-text-muted hover:border-primary hover:text-primary";
  return (
    <button onClick={onClick} disabled={busy}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11.5px] font-extrabold transition disabled:opacity-50 ${cls}`}>
      <FontAwesomeIcon icon={busy ? faSpinner : icon} className={`h-2.5 w-2.5 ${busy ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}
