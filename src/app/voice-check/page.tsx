"use client";

import { useRef, useState } from "react";
import { newSession, pushTracks, renegotiate, getIceServers } from "@/lib/realtime/client";

/* ════════════════════════════════════════════════════════════
   فحص الصوت — أين تتوقّف الرحلة بالضبط؟

   يمرّ بنفس دوال الغرفة حرفياً (`lib/realtime/client`)، ثمّ يختبر
   الدورة كاملة: ينشر صوتك في جلسة، ويسحبه في جلسة ثانية، ويتحقّق
   أنّ بايتات صوت **وصلت فعلاً**. فإن نجح هنا ولم يعمل في الغرفة
   فالعطل في الغرفة؛ وإن فشل هنا فهذه الصفحة تقول أين.
   ════════════════════════════════════════════════════════════ */

type Status = "run" | "ok" | "warn" | "fail";
interface Step { label: string; status: Status; detail?: string; ms?: number }
interface Verdict { kind: "ok" | "fail" | "warn"; title: string; body: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function errText(e: unknown) {
  const x = e as { code?: string; message?: string; name?: string };
  return [x.code, x.name && x.name !== "Error" && x.name !== "RealtimeError" ? x.name : "", x.message ?? String(e)]
    .filter(Boolean).join(" — ");
}

function waitConnected(pc: RTCPeerConnection, timeout: number, trail: string[]) {
  return new Promise<void>((resolve, reject) => {
    const ok = () => pc.connectionState === "connected"
      || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed";
    if (ok()) return resolve();
    const t = setTimeout(() => { done(); reject(new Error(`timeout ${timeout / 1000}s`)); }, timeout);
    const check = () => {
      trail.push(`${pc.iceConnectionState}/${pc.connectionState}`);
      if (ok()) { done(); resolve(); }
      else if (pc.connectionState === "failed") { done(); reject(new Error("connection failed")); }
    };
    const done = () => {
      clearTimeout(t);
      pc.removeEventListener("connectionstatechange", check);
      pc.removeEventListener("iceconnectionstatechange", check);
    };
    pc.addEventListener("connectionstatechange", check);
    pc.addEventListener("iceconnectionstatechange", check);
  });
}

export default function VoiceCheckPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [copied, setCopied] = useState(false);
  const list = useRef<Step[]>([]);

  function begin(label: string) {
    const i = list.current.push({ label, status: "run" }) - 1;
    const t0 = performance.now();
    setSteps([...list.current]);
    return (status: Status, detail?: string) => {
      list.current[i] = { label, status, detail, ms: Math.round(performance.now() - t0) };
      setSteps([...list.current]);
    };
  }

