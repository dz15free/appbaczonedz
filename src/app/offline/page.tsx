import type { Metadata } from "next";

/* ════════════════════════════════════════════════════════════
   صفحة «لا اتّصال» — يعرضها خادم الخدمة حين تنقطع الشبكة

   تُعرض من الكاش بلا JavaScript الموقع (ملفّاته غير محفوظة)، لذلك:
   • لا أزرار تحتاج React: «أعد المحاولة» رابطٌ عاديّ.
   • سكربت صغير مضمَّن يُعيد التحميل وحده حين يعود الاتّصال.
   • التنسيق من design-v9.css (يحفظه خادم الخدمة مع الصفحة).
   ولا وعود كاذبة: الأدوات تحتاج الإنترنت، فلا نقول غير ذلك.
   ════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "لا يوجد اتّصال",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

const reconnectScript = `
(function(){
  function back(){ location.replace(document.referrer && document.referrer.indexOf(location.origin)===0 ? document.referrer : '/home'); }
  window.addEventListener('online', function(){ setTimeout(function(){ location.pathname === '/offline' ? back() : location.reload(); }, 400); });
})();
`;

export default function OfflinePage() {
  return (
    <main className="bz-offline" dir="rtl">
      <div className="bz-offline-card">
        <div className="bz-offline-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png?v=3" alt="" width={64} height={64} />
          <span className="bz-offline-dot" />
        </div>

        <h1>أنت غير متّصل بالإنترنت</h1>
        <p className="bz-offline-lede">
          لا بأس — حين يعود الاتّصال نُعيدك إلى حيث كنت تلقائياً.
        </p>

        <p className="bz-offline-wait"><span aria-hidden="true" /> ننتظر عودة الاتّصال…</p>

        <a href="/home" className="bz-offline-btn">أعد المحاولة</a>

        <div className="bz-offline-tips">
          <p className="bz-offline-tips-h">في الأثناء</p>
          <ul>
            <li>تأكّد من الويفي أو بيانات الهاتف، أو جرّب وضع الطيران ثمّ أعده.</li>
            <li>إن كنت في غرفة صوتية، تعود إليها بإعادة فتحها بعد الاتّصال.</li>
            <li>لا تضيّع الوقت: خذ ورقة وراجع آخر درس — ٢٥ دقيقة تركيز ثمّ ٥ راحة.</li>
          </ul>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: reconnectScript }} />
    </main>
  );
}
