"use client";

import { useEffect, useState } from "react";
import { listenExcluded, setLeaderboardExcluded, deleteUserData } from "@/features/admin/moderation";
import { GuideEditor } from "@/features/admin/guide-editor";
import { SubjectsEditor } from "@/features/admin/subjects-editor";
import { CurriculumEditor } from "@/features/admin/curriculum-editor";
import { useRouter } from "next/navigation";
import { ref, onValue, remove, query, orderByChild, limitToLast, get, update } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShield, faFlag, faStar, faLayerGroup, faTrash, faChartBar,
  faCircleExclamation, faCheckCircle, faGear, faCalendarDays,
  faFloppyDisk, faLock, faLockOpen, faBullhorn, faPaperPlane,
  faMessage, faImage, faLink, faFont, faPalette, faWrench,
  faPlus, faXmark, faToggleOn, faToggleOff, faUsers,
  faDoorOpen, faBan, faUnlock, faEye, faBookOpen,
  faGlobe, faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { AppShell } from "@/components/app-shell";
import { useSiteSettings, saveSetting, saveSiteSettings, type FooterLink, type AdSlotConfig } from "@/features/settings/use-site-settings";
import { AD_PLACEMENTS } from "@/components/ui/ad-slot";
import { listenCommissionPct, setCommissionPct as setCommissionPctFn, listenAllCodes, deleteAccessCode, splitAmount, markSettled, type AccessCode } from "@/features/paid/paid-access";
import { LandingEditor } from "@/features/admin/landing-editor";
import { WelcomeEditor } from "@/features/admin/welcome-editor";
import { createPost, deletePost, setPostLocked, type Post } from "@/features/community/social";
import { AdminRatingRow } from "@/features/community/teacher-rating-ui";
import { detectBrigading, listenTeacherRatings, computeStats, type TeacherRating } from "@/features/community/teacher-rating";
import { setSupportAccount, useSupportInfo, SUPPORT_DEFAULTS } from "@/features/support/admin-chat";
import { loginHrefFor } from "@/features/auth/use-require-auth";

interface Report {
  firebaseKey: string;
  kind: string;
  contentRef?: string;
  reporterId: string; reporterName: string;
  reason?: string; createdAt: number;
  contentPreview?: string;
}

interface AppUser {
  uid: string; name: string; email?: string;
  role?: string; points?: number; level?: number;
  banned?: boolean; createdAt?: number;
}

interface ActiveRoom {
  id: string; name: string; ownerId: string; ownerName?: string;
  subject?: string; memberCount: number;
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d === 0 ? "اليوم" : d === 1 ? "أمس" : `منذ ${d} يوم`;
}

/* حساب الدعم — يفتح الدردشة المباشرة مع الإدارة */
function SupportAccountCard() {
  const { user } = useAuth();
  const info = useSupportInfo();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const isMe = info.adminUid === user?.uid;

  async function claim() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await setSupportAccount(
        user.uid,
        SUPPORT_DEFAULTS.adminName,
        email.trim() || info.adminEmail || SUPPORT_DEFAULTS.adminEmail
      );
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <p className="text-xs font-bold text-text-primary">💬 حساب الدردشة المباشرة</p>
      <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
        الحساب الذي تصله رسائل «تواصل مع الإدارة» ورسائل الدفع.
        دون ضبطه سيرى المستخدمون البريد الإلكتروني فقط.
      </p>
      <p className="mt-2 text-[11px] text-text-muted">
        الحالي: <span className="font-bold text-text-primary">{info.adminUid ? (isMe ? "أنت" : info.adminUid) : "غير مضبوط"}</span>
      </p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={info.adminEmail}
        dir="ltr"
        className="mt-2 h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-primary"
      />
      <button
        onClick={claim}
        disabled={busy || isMe}
        className="mt-2 w-full rounded-lg bg-gradient-primary py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {isMe ? "أنت جهة الدعم ✓" : busy ? "..." : "اجعل هذا الحساب جهة الدعم"}
      </button>
    </div>
  );
}

