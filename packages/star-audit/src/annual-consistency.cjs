'use strict';
/** Internal structural checks, not a validation of astrological rules. */
const Engine=require('../../astrology-engine/src/tuvi.js');
const Baselines=require('../fixtures/chart-baselines.json');
const {NORMALIZE}=require('./index.cjs');
function inspectAnnualItems(chart, annual, year){
 const issues=[];
 const houses=chart.houses;
 const items=annual?.luuStars?.items;
 if(!Array.isArray(items)||!items.length)return {issues:[`Year ${year}: empty annual overlay`],names:[]};
 const seen=new Set();
 for(const item of items){
  const name=typeof item.name==='string'?item.name.trim():'';
  if(!name)issues.push(`Year ${year}: blank annual star name`);
  const key=NORMALIZE(name);
  if(seen.has(key))issues.push(`Year ${year}: duplicated annual star ${name}`);
  seen.add(key);
  if(!Number.isInteger(item.branch)||item.branch<0||item.branch>11)issues.push(`Year ${year}: invalid branch for ${name}`);
  else if(!houses.some(h=>h.branchIndex===item.branch&&h.palace===item.palace))issues.push(`Year ${year}: palace mismatch for ${name}`);
  if(typeof item.ruleSet!=='string'||!item.ruleSet.trim())issues.push(`Year ${year}: missing ruleSet for ${name}`);
 }
 return {issues,names:[...seen].sort()};
}
function auditAnnualConsistency({cases=Baselines.cases,years=[2024,2025,2026,2027]}={}){
 const issues=[];const counts=[];const signatures=new Map();
 for(const entry of cases){
  const chart=Engine.calculate(entry.input);
  for(const year of years){
   if(year<chart.lunar.year||year>2100)continue;
   const items=Engine.annualOverview(chart,year);
   const checked=inspectAnnualItems(chart,items,year);
   issues.push(...checked.issues.map(s=>`${entry.id}: ${s}`));
   const signature=checked.names.join('|');
   if(signatures.has(year)&&signatures.get(year)!==signature)issues.push(`${entry.id}: annual star name set differs in ${year}`);
   else signatures.set(year,signature);
   counts.push({caseId:entry.id,year,annualNames:checked.names.length});
  }
 }
 return {schemaVersion:1,status:issues.length?'FAIL':'PASS',scope:'internal-structural-consistency-only',cases:cases.length,years,checks:counts.length,counts,issues,limitations:['Cross-case consistency does not establish traditional correctness','Baseline cases and calculations share the same engine','No independent expert or astronomical validation']};
}
module.exports={inspectAnnualItems,auditAnnualConsistency};
