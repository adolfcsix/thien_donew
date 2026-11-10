'use strict';

/**
 * Internal, read-only geometry audit for the already-existing natal decade
 * placements. It does not establish source/school agreement and MUST NOT be
 * used as a Ding Za (period-formation) verdict.
 */
const Cycles=require('@thiendo/astrology-engine/src/cycles.js');
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const mod=(n,k)=>(n%k+k)%k;
const PERIOD_BASIS='tuoi-mu-theo-cuc';

function auditClassicalPeriodGeometry(chart){
 const fail=reason=>Object.freeze({
  verifiedGeometry:false,sourceInterpretationVerified:false,
  matchedPeriods:0,ruleSet:Cycles.RULESET,reason
 });
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12||
    !chart.cycles||!Array.isArray(chart.cycles.daiHan)||chart.cycles.daiHan.length!==12)
  return fail('Thiếu 12 cung hoặc thiếu dữ liệu 12 đại hạn nguyên cục.');
 if(chart.cycles.ruleSet!==Cycles.RULESET)
  return fail('Bảng đại hạn đang sử dụng thiếu hoặc sai mã phiên bản quy tắc.');
 const parts=typeof chart.yearCanChi==='string'?chart.yearCanChi.split(' '):[];
 const stem=STEMS.indexOf(parts[0]),branch=BRANCHES.indexOf(parts[1]);
 const lunarYear=chart.lunar?.year;
 if(parts.length!==2||stem<0||branch<0||
    !Number.isInteger(lunarYear)||mod(lunarYear-4,10)!==stem||mod(lunarYear-4,12)!==branch)
  return fail('Can Chi và năm âm lịch sinh không nhất quán.');
 if(!['Nam','Nữ'].includes(chart.gender)||!Number.isInteger(chart.cuc?.number)||
    chart.cuc.number<2||chart.cuc.number>6)
  return fail('Thiếu giới tính hoặc Cục hợp lệ để xác minh chiều đại hạn.');
 const menh=BRANCHES.indexOf(chart.menh);
 const loc=Array.isArray(chart.auxiliaries)?chart.auxiliaries.filter(s=>s?.name==='Lộc Tồn'):[];
 if(menh<0||loc.length!==1||!Number.isInteger(loc[0].branch)||loc[0].branch<0||loc[0].branch>11)
  return fail('Thiếu cung Mệnh hoặc vị trí Lộc Tồn duy nhất thuộc lớp sao phụ.');
 const seen=new Set(),byBranch=new Map();
 for(const h of chart.houses){
  if(!h||!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||
     seen.has(h.branchIndex)||h.branch!==BRANCHES[h.branchIndex]||
     !h.daiHan||typeof h.daiHan!=='object')
   return fail('Cung và dữ liệu đại hạn theo địa chi bị thiếu, trùng hoặc sai định dạng.');
  seen.add(h.branchIndex);
  byBranch.set(h.branchIndex,h);
 }
 if(byBranch.get(menh)?.palace!=='Mệnh'||chart.coverage?.daiHan!==12)
  return fail('Cung Mệnh hoặc chỉ số bao phủ đại hạn không nhất quán.');
 let expected;
 try{
  expected=Cycles.calculate({yearStem:stem,yearBranch:branch,gender:chart.gender,
   cucNumber:chart.cuc.number,locTonBranch:loc[0].branch,menhBranch:menh});
 }catch{
  return fail('Không thể tái lập vị trí đại hạn bằng quy tắc đang công bố.');
 }
 if(chart.cycles.direction!==expected.direction)
  return fail('Chiều thuận/nghịch đại hạn không khớp Can Chi và giới tính.');
 const same=(a,b)=>a&&b&&
   a.index===b.index&&a.branch===b.branch&&a.fromAge===b.fromAge&&
   a.toAge===b.toAge&&a.basis===b.basis&&a.basis===PERIOD_BASIS;
 for(let i=0;i<12;i++){
  const target=expected.daiHan[i],root=chart.cycles.daiHan[i];
  const projection=byBranch.get(target.branch)?.daiHan;
  if(!same(root,target)||!same(projection,target))
   return fail('Thứ tự đại hạn, khoảng tuổi mụ hoặc dữ kiện gắn lên cung không khớp quy tắc gốc.');
 }
 return Object.freeze({
  verifiedGeometry:true,sourceInterpretationVerified:false,
  matchedPeriods:12,ruleSet:Cycles.RULESET,
  reason:'Đã đối chiếu 12/12 đại hạn theo địa chi và tuổi mụ của quy tắc Thiên Đồ '+Cycles.RULESET+'.'
 });
}
module.exports=Object.freeze({auditClassicalPeriodGeometry});
