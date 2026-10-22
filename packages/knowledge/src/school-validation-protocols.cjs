'use strict';
/** Research protocols only. This module must NEVER calculate/enable placements. */
const registry=require('./school-validation-protocols.json');
const reviews=require('./school-review-registry.json');
const CATEGORY_BY_REFERENCE=Object.freeze({
 'method-profile':'an-sao',
 'four-court-family':'luan-giai',
 'natal-pair':'cap-sao',
 'worked-case':'bai-tap',
});
const AXIS_BY_RULE_ID=Object.freeze({
 'rule-luu-nien-van-tinh-natal-stem':'can-nam-sinh',
 'rule-hong-diem-bazi-day-stem':'can-ngay-bat-tu',
 'rule-quan-sach-sui-qian-branch':'chi-nam-tham-chieu',
 'family-tu-phu-vu-tuong':'tu-chinh-menh','family-co-nguyet-dong-luong':'tu-chinh-menh',
 'family-sat-pha-tham':'tu-chinh-menh','family-cu-nhat':'tu-chinh-menh',
 'pair-ta-huu':'quan-he-cung','pair-xuong-khuc':'quan-he-cung','pair-khoi-viet':'quan-he-cung',
 'exercise-menh-hoa':'tu-hoa-bon-menh','exercise-phu-mau-doi':'doi-cung-phu-mau',
});
const VALID_AXES=Object.freeze({
 'an-sao':new Set(['can-nam-sinh','can-ngay-bat-tu','chi-nam-tham-chieu']),
 'luan-giai':new Set(['tu-chinh-menh']),
 'cap-sao':new Set(['quan-he-cung']),
 'bai-tap':new Set(['tu-hoa-bon-menh','doi-cung-phu-mau']),
});
function auditValidationProtocols(data=registry,schoolData=reviews){
 const errors=[];
 const ids=new Set(), rules=new Map((schoolData.records||[]).map(x=>[x.id,x]));
 if(data?.researchOnly!==true||data?.engineIntegrationsAllowed!==false)errors.push('Protocol collection must be editorial only');
 if(!Array.isArray(data?.protocols)){return {status:'FAIL',count:0,linked:0,approvedForEngine:0,errors:['Missing protocols array',...errors]};}
 for(const [index,protocol] of data.protocols.entries()){
  const tag=`protocol[${index}]`;
  if(!protocol||typeof protocol!=='object'){errors.push(`${tag}: invalid record`);continue;}
  if(ids.has(protocol.ruleId))errors.push(`${tag}: duplicate ruleId ${protocol.ruleId}`);
  ids.add(protocol.ruleId);
  const rule=rules.get(protocol.ruleId);
  if(!rule)errors.push(`${tag}: stale ruleId ${protocol.ruleId}`);
  if(protocol.category!==CATEGORY_BY_REFERENCE[rule?.reference?.kind])errors.push(`${tag}: category/reference mismatch`);
  if(!VALID_AXES[protocol.category]?.has(protocol.scopeAxis)||AXIS_BY_RULE_ID[protocol.ruleId]!==protocol.scopeAxis)errors.push(`${tag}: wrong methodological input axis`);
  if(protocol.reviewStatus!=='unverified'||protocol.engineEnabled!==false)errors.push(`${tag}: unreviewed protocol cannot be enabled`);
  if(protocol.expectedIndependentSources!==2||protocol.expectedIndependentFixtures!==2)errors.push(`${tag}: independent evidence targets reduced`);
  if(!Array.isArray(protocol.inputDimensions)||protocol.inputDimensions.length<3||new Set(protocol.inputDimensions).size!==protocol.inputDimensions.length||protocol.inputDimensions.some(s=>typeof s!=='string'||s.trim().length<3))errors.push(`${tag}: invalid input dimensions`);
  for(const key of ['positiveControl','negativeControl']){
   const c=protocol[key];
   if(!c||typeof c.goal!=='string'||c.goal.length<35||typeof c.procedure!=='string'||c.procedure.length<50) errors.push(`${tag}: incomplete ${key}`);
  }
  for(const key of ['prohibitedShortcut','sourceComparisonPrompt','interpretationLimit']){
   if(typeof protocol[key]!=='string'||protocol[key].length<35) errors.push(`${tag}: missing ${key}`);
  }
  if(protocol.positiveControl?.procedure===protocol.negativeControl?.procedure)errors.push(`${tag}: negative control copied from positive`);
  if(JSON.stringify(protocol).includes('houses[')||JSON.stringify(protocol).includes('sourcePath'))errors.push(`${tag}: internal path leaked`);
 }
 for(const id of rules.keys())if(!ids.has(id))errors.push(`Missing protocol for ${id}`);
 // No blanket claims, no already-approved record; a review protocol is not proof of approval.
 if(schoolData.researchOnly!==true||schoolData.engineIntegrationsAllowed!==false)errors.push('Underlying school registry changed to auto-approval');
 return {version:data.edition,status:errors.length?'FAIL':'PASS',count:data.protocols.length,linked:ids.size,approvedForEngine:0,errors,
  scope:'Editorial test plans for expert review only. No external source or astrology engine validated.'};
}
function getValidationProtocol(ruleId,data=registry){
 return data.protocols.find(p=>p.ruleId===ruleId)||null;
}
module.exports={registry,auditValidationProtocols,getValidationProtocol};
