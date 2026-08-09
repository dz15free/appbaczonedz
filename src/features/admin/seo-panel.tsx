"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSatelliteDish, faSpinner, faCircleCheck, faTriangleExclamation,
  faLink, faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/features/auth/auth-provider";

/* ════════════════════════════════════════════════════════════
   الأرشفة — لوحة الأدمن

   الصفحة التي تكتبها هنا موجودة على الموقع فوراً، لكنّ محرّك البحث
   لا يعرف بها حتى يمرّ عليه زاحفه — وقد يستغرق ذلك أسابيع.

   ثلاث طبقات تعمل معاً:
     ١. `sitemap.xml` صار **ديناميكياً**: يقرأ ما نشرتَه من قاعدة
        البيانات بروابطه الحقيقية وتواريخ تعديله. لا إعادة نشر.
     ٢. التحقّق من الموقع في Search Console عبر `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
     ٣. زرّ الإبلاغ هنا: يدفع الروابط إلى شبكة IndexNow فوراً.
   ════════════════════════════════════════════════════════════ */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://app.baczonedz.com").replace(/\/+$/, "");

export function SeoPanel() {
  const { user } = useAuth();
  const [urls, setUrls] = useState<string[] | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/indexnow")
      .then((r) => r.json())
      .then((d) => { setUrls(d.urls ?? []); setReady(Boolean(d.ready)); })
      .catch(() => setUrls([]));
  }, []);

  async function ping() {
    if (!user?.uid || !urls?.length) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, urls }),
      });
      const d = await res.json();
      setMsg(d.ok
        ? { tone: "ok", text: `تمّ إبلاغ محرّكات البحث بـ ${d.count} رابطاً.` }
        : { tone: "bad", text: d.error || `فشل الإبلاغ (رمز ${d.status ?? res.status}).` });
    } catch {
      setMsg({ tone: "bad", text: "تعذّر الاتصال بالخادم." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-display text-[17px] font-extrabold">
          <FontAwesomeIcon icon={faSatelliteDish} className="h-4 w-4 text-primary" />
          أرشفة الصفحات في محرّكات البحث
        </h3>
        <p className="mt-2 text-[13px] leading-[1.9] text-text-muted">
          خريطة الموقع تقرأ ما تنشره من قاعدة البيانات مباشرةً — أي تخصّص تكتبه أو
          تعدّله يظهر فيها خلال نصف ساعة بلا إعادة نشر للموقع. والزرّ أدناه يُبلّغ
          محرّكات البحث <b className="text-text-primary">فوراً</b> بدل انتظار الزاحف.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a href={`${SITE}/sitemap.xml`} target="_blank" rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border px-3 text-[13px] font-bold text-text-muted transition hover:border-primary hover:text-primary">
            <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5 text-primary" />
            <span className="min-w-0 flex-1 truncate">افتح خريطة الموقع</span>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-2.5 w-2.5 opacity-50" />
          </a>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border px-3 text-[13px] font-bold text-text-muted transition hover:border-primary hover:text-primary">
            <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5 text-primary" />
            <span className="min-w-0 flex-1 truncate">Google Search Console</span>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-2.5 w-2.5 opacity-50" />
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={ping}
            disabled={busy || !ready || !urls?.length}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-gradient-primary px-5 text-[13.5px] font-extrabold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {busy
              ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
              : <FontAwesomeIcon icon={faSatelliteDish} className="h-4 w-4" />}
            أبلغ محرّكات البحث الآن
          </button>
          {urls && (
            <span className="text-[12.5px] font-bold text-text-muted">
              {urls.length} رابطاً جاهزاً للإبلاغ
            </span>
          )}
        </div>

        {!ready && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2.5 text-[12.5px] font-bold leading-relaxed text-amber-700">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              الزرّ معطّل حتى تضبط <code className="font-mono">INDEXNOW_KEY</code> في متغيّرات البيئة
              (أي نصّ عشوائي من ٨–١٢٨ محرفاً لاتينياً/رقماً). خريطة الموقع تعمل بدونه.
            </span>
          </p>
        )}

        {msg && (
          <p className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold ${
            msg.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-danger/10 text-danger"
          }`}>
            <FontAwesomeIcon icon={msg.tone === "ok" ? faCircleCheck : faTriangleExclamation} className="h-3.5 w-3.5" />
            {msg.text}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="text-[12.5px] font-extrabold text-text-primary">خطوات مرّة واحدة</p>
        <ol className="mt-2 space-y-1.5 ps-4 text-[12.5px] leading-[1.9] text-text-muted" style={{ listStyle: "decimal" }}>
          <li>أضف الموقع في Search Console واختر «وسم HTML»، ثمّ ضع القيمة في <code className="font-mono">NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION</code>.</li>
          <li>أرسل <code className="font-mono">/sitemap.xml</code> من قسم Sitemaps.</li>
          <li>ولّد مفتاحاً عشوائياً وضعه في <code className="font-mono">INDEXNOW_KEY</code> — يُقدَّم تلقائياً على <code className="font-mono">/indexnow-key.txt</code>.</li>
          <li>بعد كل نشر مهمّ، اضغط «أبلغ محرّكات البحث الآن».</li>
        </ol>
      </div>
    </div>
  );
}
