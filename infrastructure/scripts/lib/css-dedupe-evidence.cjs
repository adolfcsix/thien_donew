'use strict';
const { createHash } = require('node:crypto');
const sha256 = value => createHash('sha256').update(value).digest('hex');

/** Rebuilds the exact V11.33 stylesheet to prove that only recorded bytes were removed.
 * Indices address the V11.34 text, so reinsert at descending offsets.
 */
function restoreCss(previousVersion, evidence) {
  let result = previousVersion;
  for (const item of evidence.removed.map((value, index) => ({ ...value, index }))
    .sort((a, b) => b.offsetAfter - a.offsetAfter || b.index - a.index)) {
    if (!Number.isSafeInteger(item.offsetAfter) || item.offsetAfter < 0 || item.offsetAfter > result.length) {
      throw Error('Invalid CSS insertion offset: ' + item.offsetAfter);
    }
    if (typeof item.removed !== 'string' || !item.removed) throw Error('Empty CSS removal evidence');
    result = result.slice(0, item.offsetAfter) + item.removed + result.slice(item.offsetAfter);
  }
  return result;
}
module.exports = { restoreCss, sha256 };
