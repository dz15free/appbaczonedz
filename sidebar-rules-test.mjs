import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";
import fs from "node:fs";

const env = await initializeTestEnvironment({
  projectId: "baczone-sidebar-test",
  database: { host: "127.0.0.1", port: 9000, rules: fs.readFileSync("firebase-rtdb-rules.json", "utf8") },
});

const db = (uid) => (uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database());
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(["✔", name]); }
  catch (error) { results.push(["✘", `${name} → ${String(error).slice(0, 180)}`]); }
};

await env.withSecurityRulesDisabled(async (ctx) => {
  await set(ref(ctx.database(), "users"), {
    A: { name: "Admin", role: "admin" },
    T: { name: "Teacher", role: "teacher" },
    S: { name: "Student", role: "student" },
  });
});

const widget = {
  enabled: true,
  widgets: [{ id: "w1", title: "Trusted", html: "<strong>HTML</strong>", css: ".x{}", js: "console.log('trusted')", order: 0, placement: "blog" }],
};

await step("Admin يكتب Sidebar", () => assertSucceeds(set(ref(db("A"), "settings/sidebar"), widget)));
await step("Guest يقرأ Sidebar", () => assertSucceeds(get(ref(db(null), "settings/sidebar"))));
await step("User لا يكتب Sidebar", () => assertFails(set(ref(db("S"), "settings/sidebar"), widget)));
await step("Teacher لا يكتب Sidebar", () => assertFails(set(ref(db("T"), "settings/sidebar"), widget)));

await env.cleanup();
for (const [symbol, name] of results) console.log(`${symbol} ${name}`);
const failures = results.filter(([symbol]) => symbol === "✘");
console.log(`\n${results.length - failures.length}/${results.length} خطوة ناجحة`);
process.exit(failures.length ? 1 : 0);
