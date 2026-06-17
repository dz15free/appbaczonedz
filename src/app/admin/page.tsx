"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, remove, query, orderByChild, limitToLast, get } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield, faFlag, faLayerGroup, faTrash,
  faChartBar, faCircleExclamation, faCheckCircle, faGear,
  faCalendarDays, faFloppyDisk, faLock, faLockOpen, faBullhorn,
  faPaperPlane, faMessage, faImage, faLink, faFont, faPalette,
  faWrench, faPlus, faXmark, faToggleOn, faToggleOff, faEye,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { useSiteSettings, saveSetting, saveSiteSettings, type FooterLink } from "@/features/settings/use-site-settings";
import { createPost, deletePost, setPostLocked, type Post } from "@/features/community/social";

interface Report {
  id: string; kind: string;
  reporterId: string; reporterName: string;
  reason?: string; createdAt: number;
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? "اليوم" : `منذ ${d} يوم`;
}

const TABS = [
  { id: "overview",  label: "إحصائيات",  icon: faChartBar },
  { id: "identity",  label: "الهوية",     icon: faImage },
  { id: "home",      label: "الرئيسية",   icon: faFont },
  { id: "footer",    label: "الفوتر",     icon: faLink },
  { id: "control",   label: "التحكّم",    icon: faWrench },
  { id: "posts",     label: "المنشورات",  icon: faMessage },
  { id: "reports",   label: "البلاغات",   icon: faFlag },
] as const;

type Tab = (typeof TABS)[number]["id"];

