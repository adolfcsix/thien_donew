'use strict';
/** V11.149.5: source/period/host-star ledger for VERSIONED annual placements.
 * Evidence about WHAT the current engine computed, not independent expert
 * certification of the rule or a forecast. Does not insert unresolved stars.
 */
const TuHoa=require('../../astrology-engine/src/tuhoa.js');
const docket=require('../../knowledge/src/star-source-docket.json');
const METHOD='v11.149.5-period-source-ledger';
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const makeKey=(kind,name)=>kind+':'+name;
const ANNUAL_EXT_BASES=Object.freeze({'Lưu Tang Môn':'ty-tai-dan-thuan','Lưu Bạch Hổ':'ty-tai-than-thuan','Lưu Thiên Khốc':'ty-tai-ngo-nghich','Lưu Thiên Hư':'ty-tai-ngo-thuan'});
const ensure=(condition,message)=>{if(!condition)throw new Error('Period evidence: '+message);};
function buildPeriodEvidence(chart,annual){
 ensure(chart&&Array.isArray(chart.houses)&&chart.houses.length===12,'cần 12 cung');
 const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 ensure(byBranch.size===12&&[...byBranch.keys()].every(n=>Number.isInteger(n)&&n>=0&&n<12),'địa chi cung không duy nhất');
 const stemIndex=annual?.luuTuHoa?.yearStemIndex;
 const branchIndex=annual?.luuThaiTueBranchIndex;
 ensure(Number.isInteger(stemIndex)&&stemIndex>=0&&stemIndex<10,'thiếu can năm xem');
 ensure(Number.isInteger(branchIndex)&&branchIndex>=0&&branchIndex<12,'thiếu chi năm xem');
 ensure(annual?.year&&Number.isInteger(annual.year),'thiếu năm âm lịch');
 ensure(((annual.year-4)%10+10)%10===stemIndex,'can năm không khớp năm âm lịch');
 ensure(((annual.year-4)%12+12)%12===branchIndex,'chi năm không khớp năm âm lịch');
 ensure(Array.isArray(annual?.luuStars?.items)&&annual.luuStars.items.length===12,'cần đúng 12 sao lưu theo engine');
 ensure(Array.isArray(annual?.luuTuHoa?.items)&&annual.luuTuHoa.items.length===4,'cần đúng 4 Lưu Tứ Hóa');
 const natalTargets=new Map();
 for(const house of chart.houses)for(const field of ['stars','auxiliaryStars']){
  ensure(Array.isArray(house[field]),'thiếu sao nguyên bàn '+field);
  for(const name of house[field]){
   ensure(typeof name==='string'&&name.trim(),'tên sao không hợp lệ');
   ensure(!natalTargets.has(name),'trùng tên sao nhận Hóa: '+name);
   natalTargets.set(name,house.branchIndex);
  }
 }
 const annualEntries=annual.luuStars.items.map(s=>{
  ensure(typeof s.name==='string'&&s.name.startsWith('Lưu '),'tên sao lưu thiếu tiền tố');
  ensure(Number.isInteger(s.branch)&&byBranch.has(s.branch),'sao lưu ngoài 12 cung '+s.name);
  ensure(s.palace===byBranch.get(s.branch).palace,'tên cung sao lưu không khớp '+s.name);
  ensure(typeof s.ruleSet==='string'&&s.ruleSet,'sao lưu thiếu phiên bản phép an '+s.name);
  ensure(['can-nam-xem','chi-nam-xem'].includes(s.basis)||ANNUAL_EXT_BASES[s.name]===s.basis,'nguồn can/chi sao lưu không rõ '+s.name);
  return Object.freeze({kind:'annual-star',name:s.name,branchIndex:s.branch,palace:s.palace,
   inputLayer:'năm âm lịch đang xem',inputKind:s.basis==='can-nam-xem'?'heavenly-stem':'earthly-branch',
   inputValue:s.basis==='can-nam-xem'?STEMS[stemIndex]:BRANCHES[branchIndex],
   ruleSet:s.ruleSet,expertReviewed:false});
 });
 ensure(new Set(annualEntries.map(s=>s.name)).size===12,'sao lưu bị trùng tên');
 const transformations=annual.luuTuHoa.items.map((s,i)=>{
  ensure(s.name===TuHoa.TYPES[i],'thứ tự 4 Lưu Tứ Hóa không khớp');
  ensure(s.star===TuHoa.ROWS[stemIndex][i],'bảng Tứ Hóa đang dùng không khớp can năm xem');
  ensure(natalTargets.get(s.star)===s.branch,'sao chủ không có ở vị trí báo cáo: '+s.star);
  ensure(byBranch.has(s.branch)&&s.palace===byBranch.get(s.branch).palace,'cung tiếp nhận Tứ Hóa không khớp');
  return Object.freeze({kind:'annual-transformation',name:s.name,hostStar:s.star,
   branchIndex:s.branch,palace:s.palace,inputLayer:'năm âm lịch đang xem',inputKind:'heavenly-stem',
   inputValue:STEMS[stemIndex],ruleSet:annual.luuTuHoa.ruleSet||TuHoa.RULESET,
   hostStarOrigin:'sao nguyên bàn đã được an',expertReviewed:false});
 });
 ensure(new Set([...annualEntries,...transformations].map(e=>makeKey(e.kind,e.name))).size===16,'trùng khóa bằng chứng');
 ensure(docket.records?.length===15&&docket.missingCount===11&&docket.aliasCount===4,'hồ sơ chưa phân xử không đầy đủ');
 ensure(docket.records.every(r=>r.automaticPlacement===false&&r.automaticAlias===false&&
  r.gates?.independentChartFixture===false&&r.gates?.schoolReview===false),'không được tự duyệt sao chưa đối chứng');
 const entries=Object.freeze([...annualEntries,...transformations]);
 return Object.freeze({method:METHOD,selectedLunarYear:annual.year,yearStem:STEMS[stemIndex],
  yearBranch:BRANCHES[branchIndex],entries,counts:Object.freeze({annualStars:12,annualTransformations:4,unresolvedNames:11,unresolvedAliases:4}),
  unmatchedSchools:'School table differences not adjudicated; show current ruleSet, never merge variants',
  researchOnly:true,expertReviewed:false});
}
module.exports=Object.freeze({METHOD,buildPeriodEvidence});
