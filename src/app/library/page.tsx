"use client";
import { useEffect, useState } from "react";
import { ref, push, remove, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faPlus, faTrash, faSearch, faFilePdf, faFileLines, faLink, faSpinner, faXmark, faBookOpen } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

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

interface LibEntry { id: string; subject: string; chapter: string; title: string; description?: string; fileUrl: string; fileType: string; uploaderId: string; uploaderName: string; createdAt: number; }

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
  const [form, setForm] = useState({ title: "", subject: "math", chapter: "", description: "", fileUrl: "" });
  const [adding, setAdding] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => {
    return onValue(query(ref(rtdb, "library"), orderByChild("createdAt"), limitToLast(200)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, e]: [string, any]) => ({ id, ...e })) as LibEntry[];
      setEntries(list.sort((a, b) => b.createdAt - a.createdAt));
    });
  }, []);

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const filtered = entries.filter((e) => {
    if (subFilter !== "all" && e.subject !== subFilter) return false;
    if (search && !e.title.includes(search) && !e.chapter?.includes(search)) return false;
    return true;
  });

  async function addEntry() {
    if (!form.title.trim() || !form.fileUrl.trim()) { setFormErr("العنوان والرابط مطلوبان"); return; }
    const uid = user?.uid;
    const uname = profile?.name || user?.displayName || "طالب";
    if (!uid) return;
    setAdding(true); setFormErr("");
    try {
      await push(ref(rtdb, "library"), { ...form, fileType: guessType(form.fileUrl), uploaderId: uid, uploaderName: uname, createdAt: Date.now() });
      setForm({ title: "", subject: "math", chapter: "", description: "", fileUrl: "" }); setShowAdd(false);
    } catch { setFormErr("حدث خطأ."); } finally { setAdding(false); }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-4">
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
            {filtered.map((e) => {
              const icon = e.fileType === "pdf" ? faFilePdf : e.fileType === "link" ? faLink : faFileLines;
              const color = e.fileType === "pdf" ? "text-danger" : e.fileType === "link" ? "text-primary" : "text-text-muted";
              return (
                <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-glass transition">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-border/30 ${color}`}><FontAwesomeIcon icon={icon} className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{subjectLabel(e.subject)}</span>
                      {e.chapter && <span className="rounded-full bg-border px-2 py-0.5 text-[10px] text-text-muted">{e.chapter}</span>}
                    </div>
                    <h3 className="mt-1 font-semibold">{e.title}</h3>
                    {e.description && <p className="mt-0.5 text-xs text-text-muted line-clamp-2">{e.description}</p>}
                    <p className="mt-1 text-[11px] text-text-muted">بواسطة {e.uploaderName} · {timeAgo(e.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <a href={e.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90">فتح</a>
                    {(e.uploaderId === user?.uid || profile?.role === "admin") && (
                      <button onClick={() => confirm("حذف؟") && remove(ref(rtdb, `library/${e.id}`))}
                        className="grid h-8 w-full place-items-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger">
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
