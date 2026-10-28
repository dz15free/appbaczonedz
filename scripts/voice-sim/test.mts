import "./mocks/env.js";
import { log, sfu } from "./mocks/env.js";
import { store, simulateBlip } from "./mocks/firebase-database.js";
import { VoiceManager } from "@/features/voice/voice-manager";
import { pushTracks, RealtimeError } from "@/lib/realtime/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
(globalThis as any).__pcBySession = new Map();
const reg = (m: any) => (globalThis as any).__pcBySession.set(m.sessionId, m.pc);
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); };
const voice = () => store.data.roomLive?.r1?.voice ?? {};

async function main() {
  // ── ١: Cloudflare يُرجع خطأ المسار بحالة 200 — هل يُكتشف؟
  let caught: any = null;
  try { await pushTracks("sessX12345678", { tracks: [{ location: "remote", sessionId: "s", trackName: "nope" }] }); }
  catch (e) { caught = e; }
  check("خطأ Cloudflare داخل ردّ 200 يُكتشف ولا يُبتلع", caught instanceof RealtimeError && caught.code === "track_not_found");

  // ── الأستاذ والتلميذ يدخلان
  const T = new VoiceManager("r1", "teacher", "أ. سليمة", true);
  const S = new VoiceManager("r1", "student", "يوسف", false);
  const heard: string[] = [];
  S.onRemoteStream = (uid) => heard.push(uid);
  await T.join(); reg(T);
  await S.join(); reg(S);
  S.ownerUid = "teacher";
  await sleep(30);
  check("الدخول استماعٌ فقط: لا مسار منشور للتلميذ", !voice().student?.trackName);
  check("الأستاذ مسجَّل بإذن، والتلميذ بلا حقل allowed", voice().teacher?.allowed === true && !("allowed" in (voice().student ?? {})));

  // ── ٢: لا إعلان قبل الجاهزية
  let announcedWhileDisconnected = false;
  const origUpdateLog = () => { if (voice().teacher?.trackName && (T as any).pc.connectionState !== "connected") announcedWhileDisconnected = true; };
  const iv = setInterval(origUpdateLog, 2);
  const res = await T.enableMic();
  clearInterval(iv);
  check("enableMic يعيد ok", res === "ok", res);
  check("المسار لا يُعلَن في القاعدة قبل اكتمال الاتصال بالخادم", !announcedWhileDisconnected && !!voice().teacher?.trackName);

  // ── ٣: المسار لم ينتشر بعد ⇒ أوّل سحب يفشل ⇒ إعادة محاولة تلقائية
  await sleep(2500);
  const fails = log.filter((l) => l[0] === "pull-fail").length;
  const oks = log.filter((l) => l[0] === "pull-ok").length;
  check("السحب الأوّل فشل (المسار لم يصل الخادم بعد) ثمّ أُعيدت المحاولة", fails >= 1 && oks === 1, `فشل ${fails} · نجاح ${oks}`);
  check("التلميذ يسمع الأستاذ في النهاية", heard.includes("teacher"));

  // ── ٤: تذبذب شبكة الهاتف — الخادم يمحو الحضور ثمّ يعود الاتصال
  simulateBlip();
  await sleep(10);
  const goneDuringBlip = !voice().teacher;
  await sleep(120);
  check("بعد عودة الاتصال يُعاد كتابة حضور الأستاذ بمساره", goneDuringBlip && voice().teacher?.trackName && voice().teacher?.micOn === true,
    `اختفى أثناء الانقطاع: ${goneDuringBlip}`);

  // ── ٥: تلميذ يدخل بعد التذبذب — هل يسمع الأستاذ؟
  const L = new VoiceManager("r1", "late", "فاطمة", false);
  const heardL: string[] = [];
  L.onRemoteStream = (uid) => heardL.push(uid);
  await L.join(); reg(L); L.ownerUid = "teacher";
  await sleep(400);
  check("من يدخل بعد تذبذب الشبكة يسمع الأستاذ", heardL.includes("teacher"));

  // ── ٦: التلميذ بلا إذن لا يستطيع الكلام؛ بعد الإذن يستطيع ويسمعه الأستاذ
  check("التلميذ بلا إذن ⇒ forbidden", (await S.enableMic()) === "forbidden");
  const heardT: string[] = [];
  T.onRemoteStream = (uid) => heardT.push(uid);
  T.setAllowed("student", true);
  await sleep(30);
  const r2 = await S.enableMic();
  await sleep(2500);
  check("بعد منح الكلمة: التلميذ يتكلّم والأستاذ يسمعه", r2 === "ok" && heardT.includes("student"), r2);

  // ── ٧: نسخة قديمة لا تمسح حضور نسخة أحدث للمستخدم نفسه
  const old = new VoiceManager("r1", "dup", "مكرّر", false);
  await old.join(); reg(old);
  const fresh = new VoiceManager("r1", "dup", "مكرّر", false);
  await fresh.join(); reg(fresh);
  await sleep(20);
  await old.leave();
  await sleep(20);
  check("مغادرة النسخة القديمة لا تُخفي النسخة الأحدث", !!voice().dup && voice().dup.cid === (fresh as any).cid);

  // ── ٨: السحب الإذن يُغلق الميكروفون فوراً
  T.setAllowed("student", false);
  await sleep(40);
  check("سحب الإذن يُغلق ميكروفون التلميذ فوراً", S.isMicOn() === false && voice().student?.micOn === false);

  console.log(`\n${pass} نجح · ${fail} فشل`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
