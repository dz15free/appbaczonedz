"use client";
import { useEffect, useState } from "react";
import { ChargilyPayButton } from "@/features/paid/chargily-button";
import { ReportLinkButton } from "@/features/community/report-link";
import { useSiteSubjects } from "@/features/study/subjects-store";
import Link from "next/link";
import { ref, push, remove, update, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faSearch, faFilePdf, faFileLines, faLink, faSpinner, faXmark, faBookOpen, faLock, faToggleOn, faToggleOff, faKey, faStar, faPen, faCheck, faComments, faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, Badge, Chip, ChipRail, EmptyState, SkeletonList, IconButton } from "@/components/ui/kit";
import { Button } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { timeAgo } from "@/lib/time-ago";
import { AdSlot } from "@/components/ui/ad-slot";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { listenHasAccess, redeemCode, createAccessCode } from "@/features/paid/paid-access";
import { ContentRatingBadge, ContentRatingSheet } from "@/features/community/content-rating";
import { SupportChatSheet } from "@/features/support/support-chat";
import { loginHrefFor, useQueryParam } from "@/features/auth/use-require-auth";
import { ShareButton } from "@/components/ui/share-sheet";

/* كانت قائمة ثالثة مكتوبة في الشيفرة. صارت من سجلّ المواد، فإضافة
   مادّة في لوحة الإدارة تظهر هنا وفي الغرف معاً بلا تعديل شيفرة. */

interface LibEntry { id: string; subject: string; chapter: string; title: string; description?: string; fileUrl: string; fileType: string; uploaderId: string; uploaderName: string; createdAt: number; isPaid?: boolean; price?: number; }

function guessType(url: string) {
  if (/\.pdf(\?|$)/i.test(url) || /drive\.google/i.test(url)) return "pdf";
  if (/\.(doc|docx)(\?|$)/i.test(url)) return "doc";
  return "link";
}
/* «منذ متى» موحّدة في `src/lib/time-ago.ts` — كانت هنا نسخة ثالثة
   تقول «منذ ٣ يوم» بينما تقول الرئيسية «منذ ٣ أيّام». */
/* تأخذ القائمة وسيطاً: القائمة صارت حيّة من خطّاف، والدالّة على مستوى
   الوحدة لا تستطيع قراءة خطّاف. */
function subjectLabel(list: { id: string; label: string }[], id: string) {
  return list.find((s) => s.id === id)?.label ?? id;
}