  async function run() {
    list.current = [];
    setSteps([]);
    setVerdict(null);
    setCopied(false);
    setRunning(true);

    let stream: MediaStream | null = null;
    const pcs: RTCPeerConnection[] = [];
    const finish = (v: Verdict) => {
      setVerdict(v);
      stream?.getTracks().forEach((t) => t.stop());
      pcs.forEach((p) => { try { p.close(); } catch { /* */ } });
      setRunning(false);
    };

    // ١ — الخادم
    let end = begin("إعداد الصوت على الخادم");
    try {
      const h = await (await fetch("/api/realtime/health", { cache: "no-store" })).json();
      if (h.voice !== "configured") {
        end("fail", h.voice);
        return finish({ kind: "fail", title: "مفاتيح Cloudflare ناقصة", body: "أضف CLOUDFLARE_REALTIME_APP_ID و CLOUDFLARE_REALTIME_APP_SECRET في Vercel ثمّ Redeploy." });
      }
      end("ok", `TURN: ${h.turn === "configured" ? "مفعّل" : "غير مفعّل"}`);
    } catch (e) {
      end("fail", errText(e));
      return finish({ kind: "fail", title: "تعذّر الوصول إلى خادم الموقع", body: "تحقّق من الإنترنت ثمّ أعد الفحص." });
    }

    // ٢ — خوادم ICE
    end = begin("خوادم الاتصال (STUN/TURN)");
    const iceServers = await getIceServers();
    const hasTurn = iceServers.some((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => u.startsWith("turn")));
    end(hasTurn ? "ok" : "warn", hasTurn ? "STUN + TURN" : "STUN فقط — لا بديل إن حجبت الشبكة UDP");

    // ٣ — الميكروفون
    end = begin("إذن الميكروفون");
    if (!navigator.mediaDevices?.getUserMedia) {
      end("fail", "المتصفّح لا يدعم getUserMedia");
      return finish({ kind: "fail", title: "هذا المتصفّح لا يدعم الميكروفون", body: "افتح الصفحة في Chrome أو Safari (لا من داخل فيسبوك أو إنستغرام)." });
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      end("ok", stream.getAudioTracks()[0]?.label || "ميكروفون");
    } catch (e) {
      end("fail", errText(e));
      return finish({ kind: "fail", title: "الميكروفون غير متاح", body: "اسمح بالميكروفون من القفل بجانب عنوان الموقع، ثمّ أعد الفحص." });
    }

    // ٤ — جلسة النشر
    end = begin("فتح جلسة صوت عند Cloudflare");
    let sidA = "";
    try { sidA = await newSession(); end("ok", sidA.slice(0, 10) + "…"); }
    catch (e) {
      end("fail", errText(e));
      return finish({ kind: "fail", title: "Cloudflare رفض فتح جلسة", body: "تحقّق من صحّة المفاتيح في Vercel. التفاصيل في التقرير." });
    }

    // ٥ — نشر الصوت
    end = begin("إرسال صوتك إلى الخادم");
    const pcA = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    pcs.push(pcA);
    const types = new Set<string>();
    pcA.onicecandidate = (e) => {
      const c = e.candidate;
      const t = c && ((c as RTCIceCandidate & { type?: string }).type || / typ (\w+)/.exec(c.candidate)?.[1]);
      if (t) types.add(t);
    };
    const trackName = `check-${Date.now()}`;
    try {
      const tr = pcA.addTransceiver(stream.getAudioTracks()[0], { direction: "sendonly" });
      const offer = await pcA.createOffer();
      await pcA.setLocalDescription(offer);
      const res = await pushTracks(sidA, {
        sessionDescription: { type: "offer", sdp: offer.sdp },
        tracks: [{ location: "local", mid: tr.mid, trackName }],
      });
      if (!res.sessionDescription) throw new Error("لا ردّ SDP من الخادم");
      await pcA.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
      end("ok", "الخادم قبل المسار");
    } catch (e) {
      end("fail", errText(e));
      return finish({ kind: "fail", title: "الخادم رفض نشر الصوت", body: "هذا عطل في الإعداد أو الكود لا في شبكتك. أرسل التقرير كما هو." });
    }

    // ٦ — اكتمال الاتصال
    end = begin("اكتمال الاتصال الصوتي (UDP)");
    const trailA: string[] = [];
    try {
      await waitConnected(pcA, 15000, trailA);
      end("ok", `مرشّحات: ${[...types].join("، ") || "—"}`);
    } catch (e) {
      const t = [...types];
      end("fail", `${errText(e)} · مرشّحات: ${t.join("، ") || "لا شيء"} · ${trailA.join(" ← ") || pcA.iceConnectionState}`);
      return finish(
        !t.includes("srflx") && !t.includes("relay")
          ? { kind: "fail", title: "شبكتك تحجب UDP بالكامل", body: hasTurn
              ? "حتى TURN لم يُجب. جرّب شبكة أخرى (بيانات الهاتف) للتأكّد."
              : "الحلّ: فعّل TURN من Cloudflare (مجاني) — يمرّر الصوت عبر المنفذ 443 الذي لا تحجبه الشبكات. أو جرّب بيانات الهاتف الآن للتأكّد." }
          : { kind: "fail", title: "الشبكة تمنع اكتمال الاتصال الصوتي", body: hasTurn
              ? "جرّب شبكة أخرى. إن فشل في كل الشبكات أرسل التقرير."
              : "فعّل TURN من Cloudflare (مجاني) — هو الحلّ لهذه الحالة تحديداً." },
      );
    }

    // ٧ — السحب من جلسة ثانية (كما يفعل التلميذ)
    end = begin("استقبال الصوت كما يستقبله التلميذ");
    const pcB = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    pcs.push(pcB);
    try {
      const sidB = await newSession();
      let res: { sessionDescription?: RTCSessionDescriptionInit; requiresImmediateRenegotiation?: boolean } | null = null;
      let lastErr: unknown = null;
      for (let i = 0; i < 6 && !res; i++) {
        try {
          res = await pushTracks(sidB, { tracks: [{ location: "remote", sessionId: sidA, trackName }] });
        } catch (e) { lastErr = e; await sleep(700); }
      }
      if (!res) throw lastErr;
      if (res.requiresImmediateRenegotiation && res.sessionDescription) {
        await pcB.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));
        const ans = await pcB.createAnswer();
        await pcB.setLocalDescription(ans);
        await renegotiate(sidB, { type: "answer", sdp: ans.sdp });
      }
      await waitConnected(pcB, 15000, []);
      end("ok");
    } catch (e) {
      end("fail", errText(e));
      return finish({ kind: "fail", title: "النشر نجح لكنّ الاستقبال فشل", body: "أرسل التقرير كما هو — هذا يحدّد العطل بدقّة." });
    }

    // ٨ — هل وصلت بايتات صوت فعلاً؟
    end = begin("وصول الصوت فعلاً (بايتات مستلَمة)");
    let bytes = 0;
    for (let i = 0; i < 12 && bytes === 0; i++) {
      await sleep(500);
      const stats = await pcB.getStats();
      stats.forEach((r) => {
        const s = r as { type?: string; kind?: string; bytesReceived?: number };
        if (s.type === "inbound-rtp" && s.kind === "audio") bytes = s.bytesReceived ?? 0;
      });
    }
    if (bytes > 0) {
      end("ok", `${bytes.toLocaleString("en")} بايت`);
      finish({ kind: "ok", title: "الصوت يعمل على هذه الشبكة", body: "الإرسال والاستقبال سليمان. إن لم يعمل في الغرفة، أعد تحميلها وأرسل لي ما يظهر." });
    } else {
      end("fail", "0 بايت خلال 6 ثوانٍ");
      finish({ kind: "warn", title: "الاتصال اكتمل لكن لم يصل صوت", body: "أرسل التقرير كما هو." });
    }
  }

  function report() {
    const lines = [
      `BacZone voice-check · ${new Date().toISOString()}`,
      `UA: ${navigator.userAgent}`,
      ...steps.map((s) => `[${s.status}] ${s.label}${s.ms != null ? ` (${s.ms}ms)` : ""}${s.detail ? ` — ${s.detail}` : ""}`),
      verdict ? `=> ${verdict.title}` : "",
    ];
    void navigator.clipboard?.writeText(lines.join("\n")).then(() => setCopied(true)).catch(() => {});
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="bz-rooms-h1">فحص الصوت</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-text-muted">
        يجرّب رحلة الصوت كاملة على هذا الجهاز وهذه الشبكة: يرسل صوتك إلى الخادم ويستقبله كما يستقبله التلميذ.
        يستغرق نحو 20 ثانية، ولا يُسمعك أحد.
      </p>

      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
      >
        {running ? "جارٍ الفحص…" : steps.length ? "أعد الفحص" : "ابدأ الفحص"}
      </button>

      {steps.length > 0 && (
        <ol className="mt-6 space-y-2" aria-live="polite">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white ${
                  s.status === "ok" ? "bg-secondary" : s.status === "fail" ? "bg-danger" : s.status === "warn" ? "bg-warning" : "animate-pulse bg-primary"
                }`}
              >
                {s.status === "ok" ? "✓" : s.status === "fail" ? "✕" : s.status === "warn" ? "!" : "…"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-text-primary">
                  {s.label}
                  {s.ms != null && <span className="ms-2 text-[11px] font-normal text-text-muted">{s.ms}ms</span>}
                </span>
                {s.detail && (
                  <span className="mt-0.5 block break-words text-[12px] leading-relaxed text-text-muted" dir="auto">{s.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {verdict && (
        <section
          className={`mt-5 rounded-2xl border p-4 ${
            verdict.kind === "ok" ? "border-secondary/40 bg-secondary/10" : verdict.kind === "warn" ? "border-warning/40 bg-warning/10" : "border-danger/40 bg-danger/10"
          }`}
        >
          <h2 className="m-0 text-[16px] text-text-primary">{verdict.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-text-primary/80">{verdict.body}</p>
          <button
            type="button"
            onClick={report}
            className="mt-3 inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-[12.5px] font-bold text-text-primary"
          >
            {copied ? "نُسخ التقرير ✓" : "انسخ التقرير"}
          </button>
        </section>
      )}
    </main>
  );
}
