"use client";

import { useEffect, useRef, useState } from "react";
import { TeacherContactEditor } from "@/features/paid/teacher-contact";
import { listenTeacherSales, summarize, type TeacherSale } from "@/features/paid/teacher-sales";
import { clearProfileCache } from "@/features/auth/use-profile";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap, faLocationDot, faStar, faRightFromBracket,
  faPen, faXmark, faCamera, faFire, faComments, faUsers, faFileLines, faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { listenOwnerCodes, splitAmount, type AccessCode } from "@/features/paid/paid-access";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/auth/use-profile";
import { logoutUser, updateAccount, updateAvatar } from "@/lib/firebase/auth";
import { compressAvatar } from "@/lib/avatar";
import { TRACKS, WILAYAS, ALL_SUBJECTS, subjectName } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProfileBadges } from "@/features/gamification/profile-stats";
import { listenFriends, type Person } from "@/features/community/social";
import { useLeaderboardRank } from "@/features/gamification/use-rank";
import { MyRatingSummary } from "@/features/community/teacher-rating-ui";
import { loginHrefFor } from "@/features/auth/use-require-auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const profile = useProfile(user?.uid);
  const [friends, setFriends] = useState<Person[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [track, setTrack] = useState("");
  const [teachSubject, setTeachSubject] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const rank = useLeaderboardRank(user?.uid, profile?.points);
  const isTeacher = profile?.role === "teacher";
  const isStaff = profile?.role === "teacher" || profile?.role === "admin";

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setAvatarLoading(true);
    try {
      const compressed = await compressAvatar(file);
      await updateAvatar(user.uid, compressed);
    } catch { /* تجاهل */ }
    finally { setAvatarLoading(false); }
  }

  useEffect(() => {
    if (!loading && !user) router.replace(loginHrefFor(window.location.pathname, window.location.search));
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenFriends(user.uid, setFriends);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [user]);

  function openEdit() {
    setName(profile?.name || user?.displayName || "");
    setTrack(profile?.track || "");
    setTeachSubject(profile?.teachSubject || "");
    setWilaya(profile?.wilaya || "");
    setErr("");
    setEditing(true);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    setErr("");
    try {
      // الأستاذ يحفظ المادة التي يدرّسها، الطالب يحفظ الشعبة
      if (isTeacher) {
        await updateAccount(user, { name, teachSubject, wilaya });
      } else {
        await updateAccount(user, { name, track, wilaya });
      }
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return <div className="p-10 text-center text-text-muted">جارٍ التحميل...</div>;

  const trackName = TRACKS.find((t) => t.id === profile?.track)?.name ?? "—";

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-5 py-8">
        <div className="relative flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center">
          <button
            onClick={openEdit}
            aria-label="تعديل"
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-md text-text-muted hover:bg-primary/10 hover:text-primary"
          >
            <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
          </button>
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={pickAvatar} />
          {/* Avatar + edit button */}
          <button onClick={() => avatarInput.current?.click()} disabled={avatarLoading}
            className="relative" aria-label="تغيير الصورة">
            <UserAvatar name={profile?.name || user.displayName || "ط"} avatarUrl={profile?.avatarUrl} size="xl" />
            <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-gradient-primary text-white shadow">
              <FontAwesomeIcon icon={faCamera} className="h-3.5 w-3.5" />
            </span>
          </button>

          <h1 className="mt-4 font-display text-xl font-extrabold">{profile?.name || user.displayName || "طالب"}</h1>
          <span className="mt-0.5 text-sm text-text-muted">{user.email}</span>

          {/* شارة الدور */}
          {profile?.role === "teacher" && (
            <span className="mt-2 flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-sm font-bold text-secondary">
              👨‍🏫 أستاذ
            </span>
          )}
          {profile?.role === "admin" && (
            <span className="mt-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              🛡️ إدارة
            </span>
          )}

          {!isStaff && (
            <>
              {/* Streak */}
              {(profile?.streak ?? 0) >= 2 && (
                <div className={`mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                  (profile?.streak ?? 0) >= 7 ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                }`}>
                  <FontAwesomeIcon icon={faFire} className="h-4 w-4" />
                  {profile?.streak} أيام متتالية
                </div>
              )}

              {/* Level + Points */}
              <div className="mt-3 flex items-center gap-2 rounded-full bg-warning/10 px-4 py-1.5 text-sm font-bold text-warning">
                <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
                المستوى {profile?.level ?? 1} · {profile?.points ?? 0} نقطة
              </div>

              {/* Stats grid */}
              <div className="mt-4 grid w-full grid-cols-4 gap-2 text-center">
                {[
                  { icon: faFileLines, val: profile?.postCount ?? 0,   label: "منشور" },
                  { icon: faComments,  val: profile?.commentCount ?? 0, label: "تعليق" },
                  { icon: faUsers,     val: friends.length,             label: "صديق" },
                  { icon: faStar,      val: rank ? `#${rank}` : "—",   label: "ترتيبي" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-surface py-3">
                    <FontAwesomeIcon icon={s.icon} className="h-4 w-4 text-primary" />
                    <p className="mt-1 text-lg font-extrabold">{s.val}</p>
                    <p className="text-xs text-text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
              {rank && (
                <a href="/leaderboard" className="mt-2 block text-center text-xs text-primary hover:underline">
                  عرض لوحة الترتيب الكاملة →
                </a>
              )}
            </>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5 text-primary" />
            <div>
              <span className="block text-xs text-text-muted">{isTeacher ? "المادة التي يدرّسها" : "الشعبة"}</span>
              <span className="font-bold">{isTeacher ? subjectName(profile?.teachSubject) : trackName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5 text-primary" />
            <div>
              <span className="block text-xs text-text-muted">الولاية</span>
              <span className="font-bold">{profile?.wilaya ?? "—"}</span>
            </div>
          </div>
        </div>

        {!isStaff && (
          <div className="mt-4">
            <ProfileBadges
              stats={{ points: profile?.points, postCount: profile?.postCount, commentCount: profile?.commentCount }}
              friendCount={friends.length}
            />
          </div>
        )}

        <Button
          variant="ghost"
          onClick={() => {
            // نمسح ذاكرة الدور أوّلاً: لو دخل حساب آخر بعدها لرأى
            // دور الحساب السابق للحظة.
            clearProfileCache(user?.uid);
            void logoutUser().then(() => router.push("/"));
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 text-danger"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          تسجيل الخروج
        </Button>

        {profile?.role === "admin" && (
          <a
            href="/admin"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10"
          >
            🛡️ لوحة إدارة BacZoneDZ
          </a>
        )}
      </section>

      {/* تقييم الطلاب — للأستاذ والإدارة */}
      {user && isStaff && <MyRatingSummary uid={user.uid} />}

      {/* بيانات تواصل الأستاذ — بجانب لوحة أرباحه */}
      {profile?.role === "teacher" && user && <TeacherContactEditor uid={user.uid} />}

      {/* لوحة أرباح الأستاذ — الأستاذ وحده (الإدارة لا تبيع محتوى) */}
      {user && profile?.role === "teacher" && <TeacherEarnings uid={user.uid} />}

      {/* نافذة التعديل */}
      {editing && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setEditing(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">تعديل الملف الشخصي</h2>
              <button onClick={() => setEditing(false)} aria-label="إغلاق" className="text-text-muted hover:text-danger">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1 block text-sm font-semibold">الاسم</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />

            {isTeacher ? (
              <>
                <label className="mb-1 block text-sm font-semibold">المادة التي تدرّسها</label>
                <select
                  value={teachSubject}
                  onChange={(e) => setTeachSubject(e.target.value)}
                  className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">اختر المادة</option>
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="mb-1 block text-sm font-semibold">الشعبة</label>
                <select
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">اختر الشعبة</option>
                  {TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </>
            )}

            <label className="mb-1 block text-sm font-semibold">الولاية</label>
            <select
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">اختر الولاية</option>
              {WILAYAS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {err && <p className="mb-3 text-sm text-danger">{err}</p>}

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-md bg-gradient-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* لوحة أرباح الأستاذ — مبيعاته وأرباحه بعد خصم العمولة */
function TeacherEarnings({ uid }: { uid: string }) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [sales, setSales] = useState<TeacherSale[]>([]);

  useEffect(() => {
    const unsub = listenOwnerCodes(uid, setCodes);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  /* مبيعات الدفع الإلكتروني تُضمّ إلى مبيعات الأكواد في **لوحة واحدة**.
     لوحتان منفصلتان تعنيان أن يجمع الأستاذ أرباحه بنفسه — وهو أوّل
     مصدر للشكّ في المنصّة. */
  useEffect(() => {
    const unsub = listenTeacherSales(uid, setSales);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [uid]);

  const sold = codes.filter((c) => c.redeemedBy);
  const cardTotals = summarize(sales);

  const totalGross = sold.reduce((s, c) => s + c.price, 0) + cardTotals.gross;
  const totalNet =
    sold.reduce((s, c) => s + splitAmount(c.price, c.commissionPct).owner, 0) + cardTotals.net;
  const settledNet =
    sold.filter((c) => c.settled).reduce((s, c) => s + splitAmount(c.price, c.commissionPct).owner, 0)
    + cardTotals.settled;
  const pendingNet = totalNet - settledNet;
  const siteCut =
    sold.reduce((s, c) => s + splitAmount(c.price, c.commissionPct).commission, 0)
    + cardTotals.commission;
  const buyers = new Set([
    ...sold.map((c) => c.redeemedBy),
    ...sales.map((x) => x.buyerUid),
  ]).size;

  return (
    <section className="mx-auto mt-4 max-w-md px-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-secondary" />
          <h2 className="font-display text-base font-extrabold">أرباحي من المحتوى المدفوع</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-secondary/10 p-3 text-center">
            <p className="text-lg font-extrabold text-secondary">{totalNet}</p>
            <p className="text-[11px] text-text-muted">صافي أرباحك (دج)</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-center">
            <p className="text-lg font-extrabold text-primary">{sold.length}</p>
            <p className="text-[11px] text-text-muted">عدد المبيعات</p>
          </div>
          <div className="rounded-xl bg-amber-400/15 p-3 text-center">
            <p className="text-lg font-extrabold text-amber-600">{pendingNet}</p>
            <p className="text-[11px] text-text-muted">بانتظار التسوية (دج)</p>
          </div>
          <div className="rounded-xl bg-border p-3 text-center">
            <p className="text-lg font-extrabold">{buyers}</p>
            <p className="text-[11px] text-text-muted">عدد المشترين</p>
          </div>
        </div>

        {/* الشفافية المالية: الأستاذ يرى **كم دخل وكم أخذ الموقع** بلا
            حساب يدوي. إخفاء العمولة يفتح باب الشكّ لا الطمأنينة. */}
        <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-background p-3 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">إجمالي المبيعات قبل العمولة</span>
            <span className="font-bold">{totalGross} دج</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">عمولة الموقع</span>
            <span className="font-bold text-text-muted">− {siteCut} دج</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5">
            <span className="font-bold">صافي أرباحك</span>
            <span className="font-extrabold text-secondary">{totalNet} دج</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">حُوّل إليك</span>
            <span className="font-bold">{settledNet} دج</span>
          </div>
        </div>

        {sales.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-bold text-text-muted">
              مبيعات الدفع بالبطاقة ({sales.length})
            </p>
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {sales.map((x) => (
                <div key={x.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-[11.5px]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{x.itemTitle}</span>
                    <span className="block text-[10.5px] text-text-muted">
                      {x.itemType === "room" ? "غرفة" : x.itemType === "course" ? "دورة" : "ملخّص"} ·{" "}
                      {new Date(x.paidAt).toLocaleDateString("ar-DZ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-left">
                    <span className="block font-extrabold text-secondary">{x.net} دج</span>
                    <span className="block text-[10px] text-text-muted">من {x.price}</span>
                  </span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    x.settled ? "bg-secondary/10 text-secondary" : "bg-amber-400/15 text-amber-600"}`}>
                    {x.settled ? "حُوّل" : "بانتظار"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
          التسوية تتم مع أدمن الموقع. المبالغ تصل إلى حساب الموقع أوّلاً ثم تُحوَّل إليك بعد خصم العمولة.
        </p>

        {sold.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-text-muted">تفاصيل المبيعات</p>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {sold.map((c) => {
                const sp = splitAmount(c.price, c.commissionPct);
                return (
                  <div key={c.id} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{c.itemTitle}</span>
                      {c.settled ? (
                        <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">سُوّيت ✓</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">معلّقة</span>
                      )}
                    </div>
                    <p className="mt-1 text-text-muted">المشتري: <span className="font-semibold text-text-primary">{c.redeemedName || "طالب"}</span></p>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]">
                      <span>السعر: <span className="font-bold">{c.price} دج</span></span>
                      <span className="text-secondary">حصّتك: <span className="font-bold">{sp.owner} دج</span></span>
                      <span className="text-text-muted">عمولة الموقع: {sp.commission} دج</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
