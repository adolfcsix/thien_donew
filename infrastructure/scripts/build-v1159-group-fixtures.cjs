'use strict';
/** Rebuild 12 deterministic study examples from the *current* engine. Never external verification. */
const fs=require('node:fs');const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {examineNatalMultiStars}=require('../../packages/interpretation/src/natal-multi-star-study.cjs');
const catalog=require('../../packages/knowledge/src/natal-multi-star-research.json');
const groups=catalog.groups.map(g=>g.id);
const targetYears=[1988,1997,1979,2004,2012,2020];
const fallbacks=[2004,1988,1997,1979,2012,1991,2020,1966,2000,1994,2007,1983,2025];
const fixtures=[];
for(const [i,id] of groups.entries())for(const status of ['complete','partial']){
 let selected=null;
 for(const year of [targetYears[i],...fallbacks.filter(y=>y!==targetYears[i])]){
  if(selected)break;
  for(let month=1;month<=12&&!selected;month++)for(const hour of [1,8,15,21]){
   if(selected)break;
   for(const gender of ['Nam','Nữ']){
    const input={date:`${year}-${String(month).padStart(2,'0')}-15`,calendar:'solar',gender,hour,minute:30};
    const chart=Engine.calculate(input);
    for(const house of chart.houses){
     const detail=examineNatalMultiStars(chart,house.branchIndex).conditionalGuides.records.find(x=>x.id===id);
     if(detail.status!==status)continue;
     selected={groupId:id,status,input,anchorBranchIndex:house.branchIndex,anchorPalace:house.palace,
      expectedEvidence:detail.evidence.map(p=>({star:p.star,branchIndex:p.branchIndex,relation:p.relation})),
      expectedExcluded:detail.excluded.map(p=>({star:p.star,reason:p.reason}))};
     break;
    }
    if(selected)break;
   }
  }
 }
 if(!selected)throw Error(`No ${status} case: ${id}`);
 fixtures.push(selected);
}
const output={edition:'11.59.0',status:'internally-reproducible-engine-examples',expertReviewed:false,
 notice:'Lá số thử giả định do engine sinh ra để minh họa điều kiện. Không phải chứng cứ thẩm định độc lập về thuật số hoặc dự báo.',cases:fixtures};
const file=path.resolve(__dirname,'../../packages/knowledge/src/conditional-star-group-examples.json');
if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
else console.log(JSON.stringify({count:fixtures.length,summary:fixtures.map(f=>[f.groupId,f.status,f.input.date,f.anchorPalace])},null,2));
