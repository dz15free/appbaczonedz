"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ref, push, remove, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPlus, faTrash, faSearch, faFilePdf, faFileLines, faLink, faSpinner, faXmark, faBookOpen, faLock, faToggleOn, faToggleOff, faKey , faStar } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdSlot } from "@/components/ui/ad-slot";
import { useSiteSettings } from "@/features/settings/use-site-settings";
import { listenHasAccess, redeemCode, createAccessCode } from "@/features/paid/paid-access";
import { ContentRatingBadge, ContentRatingSheet } from "@/features/community/content-rating";
import { SupportChatSheet } from "@/features/support/support-chat";
import { loginHrefFor, useQueryParam } from "@/features/auth/use-require-auth";
import { ShareButton } from "@/components/ui/share-sheet";

const SUBJECTS = [
  { id: "all", label: "الكل" },
  { id: "arabic", label: "اللغة العربية" },
  { id: "islamic", label: "العلوم الإسلامية" },
  { id: "math", label: "الرياضيات" },
  { id: "science", label: "علوم الطبيعة والحياة" },
  { id: "physics", label: "العلوم الفيزيائية" },
  { id: "philosophy", label: "الفلسفة" },
  { id: "history-geo", label: "التاريخ والجغرافيا" },
  { id: "french", label: "اللغة الفرنسية" },
  { id: "english", label: "اللغة الإنجليزية" },
  { id: "amazigh", label: "اللغة الأمازيغية" },
  { id: "law", label: "القانون" },
  { id: "accounting", label: "التسيير المحاسبي والمالي" },
  { id: "economics", label: "الاقتصاد والمناجمنت" },
  { id: "spanish", label: "اللغة الإسبانية" },
  { id: "german", label: "اللغة الألمانية" },
  { id: "italian", label: "اللغة الإيطالية" },
  { id: "elec-eng", label: "الهندسة الكهربائية" },
  { id: "mech-eng", label: "الهندسة الميكانيكية" },
  { id: "process-eng", label: "هندسة الطرائق" },
  { id: "civil-eng", label: "الهندسة المدنية" },
  { id: "art-major", label: "مادة التخصص الفني" },
  { id: "other", label: "أخرى" },
];

interface LibEntry { id: string; subject: string; chapter: string; title: string; description?: string; fileUrl: string; fileType: string; uploaderId: string; uploaderName: string; createdAt: number; isPaid?: boolean; price?: number; }

function guessType(url: string) {
  if (/\.pdf(\?|$)/i.test(url) || /drive\.google/i.test(url)) return "pdf";
  if (/\.(doc|docx)(\?|$)/i.test(url)) return "doc";
  return "link";
}
function timeAgo(ts: number) { const d = Math.floor((Date.now() - ts) / 86400000); return d === 0 ? "اليوم" : d === 1 ? "أمس" : `منذ ${d} يوم`; }
function subjectLabel(id: string) { return SUBJECTS.find((s) => s.id === id)?.label ?? id; }