/* مراقبة التقييمات — كشف الحملات المنسّقة ضد الأساتذة */
function RatingsAdminPanel({ users }: { users: { uid: string; name?: string; role?: string }[] }) {
  const teachers = users.filter((u) => u.role === "teacher" || u.role === "admin");
  const [flags, setFlags] = useState<Record<string, ReturnType<typeof detectBrigading>>>({});

  useEffect(() => {
    const unsubs = teachers.map((t) =>
      listenTeacherRatings(t.uid, (list: TeacherRating[]) => {
        setFlags((prev) => ({ ...prev, [t.uid]: detectBrigading(list, t.uid) }));
      })
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers.map((t) => t.uid).join(",")]);

  const flagged = teachers.filter((t) => flags[t.uid]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
        <p className="text-xs font-bold text-warning">⚠️ أنماط تستحق المراجعة ({flagged.length})</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
          إشارة لا حكم: ثلاثة تقييمات منخفضة أو أكثر وصلت خلال أقل من ٢٤ ساعة.
          قد يكون سبباً وجيهاً، وقد يكون حملة. القرار لك — لا يُحذف شيء تلقائياً.
        </p>
      </div>

      {flagged.map((t) => {
        const f = flags[t.uid]!;
        return (
          <div key={t.uid} className="rounded-xl border border-danger/30 bg-danger/5 p-3">
            <p className="text-sm font-bold text-text-primary">{t.name ?? t.uid}</p>
            <p className="mt-1 text-[11px] text-danger">
              {f.lowCount} تقييمات منخفضة — أضيق نافذة: {f.windowHours} ساعة — المتوسّط {f.avg} من {f.total}
            </p>
          </div>
        );
      })}

      <p className="pt-2 text-xs font-bold text-text-muted">كل الأساتذة</p>
      {teachers.map((t) => (
        <AdminRatingRow key={t.uid} teacherUid={t.uid} teacherName={t.name ?? t.uid} />
      ))}
    </div>
  );
}

const TABS = [
  { id: "overview",  label: "إحصائيات",  icon: faChartBar },
  { id: "identity",  label: "الهوية",     icon: faImage },
  { id: "landing",   label: "الرئيسية (قبل الدخول)", icon: faFont },
  { id: "welcome",   label: "مرحباً بعودتك", icon: faFont },
  { id: "footer",    label: "الفوتر",     icon: faLink },
  { id: "control",   label: "التحكّم",    icon: faWrench },
  { id: "ads",       label: "الإعلانات",  icon: faBullhorn },
  { id: "users",     label: "المستخدمون", icon: faUsers },
  { id: "rooms",     label: "الغرف",      icon: faDoorOpen },
  { id: "library",   label: "المكتبة",    icon: faBookOpen },
  { id: "curriculum", label: "المنهج",   icon: faBookOpen },
  { id: "subjects",  label: "المواد",    icon: faBookOpen },
  { id: "guide",     label: "دليل التخصّصات", icon: faBookOpen },
  { id: "posts",     label: "المنشورات",  icon: faMessage },
  { id: "ratings",   label: "التقييمات",  icon: faStar },
  { id: "reports",   label: "البلاغات",   icon: faFlag },
] as const;

type Tab = (typeof TABS)[number]["id"];

function Card({ icon, title, hint, children }: { icon: any; title: string; hint?: string; children: React.ReactNode }) {
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

function SaveBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
      <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
      {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const { settings } = useSiteSettings();

  const [reports, setReports] = useState<Report[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  // المستبعدون من الترتيب — يُقرأ في تبويب المستخدمين
  useEffect(() => {
    const unsub = listenExcluded(setExcluded);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [libraryEntries, setLibraryEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, groups: 0, posts: 0, rooms: 0, library: 0 });
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [userSearch, setUserSearch] = useState("");

  // Identity
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const [bannerText, setBannerText] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  // Footer
  const [footerText, setFooterText] = useState("");
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  // Control
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [bacDate, setBacDate] = useState("");
  const [resultsDate, setResultsDate] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [averageCalcUrl, setAverageCalcUrl] = useState("");
  const [pastExamsUrl, setPastExamsUrl] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [weightedCalcUrl, setWeightedCalcUrl] = useState("");
  const [adsEmail, setAdsEmail] = useState("");
  const [adsWhatsapp, setAdsWhatsapp] = useState("");
  const [adsDraft, setAdsDraft] = useState<Record<string, AdSlotConfig>>({});
  const [commissionPct, setCommissionPct] = useState("10");
  const [allowReg, setAllowReg] = useState(true);
  // Posts
  const [announceText, setAnnounceText] = useState("");

  useEffect(() => {
    if (!loading && !user) { router.replace(loginHrefFor(window.location.pathname, window.location.search)); return; }
    if (!loading && profile && profile.role !== "admin") router.replace("/home");
  }, [loading, user, profile, router]);

  // عمولة الموقع + سجلّ الأكواد المالي
  const [codes, setCodes] = useState<AccessCode[]>([]);
  useEffect(() => {
    const unsub = listenCommissionPct((p) => setCommissionPct(String(p)));
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);
  useEffect(() => {
    const unsub = listenAllCodes(setCodes);
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  useEffect(() => {
    setLogoUrl(settings.logoUrl ?? "");
    setFaviconUrl(settings.faviconUrl ?? "");
    setSiteName(settings.siteName ?? "BacZoneDZ");
    setAccentColor(settings.accentColor ?? "#4f46e5");
    setFooterText(settings.footerText ?? "");
    setFooterLinks(settings.footerLinks ?? []);
    setMaintenanceMode(!!settings.maintenanceMode);
    setMaintenanceMsg(settings.maintenanceMsg ?? "");
    setBannerText(settings.siteBanner?.text ?? "");
    setBannerActive(!!settings.siteBanner?.active);
    setBacDate(settings.bacExamDate ?? "");
    setResultsDate(settings.bacResultsDate ?? "");
    setTelegramUrl(settings.telegramUrl ?? "");
    setInstagramUrl(settings.instagramUrl ?? "");
    setFacebookUrl(settings.facebookUrl ?? "");
    setAverageCalcUrl(settings.averageCalcUrl ?? "");
    setPastExamsUrl(settings.pastExamsUrl ?? "");
    setPaymentUrl(settings.paymentUrl ?? "");
    setWeightedCalcUrl(settings.weightedCalcUrl ?? "");
    setAdsEmail(settings.adsEmail ?? "");
    setAdsWhatsapp(settings.adsWhatsapp ?? "");
    setAdsDraft(settings.ads ?? {});
    setAllowReg(settings.allowRegistration !== false);
  }, [settings]);

  // Reports
  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    const unsub = onValue(query(ref(rtdb, "reports"), limitToLast(100)), async (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([key, r]: [string, any]) => ({ firebaseKey: key, ...r })) as Report[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      const withContent = await Promise.all(list.map(async (r) => {
        try {
          const cid = r.contentRef;
          if (!cid) return r;
          const path = r.kind === "post" ? `community/posts/${cid}/text` : `community/comments/${cid}/text`;
          const s2 = await get(ref(rtdb, path));
          return { ...r, contentPreview: s2.val() as string ?? "" };
        } catch { return r; }
      }));
      setReports(withContent);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user, profile]);

  // Stats
  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    get(ref(rtdb, "users")).then((s) => setStats((st) => ({ ...st, users: Object.keys(s.val() ?? {}).length })));
    get(ref(rtdb, "groups")).then((s) => setStats((st) => ({ ...st, groups: Object.keys(s.val() ?? {}).length })));
    get(query(ref(rtdb, "community/posts"), limitToLast(999))).then((s) => setStats((st) => ({ ...st, posts: Object.keys(s.val() ?? {}).length })));
    get(ref(rtdb, "rooms")).then((s) => setStats((st) => ({ ...st, rooms: Object.keys(s.val() ?? {}).length })));
    get(ref(rtdb, "library")).then((s) => setStats((st) => ({ ...st, library: Object.keys(s.val() ?? {}).length })));
  }, [user, profile]);

  // Users tab
  useEffect(() => {
    if (!user || profile?.role !== "admin" || tab !== "users") return;
    const unsub = onValue(ref(rtdb, "users"), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([uid, u]: [string, any]) => ({ uid, ...u })) as AppUser[];
      list.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
      setAppUsers(list);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user, profile, tab]);

  // Active rooms tab
  useEffect(() => {
    if (!user || profile?.role !== "admin" || tab !== "rooms") return;
    // Rooms list from /rooms
    const unsub = onValue(ref(rtdb, "rooms"), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, r]: [string, any]) => ({
        id, name: r.name ?? id, ownerId: r.ownerId ?? "", ownerName: r.ownerName,
        subject: r.subject, memberCount: 0,
      })) as ActiveRoom[];
      setActiveRooms(list);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user, profile, tab]);

  // Library tab
  useEffect(() => {
    if (!user || profile?.role !== "admin" || tab !== "library") return;
    const unsub = onValue(query(ref(rtdb, "library"), orderByChild("createdAt"), limitToLast(100)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, e]: [string, any]) => ({ id, ...e }));
      list.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setLibraryEntries(list);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user, profile, tab]);

  // Posts tab
  useEffect(() => {
    if (!user || profile?.role !== "admin" || tab !== "posts") return;
    const unsub = onValue(query(ref(rtdb, "community/posts"), orderByChild("createdAt"), limitToLast(40)), (snap) => {
      const val = snap.val() ?? {};
      const list = Object.entries(val).map(([id, p]: [string, any]) => ({ id, ...p, myVote: 0, score: p.score ?? 0 })) as Post[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(list);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user, profile, tab]);

  if (loading || !user || !profile) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;
  if (profile.role !== "admin") return null;

  async function save(key: string, fn: () => Promise<void>) {
    setSaving((s) => ({ ...s, [key]: true }));
    try { await fn(); } finally { setSaving((s) => ({ ...s, [key]: false })); }
  }

  // رفع صورة من الجهاز وتحويلها إلى base64 (للشعار/الأيقونة)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, setUrl: (v: string) => void) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("حجم الصورة كبير. الرجاء اختيار صورة أصغر من 500 كيلوبايت.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function removePost(p: Post) {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    await deletePost(p);
    setPosts((l) => l.filter((x) => x.id !== p.id));
  }

  async function handleDeleteReportedContent(r: Report) {
    if (!r.contentRef) return;
    if (!confirm("حذف المحتوى المُبلَّغ عنه نهائياً؟ سيُحذف البلاغ تلقائياً.")) return;
    try {
      if (r.kind === "broken-link") {
        // بلاغ رابط: لا محتوى مجتمع لحذفه — نُغلق البلاغ وحده
        await remove(ref(rtdb, `reports/${r.firebaseKey}`));
        return;
      }
      if (r.kind === "post") {
        await deletePost({ id: r.contentRef });
      }
      await remove(ref(rtdb, `reports/${r.firebaseKey}`));
    } catch {
      alert("تعذّر الحذف.");
    }
  }
  async function toggleLock(p: Post) {
    await setPostLocked(p.id, !p.locked);
    setPosts((l) => l.map((x) => (x.id === p.id ? { ...x, locked: !p.locked } : x)));
  }
  async function setUserRole(uid: string, role: string | null) {
    await update(ref(rtdb, `users/${uid}`), { role: role ?? null });
  }
  async function banUser(uid: string, ban: boolean) {
    await update(ref(rtdb, `users/${uid}`), { banned: ban });
  }
  /* استبعاد من الترتيب: عقوبة خفيفة قابلة للتراجع — نقاط مضخّمة أو
     حساب تجريبي — لا تُلغي الحساب. */
  async function toggleLeaderboard(uid: string, excluded: boolean) {
    await setLeaderboardExcluded(uid, !excluded);
  }

  /* حذف نهائي: تأكيد مزدوج لأنّه لا رجعة فيه — كتابة الاسم شرط،
     فلا تُحذف حسابات بضغطة خاطئة. */
  async function purgeUser(uid: string, name: string) {
    const typed = prompt(
      `حذف «${name}» نهائياً؟\n\nسيُمسح: حسابه · بطاقاته · تقدّمه · مهامّه · إشعاراته · أصدقاؤه.\n` +
      `لا يمكن التراجع.\n\nاكتب اسمه للتأكيد:`,
    );
    if (typed === null) return;
    if (typed.trim() !== name.trim()) { alert("الاسم غير مطابق — أُلغي الحذف."); return; }
    const r = await deleteUserData(uid);
    alert(
      `حُذفت بيانات المستخدم (${r.removed.length} مسار).` +
      (r.failed.length ? `\nتعذّر حذف: ${r.failed.join(", ")}` : "") +
      `\n\n⚠️ حساب الدخول نفسه يُحذف من Firebase Console ← Authentication، ` +
      `فلا يمكن حذفه من المتصفّح لأسباب أمنية.`,
    );
  }

  async function closeRoom(roomId: string) {
    if (!confirm("هل تريد إغلاق هذه الغرفة؟")) return;
    await remove(ref(rtdb, `roomLive/${roomId}`));
  }
  async function deleteRoom(roomId: string) {
    if (!confirm("حذف الغرفة نهائياً من القائمة؟")) return;
    await remove(ref(rtdb, `rooms/${roomId}`));
  }
  async function deleteLibraryEntry(id: string) {
    if (!confirm("حذف هذا المصدر؟")) return;
    await remove(ref(rtdb, `library/${id}`));
  }

  const filteredUsers = appUsers.filter((u) =>
    !userSearch || u.name?.includes(userSearch) || u.email?.includes(userSearch) || u.uid.includes(userSearch)
  );

  const statCards = [
    { label: "مستخدم", val: stats.users, icon: faUsers, c: "text-primary bg-primary/10" },
    { label: "غرفة محفوظة", val: stats.rooms, icon: faDoorOpen, c: "text-violet-500 bg-violet-500/10" },
    { label: "مجموعة", val: stats.groups, icon: faLayerGroup, c: "text-secondary bg-secondary/10" },
    { label: "منشور", val: stats.posts, icon: faMessage, c: "text-warning bg-warning/10" },
    { label: "مصدر في المكتبة", val: stats.library, icon: faBookOpen, c: "text-sky-500 bg-sky-500/10" },
    { label: "بلاغ نشط", val: reports.length, icon: faFlag, c: "text-danger bg-danger/10" },
  ];

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-white">
            <FontAwesomeIcon icon={faShield} className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold">لوحة إدارة BacZoneDZ</h1>
            <p className="text-xs text-text-muted">صلاحيات كاملة — للمؤسّس فقط</p>
          </div>
        </div>

        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                tab === t.id ? "bg-gradient-primary text-white" : "border border-border text-text-muted hover:text-primary"
              }`}>
              <FontAwesomeIcon icon={t.icon} className="h-3 w-3" />
              {t.label}
              {t.id === "reports" && reports.length > 0 && (
                <span className={`rounded-full px-1.5 ${tab === t.id ? "bg-white/20" : "bg-danger/10 text-danger"}`}>{reports.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ════ إحصائيات ════ */}
        {tab === "curriculum" && <CurriculumEditor />}

        {tab === "subjects" && <SubjectsEditor />}

        {tab === "guide" && <GuideEditor />}

        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {statCards.map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.c}`}>
                    <FontAwesomeIcon icon={s.icon} className="h-4 w-4" />
                  </span>
                  <div><p className="text-2xl font-extrabold">{s.val}</p><p className="text-xs text-text-muted">{s.label}</p></div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-text-muted">
              <FontAwesomeIcon icon={faCircleExclamation} className="ml-1 h-4 w-4 text-warning" />
              لإنشاء أدمن آخر أو حذف حساب نهائياً → Firebase Console → Realtime Database.
            </div>
          </div>
        )}

        {/* ════ الهوية ════ */}
        {tab === "identity" && (
          <div className="space-y-4">
            <Card icon={faImage} title="شعار الموقع" hint="ارفع صورة أو الصق رابطاً (png/svg/webp)">
              <div>
                <label className="mb-1 block text-sm font-bold">رابط الشعار</label>
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..."
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-2.5 text-sm font-bold text-text-muted transition hover:border-primary hover:text-primary">
                <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
                رفع صورة من الجهاز
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, setLogoUrl)} />
              </label>
              {logoUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="معاينة" className="h-10 w-10 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <span className="text-xs text-text-muted">معاينة الشعار</span>
                </div>
              )}
              <SaveBtn onClick={() => save("logo", () => saveSetting("logoUrl", logoUrl || undefined))} loading={!!saving.logo} />
            </Card>

            <Card icon={faImage} title="أيقونة المتصفّح (Favicon)" hint="الأيقونة الصغيرة في تبويب المتصفّح">
              <div>
                <label className="mb-1 block text-sm font-bold">رابط الأيقونة</label>
                <input value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..."
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-2.5 text-sm font-bold text-text-muted transition hover:border-primary hover:text-primary">
                <FontAwesomeIcon icon={faImage} className="h-4 w-4" />
                رفع صورة من الجهاز
                <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, setFaviconUrl)} />
              </label>
              {faviconUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={faviconUrl} alt="معاينة" className="h-8 w-8 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <span className="text-xs text-text-muted">معاينة الأيقونة</span>
                </div>
              )}
              <SaveBtn onClick={() => save("favicon", () => saveSetting("faviconUrl", faviconUrl || undefined))} loading={!!saving.favicon} />
            </Card>

            <Card icon={faFont} title="اسم الموقع">
              <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="BacZoneDZ"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              <SaveBtn onClick={() => save("name", () => saveSetting("siteName", siteName))} loading={!!saving.name} />
            </Card>

            <Card icon={faPalette} title="لون التمييز الأساسي" hint="يُغيّر لون الأزرار والروابط فوراً">
              <div className="flex items-center gap-3">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border" />
                <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
              <SaveBtn onClick={() => save("color", () => saveSetting("accentColor", accentColor))} loading={!!saving.color} />
            </Card>
          </div>
        )}

        {/* ════ الرئيسية ════ */}
        {tab === "landing" && (
          <div className="space-y-4">
            <Card icon={faBullhorn} title="بانر إعلاني عالمي">
              <input value={bannerText} onChange={(e) => setBannerText(e.target.value)} placeholder="نص البانر..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} className="h-4 w-4 accent-primary" />
                إظهار البانر للجميع
              </label>
              <SaveBtn onClick={() => save("banner", () => saveSetting("siteBanner", { text: bannerText, active: bannerActive }))} loading={!!saving.banner} />
            </Card>
            <LandingEditor />
          </div>
        )}

        {tab === "welcome" && <WelcomeEditor />}

        {/* ════ الفوتر ════ */}
        {tab === "footer" && (
          <div className="space-y-4">
            <Card icon={faFont} title="نص الفوتر">
              <input value={footerText} onChange={(e) => setFooterText(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              <SaveBtn onClick={() => save("footerText", () => saveSetting("footerText", footerText))} loading={!!saving.footerText} />
            </Card>
            <Card icon={faLink} title="روابط الفوتر">
              <div className="space-y-2">
                {footerLinks.map((lnk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={lnk.label} onChange={(e) => { const c = [...footerLinks]; c[i] = { ...c[i], label: e.target.value }; setFooterLinks(c); }}
                      placeholder="الاسم" className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none" />
                    <input value={lnk.href} onChange={(e) => { const c = [...footerLinks]; c[i] = { ...c[i], href: e.target.value }; setFooterLinks(c); }}
                      placeholder="https://..." className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none" />
                    <button onClick={() => setFooterLinks(footerLinks.filter((_, j) => j !== i))} className="grid h-9 w-9 place-items-center text-text-muted hover:text-danger">
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setFooterLinks([...footerLinks, { label: "", href: "" }])} className="flex items-center gap-2 text-sm text-primary hover:underline">
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
              <input type="date" value={bacDate} onChange={(e) => setBacDate(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              {settings.bacExamDate && <p className="text-xs text-text-muted">الحالي: <span className="font-bold text-secondary">{settings.bacExamDate}</span></p>}
              <SaveBtn onClick={() => save("bacDate", () => saveSetting("bacExamDate", bacDate))} loading={!!saving.bacDate} />
            </Card>
            <Card icon={faCalendarDays} title="تاريخ نتائج البكالوريا" hint="عدّاد النتائج في الشريحة الترحيبية">
              <input type="date" value={resultsDate} onChange={(e) => setResultsDate(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              {settings.bacResultsDate && <p className="text-xs text-text-muted">الحالي: <span className="font-bold text-secondary">{settings.bacResultsDate}</span></p>}
              <SaveBtn onClick={() => save("resultsDate", () => saveSetting("bacResultsDate", resultsDate))} loading={!!saving.resultsDate} />
            </Card>
            <Card icon={faGlobe} title="روابط التواصل الاجتماعي" hint="تظهر في الصفحة الرئيسية">
              <label className="text-xs font-semibold text-text-muted">تيليغرام</label>
              <input value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="https://t.me/..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <label className="text-xs font-semibold text-text-muted">إنستغرام</label>
              <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <label className="text-xs font-semibold text-text-muted">فيسبوك</label>
              <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <SaveBtn onClick={() => save("social", () => saveSiteSettings({ telegramUrl, instagramUrl, facebookUrl }))} loading={!!saving.social} />
            </Card>
            <Card icon={faUpRightFromSquare} title="روابط الأقسام الخارجية" hint="حاسبة المعدّل والمواضيع السابقة">
              <label className="text-xs font-semibold text-text-muted">حاسبة المعدّل</label>
              <input value={averageCalcUrl} onChange={(e) => setAverageCalcUrl(e.target.value)} placeholder="https://..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <label className="text-xs font-semibold text-text-muted">مواضيع وحلول سابقة</label>
              <input value={pastExamsUrl} onChange={(e) => setPastExamsUrl(e.target.value)} placeholder="https://..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <label className="text-xs font-semibold text-text-muted">حاسبة المعدّل الموزون</label>
              <input value={weightedCalcUrl} onChange={(e) => setWeightedCalcUrl(e.target.value)} placeholder="https://..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <SaveBtn onClick={() => save("exturls", () => saveSiteSettings({ averageCalcUrl, pastExamsUrl, weightedCalcUrl }))} loading={!!saving.exturls} />
            </Card>
            <Card icon={faLink} title="الدعم والدفع" hint="الدردشة المباشرة هي الأساس — الرابط الخارجي احتياطي فقط">
              <SupportAccountCard />
              <input value={paymentUrl} onChange={(e) => setPaymentUrl(e.target.value)} placeholder="https://m.me/... (احتياطي)"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <SaveBtn onClick={() => save("payment", () => saveSetting("paymentUrl", paymentUrl))} loading={!!saving.payment} />
            </Card>
            <Card icon={faBullhorn} title="جهات التواصل للإعلانات" hint="بطاقة «أعلن معنا» في الرئيسية">
              <label className="text-xs font-semibold text-text-muted">الإيميل</label>
              <input value={adsEmail} onChange={(e) => setAdsEmail(e.target.value)} placeholder="email@example.com"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <label className="text-xs font-semibold text-text-muted">واتساب (مع رمز الدولة)</label>
              <input value={adsWhatsapp} onChange={(e) => setAdsWhatsapp(e.target.value)} placeholder="+213..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" dir="ltr" />
              <SaveBtn onClick={() => save("ads", () => saveSiteSettings({ adsEmail, adsWhatsapp }))} loading={!!saving.ads} />
            </Card>
            <Card icon={faChartBar} title="عمولة الموقع" hint="نسبة الموقع من مبيعات الملخّصات والغرف المدفوعة">
              <div className="flex items-center gap-2">
                <input type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} min="0" max="100"
                  className="h-10 w-24 rounded-md border border-border bg-background px-3 text-center text-sm outline-none focus:border-primary" />
                <span className="text-sm font-bold text-text-muted">%</span>
              </div>
              <p className="text-xs text-text-muted">مثال: سعر 2000 دج، عمولة {commissionPct || 0}% → الموقع {Math.round((2000 * (parseInt(commissionPct) || 0)) / 100)} دج، الأستاذ {2000 - Math.round((2000 * (parseInt(commissionPct) || 0)) / 100)} دج.</p>
              <SaveBtn onClick={() => save("commission", () => setCommissionPctFn(parseInt(commissionPct) || 0))} loading={!!saving.commission} />
            </Card>
            <Card icon={faChartBar} title="السجلّ المالي" hint="الأكواد المُباعة وتوزيع الأرباح">
              {(() => {
                const sold = codes.filter((c) => c.redeemedBy);
                const totalRevenue = sold.reduce((s, c) => s + c.price, 0);
                const totalCommission = sold.reduce((s, c) => s + splitAmount(c.price, c.commissionPct).commission, 0);
                return (
                  <div>
                    <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <p className="text-sm font-extrabold text-primary">{sold.length}</p>
                        <p className="text-[10px] text-text-muted">مبيعات</p>
                      </div>
                      <div className="rounded-lg bg-secondary/10 p-2">
                        <p className="text-sm font-extrabold text-secondary">{totalRevenue}</p>
                        <p className="text-[10px] text-text-muted">إجمالي (دج)</p>
                      </div>
                      <div className="rounded-lg bg-amber-400/15 p-2">
                        <p className="text-sm font-extrabold text-amber-600">{totalCommission}</p>
                        <p className="text-[10px] text-text-muted">عمولتك (دج)</p>
                      </div>
                    </div>
                    {sold.length === 0 ? (
                      <p className="py-4 text-center text-xs text-text-muted">لا مبيعات بعد.</p>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {sold.map((c) => {
                          const sp = splitAmount(c.price, c.commissionPct);
                          return (
                            <div key={c.id} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-bold">{c.itemTitle}</span>
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{c.itemType === "library" ? "ملخّص" : "غرفة"}</span>
                              </div>
                              <p className="mt-1 text-text-muted">اشترى: <span className="font-semibold text-text-primary">{c.redeemedName || "طالب"}</span> · الأستاذ: {c.ownerName}</p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                                <span>السعر: <span className="font-bold">{c.price} دج</span></span>
                                <span className="text-amber-600">عمولتك: <span className="font-bold">{sp.commission} دج</span></span>
                                <span className="text-secondary">للأستاذ: <span className="font-bold">{sp.owner} دج</span></span>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button onClick={() => markSettled(c.id, !c.settled)}
                                  className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition ${
                                    c.settled ? "bg-secondary/15 text-secondary hover:bg-secondary/25" : "bg-amber-400/15 text-amber-600 hover:bg-amber-400/25"
                                  }`}>
                                  {c.settled ? "✓ سُوّيت — تراجع" : "وسم كـ«سُوّيت»"}
                                </button>
                                <button onClick={() => { if (confirm("حذف هذه المعاملة نهائياً؟ لا يمكن التراجع.")) deleteAccessCode(c.id); }}
                                  title="حذف المعاملة"
                                  className="grid w-9 shrink-0 place-items-center rounded-md bg-danger/10 text-danger transition hover:bg-danger/20">
                                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
            <Card icon={faWrench} title="وضع الصيانة">
              <label className="flex cursor-pointer items-center gap-3">
                <button onClick={() => setMaintenanceMode(!maintenanceMode)}>
                  <FontAwesomeIcon icon={maintenanceMode ? faToggleOn : faToggleOff} className={`h-7 w-7 ${maintenanceMode ? "text-danger" : "text-text-muted"}`} />
                </button>
                <span className={`text-sm font-bold ${maintenanceMode ? "text-danger" : "text-text-muted"}`}>{maintenanceMode ? "⚠️ وضع الصيانة مفعّل" : "الموقع يعمل بشكل طبيعي"}</span>
              </label>
              <input value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} placeholder="رسالة الصيانة..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              <SaveBtn onClick={() => save("maint", () => saveSiteSettings({ maintenanceMode, maintenanceMsg }))} loading={!!saving.maint} />
            </Card>
            <Card icon={faEye} title="التسجيل الجديد">
              <label className="flex cursor-pointer items-center gap-3">
                <button onClick={() => setAllowReg(!allowReg)}>
                  <FontAwesomeIcon icon={allowReg ? faToggleOn : faToggleOff} className={`h-7 w-7 ${allowReg ? "text-secondary" : "text-danger"}`} />
                </button>
                <span className="text-sm font-bold">{allowReg ? "التسجيل مفتوح" : "❌ التسجيل مغلق"}</span>
              </label>
              <SaveBtn onClick={() => save("reg", () => saveSetting("allowRegistration", allowReg))} loading={!!saving.reg} />
            </Card>
          </div>
        )}

        {/* ════ الإعلانات ════ */}
        {tab === "ads" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-bold">📢 إدارة الإعلانات</p>
              <p className="mt-1 text-xs text-text-muted">أضف إعلاناً (كود HTML/AdSense أو صورة برابط) في المواضع المختلفة. فعّل/عطّل كل موضع حسب الحاجة.</p>
            </div>
            {AD_PLACEMENTS.map((p) => {
              const cur = adsDraft[p.id] ?? { enabled: false, type: "html" as const, html: "", imageUrl: "", linkUrl: "" };
              const upd = (patch: Partial<typeof cur>) => setAdsDraft({ ...adsDraft, [p.id]: { ...cur, ...patch } });
              return (
                <Card key={p.id} icon={faBullhorn} title={p.label} hint={p.desc}>
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-sm font-bold">تفعيل الإعلان هنا</span>
                    <button type="button" onClick={() => upd({ enabled: !cur.enabled })}>
                      <FontAwesomeIcon icon={cur.enabled ? faToggleOn : faToggleOff} className={`h-7 w-7 ${cur.enabled ? "text-secondary" : "text-text-muted"}`} />
                    </button>
                  </label>
                  {cur.enabled && (
                    <>
                      <div className="flex gap-2">
                        <button onClick={() => upd({ type: "html" })}
                          className={`flex-1 rounded-lg border py-2 text-xs font-bold ${cur.type === "html" ? "border-primary bg-primary/5 text-primary" : "border-border text-text-muted"}`}>
                          كود HTML / AdSense
                        </button>
                        <button onClick={() => upd({ type: "image" })}
                          className={`flex-1 rounded-lg border py-2 text-xs font-bold ${cur.type === "image" ? "border-primary bg-primary/5 text-primary" : "border-border text-text-muted"}`}>
                          صورة برابط
                        </button>
                      </div>
                      {cur.type === "html" ? (
                        <textarea value={cur.html ?? ""} onChange={(e) => upd({ html: e.target.value })}
                          placeholder="<script>...</script> أو أي كود إعلان"
                          rows={4} dir="ltr"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary" />
                      ) : (
                        <>
                          <label className="text-xs font-semibold text-text-muted">رابط الصورة</label>
                          <input value={cur.imageUrl ?? ""} onChange={(e) => upd({ imageUrl: e.target.value })} placeholder="https://...jpg" dir="ltr"
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                          <label className="text-xs font-semibold text-text-muted">رابط عند الضغط (اختياري)</label>
                          <input value={cur.linkUrl ?? ""} onChange={(e) => upd({ linkUrl: e.target.value })} placeholder="https://..." dir="ltr"
                            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                        </>
                      )}
                    </>
                  )}
                  <SaveBtn onClick={() => save(`ad_${p.id}`, () => saveSiteSettings({ ads: { ...(settings.ads ?? {}), [p.id]: cur } }))} loading={!!saving[`ad_${p.id}`]} />
                </Card>
              );
            })}
          </div>
        )}

        {/* ════ المستخدمون ════ */}
        {tab === "users" && (
          <div className="space-y-3">
            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="بحث بالاسم أو البريد..."
              className="h-10 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary" />
            <p className="text-xs text-text-muted">{filteredUsers.length} مستخدم</p>
            {filteredUsers.slice(0, 50).map((u) => (
              <div key={u.uid} className={`rounded-xl border p-3 ${u.banned ? "border-danger/30 bg-danger/5" : "border-border bg-surface"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm">{u.name ?? "بدون اسم"}</span>
                      {u.role === "admin" && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">أدمن</span>}
                      {u.role === "teacher" && <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">👨‍🏫 أستاذ</span>}
                      {u.banned && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">محظور</span>}
                    </div>
                    {u.email && <p className="text-xs text-text-muted">{u.email}</p>}
                    <p className="text-xs text-text-muted">{u.points ?? 0} نقطة · المستوى {u.level ?? 1}</p>
                    <p className="mt-1 text-[10px] text-text-muted opacity-60 select-all">{u.uid}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {/* تعيين/إلغاء أستاذ */}
                    {u.role !== "admin" && (
                      u.role === "teacher" ? (
                        <button onClick={() => setUserRole(u.uid, null)}
                          className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-text-muted hover:bg-border">
                          إلغاء الأستاذية
                        </button>
                      ) : (
                        <button onClick={() => setUserRole(u.uid, "teacher")}
                          className="rounded-md border border-secondary/30 px-2 py-1 text-[11px] font-bold text-secondary hover:bg-secondary/10">
                          👨‍🏫 تعيين أستاذ
                        </button>
                      )
                    )}
                    {/* ترقية/إلغاء أدمن */}
                    {u.role !== "admin" ? (
                      <button onClick={() => setUserRole(u.uid, "admin")}
                        className="rounded-md border border-primary/30 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10">
                        ترقية أدمن
                      </button>
                    ) : (
                      <button onClick={() => setUserRole(u.uid, null)}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-text-muted hover:bg-border">
                        إلغاء الأدمن
                      </button>
                    )}
                    <button onClick={() => toggleLeaderboard(u.uid, excluded.has(u.uid))}
                      title="إخفاء/إظهار في لوحة الترتيب"
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                        excluded.has(u.uid)
                          ? "border border-primary/30 text-primary hover:bg-primary/10"
                          : "border border-border text-text-muted hover:text-primary"}`}>
                      {excluded.has(u.uid) ? "أعده للترتيب" : "استبعد من الترتيب"}
                    </button>
                    <button onClick={() => purgeUser(u.uid, u.name)}
                      title="حذف نهائي لبيانات المستخدم"
                      className="rounded-md border border-danger/30 px-2 py-1 text-[11px] font-bold text-danger hover:bg-danger/10">
                      حذف نهائي
                    </button>
                    <button onClick={() => banUser(u.uid, !u.banned)}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${u.banned ? "border border-secondary/30 text-secondary hover:bg-secondary/10" : "border border-danger/30 text-danger hover:bg-danger/10"}`}>
                      {u.banned ? "رفع الحظر" : "حظر"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ الغرف ════ */}
        {tab === "rooms" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
              <span className="text-sm font-bold">{activeRooms.length} غرفة</span>
              {activeRooms.length > 0 && (
                <button onClick={async () => {
                  if (!confirm("حذف كل الغرف نهائياً؟ لا يمكن التراجع.")) return;
                  await Promise.all(activeRooms.flatMap((r) => [
                    remove(ref(rtdb, `rooms/${r.id}`)),
                    remove(ref(rtdb, `roomLive/${r.id}`)),
                  ]));
                }}
                  className="flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10">
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  حذف كل الغرف
                </button>
              )}
            </div>
            {activeRooms.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{r.name}</p>
                  {r.subject && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{r.subject}</span>}
                  <p className="text-xs text-text-muted">المالك: {r.ownerName ?? r.ownerId.slice(0, 8)}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => closeRoom(r.id)} title="إنهاء الجلسة المباشرة"
                    className="rounded-md border border-warning/30 px-2 py-1 text-[11px] font-bold text-warning hover:bg-warning/10">
                    إنهاء
                  </button>
                  <button onClick={() => deleteRoom(r.id)} title="حذف الغرفة نهائياً"
                    className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {activeRooms.length === 0 && <p className="py-8 text-center text-sm text-text-muted">لا غرف محفوظة.</p>}
          </div>
        )}

        {/* ════ المكتبة ════ */}
        {tab === "library" && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">{libraryEntries.length} مصدر</p>
            {libraryEntries.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{e.title}</p>
                  <div className="flex gap-1.5 mt-0.5">
                    {e.subject && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{e.subject}</span>}
                    {e.chapter && <span className="rounded-full bg-border px-2 py-0.5 text-[10px] text-text-muted">{e.chapter}</span>}
                  </div>
                  <p className="text-xs text-text-muted">{e.uploaderName} · {timeAgo(e.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a href={e.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="rounded-md bg-primary/10 px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20">فتح</a>
                  <button onClick={() => deleteLibraryEntry(e.id)}
                    className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {libraryEntries.length === 0 && <p className="py-8 text-center text-sm text-text-muted">لا مصادر.</p>}
          </div>
        )}

        {/* ════ المنشورات ════ */}
        {tab === "posts" && (
          <div className="space-y-4">
            <Card icon={faBullhorn} title="نشر إعلان رسمي">
              <textarea value={announceText} onChange={(e) => setAnnounceText(e.target.value)} rows={3}
                placeholder="اكتب إعلاناً باسم «📢 إدارة BacZoneDZ»..."
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={async () => {
                if (!announceText.trim()) return;
                setSaving((s) => ({ ...s, announce: true }));
                try { await createPost(user.uid, "📢 إدارة BacZoneDZ", announceText, undefined, "public"); setAnnounceText(""); }
                finally { setSaving((s) => ({ ...s, announce: false })); }
              }} disabled={!!saving.announce || !announceText.trim()}
                className="flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5 -scale-x-100" />
                {saving.announce ? "جارٍ النشر..." : "نشر"}
              </button>
            </Card>
            <div className="space-y-2">
              {posts.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                        {p.authorName}
                        {p.locked && <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-warning" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{p.text || "(بدون نص)"}</p>
                      <p className="mt-1 text-[10px] text-text-muted">{timeAgo(p.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => toggleLock(p)} className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-warning/10 hover:text-warning">
                        <FontAwesomeIcon icon={p.locked ? faLockOpen : faLock} className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removePost(p)} className="grid h-8 w-8 place-items-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger">
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ البلاغات ════ */}
        {tab === "ratings" && (
          <RatingsAdminPanel users={appUsers} />
        )}

        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
                <span className="text-sm font-bold">{reports.length} بلاغ</span>
                <button onClick={async () => {
                  if (!confirm("حذف كل البلاغات؟")) return;
                  await Promise.all(reports.map((r) => remove(ref(rtdb, `reports/${r.firebaseKey}`))));
                }}
                  className="flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10">
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  حذف كل البلاغات
                </button>
              </div>
            )}
            {reports.length === 0 ? (
              <div className="grid place-items-center py-16 text-text-muted">
                <FontAwesomeIcon icon={faCheckCircle} className="h-10 w-10 text-secondary" />
                <p className="mt-3 text-sm">لا بلاغات — المجتمع نظيف! 🎉</p>
              </div>
            ) : reports.map((r) => (
              <div key={r.firebaseKey} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faFlag} className="h-4 w-4 text-danger" />
                    <span className="font-semibold text-sm">
                      {r.kind === "broken-link"
                        ? "🔗 رابط لا يعمل"
                        : `${r.kind === "post" ? "منشور" : "تعليق"} مُبلَّغ عنه`}
                    </span>
                  </div>
                </div>
                {r.contentPreview ? (
                  <p className="mt-2 line-clamp-3 rounded-lg border border-border bg-background p-2.5 text-sm italic">«{r.contentPreview}»</p>
                ) : (
                  <p className="mt-2 rounded-lg border border-border bg-background p-2.5 text-sm italic text-text-muted">(المحتوى محذوف أو غير متاح)</p>
                )}
                <p className="mt-2 text-sm text-text-muted">
                  أبلغ عنه: <span className="font-semibold text-text-primary">{r.reporterName}</span>
                  {r.reason && <> · «{r.reason}»</>}
                </p>
                <p className="mt-1 text-xs text-text-muted">{timeAgo(r.createdAt)}</p>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  {r.contentRef && r.kind === "post" && (
                    <button onClick={() => handleDeleteReportedContent(r)}
                      className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                      حذف المنشور
                    </button>
                  )}
                  <button onClick={() => remove(ref(rtdb, `reports/${r.firebaseKey}`))}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-text-muted hover:bg-border">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" />
                    تجاهل البلاغ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
