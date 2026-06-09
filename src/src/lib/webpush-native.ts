// تطبيق بروتوكول Web Push بالكامل بدون أي حزمة خارجية
// يستخدم Node.js 18 crypto API المدمجة (متوفّرة على Vercel)
import { createECDH, createCipheriv, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { hkdf as nodeHkdf } from "node:crypto";

const hkdf = promisify(nodeHkdf);

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// توليد VAPID JWT لتوقيع الطلب
async function vapidJWT(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  email: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ aud: audience, exp: now + 43200, sub: email })).toString("base64url");
  const unsigned = `${h}.${p}`;

  const pubBytes = Buffer.from(vapidPublicKey, "base64url");
  const x = pubBytes.slice(1, 33).toString("base64url");
  const y = pubBytes.slice(33, 65).toString("base64url");

  const key = await globalThis.crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: vapidPrivateKey, x, y, ext: true, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = Buffer.from(
    await globalThis.crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(unsigned))
  ).toString("base64url");
  return `${unsigned}.${sig}`;
}

// تشفير الحمولة (RFC 8291 / RFC 8188 — aes128gcm)
async function encryptPush(
  sub: PushSubscription,
  plaintext: string
): Promise<{ body: Buffer; localPublicKey: Buffer; salt: Buffer }> {
  const salt = randomBytes(16);
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const localPublicKey = ecdh.getPublicKey(); // 65 bytes

  const recipientPub = Buffer.from(sub.keys.p256dh, "base64url");
  const authSecret = Buffer.from(sub.keys.auth, "base64url");
  const ecdhSecret = ecdh.computeSecret(recipientPub);

  // IKM باستخدام سرّي المصادقة و ECDH
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    recipientPub,
    localPublicKey,
  ]);
  const ikm = Buffer.from(await hkdf("sha256", ecdhSecret, authSecret, keyInfo, 32));

  // مفتاح التشفير والـ nonce
  const cek = Buffer.from(await hkdf("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(await hkdf("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  // تشفير AES-128-GCM
  const data = Buffer.concat([Buffer.from(plaintext), Buffer.from([0x02])]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);

  // هيكل السجلّ: salt(16) || rs(4) || idlen(1) || localPub(65) || ciphertext
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const body = Buffer.concat([salt, rs, Buffer.from([65]), localPublicKey, encrypted]);

  return { body, localPublicKey, salt };
}

// الدالة الرئيسية: ترسل Push Notification
export async function sendWebPush(
  subscription: PushSubscription,
  payload: { title: string; body: string; link: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string
): Promise<void> {
  const audience = new URL(subscription.endpoint).origin;
  const jwt = await vapidJWT(audience, vapidPublicKey, vapidPrivateKey, vapidEmail);
  const { body } = await encryptPush(subscription, JSON.stringify(payload));

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "Content-Length": String(body.byteLength),
      TTL: "86400",
    },
    body,
  });

  if (res.status === 410 || res.status === 404) {
    throw Object.assign(new Error("gone"), { statusCode: 410 });
  }
  if (!res.ok && res.status !== 201) {
    throw new Error(`Push HTTP ${res.status}`);
  }
}
