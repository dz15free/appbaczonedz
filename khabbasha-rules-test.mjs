import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";
import fs from "node:fs";

const env = await initializeTestEnvironment({
  projectId: "baczone-khabbasha-test",
  database: { host: "127.0.0.1", port: 9000, rules: fs.readFileSync("firebase-rtdb-rules.json", "utf8") },
});

const db = (uid) => (uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database());
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(["✔", name]); }
  catch (error) { results.push(["✘", `${name} → ${String(error).slice(0, 180)}`]); }
};

const legacy = {
  messages: [
    { role: "assistant", text: "أهلاً! أنا الخباشة." },
    { role: "user", text: "اشرح لي الدرس." },
  ],
  updatedAt: Date.now(),
};
const conversation = {
  id: "c1",
  title: "محادثة جديدة",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastMessagePreview: "اشرح لي الدرس.",
  messageCount: 1,
};
const message = {
  id: "m1",
  role: "user",
  text: "اشرح لي الدرس.",
  createdAt: Date.now(),
  attachments: [{ id: "a1", type: "image", fileName: "exercise.png", mimeType: "image/png", source: "rtdb-base64" }],
};
const attachment = {
  dataUrl: "data:image/png;base64,AAAA",
  fileName: "exercise.png",
  mimeType: "image/png",
  size: 32,
  createdAt: Date.now(),
};

await step("المسار القديم يحفظ للمستخدم A", () => assertSucceeds(set(ref(db("A"), "khabbashaChats/A"), legacy)));
await step("المسار القديم يُقرأ للمستخدم A", () => assertSucceeds(get(ref(db("A"), "khabbashaChats/A"))));
await step("المحادثة الجديدة تُحفظ للمستخدم A", () => assertSucceeds(set(ref(db("A"), "khabbashaConversations/A/c1"), conversation)));
await step("رسالة المحادثة تُحفظ للمستخدم A", () => assertSucceeds(set(ref(db("A"), "khabbashaMessages/A/c1/m1"), message)));
await step("مرفق المحادثة يُحفظ للمستخدم A", () => assertSucceeds(set(ref(db("A"), "khabbashaAttachments/A/c1/a1"), attachment)));
await step("المحادثة النشطة تُحفظ للمستخدم A", () => assertSucceeds(set(ref(db("A"), "khabbashaActive/A"), { conversationId: "c1", updatedAt: Date.now() })));
await step("المستخدم A يقرأ محادثته ورسائلها", () => assertSucceeds(get(ref(db("A"), "khabbashaConversations/A/c1"))));
await step("المستخدم B لا يقرأ محادثة A", () => assertFails(get(ref(db("B"), "khabbashaConversations/A/c1"))));
await step("المستخدم B لا يكتب على محادثة A", () => assertFails(set(ref(db("B"), "khabbashaConversations/A/c1"), conversation)));
await step("المستخدم B لا يكتب رسالة في محادثة A", () => assertFails(set(ref(db("B"), "khabbashaMessages/A/c1/m2"), { ...message, id: "m2" })));
await step("المستخدم B لا يقرأ مرفق A", () => assertFails(get(ref(db("B"), "khabbashaAttachments/A/c1/a1"))));
await step("الزائر لا يقرأ محادثات خباشة", () => assertFails(get(ref(db(null), "khabbashaConversations/A/c1"))));
await step("المستخدم A لا يحفظ دور رسالة غير صالح", () => assertFails(set(ref(db("A"), "khabbashaMessages/A/c1/m2"), { ...message, id: "m2", role: "system" })));
await step("المستخدم A لا يحفظ مرفقًا أكبر من الحد", () => assertFails(set(ref(db("A"), "khabbashaAttachments/A/c1/a2"), { ...attachment, size: 9 * 1024 * 1024 })));

await env.cleanup();
for (const [symbol, name] of results) console.log(`${symbol} ${name}`);
const failures = results.filter(([symbol]) => symbol === "✘");
console.log(`\n${results.length - failures.length}/${results.length} خطوة ناجحة`);
process.exit(failures.length ? 1 : 0);