export default function LibraryPage() {
  const siteSubjects = useSiteSubjects();
  // «الكل» أوّلاً كما كانت القائمة الثابتة
  const SUBJECTS = [
    { id: "all", label: "الكل" },
    ...siteSubjects.map((s) => ({ id: s.id, label: s.name })),
  ];
  const router = useRouter();

  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [entries, setEntries] = useState<LibEntry[]>([]);
  /* 🐛 لم تكن للمكتبة حالة تحميل إطلاقاً: `entries` تبدأ `[]` والاشتراك
     غير متزامن، فكانت الصفحة تعرض «لا مصادر بعد — كن أوّل من يضيف!»
     في **كل** زيارة قبل أن تُستبدل بالقائمة. أوضح عيب في المنصّة. */
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [subFilter, setSubFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "math", chapter: "", description: "", fileUrl: "", isPaid: false, price: "" });
  const [adding, setAdding] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => { if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search)); }, [loading, user, router]);
  useEffect(() => {
    const unsub = onValue(query(ref(rtdb, "library"), orderByChild("createdAt"), limitToLast(200)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, e]: [string, any]) => ({ id, ...e })) as LibEntry[];
      setEntries(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoadingEntries(false);
    }, () => setLoadingEntries(false));
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  /* 🐛 React #310 — كان هذا الخطّاف **تحت** الخروج المبكّر.
     أثناء التحميل تُنفَّذ خطّافات أقلّ، وبعده تُنفَّذ خطّافة إضافية،
     فتشتكي React: «رُصدت خطّافات أكثر من التصيير السابق».
     كل الخطّافات يجب أن تسبق أيّ `return`. */
  // عنصر مشارَك عبر رابط: نتجاهل الفلاتر ونرفعه إلى الأعلى ونبرزه
  const sharedId = useQueryParam("item");

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const filtered = entries
    .filter((e) => {
      if (sharedId && e.id === sharedId) return true;
      if (subFilter !== "all" && e.subject !== subFilter) return false;
      if (search && !e.title.includes(search) && !e.chapter?.includes(search)) return false;
      return true;
    })
    .sort((a, b) => (a.id === sharedId ? -1 : b.id === sharedId ? 1 : 0));

  // فقط الأستاذ والأدمن يمكنهما نشر محتوى مدفوع
  const canSell = profile?.role === "teacher" || profile?.role === "admin";

  async function addEntry() {
    if (!form.title.trim() || !form.fileUrl.trim()) { setFormErr("العنوان والرابط مطلوبان"); return; }
    const uid = user?.uid;
    const uname = profile?.name || user?.displayName || "طالب";
    if (!uid) return;
    const paid = form.isPaid && canSell;
    const priceNum = parseInt(form.price, 10);
    if (paid && (!priceNum || priceNum <= 0)) { setFormErr("أدخل سعراً صحيحاً للمحتوى المدفوع"); return; }
    setAdding(true); setFormErr("");
    try {
      const entry: Record<string, unknown> = {
        title: form.title, subject: form.subject, chapter: form.chapter,
        description: form.description, fileUrl: form.fileUrl,
        fileType: guessType(form.fileUrl), uploaderId: uid, uploaderName: uname, createdAt: Date.now(),
      };
      if (paid) { entry.isPaid = true; entry.price = priceNum; }
      await push(ref(rtdb, "library"), entry);
      setForm({ title: "", subject: "math", chapter: "", description: "", fileUrl: "", isPaid: false, price: "" }); setShowAdd(false);
    } catch { setFormErr("حدث خطأ."); } finally { setAdding(false); }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-5">
        <AdSlot placement="library" className="mb-4" />
        {/* ترويسة الصفحة — بلا زرّ رجوع: كانت المكتبة الصفحة الوحيدة
            في المنصّة التي تحمل سهم رجوع، فيختلف نموذج التنقّل فيها
            عن الغرف والدورات والمجتمع بلا سبب. */}
        <header className="mb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-[22px] font-extrabold leading-tight text-text-primary sm:text-2xl">
                مكتبة البكالوريا
              </h1>
              <p className="mt-1 text-[12.5px] font-semibold text-text-muted">
                {entries.length > 0
                  ? `${entries.length} مصدراً — ملخّصات ومواضيع يشاركها الطلبة والأساتذة`
                  : "ملخّصات ومواضيع يشاركها الطلبة والأساتذة"}
              </p>
            </div>
            <Button size="md" onClick={() => setShowAdd(true)} className="shrink-0">
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> إضافة مصدر
            </Button>
          </div>
        </header>

        <div className="relative mb-3">
          <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالعنوان أو الوحدة…"
            aria-label="بحث في المكتبة"
            className="h-12 w-full rounded-control border border-border bg-surface pe-11 ps-4 text-[16px] outline-none transition focus:border-primary"
          />
        </div>

        {/* شرائح المواد.
            كانت `flex-wrap` بعشرين شريحة، فتملأ ٤–٦ صفوف ≈ ١٨٠px قبل
            أوّل نتيجة على شاشة ٦٤٠px. الرفّ الأفقي يعرضها كلّها في سطر
            واحد قابل للسحب — وهو ما تفعله صفحة الدورات أصلاً. */}
        <div className="mb-4">
          <ChipRail>
            {SUBJECTS.map((s) => (
              <Chip key={s.id} active={subFilter === s.id} onClick={() => setSubFilter(s.id)}>
                {s.label}
              </Chip>
            ))}
          </ChipRail>
        </div>

        {loadingEntries ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonList count={4} lines={2} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={faBookOpen}
            title={search ? `لا نتائج لـ «${search}»` : subFilter !== "all" ? "لا مصادر في هذه المادّة بعد" : "المكتبة فارغة — لكن ليس لوقت طويل"}
            hint={search
              ? "جرّب كلمة أقصر، أو تصفّح المواد من الشريط أعلاه."
              : "أضف ملخّصك أو موضوعاً سابقاً بالرابط — وسيصل إلى كل من يراجع المادّة نفسها."}
            action={<Button size="md" onClick={() => setShowAdd(true)}>أضف أوّل مصدر</Button>}
          />
        ) : (
          /* عمودان من `sm` فصاعداً: كانت المكتبة السطح الوحيد بعمود
             واحد في كل المقاسات، بينما الغرف والدورات شبكتان. */
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((e) => (
              <LibEntryCard key={e.id} e={e} highlighted={e.id === sharedId} uid={user.uid} isAdmin={profile?.role === "admin"}
                isTeacher={profile?.role === "teacher"} myUid={user.uid} myName={user.displayName || "طالب"}
                onDelete={() => confirm("حذف هذا المصدر نهائياً؟") && remove(ref(rtdb, `library/${e.id}`))} />
            ))}
          </div>
        )}
        {/* ورقة إضافة مصدر — الورقة السفلية المشتركة نفسها التي
            يستعملها شراء الدورات والغرف، بدل نافذة مكتوبة يدوياً
            بحقول `rounded-md h-10` لا تشبه أي حقل آخر في المنصّة. */}
        <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="إضافة مصدر جديد" maxHeight="88vh">
          <div className="space-y-3 pb-2">
            {[
              { label: "المادة *", field: "subject", type: "select" },
              { label: "العنوان *", field: "title", placeholder: "ملخّص الحدود والاستمرارية" },
              { label: "الفصل / الوحدة", field: "chapter", placeholder: "الفصل 1 — المشتقات" },
              { label: "رابط الملفّ *", field: "fileUrl", placeholder: "رابط Google Drive أو PDF مباشر" },
              { label: "وصف مختصر", field: "description", placeholder: "ماذا يحتوي هذا المصدر؟" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="mb-1.5 block text-[12.5px] font-extrabold text-text-primary">{label}</label>
                {type === "select" ? (
                  <select value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="h-12 w-full rounded-control border border-border bg-surface px-3 text-[15px] font-bold outline-none focus:border-primary">
                    {SUBJECTS.filter((s) => s.id !== "all").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                ) : (
                  <input value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={placeholder}
                    dir={field === "fileUrl" ? "ltr" : undefined}
                    className="h-12 w-full rounded-control border border-border bg-surface px-3 text-[16px] outline-none focus:border-primary" />
                )}
              </div>
            ))}

            {/* خيار المحتوى المدفوع (للأستاذ والأدمن فقط) */}
            {canSell && (
              <div className="rounded-card border border-amber-400/30 bg-amber-400/5 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13.5px] font-extrabold">
                    <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-amber-500" />
                    محتوى مدفوع (يحتاج كود)
                  </span>
                  <button type="button" aria-pressed={form.isPaid} aria-label="محتوى مدفوع"
                    onClick={() => setForm({ ...form, isPaid: !form.isPaid })}>
                    <FontAwesomeIcon icon={form.isPaid ? faToggleOn : faToggleOff}
                      className={`h-8 w-8 ${form.isPaid ? "text-amber-500" : "text-text-muted"}`} />
                  </button>
                </label>
                {form.isPaid && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-[12px] font-extrabold text-text-muted">السعر بالدينار الجزائري</label>
                    <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="2000" min="1"
                      className="h-12 w-full rounded-control border border-border bg-surface px-3 text-[16px] outline-none focus:border-primary" />
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-muted">
                      سيتواصل الطالب مع الإدارة للدفع والحصول على كود الوصول.
                    </p>
                  </div>
                )}
              </div>
            )}

            {formErr && <p className="text-[12px] font-bold text-danger">{formErr}</p>}
            <Button block onClick={addEntry} loading={adding}
              disabled={!form.title.trim() || !form.fileUrl.trim()}>
              إضافة المصدر
            </Button>
          </div>
        </BottomSheet>
      </section>
    </AppShell>
  );
}

