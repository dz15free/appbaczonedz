"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
/* أيقونات الحزمة الصلبة وحدها: `free-brands-svg-icons` ليست تبعيّةً في
   المشروع، وإضافة حزمة أيقونات كاملة من أجل ثلاثة شعارات ثمنٌ لا يُقابله
   عائد على جمهور 3G. فالقناة تُعرَّف باسمها المكتوب لا بشعارها. */
import {
  faEnvelope, faPaperPlane, faCommentDots, faShareNodes, faCamera,
} from "@fortawesome/free-solid-svg-icons";
import { useSiteSettings } from "@/features/settings/use-site-settings";

/* ════════════════════════════════════════════════════════════
   جسم صفحة الاتصال — مكوّن عميل

   لماذا انفصل عن الصفحة؟ لأنّ عناوين التواصل **تُدار من لوحة الإدارة**
   (البريد، الواتساب، وقنوات التواصل)، وقراءتها تحتاج مشتركاً حيّاً مع
   قاعدة البيانات. والصفحة نفسها تبقى مكوّن خادم لتُصدّر `metadata`
   وcanonical — فلا نخسر السيو من أجل حقلٍ قابل للتحرير.

   وأيّ قناة لم يضبطها الأدمن لا تُعرض بطاقةٌ فارغة لها: زرٌّ يؤدّي إلى
   لا شيء أسوأ من غيابه.
   ════════════════════════════════════════════════════════════ */

function Card({
  href, icon, label, value, note,
}: {
  href: string; icon: typeof faEnvelope; label: string; value: string; note?: string;
}) {
  const external = !href.startsWith("mailto:") && !href.startsWith("/");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="bz-contact-card"
    >
      <span className="bz-contact-card-icon">
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      </span>
      <span className="bz-contact-card-copy">
        <span className="block text-[13px] font-extrabold text-text">{label}</span>
        <span className="block break-all text-[12.5px] text-primary" dir="ltr">{value}</span>
        {note && <span className="mt-0.5 block text-[11.5px] text-text-muted">{note}</span>}
      </span>
    </a>
  );
}

export function ContactBody() {
  const { settings: s } = useSiteSettings();
  const email = s.adsEmail?.trim();
  const wa = s.adsWhatsapp?.trim();
  const waDigits = wa?.replace(/[^\d]/g, "");

  return (
    <>
      <h2>القنوات المباشرة</h2>
      <div className="not-prose mt-3 grid gap-2.5 sm:grid-cols-2">
        {email && (
          <Card
            href={`mailto:${email}`}
            icon={faEnvelope}
            label="البريد الإلكتروني"
            value={email}
            note="للأسئلة التفصيلية وطلبات الخصوصية"
          />
        )}
        {waDigits && (
          <Card
            href={`https://wa.me/${waDigits}`}
            icon={faCommentDots}
            label="واتساب"
            value={wa!}
            note="للردّ السريع"
          />
        )}
        {s.telegramUrl && (
          <Card href={s.telegramUrl} icon={faPaperPlane} label="تيليغرام" value={s.telegramUrl.replace(/^https?:\/\//, "")} />
        )}
        {s.facebookUrl && (
          <Card href={s.facebookUrl} icon={faShareNodes} label="فيسبوك" value={s.facebookUrl.replace(/^https?:\/\//, "")} />
        )}
        {s.instagramUrl && (
          <Card href={s.instagramUrl} icon={faCamera} label="إنستغرام" value={s.instagramUrl.replace(/^https?:\/\//, "")} />
        )}
      </div>

      <h2>لماذا تراسلنا</h2>
      <ul>
        <li><strong>مشكلة تقنية:</strong> صفحة لا تعمل، أو حساب لا تستطيع الدخول إليه، أو ميزة تتصرّف بغرابة. اذكر نوع هاتفك ومتصفّحك وما فعلتَه قبل المشكلة — ذلك يوفّر جولات أسئلة.</li>
        <li><strong>تفعيل حساب أستاذ:</strong> إن كنت أستاذاً وتريد إنشاء غرف ونشر دورات وملخّصات على المنصّة.</li>
        <li><strong>الدفع والوصول:</strong> دفعتَ ولم يُفتح لك المحتوى، أو تريد استفساراً عن دورة مدفوعة.</li>
        <li><strong>الإبلاغ عن محتوى:</strong> منشور مسيء، أو محتوى محميّ بحقوق نُشر دون إذن، أو انتحال صفة. اذكر رابط المحتوى.</li>
        <li><strong>الخصوصية:</strong> طلب نسخة من بياناتك أو حذفها — انظر {" "}<Link href="/privacy">سياسة الخصوصية</Link>.</li>
        <li><strong>اقتراح أو إعلان:</strong> فكرة تحسين، أو تعاون، أو إعلان على المنصّة.</li>
      </ul>

      <h2>وقت الردّ</h2>
      <p>
        نقرأ كل رسالة. والردّ عادةً <strong>خلال ٢٤ إلى ٤٨ ساعة</strong>، وقد
        يتأخّر في أيام الامتحانات وفي المواسم المزدحمة. وإن كانت مشكلتك عاجلة
        ومتعلّقة بدفع أو بحساب مقفل، اكتب ذلك في أوّل سطر.
      </p>

      <div className="box">
        <p>
          <strong>قبل أن تكتب:</strong> إن كان سؤالك عن كيفية استعمال ميزة، فجرّب
          سؤال المساعد الآلي داخل المنصّة أوّلاً — يجيب فوراً ويعرف أقسام
          المنصّة.
        </p>
      </div>
    </>
  );
}
