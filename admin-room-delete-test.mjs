import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { ref, set, remove } from "firebase/database";
import fs from "node:fs";

const env = await initializeTestEnvironment({
  projectId: "baczone-admin-room-delete-test",
  database: { host: "127.0.0.1", port: 9000, rules: fs.readFileSync("firebase-rtdb-rules.json", "utf8") },
});

const db = (uid) => env.authenticatedContext(uid).database();
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(["✔", name]); }
  catch (error) { results.push(["✘", `${name} → ${String(error).slice(0, 180)}`]); }
};

await env.withSecurityRulesDisabled(async (context) => {
  const seedDb = context.database();
  await set(ref(seedDb, "users/owner"), { role: "user" });
  await set(ref(seedDb, "users/admin"), { role: "admin" });
  await set(ref(seedDb, "rooms/r1"), { id: "r1", name: "Room 1", ownerId: "owner" });
  await set(ref(seedDb, "roomLive/r1"), { roomState: { open: true } });
  await set(ref(seedDb, "notesDraft/r1"), "draft");
  await set(ref(seedDb, "presence/r1/owner"), { lastActive: Date.now() });
});

await step("المستخدم العادي لا يحذف غرفة ليست له", () => assertFails(remove(ref(db("owner"), "rooms/r1"))));
await step("المستخدم العادي لا يحذف roomLive", () => assertFails(remove(ref(db("owner"), "roomLive/r1"))));
await step("Admin يحذف rooms", () => assertSucceeds(remove(ref(db("admin"), "rooms/r1"))));
await step("Admin يحذف roomLive", () => assertSucceeds(remove(ref(db("admin"), "roomLive/r1"))));
await step("Admin ينظف notesDraft", () => assertSucceeds(remove(ref(db("admin"), "notesDraft/r1"))));
await step("Admin ينظف حضور الغرفة", () => assertSucceeds(remove(ref(db("admin"), "presence/r1"))));

await env.cleanup();
for (const [symbol, name] of results) console.log(`${symbol} ${name}`);
const failures = results.filter(([symbol]) => symbol === "✘");
console.log(`\n${results.length - failures.length}/${results.length} خطوة ناجحة`);
process.exit(failures.length ? 1 : 0);
