'use strict';
/**
 * R18: safe internal preflight for 12 natal decade periods.
 * Reference: Renhuai123/ziwei-doushu@7922285d... patterns-dingza.ts
 * This never evaluates a Ding Za formation or assigns a fortune grade.
 */
const {auditClassicalPeriodGeometry}=require('./classical-period-geometry.cjs');
const Aux=require('@thiendo/astrology-engine/src/auxiliary.js');
const Year=require('@thiendo/astrology-engine/src/year-stars.js');
const Advanced=require('@thiendo/astrology-engine/src/advanced-placements.js');
const Strength=require('@thiendo/astrology-engine/src/star-strength.js');

const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const SHA=Object.freeze(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp']);
const ID_LIST=Object.freeze(['dinh-tap-01','dinh-tap-02','dinh-tap-03','dinh-tap-08']);
const mod=(a,n)=>(a%n+n)%n;
const CANDIDATES=Object.freeze(ID_LIST.map(id=>Object.freeze({
 id,sourceCriterionVerified:false,scope:'period-research',status:'partial-evidence',
 sourceUrl:'https://github.com/Renhuai123/ziwei-doushu/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/lib/ziwei/patterns-dingza.ts'
})));
const EMPTY=Object.freeze([]);
function auditClassicalPeriodPreflight(chart){
 const fail=reason=>Object.freeze({
  geometryVerified:false,natalLayersVerified:false,sourceCriteriaVerified:false,
  periods:EMPTY,candidates:CANDIDATES,reason
 });
 const geometry=auditClassicalPeriodGeometry(chart);
 if(!geometry.verifiedGeometry)return fail('Bộ an đại hạn chưa đạt kiểm toán: '+geometry.reason);
 const parts=typeof chart.yearCanChi==='string'?chart.yearCanChi.split(' '):[];
 const yearStem=STEMS.indexOf(parts[0]),yearBranch=BRANCHES.indexOf(parts[1]);
 const hourBranch=BRANCHES.indexOf(chart.hourBranch);
 if(parts.length!==2||yearStem<0||yearBranch<0||hourBranch<0||
    !Number.isInteger(chart.lunar?.month)||chart.lunar.month<1||chart.lunar.month>12)
  return fail('Thiếu Can Chi năm sinh, chi giờ hoặc tháng âm hợp lệ.');
 if(chart.auxiliaryRuleSet!==Aux.RULESET||chart.yearStarRuleSet!==Year.RULESET||
    chart.advancedStarRuleSet!==Advanced.RULESET||
    chart.mainStarStrengthRuleSet!==Strength.RULESET)
  return fail('Phiên bản an sao phụ, sao năm, sát tinh hoặc độ sáng không khớp bảng Thiên Đồ.');
 let aux,annual,advanced;
 try{
  aux=Aux.calculate({yearStem,lunarMonth:chart.lunar.month,hourBranch});
  annual=Year.calculate(yearBranch);
  advanced=Advanced.calculate({yearStem,yearBranch,hourBranch,gender:chart.gender}).stars;
 }catch{
  return fail('Không thể tái lập các lớp sao nguyên cục từ đầu vào đã ghi trên lá số.');
 }
 const same=(a,b)=>!!a&&!!b&&a.name===b.name&&a.branch===b.branch&&a.basis===b.basis;
 const exact=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&
  actual.every((x,i)=>same(x,expected[i]));
 if(!exact(chart.auxiliaries,aux)||!exact(chart.yearStars,annual)||
    !Array.isArray(chart.advancedStars)||chart.advancedStars.length!==advanced.length||
    chart.advancedStars.some((x,i)=>!same(x,advanced[i])||x.ruleSet!==Advanced.RULESET))
  return fail('Sao bản mệnh và bảng an từ Can Chi/tháng/giờ không nhất quán.');
 const byBranch=new Map();
 const found=new Set();
 for(const h of chart.houses){
  if(!h||byBranch.has(h.branchIndex)||h.branch!==BRANCHES[h.branchIndex]||
     !Array.isArray(h.stars)||!Array.isArray(h.mainStarStrengths))
   return fail('Cung bị thiếu, trùng hoặc sai danh sách chính tinh.');
  byBranch.set(h.branchIndex,h);
  if(h.mainStarStrengths.length!==h.stars.length||
     h.stars.some((name,i)=>{
      const expected=Strength.lookup(name,h.branchIndex),actual=h.mainStarStrengths[i];
      if(!expected||found.has(name)||!actual)return true;
      found.add(name);
      return Object.keys(expected).some(k=>actual[k]!==expected[k]);
     }))
   return fail('Dữ liệu chính tinh hoặc độ sáng không đạt kiểm toán bảng có phiên bản.');
  const layers=[['auxiliaryStars',aux],['yearStars',annual],['advancedStars',advanced]];
  for(const [field,expected] of layers){
   const want=expected.filter(x=>x.branch===h.branchIndex).map(x=>x.name);
   if(!Array.isArray(h[field])||h[field].length!==want.length||
      h[field].some((name,i)=>name!==want[i]))
    return fail('Lớp sao gắn cung '+field+' không khớp bộ an gốc.');
  }
 }
 if(found.size!==14||Strength.NAMES.some(name=>!found.has(name)))
  return fail('Thiếu hoặc trùng chính tinh trong địa bàn 12 cung.');
 const loc=aux.find(x=>x.name==='Lộc Tồn');
 const horse=annual.find(x=>x.name==='Thiên Mã');
 if(!loc||!horse)return fail('Không thể xác định Lộc Tồn và Thiên Mã theo quy tắc nguyên cục.');
 const periods=chart.cycles.daiHan.map(dx=>{
  const b=dx.branch,h=byBranch.get(b);
  const fourCourt=[b,mod(b+4,12),mod(b+8,12),mod(b+6,12)];
  const sharp=SHA.filter(name=>aux.some(s=>s.name===name&&s.branch===b)||
    advanced.some(s=>s.name===name&&s.branch===b));
  return Object.freeze({
   index:dx.index,fromAge:dx.fromAge,toAge:dx.toAge,
   branchIndex:b,branchName:BRANCHES[b],palace:h.palace,
   locTonAndHorseInCourt:fourCourt.includes(loc.branch)&&fourCourt.includes(horse.branch),
   sevenKillingInCourt:fourCourt.some(x=>byBranch.get(x).stars.includes('Thất Sát')),
   sharpStarsAtPeriod:Object.freeze(sharp)
  });
 }).sort((a,b)=>a.fromAge-b.fromAge);
 if(periods.length!==12||new Set(periods.map(x=>x.index)).size!==12)
  return fail('Dữ liệu 12 đại hạn không có chỉ số riêng biệt.');
 return Object.freeze({
  geometryVerified:true,natalLayersVerified:true,sourceCriteriaVerified:false,
  periods:Object.freeze(periods),candidates:CANDIDATES,
  reason:'Đã đối chiếu 12 cung đại hạn cùng các lớp sao nguyên cục theo '+Aux.RULESET+', '+Year.RULESET+', '+Advanced.RULESET+' và '+Strength.RULESET+'. Chưa thẩm định định nghĩa cách cục của nguồn.'
 });
}
module.exports=Object.freeze({auditClassicalPeriodPreflight,PERIOD_IDS:ID_LIST});
