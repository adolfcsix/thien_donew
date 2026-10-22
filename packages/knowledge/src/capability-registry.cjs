'use strict';
/** Read-only, source-backed capability registry. This is not a router or marketing claims. */
const source = require('./capability-registry.json');
const modules = Object.freeze(source.modules.map(m => Object.freeze({
  ...m,
  evidencePaths: Object.freeze([...m.evidencePaths]),
})));
const byId = new Map(modules.map(m => [m.id, m]));
function getCapability(id) {
  return typeof id === 'string' ? (byId.get(id) || null) : null;
}
function listCapabilities(filter = {}) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return [...modules];
  return modules.filter(m =>
    (!filter.status || m.status === filter.status) &&
    (!filter.area || m.area === filter.area) &&
    (filter.referenceMenuObserved === undefined || m.referenceMenuObserved === filter.referenceMenuObserved));
}
/** Never expose planned or internal-only capabilities as navigable routes. */
function publicCapabilityLinks() {
  return modules.filter(m => m.status === 'source-implemented' && m.route)
    .map(m => Object.freeze({ id: m.id, title: m.name, href: m.route }));
}
module.exports = Object.freeze({
  schemaVersion: source.schemaVersion,
  getCapability,
  listCapabilities,
  publicCapabilityLinks,
});
