'use strict';
/**
 * Research-only audit for Hỏa Tinh's *natal placement* under one pinned Tam Hợp
 * convention. No Hỏa Tinh Miếu/Vượng profile is supplied by this engine;
 * therefore this module MUST NOT assert brightness or a classical verdict.
 */
const Advanced=require('@thiendo/astrology-engine/src/advanced-placements.js');
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
function auditNatalFirePosition(chart){
 const fail=reason=>Object.freeze({verified:false,branchIndex:null,ruleSet:Advanced.RULESET,fireStrengthVerified:false,reason});
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12)
  return fail('Thiếu địa bàn 12 cung cần thiết để kiểm tra Hỏa Tinh.');
 if(chart.advancedStarRuleSet!==Advanced.RULESET)
  return fail('Thiếu hoặc sai phiên bản lớp an sao Hỏa/Linh nguyên cục.');
 const p=typeof chart.yearCanChi==='string'?chart.yearCanChi.split(' '):[];
 const yearStem=STEMS.indexOf(p[0]),yearBranch=BRANCHES.indexOf(p[1]);
 const hourBranch=BRANCHES.indexOf(chart.hourBranch);
 if(p.length!==2||yearStem<0||yearBranch<0||hourBranch<0||
    yearStem%2!==yearBranch%2||!['Nam','Nữ'].includes(chart.gender))
  return fail('Can Chi năm, giờ chi hoặc giới tính chưa hợp lệ.');
 const lunarYear=chart.lunar?.year;
 if(!Number.isInteger(lunarYear)||
    ((lunarYear-4)%10+10)%10!==yearStem||
    ((lunarYear-4)%12+12)%12!==yearBranch)
  return fail('Can Chi năm không nhất quán với năm âm lịch.');
 if(chart.hour!==undefined&&
    (!Number.isInteger(chart.hour)||chart.hour<0||chart.hour>23||
     Math.floor((chart.hour+1)/2)%12!==hourBranch))
  return fail('Giờ đồng hồ không nhất quán với giờ địa chi.');
 const expected=Advanced.calculate({yearStem,yearBranch,hourBranch,gender:chart.gender}).stars;
 const same=(actual,want)=>!!actual&&
  actual.name===want.name&&actual.branch===want.branch&&
  actual.basis===want.basis&&actual.ruleSet===want.ruleSet;
 if(!Array.isArray(chart.advancedStars)||chart.advancedStars.length!==expected.length||
    chart.advancedStars.some((star,i)=>!same(star,expected[i])))
  return fail('Danh mục sao nâng cao bị thiếu, trùng hoặc sai thông tin nguồn.');
 const seen=new Set();
 for(const house of chart.houses){
  if(!house||!Number.isInteger(house.branchIndex)||house.branchIndex<0||house.branchIndex>11||
     seen.has(house.branchIndex)||!Array.isArray(house.advancedStars)||
     !Array.isArray(house.advancedStarDetails))
   return fail('Thiếu hoặc trùng cung hay lớp sao nâng cao của địa bàn.');
  seen.add(house.branchIndex);
  const items=expected.filter(s=>s.branch===house.branchIndex);
  if(house.advancedStars.length!==items.length||house.advancedStarDetails.length!==items.length||
     items.some((star,i)=>house.advancedStars[i]!==star.name||!same(house.advancedStarDetails[i],star)))
   return fail('Sao Hỏa/Linh/Không/Kiếp trong một cung không khớp bảng an nguồn.');
 }
 const fire=expected.find(x=>x.name==='Hỏa Tinh');
 if(!fire)return fail('Không tìm thấy Hỏa Tinh trong nguồn an sao đã ghim.');
 return Object.freeze({verified:true,branchIndex:fire.branch,ruleSet:Advanced.RULESET,
  fireStrengthVerified:false,
  reason:'Hỏa Tinh tại chi số '+fire.branch+' được đối chiếu từ năm/giờ theo '+Advanced.RULESET+
    '; chưa có bảng Miếu/Vượng cho Hỏa Tinh được thẩm định.'});
}
module.exports=Object.freeze({auditNatalFirePosition});
