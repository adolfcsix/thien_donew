'use strict';
/**
 * R28: read-only, fail-closed boundary between observable Tuần/Triệt geometry
 * and source-system "Không Vong" meanings in three still-pending criteria.
 *
 * R27 observed 65 synthetic source charts at pinned iztro@2.6.1 and found
 * paired-branch geometry consistent. It did not validate semantic equivalence
 * or all birth data. This module MUST NOT elevate a pattern verdict.
 */
const Aux=require('@thiendo/astrology-engine/src/auxiliary.js');
const Year=require('@thiendo/astrology-engine/src/year-stars.js');
const {auditNatalObstructionEvidence}=require('./natal-obstruction-evidence.cjs');
const {auditClassicalVoidPairGeometry}=require('./classical-source-void-geometry.cjs');
const {SOURCE_COMMIT}=require('./classical-source-void-vocabulary.cjs');

const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const SOURCE_PIN='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/patterns-dingpin.ts';
const SOURCE_PERIOD='https://github.com/Renhuai123/ziwei-doushu/blob/'+SOURCE_COMMIT+'/lib/ziwei/patterns-dingza.ts';
const LIMITATION='65 lá số giả lập của r27 khớp hình học cặp địa chi, KHÔNG chứng minh Tuần/Triệt đồng nghĩa với bộ 旬空/副旬/截空/副截, không kiểm chứng biến thể phái và không cho phép kết luận cách cục.';
const check=(label,value,detail)=>Object.freeze({
 label,state:value===null?'unknown':value?'met':'not-met',detail
});
function auditLayer(chart,top,field,versionKey,version,source){
 if(!chart||chart[versionKey]!==version||!Array.isArray(chart[top]))return null;
 const want=source;
 if(!Array.isArray(want)||chart[top].length!==want.length)return null;
 const keys=new Set();
 for(let i=0;i<want.length;i++){
  const a=chart[top][i],w=want[i];
  if(!a||!w||a.name!==w.name||a.branch!==w.branch||a.basis!==w.basis||
     !Number.isInteger(w.branch)||w.branch<0||w.branch>11||keys.has(w.name))return null;
  keys.add(w.name);
 }
 if(!Array.isArray(chart.houses)||chart.houses.length!==12)return null;
 for(const h of chart.houses){
  if(!h||!Number.isInteger(h.branchIndex)||!Array.isArray(h[field]))return null;
  const expected=want.filter(w=>w.branch===h.branchIndex).map(w=>w.name);
  if(h[field].length!==expected.length||expected.some((v,i)=>h[field][i]!==v))return null;
 }
 return Object.freeze(Object.fromEntries(want.map(w=>[w.name,w.branch])));
}
function auditClassicalVoidSemanticGates(chart){
 const obstruction=auditNatalObstructionEvidence(chart);
 const geometry=auditClassicalVoidPairGeometry(chart);
 const ready=obstruction.verified&&geometry.status==='matched';
 const branches=ready?Object.freeze([...new Set(chart.obstructionMarkers.flatMap(x=>x.branches))].sort((a,b)=>a-b)):Object.freeze([]);
 const inProxy=b=>Number.isInteger(b)&&b>=0&&b<12?branches.includes(b):null;
 const menh=ready?chart.houses.find(h=>h.palace==='Mệnh'):null;
 const menhIndex=menh?.branchIndex;
 const yearCanChi=typeof chart?.yearCanChi==='string'?chart.yearCanChi.split(' '):[];
 const stem=STEMS.indexOf(yearCanChi[0]);
 const yearBranch=BRANCHES.indexOf(yearCanChi[1]);
 const hour=BRANCHES.indexOf(chart?.hourBranch);
 let aux=null,yr=null;
 if(ready&&stem>=0&&yearBranch>=0&&hour>=0&&Number.isInteger(chart?.lunar?.month)){
  try{
   aux=auditLayer(chart,'auxiliaries','auxiliaryStars','auxiliaryRuleSet',Aux.RULESET,
    Aux.calculate({yearStem:stem,lunarMonth:chart.lunar.month,hourBranch:hour}));
   yr=auditLayer(chart,'yearStars','yearStars','yearStarRuleSet',Year.RULESET,
    Year.calculate(yearBranch));
  }catch{/* Unknown, never a favorable result. */}
 }
 const hasProxyAtMenh=ready&&Number.isInteger(menhIndex)?inProxy(menhIndex):null;
 const loc=aux&&Object.hasOwn(aux,'Lộc Tồn')?aux['Lộc Tồn']:null;
 const horse=yr&&Object.hasOwn(yr,'Thiên Mã')?yr['Thiên Mã']:null;
 const locProxy=ready&&loc!==null?inProxy(loc):null;
 const horseProxy=ready&&horse!==null?inProxy(horse):null;
 const sourceCheck=check('Tuần/Triệt có tương đương ngữ nghĩa và đủ bộ Không Vong theo nguồn',null,
  'Chưa thẩm định phép đồng nhất sao, cặp chính/phụ và quy ước sáu tên (có nhãn cũ). Không được nâng điều kiện này thành Đã quan sát.');
 const common=Object.freeze({
  sourcePlacementVerifiedForCurrentChart:false,
  sourceCriterionVerified:false,
  semanticEquivalenceVerified:false,
  sampleGeometryEvidenceOnly:true,
  sourceSampleCount:65,
  sourceCommit:SOURCE_COMMIT,
  limitation:LIMITATION
 });
 const items=Object.freeze([
  Object.freeze({id:IDS[0],scope:'natal-research',sourceUrl:SOURCE_PIN,...common,
   checks:Object.freeze([
    check('Mệnh có dấu Tuần hoặc Triệt theo Tam Hợp đã kiểm toán',hasProxyAtMenh,
      ready?'Tập vị trí Tuần/Triệt trên lá số hiện tại đã khớp bảng Thiên Đồ và cặp Triệt nguồn; đây chỉ là proxy hình học.':obstruction.reason),
    sourceCheck
   ])}),
  Object.freeze({id:IDS[1],scope:'natal-research',sourceUrl:SOURCE_PIN,...common,
   checks:Object.freeze([
    check('Mệnh có dấu Tuần hoặc Triệt theo Tam Hợp đã kiểm toán',hasProxyAtMenh,
      ready?'Chỉ kiểm tra proxy hình học; Lộc Tồn/Hóa Lộc và Không/Kiếp phải kiểm chứng ở các điều kiện riêng.':obstruction.reason),
    sourceCheck
   ])}),
  Object.freeze({id:IDS[2],scope:'period-research',sourceUrl:SOURCE_PERIOD,...common,
   checks:Object.freeze([
    check('Lộc Tồn nguyên cục tọa một trong hai cặp chi Tuần/Triệt đã kiểm toán',locProxy,
      loc!==null?'Lộc Tồn chi '+loc+' · proxy hình học, chưa xác minh Không Vong của trường phái nguồn.':'Chưa đối chiếu đầy đủ sao Lộc Tồn theo bộ an năm và cung hiện hành.'),
    check('Thiên Mã nguyên cục tọa một trong hai cặp chi Tuần/Triệt đã kiểm toán',horseProxy,
      horse!==null?'Thiên Mã chi '+horse+' · proxy hình học, chưa xác minh Không Vong của trường phái nguồn.':'Chưa đối chiếu đầy đủ sao Thiên Mã theo bộ an năm và cung hiện hành.'),
    sourceCheck
   ])})
 ]);
 return Object.freeze({
  ids:IDS,verifiedLocalObstructions:obstruction.verified,
  trietSourcePairGeometryStatus:geometry.status,
  proxyBranches:branches,sourceCriterionVerified:false,
  semanticEquivalenceVerified:false,
  sourcePlacementVerifiedForCurrentChart:false,
  sourceSampleCount:65,limitation:LIMITATION,items
 });
}
module.exports=Object.freeze({IDS,SOURCE_PIN,SOURCE_PERIOD,LIMITATION,auditClassicalVoidSemanticGates});
