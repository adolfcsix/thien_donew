'use strict';
/**
 * Research-only Tuần/Triệt evidence. NOT an identification of all Không Vong.
 * Compare all markers against the pinned natal Tam Hợp implementation, without
 * mutating input or interpreting destiny. Missing/contradictory data fails closed.
 */
const Advanced=require('@thiendo/astrology-engine/src/advanced-placements.js');
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
function auditNatalObstructionEvidence(chart){
 const fail=reason=>Object.freeze({verified:false,atMenh:Object.freeze([]),ruleSet:Advanced.RULESET,reason});
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12)
  return fail('Thiếu địa bàn 12 cung để đối chiếu Tuần/Triệt.');
 if(chart.advancedStarRuleSet!==Advanced.RULESET)
  return fail('Thiếu hoặc sai phiên bản an Tuần/Triệt nguyên cục.');
 const parts=typeof chart.yearCanChi==='string'?chart.yearCanChi.split(' '):[];
 const yearStem=STEMS.indexOf(parts[0]),yearBranch=BRANCHES.indexOf(parts[1]);
 const hourBranch=BRANCHES.indexOf(chart.hourBranch);
 if(parts.length!==2||yearStem<0||yearBranch<0||hourBranch<0||
    !['Nam','Nữ'].includes(chart.gender)||yearStem%2!==yearBranch%2)
  return fail('Can Chi năm, giờ hoặc giới tính nguyên cục không hợp lệ.');
 const y=chart.lunar?.year;
 if(!Number.isInteger(y)||((y-4)%10+10)%10!==yearStem||((y-4)%12+12)%12!==yearBranch)
  return fail('Can Chi năm không khớp với năm âm lịch gốc.');
 const expected=Advanced.calculate({yearStem,yearBranch,hourBranch,gender:chart.gender}).obstructions;
 const root=chart.obstructionMarkers;
 if(!Array.isArray(root)||root.length!==expected.length)
  return fail('Thiếu hoặc trùng cặp Tuần/Triệt nguyên cục.');
 for(let i=0;i<expected.length;i++){
  const a=root[i],b=expected[i];
  if(!a||a.name!==b.name||a.ruleSet!==b.ruleSet||a.basis!==b.basis||
     !Array.isArray(a.branches)||a.branches.length!==2||a.branches.some((v,j)=>v!==b.branches[j]))
   return fail('Vị trí hoặc nguồn an cặp Tuần/Triệt không khớp.');
 }
 const seen=new Set();
 for(const house of chart.houses){
  if(!house||!Number.isInteger(house.branchIndex)||house.branchIndex<0||house.branchIndex>11||
     seen.has(house.branchIndex)||!Array.isArray(house.obstructionMarkers))
   return fail('Lớp Tuần/Triệt tại 12 cung bị thiếu, trùng hoặc sai cấu trúc.');
  seen.add(house.branchIndex);
  const want=expected.filter(x=>x.branches.includes(house.branchIndex)).map(x=>x.name);
  if(house.obstructionMarkers.length!==want.length||house.obstructionMarkers.some((v,j)=>v!==want[j]))
   return fail('Lớp Tuần/Triệt tại cung không nhất quán với dữ kiện gốc.');
 }
 const menh=chart.houses.find(h=>h.palace==='Mệnh');
 if(!menh||!seen.has(menh.branchIndex))
  return fail('Không thể xác định cung Mệnh đã kiểm chứng.');
 const atMenh=Object.freeze(expected.filter(x=>x.branches.includes(menh.branchIndex)).map(x=>x.name));
 return Object.freeze({verified:true,ruleSet:Advanced.RULESET,atMenh,
  reason:atMenh.length?'Mệnh có dấu '+atMenh.join(', ')+' theo bảng Tam Hợp. Không đồng nghĩa đã xác minh toàn bộ Không Vong.':
    'Mệnh không có Tuần/Triệt theo bảng Tam Hợp. Không đủ loại trừ các dạng Không Vong khác.'});
}
module.exports=Object.freeze({auditNatalObstructionEvidence});
