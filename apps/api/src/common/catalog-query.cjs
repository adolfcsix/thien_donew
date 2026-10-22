'use strict';
/** Strictly normalize untrusted Express query values (string|string[]|object). */
function stringValue(query, key, maximum) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw Error('INVALID_QUERY');
  const value = query[key];
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > maximum * 2 || /[\u0000-\u001f\u007f]/u.test(value)) throw Error('INVALID_QUERY');
  const normalized = value.trim();
  if (normalized.length > maximum) throw Error('INVALID_QUERY');
  return normalized;
}
/** Reject arrays, floats, negative values and values too large for pagination. */
function offsetValue(query, limit) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) throw Error('INVALID_QUERY');
  const value = query.offset;
  if (value === undefined) return 0;
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value) || value.length > 7) throw Error('INVALID_QUERY');
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count > limit) throw Error('INVALID_QUERY');
  return count;
}
/** Escape PostgreSQL LIKE metacharacters using the explicit '!' escape. */
function literalLike(value) { return value.replace(/[!%_]/g, symbol => `!${symbol}`); }
module.exports = {stringValue, offsetValue, literalLike};