export default function LibraryPage() {
  const router = useRouter();

  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [entries, setEntries] = useState<LibEntry[]>([]);
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
    });
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
      <section className="mx-auto max-w-3xl px-4 py-4">
        <AdSlot placement="library" className="mb-4" />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-text-muted hover:text-primary"><FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" /></button>
            <div><h1 className="font-display text-xl font-extrabold">مكتبة البكالوريا 📚</h1><p className="text-xs text-text-muted">{entries.length} مصدر</p></div>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-bold text-white">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" /> إضافة مصدر
          </button>
        </div>
        <div className="relative mb-4">
          <FontAwesomeIcon icon={faSearch} className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن ملخّص..." className="h-10 w-full rounded-xl border border-border bg-surface pr-10 pl-4 text-sm outline-none focus:border-primary" />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button key={s.id} onClick={() => setSubFilter(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${subFilter === s.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:border-primary hover:text-primary"}`}>
              {s.label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FontAwesomeIcon icon={faBookOpen} className="h-12 w-12 text-text-muted opacity-20" />
            <p className="mt-3 text-sm text-text-muted">{search ? `لا نتائج لـ «${search}»` : "لا مصادر بعد — كن أول من يضيف!"}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((e) => (
              <LibEntryCard key={e.id} e={e} highlighted={e.id === sharedId} uid={user.uid} isAdmin={profile?.role === "admin"}
                isTeacher={profile?.role === "teacher"} myUid={user.uid} myName={user.displayName || "طالب"}
                onDelete={() => confirm("حذف؟") && remove(ref(rtdb, `library/${e.id}`))} />
            ))}
          </div>
        )}
        {showAdd && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => setShowAdd(false)}>
            <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">📚 إضافة مصدر جديد</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-danger"><FontAwesomeIcon icon={faXmark} className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "المادة *", field: "subject", type: "select" },
                  { label: "العنوان *", field: "title", placeholder: "ملخّص الحدود والاستمرارية" },
                  { label: "الفصل / الوحدة", field: "chapter", placeholder: "الفصل 1 — المشتقات" },
                  { label: "رابط الملف *", field: "fileUrl", placeholder: "Google Drive أو رابط PDF مباشر..." },
                  { label: "وصف مختصر", field: "description", placeholder: "محتوى المصدر..." },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field}>
                    <label className="mb-1 block text-sm font-semibold">{label}</label>
                    {type === "select" ? (
                      <select value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                        {SUBJECTS.filter((s) => s.id !== "all").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    ) : (
                      <input value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                    )}
                  </div>
                ))}

                {/* خيار المحتوى المدفوع (للأستاذ والأدمن فقط) */}
                {canSell && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
                    <label className="flex cursor-pointer items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-amber-500" />
                        محتوى مدفوع (يحتاج كود)
                      </span>
                      <button type="button" onClick={() => setForm({ ...form, isPaid: !form.isPaid })}>
                        <FontAwesomeIcon icon={form.isPaid ? faToggleOn : faToggleOff} className={`h-7 w-7 ${form.isPaid ? "text-amber-500" : "text-text-muted"}`} />
                      </button>
                    </label>
                    {form.isPaid && (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-semibold text-text-muted">السعر بالدينار الجزائري</label>
                        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                          placeholder="2000" min="1"
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                        <p className="mt-1.5 text-[11px] text-text-muted">سيتواصل الطالب مع الأدمن للدفع والحصول على كود الوصول.</p>
                      </div>
                    )}
                  </div>
                )}
                {formErr && <p className="text-xs text-danger">{formErr}</p>}
                <button onClick={addEntry} disabled={adding || !form.title.trim() || !form.fileUrl.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary py-3 text-sm font-bold text-white disabled:opacity-50">
                  {adding && <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />}
                  {adding ? "جارٍ الإضافة..." : "إضافة المصدر"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

/* بطاقة مصدر — تدعم المحتوى المدفوع بالقفل والكود */
function LibEntryCard({ e, uid, isAdmin, isTeacher, myUid, myName, highlighted, onDelete }: {
  e: LibEntry; uid: string; isAdmin: boolean; isTeacher: boolean; myUid: string; myName: string; highlighted?: boolean; onDelete: () => void;
}) {
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
    <div className={`rounded-xl border bg-surface p-4 transition ${
      highlighted ? "border-primary ring-2 ring-primary/25"
        : locked ? "border-amber-400/30"
        : "border-border hover:border-primary/30 hover:shadow-glass"
    }`}>
      {highlighted && (
        <p className="mb-2 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          🔗 هذا هو الملخّص المشارَك معك
        </p>
      )}
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-border ${locked ? "text-amber-500" : color}`}>
          <FontAwesomeIcon icon={locked ? faLock : icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{subjectLabel(e.subject)}</span>
            {e.chapter && <span className="rounded-full bg-border px-2 py-0.5 text-[10px] text-text-muted">{e.chapter}</span>}
            {e.isPaid && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" /> {e.price} دج
              </span>
            )}
          </div>
          <h3 className="mt-1 font-semibold">{e.title}</h3>
          {e.description && <p className="mt-0.5 text-xs text-text-muted line-clamp-2">{e.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] text-text-muted">
              بواسطة{" "}
              <Link href={`/u/${e.uploaderId}`} className="font-semibold text-primary hover:underline">
                {e.uploaderName}
              </Link>{" "}
              · {timeAgo(e.createdAt)}
            </p>
            {e.isPaid && <ContentRatingBadge itemId={e.id} showEmpty />}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {locked ? (
            <button onClick={() => setShowRedeem(true)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:opacity-90">
              <FontAwesomeIcon icon={faLock} className="h-3 w-3" /> فتح
            </button>
          ) : (
            <a href={e.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90">فتح</a>
          )}
          {isOwnerOrAdmin && (
            <button onClick={onDelete} className="grid h-8 w-full place-items-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger">
              <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
            </button>
          )}
          <ShareButton
            target={{ path: `/library?item=${e.id}`, title: e.title }}
            compact
            className="grid h-8 w-full place-items-center rounded-lg text-text-muted transition hover:bg-primary/10 hover:text-primary"
          />
          {e.isPaid && !locked && (
            <button onClick={() => setShowRate(true)}
              title="التقييم والآراء"
              className="grid h-8 w-full place-items-center rounded-lg bg-amber-400/15 text-amber-600 hover:bg-amber-400/25">
              <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5" />
            </button>
          )}
          {e.isPaid && isOwnerOrAdmin && (
            <button onClick={() => setShowGen(true)}
              title="توليد كود وصول"
              className="grid h-8 w-full place-items-center rounded-lg bg-amber-400/15 text-amber-600 hover:bg-amber-400/25">
              <FontAwesomeIcon icon={faKey} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

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
            هذا الملخّص مدفوع ({e.price} دج). للحصول على كود الوصول، تواصل مع الأدمن للدفع.
          </p>
          <button onClick={() => setShowPay(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary py-2 text-xs font-bold text-white active:scale-95">
            💬 تواصل مع الإدارة للشراء
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
    </div>
  );
}
