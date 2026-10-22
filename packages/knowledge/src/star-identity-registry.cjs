'use strict';
/**
 * Read-only consumer of the V11.30 generated registry.
 * This is not a star placement engine and never guesses aliases by dropping diacritics.
 */
const source = require('./star-identity-registry.json');
const normalize = value => typeof value==='string'
  ? value.normalize('NFC').replace(/\s+/gu,' ').trim().toLocaleLowerCase('vi-VN') : null;
const records = Object.freeze(source.records.map(row => Object.freeze({
  ...row,editorialSources:Object.freeze([...row.editorialSources])
})));
const rules = Object.freeze(source.ruleLinks.map(row => Object.freeze({
  ...row,starIds:Object.freeze([...row.starIds])
})));
const byId = new Map(records.map(record=>[record.id,record]));
const byName = new Map();
for(const record of records) {
  const key = normalize(record.name);
  const matches = byName.get(key) || [];
  matches.push(record);
  byName.set(key,matches);
}
for(const [key,items] of byName) byName.set(key,Object.freeze(items));
const byRuleStar = new Map();
for(const rule of rules) for(const id of rule.starIds) {
  const matches=byRuleStar.get(id) || [];
  matches.push(rule);
  byRuleStar.set(id,matches);
}
for(const [key,items] of byRuleStar) byRuleStar.set(key,Object.freeze(items));
function getStarIdentityById(id) {return typeof id==='string' ? (byId.get(id) || null) : null;}
function findStarIdentities(name,options={}) {
  const key=normalize(name);
  if(!key) return [];
  const layer = options && typeof options==='object' && !Array.isArray(options) ? options.layer : undefined;
  return (byName.get(key)||[]).filter(record=>!layer || record.layer===layer);
}
/** Fail closed rather than implicitly choosing natal vs annual transform. */
function resolveStarIdentity(name,options={}) {
  const matches=findStarIdentities(name,options);
  return matches.length===1 ? matches[0] : null;
}
function listStarIdentities(filter={}) {
  if(!filter || typeof filter!=='object' || Array.isArray(filter)) return [...records];
  return records.filter(row=>(!filter.layer || row.layer===filter.layer) &&
    (!filter.group || row.group===filter.group) && (!filter.type || row.type===filter.type));
}
function getRulesReferencingStar(id) {return typeof id==='string' ? [...(byRuleStar.get(id)||[])] : [];}
module.exports=Object.freeze({
  schemaVersion:source.schemaVersion,
  counts:Object.freeze({...source.counts}),
  normalizeStarName:normalize,
  getStarIdentityById,findStarIdentities,resolveStarIdentity,listStarIdentities,getRulesReferencingStar,
});
