"use client";

import { useEffect, useRef } from "react";

export function SidebarScript({ code }: { code: string }) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !code.trim()) return;

    const previousOnLoad = window.onload;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.dataset.bzSidebarRuntime = "true";
    script.text = code;
    host.appendChild(script);

    /* بعض الأدوات القديمة تعرّف window.onload = init. عند الحقن بعد
       تحميل الصفحة لا يُستدعى الحدث تلقائيًا، لذلك نشغّل handler الجديد
       مرة واحدة فقط بعد اكتمال DOM، من دون إعادة إطلاق حدث عالمي. */
    const nextOnLoad = window.onload;
    if (nextOnLoad && nextOnLoad !== previousOnLoad) {
      try { nextOnLoad.call(window, new Event("load")); } catch { /* الكود المخصص مستقل */ }
    }

    return () => {
      host.replaceChildren();
      if (window.onload === nextOnLoad && previousOnLoad) window.onload = previousOnLoad;
    };
  }, [code]);

  return <span ref={hostRef} data-bz-sidebar-runtime="true" aria-hidden="true" />;
}
