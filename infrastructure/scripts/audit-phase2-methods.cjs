#!/usr/bin/env node
'use strict';
const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'../..');
const registry=require(resolve(root,'packages/knowledge/src/phase2-school-methods.cjs'));
const {BRANCHES,buildHeavenEarthPlates,monthGeneralAfterZhongQi,ZHONG_QI}=require(resolve(root,'packages/astrology-engine/src/da-liu-ren-plates.cjs'));
const {disciplines,schools}=registry.registry;
const problems=[];
const unique=(items,label)=>{const ids=items.map(x=>x.id);if(new Set(ids).size!==ids.length)problems.push('Duplicate '+label+' ID');};
unique(disciplines,'discipline');unique(schools,'school');
if(disciplines.length<14||schools.length<12)problems.push('Missing phase-2 research scope');
const priorities=new Set(['P0','P1','P2']);
const statuses=new Set(['research-backlog','research-comparison','existing-needs-external-verification','deterministic-subroutine-only']);
for(const d of disciplines){if(!priorities.has(d.priority))problems.push('Invalid priority '+d.id);}
for(const m of schools){
 if(!disciplines.some(d=>d.id===m.disciplineId))problems.push('Unknown discipline: '+m.id);
 if(!statuses.has(m.status))problems.push('Invalid status: '+m.id);
 if(!priorities.has(m.priority))problems.push('Invalid school priority: '+m.id);
 if(!Array.isArray(m.inputs)||!m.inputs.length||!Array.isArray(m.boundaries)||!m.boundaries.length||!Array.isArray(m.pending)||!m.pending.length)problems.push('Missing constraints: '+m.id);
 if(!m.document.startsWith('docs/research/schools/')||!existsSync(resolve(root,m.document)))problems.push('Missing method-specific documentation: '+m.id);
 for(const uri of m.sources)if(!/^https:\/\//.test(uri))problems.push('Bad source URL in '+m.id);
 if(m.engineIntegration!=='none'&&m.engineIntegration!=='legacy-reference-only'&&m.engineIntegration!=='isolated-research-only')problems.push('Invalid engine integration status '+m.id);
 if(m.engineIntegration==='isolated-research-only'&&!['dai-luc-nham-yuejiang','thai-at-foundation','tu-vi-phi-tinh','bat-tu-tiet-khi','bat-tu-nguyet-lenh','bat-tu-bien-cach','luc-hao-phuc-than','luc-hao-dung-than-evidence','luc-hao-multiple-jie-evidence','mai-hoa-lunar-number'].includes(m.id))problems.push('Accidental unverified engine enablement: '+m.id);
 if(m.engineIntegration!=='isolated-research-only'&&registry.gateSchoolExecution(m.id).verdict!=='BLOCKED')problems.push('Fail-open unreviewed method: '+m.id);
}
if(registry.registry.researchOnly!==true)problems.push('Research flag must remain true');
if(BRANCHES.length!==12||new Set(BRANCHES).size!==12)problems.push('Invalid earth branches');
if(Object.keys(ZHONG_QI).length!==12||new Set(Object.values(ZHONG_QI)).size!==12)problems.push('Invalid ZhongQi->month general table');
for(const term of Object.keys(ZHONG_QI))if(monthGeneralAfterZhongQi(term)!==ZHONG_QI[term])problems.push('ZhongQi mapping mismatch');
for(const monthGeneral of BRANCHES)for(const divinationHour of BRANCHES){
 const x=buildHeavenEarthPlates({monthGeneral,divinationHour});
 if(x.positions.length!==12||new Set(x.positions.map(p=>p.heaven)).size!==12)problems.push('Non-bijective plate '+monthGeneral+' '+divinationHour);
 if(x.positions.find(p=>p.earth===divinationHour)?.heaven!==monthGeneral)problems.push('Failed month general alignment');
 if(x.positions.some((p,i)=>p.earth!==BRANCHES[i]||p.heaven!==BRANCHES[(i+x.offset)%12]))problems.push('Plate order drift');
 if((x.pattern==='phuc-ngam')!==(x.offset===0)||(x.pattern==='phan-ngam')!==(x.offset===6))problems.push('Pattern mismatch');
}
const result={status:problems.length?'FAIL':'PASS',schemaVersion:registry.registry.schemaVersion,disciplines:disciplines.length,schools:schools.length,plateCases:144,problems};
console.log('Phase 2 method audit:',JSON.stringify(result));
if(problems.length)process.exitCode=1;
