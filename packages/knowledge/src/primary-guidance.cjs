'use strict';
/**
 * Canonical source: primary-star-palace-guidance.json (v2 normalized editorial grid).
 * Hydrate once into the V11.31 read contract for all existing consumers.
 * Keep this module deterministic: no star placements, interpretive guesses or I/O.
 * Each returned record owns its array to avoid one consumer mutating other palaces.
 */
const source = require('./primary-star-palace-guidance.json');
function buildGuidance(data = source) {
  if (!data || data.schemaVersion !== '2.0' || !data.defaults || !data.starShared || !data.records) {
    throw new TypeError('Unsupported primary guidance schema');
  }
  const records = Object.create(null);
  for (const [star, palaces] of Object.entries(data.records)) {
    if (!Object.hasOwn(data.starShared,star)) throw new TypeError(`Missing common entry for ${star}`);
    const common = data.starShared[star];
    if (!common || typeof common.tradeoff !== 'string' || typeof common.reflectionTemplate !== 'string' ||
        !common.reflectionTemplate.includes('{palace}')) throw new TypeError(`Malformed common entry for ${star}`);
    const byPalace = Object.create(null);
    for (const [palace, entry] of Object.entries(palaces)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new TypeError(`Malformed editorial record for ${star}/${palace}`);
      byPalace[palace] = {
        focus: entry.focus,
        interpretation: entry.interpretation,
        reflection: common.reflectionTemplate.replaceAll('{palace}', palace),
        status: data.defaults.status,
        potential: entry.potential,
        tradeoff: common.tradeoff,
        requiredContext: [...data.defaults.requiredContext],
        evidence: data.defaults.evidence,
      };
    }
    records[star] = byPalace;
  }
  return {edition:data.edition,status:data.status,scope:data.scope,records};
}
const primaryStarPalaceGuidance=buildGuidance();
module.exports={primaryStarPalaceGuidance,buildGuidance};
