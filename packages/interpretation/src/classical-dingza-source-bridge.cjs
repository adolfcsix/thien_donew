'use strict';
/**
 * R25: three decade-pattern condition maps (R22 + Ding Za 02), never a natal verdict.
 * Source pinned: Renhuai123/ziwei-doushu@7922285d...
 * school-tables.generated.ts SB_QS[1..14], source column 1..12 = Tý..Hợi.
 * Numbers: 1=Miếu,2=Vượng,3=Đắc,4=Lợi,5=Bình,6=Bất,7=Hãm.
 * Matching source table labels to Thiên Đồ placements never establishes
 * agreement between the two independent placement algorithms.
 */
const Strength=require('@thiendo/astrology-engine/src/star-strength.js');
const Aux=require('@thiendo/astrology-engine/src/auxiliary.js');
const Year=require('@thiendo/astrology-engine/src/year-stars.js');
const Advanced=require('@thiendo/astrology-engine/src/advanced-placements.js');
const TuHoa=require('@thiendo/astrology-engine/src/tuhoa.js');
const {auditClassicalDingZaPeriods}=require('./classical-dingza-period-research.cjs');
const {auditNatalFirePosition}=require('./natal-fire-evidence.cjs');
const SOURCE_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const SOURCE_URL='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/school-tables.generated.ts';
const MAPPED_IDS=Object.freeze(['dinh-tap-01','dinh-tap-02','dinh-tap-08']);
const NAMES=Object.freeze(["Tử Vi","Thiên Cơ","Thái Dương","Vũ Khúc","Thiên Đồng","Liêm Trinh","Thiên Phủ","Thái Âm","Tham Lang","Cự Môn","Thiên Tướng","Thiên Lương","Thất Sát","Phá Quân"]);
const RAW=Object.freeze([[5,1,2,2,3,2,1,1,2,2,3,2],[1,7,3,2,4,5,1,7,3,2,4,5],[7,6,2,1,2,2,2,3,3,5,6,7],[2,1,3,4,1,5,2,1,3,4,1,5],[2,6,4,5,5,1,7,6,2,5,5,1],[5,4,1,5,4,7,5,4,1,5,4,7],[1,1,1,3,1,3,2,1,3,2,1,3],[1,1,2,7,7,7,6,6,4,2,2,1],[2,1,5,4,1,7,2,1,5,4,1,7],[2,6,1,1,7,2,2,6,1,1,7,2],[1,1,1,7,3,3,1,3,1,7,3,3],[1,2,1,1,1,3,1,2,7,3,1,7],[2,1,1,2,1,5,2,1,1,2,1,5],[1,2,3,7,2,5,1,2,3,7,2,5]].map(x=>Object.freeze(x)));
const SOURCE_MATRIX=Object.freeze(Object.fromEntries(NAMES.map((name,i)=>[name,RAW[i]])));
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const SHA=Object.freeze(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp']);
const JI=Object.freeze(['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn']);
const NOTE='Áp độ sáng SB_QS nguồn lên vị trí sao Thiên Đồ đã kiểm tra. Chưa xác nhận sự tương đương phép an sao, trường phái hay kết luận vận hạn.';
const c=(label,val,detail)=>Object.freeze({label,state:val===null?'unknown':val?'met':'not-met',detail});
const four=b=>[b,(b+4)%12,(b+8)%12,(b+6)%12];
function lookupSourceMainStrength(name,branch){
 if(typeof name!=='string'||!Object.hasOwn(SOURCE_MATRIX,name)||!Number.isInteger(branch)||branch<0||branch>11)return null;
 const raw=SOURCE_MATRIX[name][branch];
 return Object.freeze({name,branch,raw,weak:raw===7,strong:raw===1||raw===2,
  sourceUrl:SOURCE_URL,placementParityVerified:false});
}
function auditClassicalDingZaSourceBridge(chart){
 const empty=reason=>Object.freeze({mappedIds:MAPPED_IDS,sourceUrl:SOURCE_URL,
  sourceCriterionVerified:false,schoolPlacementVerified:false,sourceProfileReady:false,
  reason,schoolDifferences:Object.freeze([]),items:Object.freeze([])});
 const period=auditClassicalDingZaPeriods(chart);
 if(!period.verifiedGeometry)return empty(period.reason);
 if(!chart||chart.mainStarStrengthRuleSet!==Strength.RULESET||
  !Array.isArray(chart.houses)||chart.houses.length!==12)return empty('Thiếu hoặc sai bảng 14 chính tinh có phiên bản.');
 const byBranch=new Map(),seenNames=new Set(),schoolDifferences=[];
 for(const h of chart.houses){
  if(!h||!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||
   h.branch!==BRANCHES[h.branchIndex]||byBranch.has(h.branchIndex)||
   !Array.isArray(h.stars)||!Array.isArray(h.mainStarStrengths)||
   h.stars.length!==h.mainStarStrengths.length)return empty('Dữ liệu địa bàn và độ sáng chính tinh không nhất quán.');
  const source=[];
  for(let i=0;i<h.stars.length;i++){
   const name=h.stars[i],actual=h.mainStarStrengths[i],want=Strength.lookup(name,h.branchIndex);
   const qs=lookupSourceMainStrength(name,h.branchIndex);
   if(!want||!actual||!qs||seenNames.has(name)||
    Object.keys(want).some(k=>want[k]!==actual[k]))return empty('Bộ an 14 chính tinh hoặc độ sáng Thiên Đồ không đạt kiểm toán.');
   seenNames.add(name);source.push(qs);
  }
  const sw=source.length===0||source.every(x=>x.weak);
  const ss=source.some(x=>x.strong);
  const lw=h.mainStarStrengths.length===0||h.mainStarStrengths.every(x=>x.status==='H');
  const ls=h.mainStarStrengths.some(x=>x.status==='M'||x.status==='V');
  if(sw!==lw||ss!==ls)schoolDifferences.push(h.branchIndex);
  byBranch.set(h.branchIndex,Object.freeze({weak:sw,strong:ss,localWeak:lw,localStrong:ls}));
 }
 if(byBranch.size!==12||seenNames.size!==14)return empty('Thiếu hoặc trùng 14 chính tinh ở 12 cung.');
 const ming=chart.houses.find(h=>h.palace==='Mệnh');
 const than=chart.houses.find(h=>h.isThan===true);
 const thanReady=chart.houses.filter(h=>h.isThan===true).length===1&&
  than&&than.branch===chart.than&&than.palace===chart.thanPalace;
 if(!ming||!thanReady)return empty('Cung Mệnh hoặc cung Thân không được xác thực.');
 const stem=STEMS.indexOf(chart.yearCanChi?.split(' ')[0]);
 const yearBranch=BRANCHES.indexOf(chart.yearCanChi?.split(' ')[1]);
 const hour=BRANCHES.indexOf(chart.hourBranch);
 let aux=null,yr=null,fullyAudited=false;
 if(stem>=0&&yearBranch>=0&&hour>=0){
  try{
   const wantAux=Aux.calculate({yearStem:stem,lunarMonth:chart.lunar.month,hourBranch:hour});
   const wantYr=Year.calculate(yearBranch);
   const same=(a,b)=>a&&b&&a.name===b.name&&a.branch===b.branch&&a.basis===b.basis;
   const matches=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>same(x,b[i]));
   if(chart.auxiliaryRuleSet===Aux.RULESET&&chart.yearStarRuleSet===Year.RULESET&&
     chart.tuHoaRuleSet===TuHoa.RULESET&&matches(chart.auxiliaries,wantAux)&&
     matches(chart.yearStars,wantYr)&&auditNatalFirePosition(chart).verified){
    aux=Object.fromEntries(wantAux.map(x=>[x.name,x.branch]));
    yr=Object.fromEntries(wantYr.map(x=>[x.name,x.branch]));
    const position=new Map(chart.houses.flatMap(h=>h.stars.map(n=>[n,h.branchIndex])));
    for(const x of wantAux)position.set(x.name,x.branch);
    fullyAudited=Array.isArray(chart.transformations)&&chart.transformations.length===4&&
      chart.transformations.every((t,i)=>t.name===TuHoa.TYPES[i]&&
      t.star===TuHoa.ROWS[stem][i]&&t.branch===position.get(t.star))&&
      chart.houses.every(h=>
       [['auxiliaryStars',wantAux],['yearStars',wantYr]].every(([field,layer])=>{
        const values=layer.filter(v=>v.branch===h.branchIndex).map(v=>v.name);
        return Array.isArray(h[field])&&h[field].length===values.length&&
          values.every((v,i)=>h[field][i]===v);
       })&&
       Array.isArray(h.tuHoa)&&
       h.tuHoa.length===chart.transformations.filter(t=>t.branch===h.branchIndex).length);
   }
  }catch{/* unavailable is unknown */}
 }
 const weakBoth=byBranch.get(ming.branchIndex).weak&&byBranch.get(than.branchIndex).weak;
 const weakMing=byBranch.get(ming.branchIndex).weak;
 const reports=period.items.filter(item=>MAPPED_IDS.includes(item.id)).map(item=>Object.freeze({
  id:item.id,status:'mapped-condition-research',sourceCriterionVerified:false,
  sourcePlacementVerified:false,unit:'đại hạn',sourceUrl:SOURCE_URL,
  periods:Object.freeze(item.periods.map(p=>{
   const sf=four(p.branchIndex),strong=byBranch.get(p.branchIndex).strong;
   let good=null,satOnLimit=null,atLimitCount=null,detail='Chưa kiểm tra đủ lớp sao phụ, sao năm, Tứ Hóa và sáu sát theo nguyên cục.';
   if(fullyAudited){
    const support=JI.filter(name=>sf.includes(aux[name])).length+
      Number(sf.includes(yr['Thiên Mã']))+
      chart.transformations.slice(0,3).filter(t=>
        NAMES.includes(t.star)&&sf.includes(t.branch)).length;
    const evilPositions=SHA.map(name=>Object.hasOwn(aux,name)?aux[name]:
       chart.advancedStars.find(x=>x.name===name)?.branch);
    const evil=evilPositions.filter(branch=>sf.includes(branch)).length;
    atLimitCount=evilPositions.filter(branch=>branch===p.branchIndex).length;
    satOnLimit=atLimitCount>=1;
    good=strong&&support>=2&&evil<=1;
    detail='SB_QS hạn mạnh='+strong+', cát hội='+support+' (≥2), sát hội='+evil+' (≤1); vẫn chưa xác nhận vị trí sao nguồn.';
   }
   const checks=item.id==='dinh-tap-01'?[
    c('Mệnh và Thân yếu theo SB_QS tại vị trí sao Thiên Đồ',weakBoth,NOTE)
   ]:item.id==='dinh-tap-02'?[
    c('Ít nhất một trong sáu sát tinh nguyên cục tọa đúng cung đại hạn',
      satOnLimit,fullyAudited?'Sát tinh tọa hạn='+atLimitCount+'; lớp sao đã đối chiếu phiên bản.':
      'Chưa đối chiếu đủ sáu sát tinh và các lớp sao nguyên cục.'),
    c('Cung đại hạn mạnh theo bảng SB_QS của nguồn',strong,NOTE),
    c('Tam phương tứ chính hạn có cát ≥2 và sát ≤1 khi cung hạn mạnh',good,detail)
   ]:[
    c('Mệnh yếu theo SB_QS tại vị trí sao Thiên Đồ',weakMing,NOTE),
    c('Hạn mạnh theo SB_QS tại vị trí sao Thiên Đồ',strong,NOTE),
    c('Hạn tốt theo công thức QS trên dữ liệu nguyên cục đã đối chiếu',good,detail)
   ];
   return Object.freeze({index:p.index,fromAge:p.fromAge,toAge:p.toAge,
    branchIndex:p.branchIndex,checks:Object.freeze(checks.map(Object.freeze))});
  }))
 }));
 return Object.freeze({mappedIds:MAPPED_IDS,sourceUrl:SOURCE_URL,
  sourceCriterionVerified:false,schoolPlacementVerified:false,sourceProfileReady:true,
  reason:NOTE,schoolDifferences:Object.freeze(schoolDifferences),items:Object.freeze(reports)});
}
module.exports=Object.freeze({SOURCE_COMMIT,SOURCE_URL,NAMES,SOURCE_MATRIX,MAPPED_IDS,
 lookupSourceMainStrength,auditClassicalDingZaSourceBridge});
