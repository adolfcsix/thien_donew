#!/usr/bin/env node
'use strict';
/** Pre-V12 evidence inventory. Structural checks are NOT independent methodological validation. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const exists=(p)=>fs.existsSync(path.join(root,p));
const normalized=(x)=>String(x||'').normalize('NFC').trim().toLocaleLowerCase('vi');
const uniq=(xs)=>new Set(xs.map(normalized)).size===xs.length;
function inspectData({methods,stars,tarot,portal,starInventory,crosswalk,filesExist=exists}={}){
 const errors=[],blockers=[],warnings=[];
 const add=(target,code,message)=>target.push({code,message});
 if(!Array.isArray(methods.disciplines)||!uniq(methods.disciplines.map(x=>x.id)))add(errors,'METHOD_IDS','Danh mục bộ môn thiếu hoặc ID trùng');
 const methodsRows=methods.disciplines||[];
 for(const m of methodsRows){
  for(const [kind,p] of [['engine',m.implementation],['page',m.webRouteSource],['test',m.candidateTest]]){
   if(typeof p!=='string'||!filesExist(p))add(errors,'MISSING_METHOD_PATH',`${m.id}/${kind}: ${p}`);
   if(m.pathsPresent?.[kind]!==Boolean(p&&filesExist(p)))add(errors,'STALE_PATH_SNAPSHOT',`${m.id}/${kind}`);
  }
  if(m.acceptance!=='ACCEPTED'||m.verifiedByIndependentWitness!==true)add(blockers,'UNVERIFIED_METHOD',`${m.id}: ${m.witnessGate}`);
 }
 const records=stars.records||[];
 if(!uniq(records.map(r=>r.id)))add(errors,'STAR_IDS','ID sao trùng');
 const actualCounts={};for(const r of records)actualCounts[r.layer]=(actualCounts[r.layer]||0)+1;
 for(const [layer,count] of Object.entries(stars.counts||{}))if(actualCounts[layer]!==count)add(errors,'STAR_COUNT_MISMATCH',`${layer}: ${actualCounts[layer]||0} != ${count}`);
 const engineTotals=starInventory.totals;
 if((stars.counts.natal||0)+(stars.counts.cycle||0)!==engineTotals.implementedNatalAndCycleNames)add(errors,'ENGINE_STAR_DRIFT','Danh mục sao và engine không khớp');
 if(stars.counts.natal!==engineTotals.implementedNatalAndCycleNames)add(warnings,'STAR_COUNT_SEMANTICS',`${engineTotals.implementedNatalAndCycleNames} tên bao gồm ${stars.counts.cycle} tên thuộc vòng sao; chỉ ${stars.counts.natal} tên lớp natal`);
 if(records.some(r=>r.expertReviewed!==true))add(blockers,'STAR_EXPERT_REVIEW','Chưa có xác nhận chuyên gia độc lập cho toàn bộ danh mục sao');
 if(engineTotals.specialized12PalaceReadingsVerified===0)add(blockers,'PALACE_READINGS','Chưa có hồ sơ luận giải chuyên biệt 12 cung được kiểm chứng độc lập');
 if(starInventory.gaps.unimplementedPeriodLayers?.length)add(blockers,'PERIOD_LAYERS',`Chưa có đầy đủ: ${starInventory.gaps.unimplementedPeriodLayers.join(', ')}`);
 if(crosswalk){
  const reference=crosswalk.records||[];
  const counts=reference.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
  for(const [key,field] of [['engine-name','engine-name'],['possible-alias','possible-alias'],['not-in-engine','not-in-engine']])if((counts[key]||0)!==crosswalk.counts[field])add(errors,'REFERENCE_CROSSWALK_DRIFT',`${key}: ${(counts[key]||0)} != ${crosswalk.counts[field]}`);
  if(reference.length!==crosswalk.counts.referenceNames||!uniq(reference.map(x=>x.name)))add(errors,'REFERENCE_CROSSWALK_IDS','Danh mục tham chiếu thiếu hoặc tên trùng');
  if(counts['not-in-engine'])add(blockers,'REFERENCE_UNRESOLVED',`${counts['not-in-engine']} tên tham chiếu chưa an, ${counts['possible-alias']||0} dị danh chưa chốt; không tự đồng nhất với sao thiếu của mọi trường phái`);
 }
 const cards=tarot.cards||[];
 if(cards.length!==78||!uniq(cards.map(x=>x.id)))add(errors,'TAROT_DECK','Tarot không đủ 78 lá hoặc trùng ID');
 const majors=cards.filter(x=>x.id.startsWith('major-')).length;
 if(majors!==22||cards.length-majors!==56)add(errors,'TAROT_MAJOR_MINOR',`${majors} major, ${cards.length-majors} minor`);
 if(tarot.status!=='editorial-reviewed')add(blockers,'TAROT_EDITORIAL','Bộ bài Tarot chưa có trạng thái thẩm định nội dung');
 const guides=portal.filter(x=>x.kind==='guide');const policies=portal.filter(x=>x.kind==='policy');
 if(guides.length!==15||policies.length!==8||!uniq(portal.map(x=>x.kind+'/'+x.slug)))add(errors,'PORTAL_STRUCTURE','Cần 15 hướng dẫn, 8 chính sách, slug duy nhất');
 for(const g of guides){
  if(!g.tool?.startsWith('/')||!filesExist('apps/web/src/app'+g.tool+'/page.tsx'))add(errors,'GUIDE_ROUTE',`${g.slug}: ${g.tool}`);
  if(!Array.isArray(g.sections)||g.sections.length<11)add(errors,'GUIDE_SECTIONS',g.slug);
 }
 const screenshotRefs=guides.reduce((n,g)=>n+(String(g.body||'').match(/!\[[^\]]*\]\([^)]*\)/g)||[]).length,0);
 if(screenshotRefs===0)add(blockers,'GUIDE_SCREENSHOTS','15 bài hướng dẫn chưa có ảnh minh họa trực tiếp trong nội dung seed');
 if(policies.some(p=>p.reviewStatus==='legal_draft'))add(blockers,'LEGAL_DRAFT','Chính sách vẫn là dự thảo, chưa có phê duyệt pháp lý');
 return {schemaVersion:1,release:'V11.164.1 pre-V12 data hardening',verdict:errors.length?'DATA_INCONSISTENT':blockers.length?'STRUCTURE_PASS_RELEASE_BLOCKED':'READY_FOR_EXTERNAL_REVIEW',counts:{disciplines:methodsRows.length,methodsIndependentlyAccepted:methodsRows.filter(m=>m.acceptance==='ACCEPTED'&&m.verifiedByIndependentWitness===true).length,starNamesNatal:stars.counts.natal,starNamesCycles:stars.counts.cycle,starNamesCombined:engineTotals.implementedNatalAndCycleNames,annualStars:stars.counts.annual,tarotCards:cards.length,guideCategories:guides.length,guideSections:guides.reduce((n,g)=>n+g.sections.length,0),guideScreenshotRefs:screenshotRefs,referenceNames:crosswalk?.counts.referenceNames??null,referenceNotInEngine:crosswalk?.counts['not-in-engine']??null,referencePossibleAliases:crosswalk?.counts['possible-alias']??null,policyDocuments:policies.length,policyDrafts:policies.filter(p=>p.reviewStatus==='legal_draft').length},errors,blockers,warnings};
}
function run(){
 const {buildInventory}=require('../../packages/star-audit/src/index.cjs');
 const result=inspectData({methods:read('packages/knowledge/src/method-coverage.json'),stars:read('packages/knowledge/src/star-identity-registry.json'),tarot:read('packages/knowledge/src/tarot-depth-78.json'),portal:read('apps/web/src/lib/portal-v11163-content.json'),crosswalk:read('packages/knowledge/src/reference-star-crosswalk.json'),starInventory:buildInventory()});
 console.log(JSON.stringify(result,null,2));
 if(result.errors.length||(process.argv.includes('--release-gate')&&result.blockers.length))process.exitCode=1;
 return result;
}
if(require.main===module)run();
module.exports={inspectData};
