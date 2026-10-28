// قاعدة بيانات وهمية في الذاكرة — تحاكي onValue/update/onDisconnect/runTransaction
export const store = { data: {}, listeners: [], disconnects: [], connected: true };
const split = (p) => p.split("/").filter(Boolean);
function getAt(p) { let n = store.data; for (const k of split(p)) { if (n == null || typeof n !== "object") return null; n = n[k]; } return n ?? null; }
function setAt(p, v) {
  const ks = split(p); let n = store.data;
  for (let i = 0; i < ks.length - 1; i++) { n[ks[i]] ??= {}; n = n[ks[i]]; }
  if (v === null) delete n[ks.at(-1)]; else n[ks.at(-1)] = v;
}
const clone = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
function notify(changed) {
  for (const l of store.listeners) {
    if (l.path === ".info/connected") continue;
    if (changed.startsWith(l.path) || l.path.startsWith(changed)) { const v = clone(getAt(l.path)); queueMicrotask(() => l.cb({ val: () => v })); }
  }
}
export function ref(_db, path) { return { path }; }
export function onValue(r, cb) {
  const l = { path: r.path, cb }; store.listeners.push(l);
  const v = r.path === ".info/connected" ? store.connected : clone(getAt(r.path));
  queueMicrotask(() => cb({ val: () => v }));
  return () => { store.listeners = store.listeners.filter((x) => x !== l); };
}
export async function set(r, v) { setAt(r.path, clone(v)); notify(r.path); }
export async function update(r, obj) { const cur = clone(getAt(r.path)) ?? {}; setAt(r.path, { ...cur, ...obj }); notify(r.path); }
export async function remove(r) { setAt(r.path, null); notify(r.path); }
export function onDisconnect(r) { return { remove: async () => { store.disconnects.push(r.path); }, cancel: async () => {} }; }
export async function runTransaction(r, fn) { const out = fn(clone(getAt(r.path))); if (out !== undefined) { setAt(r.path, out); notify(r.path); } }
// محاكاة تذبذب الشبكة: الخادم ينفّذ onDisconnect ثمّ يعود الاتصال
export function simulateBlip() {
  for (const p of store.disconnects) setAt(p, null);
  const paths = [...store.disconnects]; store.disconnects = [];
  paths.forEach(notify);
  for (const l of store.listeners) if (l.path === ".info/connected") { l.cb({ val: () => false }); setTimeout(() => l.cb({ val: () => true }), 20); }
}
