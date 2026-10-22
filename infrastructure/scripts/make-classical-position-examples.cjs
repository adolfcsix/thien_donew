'use strict';
/** Reproducible hypothetical cases; no star placement tables or manual matching. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {describeClassicalCandidateCriteria}=require('../../packages/interpretation/src/classical-condition-diagnostics.cjs');
const fixtures=[
 ['tu-phu-vu-tuong','1976-01-15',9],
 ['co-nguyet-dong-luong','1976-10-15',21],
 ['sat-pha-tham','1976-04-15',6],
 ['cu-nhat','1976-04-15',12],
 ['cu-nhat','1990-06-15',14,'contrast']
];
const cases=fixtures.map(([familyId,date,hour,variant='anchor'])=>{
 const input={date,calendar:'solar',gender:'Nam',hour,minute:15};
 const chart=Engine.calculate(input),m=chart.houses.find(h=>h.palace==='Mệnh');
 const review=describeClassicalCandidateCriteria(chart,m.branchIndex).find(r=>r.id===familyId).reviewMatrix;
 const lenses=review.schoolLenses.tests;
 if(variant==='anchor'&&lenses.some(l=>!l.geometryMatches))throw Error(`Case not eligible for all editorial lenses: ${familyId}`);
 if(variant==='contrast'&&!(lenses[0].geometryMatches&&!lenses[1].geometryMatches&&lenses[1].outside.includes('Thái Dương')))throw Error('No observable four-court/triad contrast');
 return {id:`${familyId}-${variant}`,familyId,label:variant==='contrast'?'Khớp Tứ chính nhưng khác tam hợp vì sao ở đối cung':'Đủ vị trí theo cả ba phép thử (chưa phải thành cách)',
  input,focusBranchIndex:m.branchIndex,
  observed:review.required.map(x=>({star:x.star,branchIndex:x.branchIndex,relation:x.relation})),
  statuses:lenses.map(l=>({id:l.id,status:l.status,geometryMatches:l.geometryMatches})),
  expertReviewed:false,confirmedClassicalFormation:false};
});
const output={edition:'11.64.0',scope:'additional-hypothetical-natal-cases',notice:'Năm ví dụ thêm cho tám ví dụ của V11.63; chỉ là thử phạm vi vị trí trên lá số giả định, không kết luận về con người.',cases};
const target=path.resolve(__dirname,'../../packages/knowledge/src/classical-position-examples.json');
const payload=JSON.stringify(output,null,2)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,payload);
else if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==payload)throw Error('Classical position fixtures drifted from engine. Run --write only after audit.');
console.log(`V11.64: ${cases.length} reproducible added cases ${process.argv.includes('--write')?'written':'verified'}`);
