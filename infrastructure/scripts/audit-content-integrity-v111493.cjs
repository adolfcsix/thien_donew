#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const R=p=>path.join(ROOT,p);
const read=p=>JSON.parse(fs.readFileSync(R(p),'utf8'));
function check(){
 const disciplines=read('packages/knowledge/src/research-disciplines.json').records;
 const lessons=read('apps/web/src/features/academy/lessons.json');
 const glossary=read('apps/web/src/features/academy/glossary.json');
 const dossier=read('packages/knowledge/src/star-source-docket.json');
 const available=disciplines.filter(d=>d.route&&fs.existsSync(R(`apps/web/src/app${d.route}/page.tsx`)));
 const issues=[];
 if(disciplines.length!==15)issues.push(`Expected 15 editorial dossiers, saw ${disciplines.length}`);
 if(available.length!==disciplines.length)issues.push('A discipline route is absent');
 for(const d of disciplines){
  if(d.reviewStatus!=='editorial-draft-not-expert-reviewed')issues.push(`Unsupported approval ${d.id}`);
  if(!d.boundary||!d.studyWorkflow||!d.practiceExercise)issues.push(`Incomplete boundary/guide for ${d.id}`);
 }
 const missing=dossier.records.filter(x=>x.category==='missing');
 const aliases=dossier.records.filter(x=>x.category==='alias');
 if(missing.length!==11||aliases.length!==4)issues.push(`Star study: ${missing.length} missing and ${aliases.length} aliases`);
 if(missing.some(x=>x.gates?.independentChartFixture||x.gates?.schoolReview))issues.push('Candidate star approved without independent research gate');
 if(!Array.isArray(lessons)||lessons.length!==16)issues.push('Academy inventory drift');
 if(!Array.isArray(glossary)||glossary.length!==79)issues.push('Glossary inventory drift');
 const bazi=fs.readFileSync(R('apps/web/src/app/bazi/page.tsx'),'utf8');
 if(!bazi.includes('assessResearchCoverage(ziping)')||!bazi.includes('bz-coverage')||!bazi.includes('chưa xác minh một Dụng thần kết luận'))issues.push('Bazi research disclosure out of sync');
 if(!bazi.includes('<ExpertOnly title="Cách cục, Dụng thần'))issues.push('Bazi expert scope not gated');
 return Object.freeze({edition:'11.149.3',status:issues.length?'FAIL':'PASS',issues,
  inventory:{disciplines:disciplines.length,availableRoutes:available.length,lessons:lessons.length,glossary:glossary.length,unverifiedStars:missing.length,unverifiedAliases:aliases.length},
  interpretation:'Static editorial and route consistency only; does NOT validate chart science, full-stack runtime, or completeness of classical schools.'});
}
const result=check();
if(process.argv.includes('--write')){const p=R('docs/reports/V11_149_3_CONTENT_INTEGRITY.json');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result,null,2));if(result.status!=='PASS')process.exitCode=1;
module.exports=Object.freeze({check});
