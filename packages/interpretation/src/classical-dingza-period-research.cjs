'use strict';
/**
 * Ding Za research is scoped to individual decade periods, never a one-time
 * natal "hit". Internal chart consistency is not school agreement or a
 * prognostic verdict. Source: pinned Renhuai123/ziwei-doushu patterns-dingza.
 */
const {auditClassicalPeriodGeometry}=require('./classical-period-geometry.cjs');
const {auditNatalFirePosition}=require('./natal-fire-evidence.cjs');
const Strength=require('@thiendo/astrology-engine/src/star-strength.js');
const Aux=require('@thiendo/astrology-engine/src/auxiliary.js');
const Year=require('@thiendo/astrology-engine/src/year-stars.js');
const TuHoa=require('@thiendo/astrology-engine/src/tuhoa.js');
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const IDS=Object.freeze(['dinh-tap-01','dinh-tap-02','dinh-tap-03','dinh-tap-08']);
const TITLES=Object.freeze(['Phong vân tế hội','Cẩm thượng thiêm hoa','Lộc suy Mã khốn','Khô mộc phùng xuân']);
const SOURCE='https://github.com/Renhuai123/ziwei-doushu/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/lib/ziwei/patterns-dingza.ts';
const court=b=>[b,(b+4)%12,(b+8)%12,(b+6)%12];
const criterion=(label,met,detail)=>Object.freeze({label,state:met===null?'unknown':met?'met':'not-met',detail});
const unknown=reason=>({verified:false,reason});
function auditPlacedLayer(chart,layer,top,ruleSet,expected){
 if(chart[ruleSet[0]]!==ruleSet[1]||!Array.isArray(chart[top])||chart[top].length!==expected.length)
  return unknown('Thiếu danh mục '+top+' hoặc phiên bản an sao nguồn.');
 const same=(a,b)=>a&&a.name===b.name&&a.branch===b.branch&&a.basis===b.basis;
 if(expected.some((want,i)=>!same(chart[top][i],want)))return unknown('Sao gốc '+top+' không khớp bộ an có phiên bản.');
 for(const house of chart.houses){
  const names=expected.filter(s=>s.branch===house.branchIndex).map(s=>s.name);
  if(!Array.isArray(house[layer])||house[layer].length!==names.length||
    names.some((name,i)=>house[layer][i]!==name))
   return unknown('Sao tại cung không khớp bản gốc '+top+'.');
 }
 return {verified:true,positions:Object.freeze(Object.fromEntries(expected.map(s=>[s.name,s.branch]))),reason:'Đã so vị trí với bộ '+ruleSet[1]};
}
function auditStrength(chart){
 if(chart.mainStarStrengthRuleSet!==Strength.RULESET)return unknown('Bảng độ sáng chính tinh chưa khớp phiên bản.');
 const found=new Set();
 for(const h of chart.houses){
  if(!Array.isArray(h.stars)||!Array.isArray(h.mainStarStrengths)||
    h.stars.length!==h.mainStarStrengths.length)return unknown('Thiếu hoặc trùng lớp chính tinh và độ sáng.');
  for(let i=0;i<h.stars.length;i++){
   const name=h.stars[i],ref=Strength.lookup(name,h.branchIndex),actual=h.mainStarStrengths[i];
   if(!ref||!actual||found.has(name)||Object.keys(ref).some(key=>actual[key]!==ref[key]))
    return unknown('Độ sáng hoặc nguồn vị trí chính tinh chưa xác minh.');
   found.add(name);
  }
 }
 if(found.size!==14)return unknown('Không đủ 14 chính tinh duy nhất của nguyên cục.');
 const houses=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const state=branch=>{
  const h=houses.get(branch),s=h.mainStarStrengths;
  return {weak:s.length===0||s.every(x=>x.status==='H'),
   strong:s.some(x=>x.status==='M'||x.status==='V')};
 };
 return {verified:true,house:state,reason:'Độ sáng theo bảng '+Strength.RULESET+'; không xác nhận khác biệt trường phái.'};
}
function auditYearHua(chart,stem,aux,main){
 if(!main.verified||!aux.verified||chart.tuHoaRuleSet!==TuHoa.RULESET||
    !Array.isArray(chart.transformations)||chart.transformations.length!==4)
  return unknown('Tứ Hóa nguyên cục chưa có chứng cứ đủ nguồn.');
 const position=new Map();
 for(const h of chart.houses){
  for(const name of h.stars)position.set(name,h.branchIndex);
 }
 for(const name of Object.keys(aux.positions))position.set(name,aux.positions[name]);
 for(let i=0;i<4;i++){
  const target=TuHoa.ROWS[stem][i],t=chart.transformations[i];
  if(!t||t.name!==TuHoa.TYPES[i]||t.star!==target||t.branch!==position.get(target))
   return unknown('Tứ Hóa không khớp nguồn Can năm.');
 }
 for(const h of chart.houses){
  const want=chart.transformations.filter(t=>t.branch===h.branchIndex);
  if(!Array.isArray(h.tuHoa)||h.tuHoa.length!==want.length||
     want.some((item,i)=>h.tuHoa[i].name!==item.name||h.tuHoa[i].star!==item.star))
   return unknown('Tứ Hóa gắn trên cung không khớp bộ nguyên cục.');
 }
 return {verified:true,locBranch:chart.transformations[0].branch,reason:'Tứ Hóa nguyên cục có phiên bản '+TuHoa.RULESET};
}
function auditClassicalDingZaPeriods(chart){
 const geometry=auditClassicalPeriodGeometry(chart);
 const empty=reason=>Object.freeze({
  verifiedGeometry:false,checkedPeriods:0,sourceInterpretationVerified:false,
  reason,items:Object.freeze(IDS.map((id,i)=>Object.freeze({
   id,title:TITLES[i],status:'partial-evidence',unit:'đại hạn',
   sourceUrl:SOURCE,sourceCriterionVerified:false,periods:Object.freeze([])
  })))
 });
 if(!geometry.verifiedGeometry)return empty(geometry.reason);
 const stem=STEMS.indexOf(chart.yearCanChi?.split(' ')[0]);
 const yearBranch=BRANCHES.indexOf(chart.yearCanChi?.split(' ')[1]);
 const hourBranch=BRANCHES.indexOf(chart.hourBranch);
 if(stem<0||yearBranch<0||hourBranch<0||!Number.isInteger(chart.lunar?.month))
  return empty('Thiếu Can Chi, tháng hoặc giờ sinh để đối chiếu sao gốc.');
 const byBranch=new Map(chart.houses.map(h=>[h.branchIndex,h]));
 const main=auditStrength(chart);
 let aux=unknown('Không thể tái lập sao phụ');
 try{
  aux=auditPlacedLayer(chart,'auxiliaryStars','auxiliaries',
   ['auxiliaryRuleSet',Aux.RULESET],
   Aux.calculate({yearStem:stem,lunarMonth:chart.lunar.month,hourBranch}));
 }catch{/* fail closed */}
 let year=unknown('Không thể tái lập sao năm');
 try{
  year=auditPlacedLayer(chart,'yearStars','yearStars',
   ['yearStarRuleSet',Year.RULESET],Year.calculate(yearBranch));
 }catch{/* fail closed */}
 const hua=auditYearHua(chart,stem,aux,main);
 const fire=auditNatalFirePosition(chart);
 const menh=chart.houses.find(h=>h.palace==='Mệnh'),than=chart.houses.find(h=>h.isThan===true);
 const thanOK=chart.houses.filter(h=>h.isThan===true).length===1&&
   than&&chart.than===than.branch&&chart.thanPalace===than.palace;
 const mainCheck=(branch,pred)=>main.verified?pred(main.house(branch)):null;
 const loc=aux.verified?aux.positions['Lộc Tồn']:null;
 const horse=year.verified?year.positions['Thiên Mã']:null;
 const satBranch=main.verified?chart.houses.find(h=>h.stars.includes('Thất Sát'))?.branchIndex:null;
 const bounds=chart.cycles.daiHan.map(d=>{
  const h=byBranch.get(d.branch),four=court(d.branch);
  const here=(branch)=>four.includes(branch);
  // Three-valued OR: a verified Lộc Tồn hit is sufficient even if Hóa Lộc
  // cannot be audited. If Lộc Tồn is absent and Hóa Lộc is unverified,
  // return unknown rather than a false negative.
  const nearLoc=aux.verified&&here(loc)?true:
    aux.verified&&hua.verified?here(hua.locBranch):null;
  const nearHorse=year.verified?here(horse):null;
  const natalWeak=main.verified&&menh&&thanOK?
    (main.house(menh.branchIndex).weak&&main.house(than.branchIndex).weak):null;
  const menhWeak=main.verified&&menh?main.house(menh.branchIndex).weak:null;
  const strong=mainCheck(d.branch,x=>x.strong);
  const satPresent=aux.verified&&fire.verified?
    ['Kình Dương','Đà La'].some(n=>aux.positions[n]===d.branch)||
    ['Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'].some(n=>
      chart.advancedStars.some(s=>s.name===n&&s.branch===d.branch)):null;
  const satCourt=main.verified&&Number.isInteger(satBranch)?here(satBranch):null;
  const periods=[
   [criterion('Mệnh và Thân đều yếu theo bảng Thiên Đồ',natalWeak,main.reason),
    criterion('Trong Tam phương Tứ chính hạn có Lộc Tồn hoặc Hóa Lộc',nearLoc,
      aux.verified&&here(loc)?
        'Lộc Tồn đã được xác minh hội hạn tại chi '+loc+'; bằng chứng Hóa Lộc độc lập không cần thiết để xác nhận nhánh này.':
      aux.verified&&hua.verified?
        'Lộc Tồn tại chi '+loc+'; Hóa Lộc tại chi '+hua.locBranch:
        'Lộc Tồn chưa hội hạn theo bảng đã kiểm; vị trí Hóa Lộc chưa đủ chứng cứ: '+hua.reason),
    criterion('Thiên Mã nguyên cục hội Tam phương Tứ chính hạn',nearHorse,year.reason),
    criterion('Cách hiểu “hai hạn” của nguồn đã đối chiếu',null,'Nguồn quy về đại hạn nhưng cách phân tầng đại hạn/lưu niên vẫn cần xác nhận')],
   [criterion('Cung hạn có sát tinh thuộc bộ sáu sát',satPresent,
      fire.verified&&aux.verified?'Đã so Kình/Đà, Hỏa/Linh, Không/Kiếp theo bảng an hiện hành':fire.reason),
    criterion('Cung hạn mạnh theo bảng độ sáng Thiên Đồ',strong,main.reason),
    criterion('Tiêu chuẩn cát tinh ≥2 và sát tinh ≤1 theo nguồn',null,
      'Chưa thẩm định cùng bộ tiêu chuẩn cát/sát, độ sáng giữa hai trường phái')],
   [criterion('Thất Sát chính tinh hội Tam phương Tứ chính hạn',satCourt,main.reason),
    criterion('Lộc Tồn tọa đủ sáu loại Không Vong nguồn',null,
      'Thiên Đồ hiện chỉ kiểm chứng Tuần/Triệt; không dùng làm sáu sao nguồn'),
    criterion('Thiên Mã tọa đủ sáu loại Không Vong nguồn',null,
      'Không đủ quy tắc an độc lập cho sáu sao Không Vong')],
   [criterion('Cung Mệnh yếu theo bảng Thiên Đồ',menhWeak,main.reason),
    criterion('Cung đại hạn mạnh theo bảng Thiên Đồ',strong,main.reason),
    criterion('Tam phương hạn đủ điều kiện hội cát và hạn tốt',null,
      'Chưa xác nhận độ sáng, ngưỡng ≥2 cát và ≤1 sát theo cùng hệ nguồn')]
  ];
  return Object.freeze({index:d.index,fromAge:d.fromAge,toAge:d.toAge,
   branchIndex:d.branch,branchName:BRANCHES[d.branch],palace:h.palace,
   checksByRule:Object.freeze(periods.map(row=>Object.freeze(row)))});
 });
 const items=Object.freeze(IDS.map((id,i)=>Object.freeze({
  id,title:TITLES[i],status:'partial-evidence',unit:'đại hạn',
  sourceUrl:SOURCE,sourceCriterionVerified:false,
  periods:Object.freeze(bounds.map(range=>Object.freeze({
   index:range.index,fromAge:range.fromAge,toAge:range.toAge,
   branchIndex:range.branchIndex,branchName:range.branchName,palace:range.palace,
   checks:range.checksByRule[i]
  })))
 })));
 return Object.freeze({verifiedGeometry:true,checkedPeriods:12,
  sourceInterpretationVerified:false,reason:geometry.reason,items});
}
module.exports=Object.freeze({IDS,SOURCE,auditClassicalDingZaPeriods});
