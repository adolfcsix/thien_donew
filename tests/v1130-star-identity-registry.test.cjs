'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const builder=require('../infrastructure/scripts/build-star-registry.cjs');
const knowledge=require('../packages/knowledge/src/index.cjs');
const R=knowledge.starIdentityRegistry;
const root=path.resolve(__dirname,'..');

test('V11.30: generated snapshot matches engine, editorial data and rule inputs',()=>{
 const actual=fs.readFileSync(path.join(root,builder.registryPath),'utf8');
 assert.equal(actual,JSON.stringify(builder.buildStarRegistry(),null,2)+'\n');
});
test('V11.30: no duplicated IDs; classes are distinct and review flags are conservative',()=>{
 const all=R.listStarIdentities();
 assert.equal(all.length,127);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.equal(R.counts.natal,68);assert.equal(R.counts.cycle,36);
 assert.equal(R.counts.annual,12);assert.equal(R.counts.obstruction,2);
 assert.equal(R.counts['natal-transformation'],4);
 assert.equal(R.counts['annual-transformation'],4);
 assert.equal(R.counts['annual-locator'],1);
 assert.ok(all.every(x=>x.expertReviewed===false && x.reviewStatus==='not-independently-reviewed'));
});
test('V11.30: do not remove Vietnamese diacritics or collapse similar cycle names',()=>{
 const a=R.resolveStarIdentity('Quan Phù');
 const b=R.resolveStarIdentity('Quan Phủ');
 assert.ok(a && b);assert.notEqual(a.id,b.id);
 assert.equal(a.group,'thai_tue');assert.equal(b.group,'bac_si');
 assert.equal(R.resolveStarIdentity('Quan Phu'),null);
});
test('V11.30: Lưu Hà is natal, whereas annual overlays are a separate layer',()=>{
 assert.equal(R.resolveStarIdentity('Lưu Hà').layer,'natal');
 assert.equal(R.resolveStarIdentity('Lưu Lộc Tồn').layer,'annual');
 const origin=R.resolveStarIdentity('Lưu Lộc Tồn').originId;
 assert.equal(R.getStarIdentityById(origin).name,'Lộc Tồn');
 assert.equal(R.resolveStarIdentity('Lưu Thiên Không'),null);
});
test('V11.30: transforms are typed scopes and ambiguity fails closed',()=>{
 assert.equal(R.findStarIdentities('Hóa Khoa').length,2);
 assert.equal(R.resolveStarIdentity('Hóa Khoa'),null);
 assert.equal(R.resolveStarIdentity('Hóa Khoa',{layer:'natal-transformation'}).layer,'natal-transformation');
 assert.equal(R.resolveStarIdentity('Hóa Khoa',{layer:'annual-transformation'}).layer,'annual-transformation');
 assert.equal(R.resolveStarIdentity('Tuần').type,'paired-marker');
 assert.equal(R.resolveStarIdentity('Lưu Thái Tuế').type,'branch-locator');
});
test('V11.30: rule dependencies resolve to canonical source-backed IDs',()=>{
 const raw=builder.buildStarRegistry();assert.deepEqual(raw.unresolvedRuleReferences,[]);
 assert.equal(raw.ruleLinks.length,32);
 assert.ok(raw.ruleLinks.every(r=>r.starIds.length>0 && r.starIds.every(id=>R.getStarIdentityById(id))));
 const a=R.resolveStarIdentity('Tả Phụ');
 assert.ok(R.getRulesReferencingStar(a.id).some(r=>r.id==='phu-bat-dong-cung'));
 assert.ok(R.getRulesReferencingStar(a.id).some(r=>r.kind==='classical'));
});
test('V11.30: safe lookup, NFC normalization, no prototype pollution',()=>{
 assert.equal(R.resolveStarIdentity('  Tử   Vi  ').name,'Tử Vi');
 assert.equal(R.resolveStarIdentity('Tu\u0309 Vi'),null);
 assert.equal(R.resolveStarIdentity('__proto__'),null);
 assert.equal(R.resolveStarIdentity(null),null);
 assert.equal(R.getStarIdentityById('constructor'),null);
 assert.deepEqual(R.getRulesReferencingStar('__proto__'),[]);
});
test('V11.30: consumers cannot mutate registry identities or rule links',()=>{
 const record=R.resolveStarIdentity('Tử Vi');assert.ok(Object.isFrozen(record));
 assert.ok(Object.isFrozen(record.editorialSources));
 assert.throws(()=>record.editorialSources.push('fake'));
 assert.throws(()=>{record.expertReviewed=true});
 const rule=R.getRulesReferencingStar(record.id)[0];assert.ok(Object.isFrozen(rule));
 assert.ok(Object.isFrozen(rule.starIds));
});
test('V11.30: engine remains untouched by registry lookups',()=>{
 const E=require('../packages/astrology-engine/src/tuvi.js');
 const input={date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'};
 const before=JSON.stringify(E.calculate(input));
 R.listStarIdentities();R.getRulesReferencingStar(R.resolveStarIdentity('Tham Lang').id);
 assert.equal(JSON.stringify(E.calculate(input)),before);
});