/* ─── مكوّن حقل إدخال مُصمَّم ─── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold">{label}</label>
      {hint && <p className="mb-1.5 text-xs text-text-muted">{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
  );
}

function SaveBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
      <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
      {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
    </button>
  );
}

function Card({ icon, title, hint, children }: {
  icon: any; title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </span>
        <div>
          <p className="font-bold text-sm">{title}</p>
          {hint && <p className="text-xs text-text-muted">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const { settings } = useSiteSettings();

  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ groups: 0, posts: 0, users: 0 });
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Identity
  const [logoUrl, setLogoUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [accentColor, setAccentColor] = useState("#4f46e5");

  // Home
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");

  // Footer
  const [footerText, setFooterText] = useState("");
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);

  // Control
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [bacDate, setBacDate] = useState("");
  const [allowReg, setAllowReg] = useState(true);

  // Posts
  const [announceText, setAnnounceText] = useState("");

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return; }
    if (!loading && profile && profile.role !== "admin") router.replace("/home");
  }, [loading, user, profile, router]);

  // Sync settings → local state
  useEffect(() => {
    setLogoUrl(settings.logoUrl ?? "");
    setSiteName(settings.siteName ?? "BacZoneDZ");
    setAccentColor(settings.accentColor ?? "#4f46e5");
    setHeroTitle(settings.heroTitle ?? "");
    setHeroSubtitle(settings.heroSubtitle ?? "");
    setFooterText(settings.footerText ?? "");
    setFooterLinks(settings.footerLinks ?? []);
    setMaintenanceMode(!!settings.maintenanceMode);
    setMaintenanceMsg(settings.maintenanceMsg ?? "");
    setBannerText(settings.siteBanner?.text ?? "");
    setBannerActive(!!settings.siteBanner?.active);
    setBacDate(settings.bacExamDate ?? "");
    setAllowReg(settings.allowRegistration !== false);
  }, [settings]);

  // Load reports
  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    return onValue(query(ref(rtdb, "reports"), limitToLast(100)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, r]: [string, any]) => ({ id, ...r })) as Report[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setReports(list);
    });
  }, [user, profile]);

  // Load stats
  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    get(ref(rtdb, "groups")).then((s) => setStats((st) => ({ ...st, groups: Object.keys(s.val() ?? {}).length })));
    get(query(ref(rtdb, "community/posts"), limitToLast(999))).then((s) => setStats((st) => ({ ...st, posts: Object.keys(s.val() ?? {}).length })));
    get(ref(rtdb, "users")).then((s) => setStats((st) => ({ ...st, users: Object.keys(s.val() ?? {}).length })));
  }, [user, profile]);

  // Load posts for posts tab
  useEffect(() => {
    if (!user || profile?.role !== "admin" || tab !== "posts") return;
    return onValue(query(ref(rtdb, "community/posts"), orderByChild("createdAt"), limitToLast(40)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, p]: [string, any]) => ({ id, ...p, myVote: 0, score: p.score ?? 0 })) as Post[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(list);
    });
  }, [user, profile, tab]);

  if (loading || !user || !profile) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (profile.role !== "admin") return null;

  async function save(key: string, fn: () => Promise<void>) {
    setSaving((s) => ({ ...s, [key]: true }));
    try { await fn(); } finally { setSaving((s) => ({ ...s, [key]: false })); }
  }

  async function removePost(p: Post) {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    await deletePost(p);
    setPosts((l) => l.filter((x) => x.id !== p.id));
  }
  async function toggleLock(p: Post) {
    await setPostLocked(p.id, !p.locked);
    setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, locked: !p.locked } : x)));
  }

  const statCards = [
    { label: "مستخدم مسجّل", val: stats.users, icon: faChartBar, c: "text-primary bg-primary/10" },
    { label: "مجموعة", val: stats.groups, icon: faLayerGroup, c: "text-secondary bg-secondary/10" },
    { label: "منشور (آخر 1000)", val: stats.posts, icon: faMessage, c: "text-warning bg-warning/10" },
    { label: "بلاغ نشط", val: reports.length, icon: faFlag, c: "text-danger bg-danger/10" },
  ];

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-4">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white">
            <FontAwesomeIcon icon={faShield} className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold">لوحة إدارة BacZoneDZ</h1>
            <p className="text-xs text-text-muted">تحكّم كامل في المنصة — مرئي لك فقط</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                tab === t.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"
              }`}>
              <FontAwesomeIcon icon={t.icon} className="h-3 w-3" />
              {t.label}
              {t.id === "reports" && reports.length > 0 && (
                <span className={`rounded-full px-1.5 ${tab === t.id ? "bg-white/20" : "bg-danger/10 text-danger"}`}>
                  {reports.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════ إحصائيات ════ */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${s.c}`}>
                    <FontAwesomeIcon icon={s.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-3xl font-extrabold">{s.val}</p>
                    <p className="text-sm text-text-muted">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-text-muted">
              <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4 text-warning ml-1" />
              لإدارة المستخدمين (تعيين أدمن آخر، حذف حساب) → استخدم Firebase Console → Realtime Database.
            </div>
          </div>
        )}

        {/* ════ الهوية ════ */}
        {tab === "identity" && (
          <div className="space-y-4">
            <Card icon={faImage} title="شعار الموقع" hint="ضع رابط URL لصورة الشعار (png/svg/webp). يُستبدل الشعار الافتراضي.">
              <Field label="رابط الشعار">
                <Input value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.png" />
              </Field>
              {logoUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="معاينة" className="h-12 w-12 rounded-lg object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <p className="text-xs text-text-muted">معاينة الشعار</p>
                </div>
              )}
              <button onClick={() => save("logo", () => saveSetting("logoUrl", logoUrl || undefined))}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                disabled={saving.logo}>
                <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                {saving.logo ? "جارٍ الحفظ..." : "حفظ الشعار"}
              </button>
            </Card>

            <Card icon={faFont} title="اسم الموقع" hint="يظهر في الهيدر وعنوان المتصفح">
              <Field label="اسم الموقع">
                <Input value={siteName} onChange={setSiteName} placeholder="BacZoneDZ" />
              </Field>
              <SaveBtn onClick={() => save("name", () => saveSetting("siteName", siteName))} loading={!!saving.name} />
            </Card>

            <Card icon={faPalette} title="لون التمييز الأساسي" hint="يُغيّر لون الأزرار والروابط في جميع أنحاء الموقع">
              <Field label="اختر اللون">
                <div className="flex items-center gap-3">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-md border border-border" />
                  <Input value={accentColor} onChange={setAccentColor} placeholder="#4f46e5" />
                </div>
              </Field>
              <p className="text-xs text-text-muted">ملاحظة: يُطبَّق اللون فور تحديث الصفحة لدى المستخدمين.</p>
              <SaveBtn onClick={() => save("color", () => saveSetting("accentColor", accentColor))} loading={!!saving.color} />
            </Card>
          </div>
        )}

        {/* ════ الرئيسية ════ */}
        {tab === "home" && (
          <div className="space-y-4">
            <Card icon={faFont} title="قسم الترحيب (Hero)" hint="النص الذي يظهر في البطاقة الترحيبية لكل مستخدمين الرئيسية">
              <Field label="العنوان الكبير">
                <Input value={heroTitle} onChange={setHeroTitle} placeholder="ادرس بذكاء. ونجح في البكالوريا." />
              </Field>
              <Field label="وصف الهيرو">
                <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} rows={3}
                  placeholder="وصف مختصر يشرح المنصة..."
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <SaveBtn
                onClick={() => save("hero", () => saveSiteSettings({ heroTitle, heroSubtitle }))}
                loading={!!saving.hero} />
            </Card>

            <Card icon={faBullhorn} title="بانر إعلاني عالمي" hint="شريط يظهر أعلى الصفحة لجميع المستخدمين — للإعلانات المهمة">
              <Field label="نص البانر">
                <Input value={bannerText} onChange={setBannerText} placeholder="🎉 إعلان: ميزة جديدة متاحة الآن!" />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)}
                  className="h-4 w-4 accent-primary" />
                تفعيل البانر الآن لكل المستخدمين
              </label>
              <SaveBtn
                onClick={() => save("banner", () => saveSetting("siteBanner", { text: bannerText, active: bannerActive }))}
                loading={!!saving.banner} />
            </Card>
          </div>
        )}

        {/* ════ الفوتر ════ */}
        {tab === "footer" && (
          <div className="space-y-4">
            <Card icon={faFont} title="نص حقوق النشر" hint="يظهر في أسفل كل صفحة">
              <Field label="نص الفوتر">
                <Input value={footerText} onChange={setFooterText} placeholder={`© ${new Date().getFullYear()} BacZoneDZ`} />
              </Field>
              <SaveBtn onClick={() => save("footerText", () => saveSetting("footerText", footerText))} loading={!!saving.footerText} />
            </Card>

            <Card icon={faLink} title="روابط الفوتر" hint="تظهر بجانب حقوق النشر في الفوتر">
              <div className="space-y-2">
                {footerLinks.map((lnk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={lnk.label} onChange={(e) => {
                      const copy = [...footerLinks]; copy[i] = { ...copy[i], label: e.target.value };
                      setFooterLinks(copy);
                    }} placeholder="الاسم" className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
                    <input value={lnk.href} onChange={(e) => {
                      const copy = [...footerLinks]; copy[i] = { ...copy[i], href: e.target.value };
                      setFooterLinks(copy);
                    }} placeholder="https://..." className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
                    <button onClick={() => setFooterLinks(footerLinks.filter((_, j) => j !== i))}
                      className="grid h-9 w-9 place-items-center rounded-md text-text-muted hover:text-danger">
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setFooterLinks([...footerLinks, { label: "", href: "" }])}
                  className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> إضافة رابط
                </button>
              </div>
              <SaveBtn onClick={() => save("footerLinks", () => saveSetting("footerLinks", footerLinks))} loading={!!saving.footerLinks} />
            </Card>
          </div>
        )}

        {/* ════ التحكّم ════ */}
        {tab === "control" && (
          <div className="space-y-4">
            <Card icon={faCalendarDays} title="تاريخ امتحان البكالوريا" hint="يُحدَّث العدّ التنازلي للجميع فوراً">
              <Field label="التاريخ" hint="صيغة YYYY-MM-DD">
                <input type="date" value={bacDate} onChange={(e) => setBacDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </Field>
              {settings.bacExamDate && (
                <p className="text-xs text-text-muted">الحالي: <span className="font-bold text-secondary">{settings.bacExamDate}</span></p>
              )}
              <SaveBtn onClick={() => save("bacDate", () => saveSetting("bacExamDate", bacDate))} loading={!!saving.bacDate} />
            </Card>

            <Card icon={faWrench} title="وضع الصيانة" hint="يُظهر صفحة صيانة لكل الزوار (الأدمن محصّن)">
              <label className="flex items-center gap-3 cursor-pointer">
                <button onClick={() => setMaintenanceMode(!maintenanceMode)}>
                  <FontAwesomeIcon icon={maintenanceMode ? faToggleOn : faToggleOff}
                    className={`h-7 w-7 ${maintenanceMode ? "text-danger" : "text-text-muted"}`} />
                </button>
                <span className={`font-bold text-sm ${maintenanceMode ? "text-danger" : "text-text-muted"}`}>
                  {maintenanceMode ? "⚠️ وضع الصيانة مفعّل" : "الموقع يعمل بشكل طبيعي"}
                </span>
              </label>
              <Field label="رسالة الصيانة">
                <Input value={maintenanceMsg} onChange={setMaintenanceMsg}
                  placeholder="الموقع تحت الصيانة. نعود قريباً! 🔧" />
              </Field>
              <SaveBtn
                onClick={() => save("maint", () => saveSiteSettings({ maintenanceMode, maintenanceMsg }))}
                loading={!!saving.maint} />
            </Card>

            <Card icon={faEye} title="التسجيل الجديد">
              <label className="flex items-center gap-3 cursor-pointer">
                <button onClick={() => setAllowReg(!allowReg)}>
                  <FontAwesomeIcon icon={allowReg ? faToggleOn : faToggleOff}
                    className={`h-7 w-7 ${allowReg ? "text-secondary" : "text-danger"}`} />
                </button>
                <span className="font-bold text-sm">
                  {allowReg ? "التسجيل مفتوح للجميع" : "❌ التسجيل مغلق"}
                </span>
              </label>
              <SaveBtn onClick={() => save("reg", () => saveSetting("allowRegistration", allowReg))} loading={!!saving.reg} />
            </Card>
          </div>
        )}

        {/* ════ المنشورات ════ */}
        {tab === "posts" && (
          <div className="space-y-4">
            <Card icon={faBullhorn} title="نشر إعلان رسمي">
              <textarea value={announceText} onChange={(e) => setAnnounceText(e.target.value)} rows={3}
                placeholder="اكتب إعلاناً يظهر باسم «📢 إدارة BacZoneDZ»..."
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={async () => {
                if (!announceText.trim() || !user) return;
                setSaving((s) => ({ ...s, announce: true }));
                try {
                  await createPost(user.uid, "📢 إدارة BacZoneDZ", announceText, undefined, "public");
                  setAnnounceText("");
                } finally { setSaving((s) => ({ ...s, announce: false })); }
              }} disabled={!!saving.announce || !announceText.trim()}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5 -scale-x-100" />
                {saving.announce ? "جارٍ النشر..." : "نشر الإعلان"}
              </button>
            </Card>

            <div>
              <p className="mb-2 text-xs font-bold text-text-muted">آخر المنشورات (40)</p>
              <div className="space-y-2">
                {posts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                          {p.authorName}
                          {p.locked && <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-warning" />}
                          {p.subject && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{p.subject}</span>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{p.text || "(بدون نص)"}</p>
                        <p className="mt-1 text-[10px] text-text-muted">{timeAgo(p.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => toggleLock(p)} title={p.locked ? "فتح التعليقات" : "إغلاق التعليقات"}
                          className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-warning/10 hover:text-warning">
                          <FontAwesomeIcon icon={p.locked ? faLockOpen : faLock} className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removePost(p)} title="حذف"
                          className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && <p className="py-8 text-center text-sm text-text-muted">لا منشورات بعد.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ════ البلاغات ════ */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="grid place-items-center py-16 text-center text-text-muted">
                <FontAwesomeIcon icon={faCheckCircle} className="h-10 w-10 text-secondary" />
                <p className="mt-3 text-sm">لا بلاغات — المجتمع نظيف! 🎉</p>
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faFlag} className="h-4 w-4 text-danger" />
                      <span className="font-semibold text-sm">
                        {r.kind === "post" ? "منشور" : r.kind === "comment" ? "تعليق" : r.kind} مُبلَّغ عنه
                      </span>
                    </div>
                    <button onClick={() => remove(ref(rtdb, `reports/${r.id}`))}
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
              ))
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
