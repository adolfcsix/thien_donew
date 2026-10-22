#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const knowledge = require('../../packages/knowledge/src/index.cjs');
function auditResearch(dossiers=knowledge.expandedStarResearch, crosswalk=knowledge.referenceStarCrosswalk, identities=knowledge.starIdentityRegistry.listStarIdentities()) {
  const errors=[];
  const add=(condition,message)=>{if(!condition) errors.push(message);};
  const records = Array.isArray(dossiers.records) ? dossiers.records : [];
  const aliases = Array.isArray(dossiers.aliases) ? dossiers.aliases : [];
  const cross = Array.isArray(crosswalk.records) ? crosswalk.records : [];
  const names=new Set(records.map(r=>r.name));
  const ids=new Set(records.map(r=>r.id));
  const identityNames=new Set(identities.filter(r=>['natal','cycle'].includes(r.layer)).map(r=>r.name));
  const crossNames=new Set(cross.map(r=>r.name));
  add(dossiers.researchOnly===true,'Research dataset must be research only');
  add(dossiers.circle?.algorithmImplemented===false,'Cycle algorithm is not implemented');
  add(records.length===names.size && records.length===ids.size,'Duplicate dossier id or name');
  const order=dossiers.circle?.orderedNames ?? [];
  const expected=['Tướng Tinh','Phan An','Tuế Dịch','Tức Thần','Hoa Cái','Kiếp Sát','Tai Sát','Thiên Sát','Chỉ Bối','Hàm Trì','Nguyệt Sát','Vong Thần'];
  add(JSON.stringify(order)===JSON.stringify(expected),'Tướng Tiền cycle order mismatch');
  add(order.every(n=>names.has(n)),'Cycle member has no dossier');
  add(dossiers.circle?.sourceNamesNotIn121Crosswalk?.every(n=>!crossNames.has(n) && order.includes(n)),'Unlisted cycle member leaked into the 121-item reference');
  for(const r of records){
    add(r.placementEnabled===false && r.expertReviewed===false,`${r.name}: unsafe placement/review claim`);
    add(['research-only-no-placement','engine-name-other-group-needs-rule-equivalence-review'].includes(r.state),`${r.name}: invalid status`);
    add(typeof r.placementInputsToVerify==='string' && r.placementInputsToVerify.length>=45,`${r.name}: missing placement evidence question`);
    add(typeof r.readingContext==='string' && r.readingContext.length>=85,`${r.name}: insufficient reading context`);
    add(typeof r.verificationExercise==='string' && r.verificationExercise.length>=95,`${r.name}: insufficient verification task`);
    add(typeof r.commonMisreading==='string' && r.commonMisreading.length>=65,`${r.name}: insufficient caution`);
    add(Array.isArray(r.reviewGates) && r.reviewGates.length>=4,`${r.name}: missing review gates`);
    const already=identityNames.has(r.name);
    add(already === (r.state==='engine-name-other-group-needs-rule-equivalence-review'),`${r.name}: dossier engine status not synced`);
    if(crossNames.has(r.name)){
      const ref = cross.find(x=>x.name===r.name);
      add(ref.status === (already ? 'engine-name' : 'not-in-engine'),`${r.name}: reference status drift`);
    }
  }
  const candidateAliases=new Map(cross.filter(x=>x.status==='possible-alias').map(x=>[x.name,x.engineNames[0]]));
  add(candidateAliases.size===aliases.length, 'Alias dossier count differs from reference');
  for(const a of aliases){
    add(candidateAliases.get(a.name)===a.candidate,`${a.name}: alias candidate drift`);
    add(!identityNames.has(a.name),`${a.name}: alias now has exact engine identity`);
    add(a.issue?.length>65 && a.resolution?.length>75,`${a.name}: alias requires explanatory caution and human review`);
  }
  const circleHasIdentity=order.filter(n=>identityNames.has(n));
  add(JSON.stringify(circleHasIdentity)===JSON.stringify(['Hoa Cái','Kiếp Sát']),'Tướng Tiền overlap needs fresh review');
  const beyondCrosswalk=records.filter(r=>!crossNames.has(r.name));
  const notInEngine=records.filter(r=>r.state==='research-only-no-placement');
  return {version:'11.37.0',scope:'structural-source-audit-only',dossiers:records.length,aliasDossiers:aliases.length,
    circleMembers:order.length, namesAlreadyInEngine:circleHasIdentity, notInEngineDossiers:notInEngine.length,
    namesBeyond121Crosswalk:beyondCrosswalk.map(r=>r.name), referenceCounts:crosswalk.counts,
    disallowPlacement:true, expertReviewed:false, errors,
    limitations:['No validated placement algorithm added','No astronomical verification','No expert-reviewed interpretation','No production build/E2E']};
}
if(require.main===module){
  const report=auditResearch();
  if(process.argv.includes('--write')){
    const out=path.join(root,'docs/reports');fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'V11_37_STAR_RESEARCH.json'),JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(out,'V11_37_STAR_RESEARCH.md'),[
      '# Thiên Đồ V11.37 — Kiểm toán hồ sơ sao nghiên cứu','',
      `- Hồ sơ sao nghiên cứu: ${report.dossiers}`,
      `- Hồ sơ dị danh: ${report.aliasDossiers}`,
      `- Tướng Tiền 12 thần: ${report.circleMembers}`,
      `- Trùng tên với engine nhưng khác phạm vi cần thẩm định: ${report.namesAlreadyInEngine.join(', ')}`,
      `- Hồ sơ chưa có đúng tên sao trong engine: ${report.notInEngineDossiers}`,
      `- Ngoài danh mục 121 tên cũ: ${report.namesBeyond121Crosswalk.join(', ')}`,
      '- Không có công thức an sao mới hoặc sao được tự thêm vào lá số.','',
      '## Kiểm tra dữ liệu',...(report.errors.length?report.errors.map(s=>`- FAIL: ${s}`):['- Không phát hiện lỗi cấu trúc.']),'',
      '## Chưa được xác minh',...report.limitations.map(s=>`- ${s}`),'',
    ].join('\n'));
  }
  console.log(`V11.37 star research: ${report.dossiers} dossiers; missing ${report.notInEngineDossiers}; errors ${report.errors.length}`);
  for(const e of report.errors) console.error(e);
  if(report.errors.length) process.exitCode=1;
}
module.exports={auditResearch};