/* بطاقة مصدر — تدعم المحتوى المدفوع بالقفل والكود */
/* بطاقة العنصر مكوّن مستقلّ، فتقرأ سجلّ المواد بنفسها بدل تمريره
   عبر خاصيّة — القائمة حيّة والقارئ واحد. */
function LibEntryCard({ e, uid, isAdmin, isTeacher, myUid, myName, highlighted, onDelete }: {
  e: LibEntry; uid: string; isAdmin: boolean; isTeacher: boolean; myUid: string; myName: string; highlighted?: boolean; onDelete: () => void;
}) {
  const siteSubjects = useSiteSubjects();
  const SUBJECTS = [
    { id: "all", label: "الكل" },
    ...siteSubjects.map((x) => ({ id: x.id, label: x.name })),
  ];
  const { settings } = useSiteSettings();
  const [hasAccess, setHasAccess] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [genCode, setGenCode] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const isOwnerOrAdmin = e.uploaderId === myUid || isAdmin;
  const locked = !!e.isPaid && !hasAccess && !isOwnerOrAdmin;
  const [showRate, setShowRate] = useState(false);
  const [showPay, setShowPay] = useState(false);
  /* التعديل داخل البطاقة لا في نافذة: المستخدم يرى ما يُعدّله في سياقه،
     والنافذة تقطعه عن بقيّة القائمة بلا فائدة هنا. */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: e.title, chapter: e.chapter, description: e.description ?? "", fileUrl: e.fileUrl });
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

  async function saveEdit() {
    const t = draft.title.trim(), u = draft.fileUrl.trim();
    if (!t || !u) { setEditErr("العنوان والرابط مطلوبان."); return; }
    setSaving(true);
    setEditErr("");
    try {
      // نُحدّث الحقول المسموح بها فقط — لا نمسّ المالك ولا تاريخ الإضافة
      await update(ref(rtdb, `library/${e.id}`), {
        title: t.slice(0, 200),
        chapter: draft.chapter.trim().slice(0, 120),
        description: draft.description.trim().slice(0, 600),
        fileUrl: u,
        fileType: guessType(u),
        updatedAt: Date.now(),
      });
      setEditing(false);
    } catch {
      setEditErr("تعذّر الحفظ — راجع صلاحيات قاعدة البيانات.");
    } finally { setSaving(false); }
  }

  async function doGenerate() {
    setGenBusy(true);
    try {
      const c = await createAccessCode({
        itemType: "library", itemId: e.id, itemTitle: e.title,
        price: e.price ?? 0, ownerId: e.uploaderId, ownerName: e.uploaderName, createdBy: myUid,
      });
      setGenCode(c);
    } catch { /* تجاهل */ } finally { setGenBusy(false); }
  }

  useEffect(() => {
    if (!e.isPaid) return;
    const unsub = listenHasAccess(uid, "library", e.id, setHasAccess);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid, e.id, e.isPaid]);

  const icon = e.fileType === "pdf" ? faFilePdf : e.fileType === "link" ? faLink : faFileLines;
  const color = e.fileType === "pdf" ? "text-danger" : e.fileType === "link" ? "text-primary" : "text-text-muted";

  async function doRedeem() {
    setBusy(true); setErr("");
    const error = await redeemCode(code, uid, "");
    setBusy(false);
    if (error) { setErr(error); return; }
    setShowRedeem(false); setCode("");
  }

  return (
    <Card
      flush
      className={`p-3.5 transition sm:p-4 ${
        highlighted ? "!border-primary ring-2 ring-primary/25"
          : locked ? "!border-amber-400/40"
          : "bz-lift"
      }`}
    >
      {highlighted && (
        <p className="mb-2.5 flex items-center gap-1.5 rounded-item bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-extrabold text-primary">
          <FontAwesomeIcon icon={faLink} className="h-3 w-3" /> هذا هو الملخّص المشارَك معك
        </p>
      )}

      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-item ${
          locked ? "bg-amber-400/15 text-amber-600" : "bg-primary/10 " + color
        }`}>
          <FontAwesomeIcon icon={locked ? faLock : icon} className="h-[18px] w-[18px]" />
        </span>

        {/* العمود النصّي يأخذ ما تبقّى كاملاً.
            كان يشاركه رفٌّ عموديّ يحمل ستّة أزرار مكدّسة، فينكمش
            العنوان إلى ~١٨٠px على شاشة ٣٦٠px. الأزرار نزلت إلى
            شريط أفقي أسفل البطاقة حيث لها مساحة كاملة. */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{subjectLabel(SUBJECTS, e.subject)}</Badge>
            {e.chapter && <Badge>{e.chapter}</Badge>}
            {e.isPaid && <Badge tone="warn" icon={faLock}>{e.price} دج</Badge>}
          </div>
          <h3 className="mt-1.5 text-[14.5px] font-extrabold leading-snug text-text-primary">{e.title}</h3>
          {e.description && (
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-text-muted">{e.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[11.5px] font-semibold text-text-muted">
              بواسطة{" "}
              <Link href={`/u/${e.uploaderId}`} className="font-extrabold text-primary hover:underline">
                {e.uploaderName}
              </Link>{" "}
              · {timeAgo(e.createdAt)}
            </p>
            {e.isPaid && <ContentRatingBadge itemId={e.id} showEmpty />}
            <ReportLinkButton itemId={e.id} itemTitle={e.title} url={e.fileUrl} subject={subjectLabel(SUBJECTS, e.subject)} />
          </div>
        </div>
      </div>

      {/* شريط الإجراءات — أفقي، وكل هدف ٤٤px */}
      <div className="mt-3 flex items-center gap-1 border-t border-border pt-2.5">
        {locked ? (
          <button onClick={() => setShowRedeem(true)}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control bg-amber-500 px-4 text-[13px] font-extrabold text-white transition hover:brightness-105 sm:flex-none">
            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5" /> افتح بالكود
          </button>
        ) : (
          <a href={e.fileUrl} target="_blank" rel="noopener noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control bg-gradient-primary px-5 text-[13px] font-extrabold text-white shadow-brand transition hover:brightness-105 sm:flex-none">
            فتح المصدر
            <FontAwesomeIcon icon={faUpRightFromSquare} className="h-3 w-3 opacity-80" />
          </a>
        )}

        <span className="ms-auto flex items-center gap-0.5">
          {e.isPaid && !locked && (
            <IconButton icon={faStar} label="التقييم والآراء" size="sm" tone="brand" onClick={() => setShowRate(true)} />
          )}
          {e.isPaid && isOwnerOrAdmin && (
            <IconButton icon={faKey} label="توليد كود وصول" size="sm" tone="brand" onClick={() => setShowGen(true)} />
          )}
          <ShareButton
            target={{ path: `/library?item=${e.id}`, title: e.title }}
            compact
            className="grid h-10 w-10 place-items-center rounded-control text-text-muted transition hover:bg-primary/10 hover:text-primary"
          />
          {isOwnerOrAdmin && (
            <IconButton icon={faPen} label="تعديل الملخّص" size="sm"
              onClick={() => { setEditing((v) => !v); setEditErr(""); }} />
          )}
          {isOwnerOrAdmin && (
            <IconButton icon={faTrash} label="حذف الملخّص" size="sm" tone="danger" onClick={onDelete} />
          )}
        </span>
      </div>

      {/* 🐛 نموذج التعديل كان يُرسَم **داخل** رفّ الأزرار الضيّق
          (`shrink-0 flex-col`) — أربعة حقول وزرّان داخل عمود بعرض
          ~٤٠px. الآن بعرض البطاقة كاملاً حيث موضعه. */}
      {editing && isOwnerOrAdmin && (
        <div className="mt-3 space-y-2 rounded-card border border-primary/25 bg-primary/[0.05] p-3">
          <p className="text-[12px] font-extrabold text-primary">تعديل الملخّص</p>
          <input value={draft.title} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })}
            placeholder="العنوان"
            className="h-11 w-full rounded-control border border-border bg-surface px-3 text-[14px] font-bold outline-none focus:border-primary" />
          <input value={draft.chapter} onChange={(ev) => setDraft({ ...draft, chapter: ev.target.value })}
            placeholder="الوحدة / الفصل"
            className="h-11 w-full rounded-control border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary" />
          <textarea value={draft.description} onChange={(ev) => setDraft({ ...draft, description: ev.target.value })}
            rows={2} placeholder="وصف مختصر (اختياري)"
            className="w-full resize-y rounded-control border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary" />
          <input value={draft.fileUrl} onChange={(ev) => setDraft({ ...draft, fileUrl: ev.target.value })}
            dir="ltr" placeholder="رابط الملفّ"
            className="h-11 w-full rounded-control border border-border bg-surface px-3 font-mono text-xs outline-none focus:border-primary" />
          {editErr && <p className="text-[11.5px] font-bold text-danger">{editErr}</p>}
          <div className="flex gap-2">
            <Button size="md" onClick={saveEdit} loading={saving} className="flex-1">
              <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> حفظ التعديل
            </Button>
            <Button size="md" variant="ghost"
              onClick={() => { setEditing(false); setDraft({ title: e.title, chapter: e.chapter, description: e.description ?? "", fileUrl: e.fileUrl }); }}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* تقييم المحتوى المدفوع — للمشتري وحده */}
      {e.isPaid && myUid && (
        <ContentRatingSheet
          itemId={e.id}
          itemTitle={e.title}
          uid={myUid}
          name={myName}
          isAdmin={isAdmin}
          open={showRate}
          onClose={() => setShowRate(false)}
        />
      )}

      {/* لوحة فتح القفل بالكود */}
      {showRedeem && locked && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
          <p className="text-xs font-semibold leading-relaxed">
            هذا الملخّص مدفوع ({e.price} دج). اختر طريقة الدفع المناسبة لك.
          </p>

          {/* الدفع الفوري أوّلاً — أسرع طريق، ومن لا يملك بطاقة يجد
              البديل تحته مباشرة. لا نُلغي التواصل مع الإدارة: بعض
              الطلبة لا يملكون بطاقة أصلاً، وإغلاق الباب يخسرهم. */}
          <ChargilyPayButton
            itemType="library"
            itemId={e.id}
            price={e.price ?? 0}
            uid={myUid}
            className="mt-2"
          />

          <button onClick={() => setShowPay(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-bold text-text-muted transition hover:border-primary hover:text-primary active:scale-95">
            <FontAwesomeIcon icon={faComments} className="h-3.5 w-3.5" />
            أو ادفع بالتواصل مع الإدارة
          </button>
          <SupportChatSheet open={showPay} onClose={() => setShowPay(false)} initialKind="payment" />
          <div className="mt-2 flex gap-2">
            <input value={code} onChange={(ev) => setCode(ev.target.value)} placeholder="أدخل كود الوصول"
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
            <button onClick={doRedeem} disabled={busy || !code.trim()}
              className="rounded-lg bg-gradient-primary px-4 text-xs font-bold text-white disabled:opacity-50">
              {busy ? "..." : "تفعيل"}
            </button>
          </div>
          {err && <p className="mt-1.5 text-xs text-danger">{err}</p>}
        </div>
      )}

      {/* لوحة توليد الأكواد (للأستاذ/الأدمن) */}
      {showGen && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold">🔑 توليد كود وصول لطالب</p>
            <button onClick={() => { setShowGen(false); setGenCode(""); }} className="text-text-muted hover:text-danger">
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
            </button>
          </div>
          {genCode ? (
            <div>
              <p className="text-[11px] text-text-muted">أعطِ هذا الكود للطالب بعد الدفع (يُستخدم مرّة واحدة):</p>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-surface p-2">
                <code className="flex-1 text-center text-sm font-extrabold tracking-wider text-primary" dir="ltr">{genCode}</code>
                <button onClick={() => navigator.clipboard?.writeText(genCode)} className="rounded bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">نسخ</button>
              </div>
              <button onClick={() => setGenCode("")} className="mt-2 w-full rounded-lg border border-border py-1.5 text-xs font-semibold text-text-muted">توليد كود آخر</button>
            </div>
          ) : (
            <button onClick={doGenerate} disabled={genBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary py-2 text-xs font-bold text-white disabled:opacity-50">
              {genBusy ? <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" /> : <FontAwesomeIcon icon={faKey} className="h-3.5 w-3.5" />}
              توليد كود جديد ({e.price} دج)
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
