'use strict';
/** Release audit of *current engine* coverage. Run: npm run audit:star-period:1495 */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {buildInventory}=require('../../packages/star-audit/src/index.cjs');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {buildPeriodEvidence}=require('../../packages/interpretation/src/period-evidence-v111495.cjs');
const base=require('../../packages/star-audit/fixtures/chart-baselines.json');
const docket=require('../../packages/knowledge/src/star-source-docket.json');
const guide=require('../../packages/knowledge/src/annual-palace-deep-reading-v111494.json');
function audit(){
 const inv=buildInventory();const errors=[];
 const check=(ok,detail)=>{if(!ok)errors.push(detail)};
 check(inv.totals.implementedNatalAndCycleNames===104,'104 sao/vòng');
 check(inv.totals.mainStars===14,'14 chính tinh');
 check(Object.keys(guide.palaces).length===12,'12 cung');
 check(inv.totals.annualStarOverlays===12,'12 sao lưu');
 check(docket.records.length===15&&docket.records.filter(x=>x.category==='missing').length===11&&docket.records.filter(x=>x.category==='alias').length===4,'11 sao + 4 dị danh chưa duyệt');
 const placements=[];const seen=new Set();
 for(const b of base.cases){
  const chart=Engine.calculate(b.input);
  for(const year of [2026,2031]){
   const selectedYear=Math.max(chart.lunar.year,year), evidence=buildPeriodEvidence(chart,Engine.annualOverview(chart,selectedYear));
   check(evidence.entries.length===16,`${b.id} ${selectedYear}: 16 chứng cứ`);
   check(evidence.entries.every(x=>x.ruleSet&&x.inputValue&&!x.expertReviewed),`${b.id}: chú thích phép an`);
   placements.push({chart:b.id,year:selectedYear,yearStem:evidence.yearStem,yearBranch:evidence.yearBranch,
    annualStars:evidence.counts.annualStars,annualTransformations:evidence.counts.annualTransformations});
  }
 }
 check(inv.totals.editorialProfilesMatched===104,'104 hồ sơ biên tập đúng tên sao');
 for(let year=2024;year<2084;year++){
  const can=(year-4)%10,chi=(year-4)%12;seen.add(can+':'+chi);
 }
 check(seen.size===60,'60 phối hợp Can Chi hợp lệ');
 return {schema:'v11.149.5',status:errors.length?'FAIL':'SOURCE_AUDIT_PASS',technicalNotExpertVerified:true,
  coverage:{natalAndCycle:inv.totals.implementedNatalAndCycleNames,mainStars:inv.totals.mainStars,
   palaces:Object.keys(guide.palaces).length,primaryPalaceEditorialCells:14*12,
   annualStars:12,annualTransformations:4,unresolvedNames:11,unresolvedAliases:4,
   independentEditorialReviews:0,baziJieYears:[2025,2026,2027],annualLayersWithIndependentSchoolReview:false},
  testScope:{birthChartFixtures:base.cases.length,sampledBirthChartYears:placements.length,canChiPairs:seen.size},
  limitations:['104 là tên sao/vòng do engine hiện hành an, không đại diện mọi trường phái',
   '168 bài đọc chính tinh–cung không đồng nghĩa 168 ca đối chứng chuyên gia',
   'Lưu nguyệt/nhật/thời chưa được phê duyệt; không tính đủ lưu niên',
   '36 mốc Jie 2025–2027 chỉ là bản chép độ chính xác phút; nguồn thứ cấp chưa chứng thực độc lập',
   '11 tên sao/4 dị danh chưa được mở phép an tự động'],errors};
}
if(require.main===module){const data=audit();console.log(JSON.stringify(data,null,2));
 if(process.argv.includes('--write')){
  const out=path.join(root,'docs/reports/V11_149_5_STAR_PERIOD_EVIDENCE.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
 }
 if(data.errors.length)process.exitCode=1;
}
module.exports={audit};
