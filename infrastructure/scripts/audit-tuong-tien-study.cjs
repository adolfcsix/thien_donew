#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {tuongTienStudy,expandedStarResearch}=require('../../packages/knowledge/src/index.cjs');
const yearStars=require('../../packages/astrology-engine/src/year-stars.js');
const natalExtensions=require('../../packages/astrology-engine/src/natal-extensions.js');
const FIXED_STARTS=[0,9,6,3,0,9,6,3,0,9,6,3];
// Anchors manually transcribed from the 4-group mapping in independent editorial sources.
const GROUP_ANCHORS=[
  {years:[2,6,10],start:6}, {years:[8,0,4],start:0},
  {years:[5,9,1],start:9}, {years:[11,3,7],start:3}
];
function auditStudy(table=tuongTienStudy.studyTable) {
 const errors=[]; const assert=(ok,msg)=>{if(!ok)errors.push(msg);};
 const list=table.orderedNames ?? [], rows=table.rows ?? [];
 assert(table.scope==='reference-only-research' && table.expertReviewed===false, 'Research scope or expert status is wrong');
 assert(table.automaticNatalPlacement===false && table.automaticAnnualPlacement===false,'Research circle must not enter a chart');
 assert(JSON.stringify(list)===JSON.stringify(expandedStarResearch.circle.orderedNames),'Star order differs from research dossiers');
 assert(rows.length===12 && table.branches?.length===12,'Missing year branch or name rows');
 assert(JSON.stringify(table.groupStartByYearBranch)===JSON.stringify(FIXED_STARTS),'Starting branches disagree with independent reference anchors');
 for(const g of GROUP_ANCHORS)for(const y of g.years)assert(table.groupStartByYearBranch[y]===g.start,`Group start mismatch for ${y}`);
 for(let year=0;year<12;year++) {
  const row=rows[year], expected=tuongTienStudy.calculateStudyCircle(year);
  if(!row){errors.push(`Missing row ${year}`);continue;}
  assert(row.yearBranchIndex===year && row.yearBranch===table.branches[year],`Wrong row label ${year}`);
  assert(row.groupStart===table.branches[FIXED_STARTS[year]],`Wrong group header ${year}`);
  const placements=row.placements??[];
  assert(placements.length===12,`Wrong length for ${year}`);
  assert(new Set(placements.map(p=>p.branchIndex)).size===12,`Overlapping branches for ${year}`);
  for(let i=0;i<12;i++){
   const current=placements[i];
   if(!current){errors.push(`Missing placement ${year}/${i}`);continue;}
   assert(current.name===list[i] && current.branchIndex===expected[i].branchIndex && current.branch===expected[i].branch,
    `Reference circle divergence at ${year}/${i}`);
  }
  // Actual natal star engine is evaluated independently from the study-table formula.
  const hoa=yearStars.calculate(year).find(x=>x.name==='Hoa Cái');
  const parityStem=year%2; // valid parity, stem 0 or 1
  const extensions=natalExtensions.calculate({yearStem:parityStem,yearBranch:year,locTonBranch:natalExtensions.LOC_TON_BY_STEM[parityStem]});
  const kiep=extensions.find(x=>x.name==='Kiếp Sát');
  const expectedHoa=placements.find(x=>x.name==='Hoa Cái');
  const expectedKiep=placements.find(x=>x.name==='Kiếp Sát');
  if(expectedHoa && expectedKiep){
   assert(hoa?.branch===expectedHoa.branchIndex,`Hoa Cái differs from engine at chi ${year}`);
   assert(kiep?.branch===expectedKiep.branchIndex,`Kiếp Sát differs from engine at chi ${year}`);
  }
 }
 return {version:'11.38.0',method:'editorial-reference-cross-check; not independent expert approval',
  researchYearBranches:rows.length,placements:rows.reduce((n,row)=>n+(row.placements?.length||0),0),
  engineNameOverlapChecks:24,sourceAnchors:GROUP_ANCHORS.length,automaticNatalPlacement:false,
  automaticAnnualPlacement:false,expertReviewed:false,errors,
  remaining:['Review classical text and variant by named expert','Decide year natal / transit application','No production engine placement enabled','Check build/runtime and database E2E']};
}
if(require.main===module){
 const r=auditStudy();
 if(process.argv.includes('--write')){
  const dir=path.join(root,'docs/reports');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'V11_38_TUONG_TIEN_STUDY.json'),JSON.stringify(r,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'V11_38_TUONG_TIEN_STUDY.md'),[
    '# V11.38 — Đối chiếu Tướng Tiền (nội bộ)','',
    `- ${r.researchYearBranches} địa chi × 12 thần = ${r.placements} điểm tham chiếu.`,
    `- ${r.engineNameOverlapChecks} đối chiếu Hoa Cái và Kiếp Sát từ engine hiện tại.`,
    '- Không kích hoạt an sao, không tự tạo sao lưu.',
    '- Đối chiếu bảng tham khảo không đồng nghĩa được chuyên gia thẩm định.','',
    '## Lỗi',...(r.errors.length?r.errors:['Không có lỗi cấu trúc.']),'',
    '## Nguồn cần kiểm tra thủ công',
    'https://www.108s.tw/article/info/101',
    'https://www.doushu.ai/star-rules',
    'https://tianjihq.com/zh-CN/learn/books/digest-ziwei/6','',
    '## Còn thiếu',...r.remaining.map(x=>'- '+x),''].join('\n'));
 }
 console.log(`V11.38 Tướng Tiền study: ${r.placements} cells, ${r.engineNameOverlapChecks} engine comparisons, errors=${r.errors.length}`);
 for(const e of r.errors)console.error(e);if(r.errors.length)process.exitCode=1;
}
module.exports={auditStudy};
