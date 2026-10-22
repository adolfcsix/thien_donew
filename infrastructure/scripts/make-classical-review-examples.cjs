'use strict';
/** Deterministically regenerate V11.63 editorial cases from engine inputs. */
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {describeClassicalCandidateCriteria}=require('../../packages/interpretation/src/classical-condition-diagnostics.cjs');
const profiles=require('../../packages/knowledge/src/classical-review-questions.json');
const output=[];
for(const id of Object.keys(profiles.profiles)){
 const bucket={match:null,partial:null};
 // Deliberately bounded enumeration: do not depend on clock, network, or randomness.
 for(let year=1998;year<=2001 && (!bucket.match||!bucket.partial);year++)
  for(let month=1;month<=12 && (!bucket.match||!bucket.partial);month++)
   for(let hour=0;hour<24 && (!bucket.match||!bucket.partial);hour+=2){
    const date=`${year}-${String(month).padStart(2,'0')}-15`;
    const input={date,calendar:'solar',gender:'Nam',hour,minute:15};
    const chart=Engine.calculate(input),m=chart.houses.find(h=>h.palace==='Mệnh');
    const review=describeClassicalCandidateCriteria(chart,m.branchIndex).find(r=>r.id===id).reviewMatrix;
    const matched=review.required.filter(x=>x.status==='observed');
    const type=review.structuralCriteriaMet?'match':matched.length>=1?'partial':null;
    if(type&&!bucket[type])bucket[type]={id:`${id}-${type}`,familyId:id,
     label:type==='match'?'Đủ điều kiện vị trí để khảo sát':'Thiếu điều kiện vị trí',
     input,focusBranchIndex:m.branchIndex,expectedStatus:review.status,
     expectedStructural:review.structuralCriteriaMet,
     observed:matched.map(x=>({star:x.star,branchIndex:x.branchIndex})),
     absent:review.required.filter(x=>x.status!=='observed').map(x=>x.star)};
   }
 for(const type of ['match','partial']){
  if(!bucket[type])throw Error(`Cannot generate ${type} for ${id}`);
  output.push(bucket[type]);
 }
}
const data={edition:'v11.63.0',scope:'natal-editorial-examples',expertReviewed:false,
 notice:'Các ngày giờ là ca học tập giả định, tính bằng engine của Thiên Đồ. Không phải dữ liệu cá nhân hoặc xác thực luận đoán.',cases:output};
const file=path.resolve(__dirname,'../../packages/knowledge/src/classical-review-examples.json');
if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==JSON.stringify(data,null,2)+'\n')throw Error('Example snapshot differs; use --write after reviewing engine results.');
console.log(`${output.length} cases checked (${output.filter(x=>x.expectedStructural).length} match + ${output.filter(x=>!x.expectedStructural).length} partial)`);
