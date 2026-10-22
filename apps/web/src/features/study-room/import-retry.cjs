'use strict';

/**
 * A restore can COMMIT successfully even when the browser never sees the HTTP
 * response. Keep only its opaque request identifier and a SHA-256 fingerprint
 * in same-tab sessionStorage, not the private backup contents.
 *
 * This is recovery metadata, NOT authentication or a database receipt.
 */
const PREFIX = 'thien-do.study-import-retry.v1.';
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_RE = /^[a-f0-9]{64}$/;
const MAX_PENDING = 20;

function keyFor(userId) {
  if (typeof userId !== 'string' || !ID_RE.test(userId)) throw new TypeError('Invalid owner ID');
  return PREFIX + userId.toLowerCase();
}
function parsePending(value) {
  try {
    const valueObject = JSON.parse(value || '[]');
    if (!Array.isArray(valueObject)) return [];
    return valueObject.filter(x => x && typeof x === 'object' &&
      HASH_RE.test(x.fingerprint) && ID_RE.test(x.importId)).slice(-MAX_PENDING);
  } catch { return []; }
}
function getPending(storage, userId, fingerprint) {
  if (!HASH_RE.test(fingerprint)) throw new TypeError('Invalid fingerprint');
  const matching = parsePending(storage.getItem(keyFor(userId))).find(x => x.fingerprint === fingerprint);
  return matching ? matching.importId.toLowerCase() : null;
}
function reservePending(storage, userId, fingerprint, createUUID) {
  if (!HASH_RE.test(fingerprint)) throw new TypeError('Invalid fingerprint');
  const key = keyFor(userId);
  const rows = parsePending(storage.getItem(key));
  const previous = rows.find(x => x.fingerprint === fingerprint);
  if (previous) return { importId: previous.importId.toLowerCase(), resumed: true };
  const importId = createUUID();
  if (!ID_RE.test(importId)) throw new TypeError('Invalid generated import ID');
  // When a tab has more than MAX_PENDING abandoned attempts, older attempts
  // may be evicted; this never changes server-side atomicity/idempotency.
  storage.setItem(key, JSON.stringify([...rows, { fingerprint, importId }].slice(-MAX_PENDING)));
  return { importId: importId.toLowerCase(), resumed: false };
}
function finishPending(storage, userId, importId) {
  if (!ID_RE.test(importId)) throw new TypeError('Invalid import ID');
  const key = keyFor(userId);
  const rows = parsePending(storage.getItem(key)).filter(x => x.importId.toLowerCase() !== importId.toLowerCase());
  if (rows.length) storage.setItem(key, JSON.stringify(rows));
  else storage.removeItem(key);
}
async function fingerprintEntries(entries, cryptoObject) {
  if (!cryptoObject?.subtle?.digest) throw new Error('Trình duyệt không hỗ trợ tạo dấu vân tay bản sao an toàn');
  const encoded = new TextEncoder().encode(JSON.stringify(entries));
  const digest = await cryptoObject.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
module.exports = { getPending, reservePending, finishPending, fingerprintEntries };
