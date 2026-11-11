'use strict';
const MainStarStrength=require('@thiendo/astrology-engine/src/star-strength.js');
const NatalTuHoa=require('@thiendo/astrology-engine/src/tuhoa.js');
const NatalAux=require('@thiendo/astrology-engine/src/auxiliary.js');
const {auditNatalObstructionEvidence}=require('./natal-obstruction-evidence.cjs');
const {auditNatalFirePosition}=require('./natal-fire-evidence.cjs');
const {compareQSBrightness}=require('./classical-brightness-comparison.cjs');
const {SOURCE_VOID_NOTICE}=require('./classical-source-void-vocabulary.cjs');
const {orKnown}=require('./classical-evidence-logic.cjs');
/**
 * THIÊN ĐỒ — đối chiếu 28 chỉ mục Tử Vi, gồm một mục Tham Hỏa chưa đủ chứng cứ độ sáng; kiểm toán Tuần/Triệt độc lập, KHÔNG phải bộ phán định 49 cách cục.
 * Nguồn phương pháp tham khảo: Renhuai123/ziwei-doushu, MIT; thuật toán/diễn giải độc lập.
 * Trả về chứng cứ, điều kiện chưa xét, sai lệch dữ liệu. Không sửa lá số và không dự báo.
 */
const SOURCE='https://github.com/Renhuai123/ziwei-doushu';
const SOURCE_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const LAYERS=Object.freeze(['stars','auxiliaryStars','yearStars','additionalStars','traditionalStars','natalExtensionStars','beneficStars','advancedStars','positionalStars','derivedStars','missingStars']);
const SUPPORT=Object.freeze(['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã']);
const GROUPS=Object.freeze([
 Object.freeze({name:'Định phú',totalInReference:6,implementedHere:4,scope:'Bản mệnh'}),
 Object.freeze({name:'Định quý',totalInReference:27,implementedHere:21,scope:'Bản mệnh; Tham Hỏa chưa xác minh độ sáng Hỏa Tinh'}),
 Object.freeze({name:'Định bần',totalInReference:8,implementedHere:3,scope:'Bản mệnh / Mệnh–Thân; không phải dự đoán'}),
 Object.freeze({name:'Định tạp',totalInReference:8,implementedHere:0,scope:'Đại hạn / lưu niên; không thể ghép như cách cục bản mệnh'})
]);
const mod=n=>(n%12+12)%12;
function validate(chart){
 if(!chart || !Array.isArray(chart.houses)||chart.houses.length!==12)throw new RangeError('Thiếu địa bàn 12 cung.');
 const branches=new Set(),palaces=new Set();
 for(const h of chart.houses){
  if(!h||!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||typeof h.palace!=='string'||!Array.isArray(h.stars))throw new RangeError('Cấu trúc cung không hợp lệ.');
  if(branches.has(h.branchIndex)||palaces.has(h.palace))throw new RangeError('Địa bàn có cung hoặc địa chi trùng lặp.');
  branches.add(h.branchIndex);palaces.add(h.palace);
 }
 for(const name of ['Mệnh','Quan Lộc','Tài Bạch','Điền Trạch'])if(!palaces.has(name))throw new RangeError('Thiếu cung bắt buộc: '+name);
 return Object.freeze({byBranch:new Map(chart.houses.map(h=>[h.branchIndex,h])),byPalace:new Map(chart.houses.map(h=>[h.palace,h]))});
}
function getPosition(chart,name,requiredLayer){
 const matches=[];let bad=false;
 for(const h of chart.houses){
  for(const layer of LAYERS){
   const arr=h[layer];if(arr!=null&&!Array.isArray(arr)){bad=true;continue;}
   for(const v of Array.isArray(arr)?arr:[])if(v===name)matches.push({branchIndex:h.branchIndex,palace:h.palace,branch:h.branch,layer});
  }
 }
 if(bad||matches.length!==1||matches[0].layer!==requiredLayer){
  return {status:matches.length>1?'ambiguous':'unverified',name,layer:requiredLayer,
   locations:matches.map(({branchIndex,palace,layer})=>({branchIndex,palace,layer}))};
 }
 return {status:'observed',name,...matches[0]};
}
/**
 * Cung Thân must be read from the natal chart's unique isThan marker,
 * not inferred from age overlays or copied from an unrelated house.
 * Check optional top-level summary for contradictions when it exists.
 */
function readNatalThan(chart){
 const markers=chart.houses.filter(h=>h.isThan===true);
 if(chart.houses.some(h=>typeof h.isThan!=='boolean')||markers.length!==1)
  return {known:false,reason:'Thiếu hoặc trùng cờ cung Thân nguyên cục (isThan).'};
 const h=markers[0];
 if((chart.than!==undefined&&chart.than!==h.branch)||
    (chart.thanPalace!==undefined&&chart.thanPalace!==h.palace))
  return {known:false,reason:'Cung Thân trên địa bàn không nhất quán với thông tin tổng hợp.'};
 return {known:true,branchIndex:h.branchIndex,palace:h.palace,reason:'Đã đối chiếu cung Thân duy nhất trên địa bàn.'};
}
/**
 * Verify the provenance and *every* same-house main-star strength record
 * against the actual versioned Thiên Đồ reference matrix. Do not translate
 * another school's miếu/vượng/hãm, or accept unlabelled/client-made values.
 */
function readVerifiedMainStrength(chart,position){
 const unknown=reason=>({known:false,reason});
 if(position.status!=='observed')return unknown('Chưa xác minh được vị trí duy nhất của chính tinh.');
 if(chart.mainStarStrengthRuleSet!==MainStarStrength.RULESET)
  return unknown('Thiếu hoặc sai phiên bản bảng độ sáng chính tinh.');
 const house=chart.houses.find(h=>h.branchIndex===position.branchIndex);
 if(!house||!Array.isArray(house.mainStarStrengths)||house.mainStarStrengths.length!==house.stars.length)
  return unknown('Danh sách độ sáng trong cung thiếu hoặc không khớp danh sách chính tinh.');
 for(let i=0;i<house.stars.length;i++){
  const expected=MainStarStrength.lookup(house.stars[i],house.branchIndex);
  const actual=house.mainStarStrengths[i];
  if(!expected||!actual||Object.keys(expected).some(key=>actual[key]!==expected[key]))
   return unknown('Độ sáng, địa chi hoặc hồ sơ nguồn chưa khớp với bảng đã định phiên bản.');
 }
 const record=house.mainStarStrengths.find(x=>x.name===position.name);
 if(!record)return unknown('Không tìm thấy độ sáng của chính tinh cần đối chiếu.');
 return {known:true,status:record.status,label:record.label,source:record.source,ruleSet:record.ruleSet,
  reason:record.name+' tại '+position.palace+' / '+position.branchIndex+': '+record.label+' ('+record.ruleSet+')'};
}
const check=(label,met,detail)=>({label,state:met===null?'unknown':met?'met':'not-met',detail});
function result(id,title,group,sourceFile,interpretation,checks,extra){
 const negative=checks.some(x=>x.state==='not-met');
 const unknown=checks.some(x=>x.state==='unknown');
 return Object.freeze({id,title,group,reference:'《Tử Vi Đẩu Số Toàn Thư》, quyển I · '+group,
  sourceUrl:SOURCE+'/blob/'+SOURCE_COMMIT+'/lib/ziwei/'+sourceFile,
  status:negative?'not-met':unknown?'needs-review':'structural-match',checks,
  interpretation,extra,expertReviewed:false,
  caution:'Chỉ kiểm tra điều kiện bằng dữ kiện trên lá số và một quy ước tham khảo; không tự xác nhận thành cách, cát/hung hay dự đoán sự kiện.'});
}
/**
 * Natal transformations only. Missing/duplicate/cross-house/mismatched evidence is
 * unknown, never an affirmative hit. Never substitute a time-overlay transformation.
 */
function readNatalFourHua(chart){
 const labels=['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'];
 const byName=new Map();
 for(const house of chart.houses){
  if(!Array.isArray(house.tuHoa))return {known:false,reason:'Thiếu danh mục Tứ Hóa nguyên cục tại một hoặc nhiều cung.',byName};
  for(const entry of house.tuHoa){
   if(!entry||!labels.includes(entry.name)||typeof entry.star!=='string'||!entry.star) return {known:false,reason:'Dữ liệu Hóa không hợp lệ.',byName};
   if(byName.has(entry.name))return {known:false,reason:'Một loại Hóa bị ghi nhiều lần.',byName};
   // The star targeted by a natal Hua must be present in precisely one natal
   // star layer in exactly the same house, never a projected or annual layer.
   const positions=[];
   for(const h of chart.houses)for(const layer of ['stars','auxiliaryStars']){
    if(!Array.isArray(h[layer]))return {known:false,reason:'Lớp sao nhận Hóa không hợp lệ.',byName};
    for(const name of h[layer])if(name===entry.star)positions.push(h.branchIndex);
   }
   if(positions.length!==1||positions[0]!==house.branchIndex) return {known:false,reason:'Sao nhận Hóa thiếu, trùng hoặc sai cung.',byName};
   byName.set(entry.name,{branchIndex:house.branchIndex,star:entry.star});
  }
 }
 if(byName.size!==4)return {known:false,reason:'Chưa đủ bốn Hóa nguyên cục.',byName};
 if(chart.transformations!==undefined){
  if(!Array.isArray(chart.transformations)||chart.transformations.length!==4)return {known:false,reason:'Bảng Tứ Hóa gốc không đầy đủ.',byName};
  const seen=new Set();
  for(const t of chart.transformations){
   const match=t&&byName.get(t.name);
   if(!match||seen.has(t.name)||match.star!==t.star||match.branchIndex!==t.branch)return {known:false,reason:'Bảng Tứ Hóa gốc và dữ kiện cung không nhất quán.',byName};
   seen.add(t.name);
  }
 }
 return {known:true,reason:'Bốn Hóa nguyên cục có vị trí và sao nhận Hóa nhất quán.',byName};
}

/**
 * Read a *pinned* annual natal Tứ Hóa row; a shape-valid four-Hua object is
 * not enough evidence of a source-correct year-stem allocation.
 */
function readVerifiedYearHua(chart,hua){
 const unknown=reason=>({known:false,reason});
 if(!hua.known)return unknown(hua.reason);
 if(chart.tuHoaRuleSet!==NatalTuHoa.RULESET)
  return unknown('Thiếu hoặc sai phiên bản bảng Tứ Hóa năm sinh.');
 const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
 const stem=typeof chart.yearCanChi==='string'?stems.findIndex(x=>chart.yearCanChi===x||chart.yearCanChi.startsWith(x+' ')):-1;
 if(stem<0)return unknown('Thiếu hoặc sai can năm trên lá số nguyên cục.');
 const labels=['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'];
 for(let i=0;i<4;i++){
  const item=hua.byName.get(labels[i]);
  if(!item||item.star!==NatalTuHoa.ROWS[stem][i])
   return unknown('Sao nhận Tứ Hóa không đúng bảng nguyên cục theo can năm đã chọn.');
 }
 const loc=hua.byName.get('Hóa Lộc'),quyen=hua.byName.get('Hóa Quyền');
 if(loc.star===quyen.star)return unknown('Hóa Lộc và Hóa Quyền không được dùng chung một sao nhận Hóa.');
 return {known:true,loc,quyen,reason:'Đã xác minh đủ Tứ Hóa theo can năm và bảng '+NatalTuHoa.RULESET};
}

/**
 * Lộc Tồn branch is considered KNOWN only when the whole versioned natal
 * auxiliary layer is reproducible from the current chart's year/month/hour,
 * including every per-house auxiliary star and the one unique source position.
 * A merely observed star or a mismatched ruleSet is not verified evidence.
 */
function readVerifiedNatalLocTon(chart,loc){
 const unknown=reason=>({known:false,reason});
 if(loc.status!=='observed')return unknown('Lộc Tồn không có vị trí sao phụ duy nhất.');
 const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
 const branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
 const tokens=typeof chart.yearCanChi==='string'?chart.yearCanChi.split(' '):[];
 const stem=stems.indexOf(tokens[0]),hour=branches.indexOf(chart.hourBranch);
 if(stem<0||hour<0||!Number.isInteger(chart.lunar?.month)||
    chart.lunar.month<1||chart.lunar.month>12||
    chart.auxiliaryRuleSet!==NatalAux.RULESET||
    !Array.isArray(chart.auxiliaries))
  return unknown('Không đủ nguồn Can năm, tháng âm, giờ hoặc phiên bản an sao phụ.');
 try{
  const expected=NatalAux.calculate({yearStem:stem,lunarMonth:chart.lunar.month,hourBranch:hour});
  if(chart.auxiliaries.length!==expected.length||
     !expected.every((want,i)=>{
      const item=chart.auxiliaries[i];
      return item&&item.name===want.name&&item.branch===want.branch&&item.basis===want.basis;
     })||chart.houses.some(h=>{
      const want=expected.filter(x=>x.branch===h.branchIndex).map(x=>x.name);
      return !Array.isArray(h.auxiliaryStars)||h.auxiliaryStars.length!==want.length||
       want.some((name,i)=>h.auxiliaryStars[i]!==name);
     }))
   return unknown('Lớp sao phụ trên 12 cung không khớp bộ an gốc.');
  const want=expected.filter(x=>x.name==='Lộc Tồn');
  if(want.length!==1||want[0].branch!==loc.branchIndex)
   return unknown('Vị trí Lộc Tồn không khớp nguồn theo Can năm.');
  return {known:true,branchIndex:want[0].branch,reason:'Lộc Tồn nguyên cục đã đối chiếu '+NatalAux.RULESET};
 }catch{return unknown('Không tính lại được lớp sao phụ từ dữ liệu sinh.');}
}

/** Đánh giá độc lập, giữ nguyên địa bàn, không trộn lớp lưu hạn với sao bản mệnh. */
function auditClassicalPatternCandidates(chart){
 const {byBranch,byPalace}=validate(chart);
 const sun=getPosition(chart,'Thái Dương','stars');
 const moon=getPosition(chart,'Thái Âm','stars');
 const wu=getPosition(chart,'Vũ Khúc','stars');
 const liem=getPosition(chart,'Liêm Trinh','stars');
 const pha=getPosition(chart,'Phá Quân','stars');
 const phaStrength=readVerifiedMainStrength(chart,pha);
 const khong=getPosition(chart,'Địa Không','advancedStars');
 const kiep=getPosition(chart,'Địa Kiếp','advancedStars');
 const thienHinh=getPosition(chart,'Thiên Hình','additionalStars');
 const than=readNatalThan(chart);
 const horse=getPosition(chart,'Thiên Mã','yearStars');
 const loc=getPosition(chart,'Lộc Tồn','auxiliaryStars');
 const co=getPosition(chart,'Cự Môn','stars');
 const ki=getPosition(chart,'Thiên Cơ','stars');
 const zi=getPosition(chart,'Tử Vi','stars');
 const fu=getPosition(chart,'Thiên Phủ','stars');
 const sat=getPosition(chart,'Thất Sát','stars');
 const tham=getPosition(chart,'Tham Lang','stars');
 const thamStrength=readVerifiedMainStrength(chart,tham);
 const fire=getPosition(chart,'Hỏa Tinh','advancedStars');
 const fireAudit=auditNatalFirePosition(chart);
 // Standalone comparative profile. Never wire its values into criteria/verdicts.
 const brightnessComparison=compareQSBrightness(chart,fireAudit,tham,thamStrength);
 const tuong=getPosition(chart,'Thiên Tướng','stars');
 const ta=getPosition(chart,'Tả Phụ','auxiliaryStars');
 const huu=getPosition(chart,'Hữu Bật','auxiliaryStars');
 const khoi=getPosition(chart,'Thiên Khôi','auxiliaryStars');
 const viet=getPosition(chart,'Thiên Việt','auxiliaryStars');
 const hua=readNatalFourHua(chart);
 const obstructionAudit=auditNatalObstructionEvidence(chart);
 const verifiedYearHua=readVerifiedYearHua(chart,hua);
 const locHuaStar=verifiedYearHua.known?getPosition(chart,verifiedYearHua.loc.star,'stars'):null;
 const quyenHuaStar=verifiedYearHua.known?getPosition(chart,verifiedYearHua.quyen.star,'stars'):null;
 const locHuaStrength=locHuaStar?readVerifiedMainStrength(chart,locHuaStar):null;
 const quyenHuaStrength=quyenHuaStar?readVerifiedMainStrength(chart,quyenHuaStar):null;
 const good=[...SUPPORT].filter(name=>LAYERS.some(layer=>{const h=byPalace.get('Mệnh');return Array.isArray(h[layer])&&h[layer].includes(name);}));
 const meng=byPalace.get('Mệnh');
 const observed=x=>x.status==='observed';
 // A duplicate or wrong-layer Loc Ton cannot be affirmative evidence.
 const locDataValid=observed(loc); // Missing Loc Ton means the natal chart evidence is incomplete.
 const nearHorse=[meng.branchIndex,mod(meng.branchIndex+1)];
 const locNear=observed(loc)&&nearHorse.includes(loc.branchIndex);
 const natalHuaLocNear=hua.known&&nearHorse.includes(hua.byName.get('Hóa Lộc').branchIndex);
 const locOrNatalHua=locDataValid?
  (locNear||natalHuaLocNear?true:(observed(loc)&&hua.known?false:null)):null;
 // Count only unique, verified natal positions, never projected period stars.
 const verifiedHelpers=SUPPORT.filter(name=>{
  const position=getPosition(chart,name,name==='Thiên Mã'?'yearStars':'auxiliaryStars');
  return observed(position)&&position.branchIndex===meng.branchIndex;
 });
 const natalBeneficHua=hua.known&&['Hóa Lộc','Hóa Quyền','Hóa Khoa'].some(name=>hua.byName.get(name).branchIndex===meng.branchIndex);
 const hasBeneficInMenh=verifiedHelpers.length>0||natalBeneficHua?true:(hua.known?false:null);
 // Source Ding Pin 02 is natal Lộc Tồn OR natal Hóa Lộc at Mệnh.
 // A verified true branch is sufficient even when the other is unknown;
 // a false requires BOTH branches verified false.
 const verifiedNatalLoc=readVerifiedNatalLocTon(chart,loc);
 const natalLocAtMenh=verifiedNatalLoc.known?
  verifiedNatalLoc.branchIndex===meng.branchIndex:null;
 const natalHuaLocAtMenh=verifiedYearHua.known?
  verifiedYearHua.loc.branchIndex===meng.branchIndex:null;
 const dingPin02LocEvidence=orKnown(natalLocAtMenh,natalHuaLocAtMenh);
 const place=(x,desc,pred)=>check(desc,observed(x)?pred(x):null,observed(x)?x.name+': '+x.palace+', chi số '+x.branchIndex:x.name+': thiếu hoặc mâu thuẫn vị trí ('+x.status+')');
 const notes={
  specific:'Cần xác định đúng vị trí sao và quy ước trường phái trước khi đọc ý nghĩa.',
  void:SOURCE_VOID_NOTICE
 };
 const records=[
  result('dinh-quy-02','Nhật xuất Phù Tang','Định quý','patterns-dinggui.ts',
   'Thái Dương tại Mão, đồng thời cung Mão là Mệnh hoặc Quan Lộc. Đây là hai vị trí mà bản chú giải tham khảo xét, không thay bằng thế hội chiếu rộng.',[
   place(sun,'Thái Dương tọa Mão',x=>x.branchIndex===3),
   place(sun,'Mão thuộc Mệnh hoặc Quan Lộc',x=>['Mệnh','Quan Lộc'].includes(x.palace))],notes.specific),
  result('dinh-quy-01','Nhật Nguyệt giáp Mệnh','Định quý','patterns-dinggui.ts',
   'Hai sao Nhật – Nguyệt chia nhau hai cung kề Mệnh; bản tham khảo còn yêu cầu Mệnh không tọa Không Vong và có cát tinh. Không được bỏ qua hai điều kiện này.',[
   place(sun,'Thái Dương ở một trong hai cung giáp Mệnh',x=>[mod(meng.branchIndex-1),mod(meng.branchIndex+1)].includes(x.branchIndex)),
   place(moon,'Thái Âm ở cung giáp đối diện Thái Dương',x=>observed(sun)?x.branchIndex===mod(2*meng.branchIndex-sun.branchIndex):null),
   check('Có cát tinh trong cung Mệnh theo danh mục đối chiếu',good.length>0,good.length?good.join(', '):'Chưa thấy cát tinh từ danh mục đang hỗ trợ'),
   check('Dấu Tuần/Triệt đã được đối chiếu theo dữ liệu nguyên cục',obstructionAudit.verified?true:null,obstructionAudit.reason),
   check('Đối chiếu đầy đủ điều kiện Không Vong',null,notes.void)],notes.void),
  result('dinh-phu-05','Nhật Nguyệt chiếu bích','Định phú','patterns-dingfu.ts',
   'Thái Dương và Thái Âm cùng tọa Điền Trạch; đây là điều kiện đồng cung, không phải chỉ đồng hội Tam Hợp.',[
    place(sun,'Thái Dương tại Điền Trạch',x=>x.palace==='Điền Trạch'),
    place(moon,'Thái Âm tại cùng Điền Trạch',x=>observed(sun)?x.palace==='Điền Trạch'&&x.branchIndex===sun.branchIndex:null)],notes.specific),
  result('dinh-phu-06','Kim xán quang huy','Định phú','patterns-dingfu.ts',
   'Mệnh ở Ngọ, Thái Dương độc thủ (không có chính tinh thứ hai cùng cung).',[
    check('Cung Mệnh đóng Ngọ',meng.branchIndex===6,'Mệnh chi số '+meng.branchIndex),
    place(sun,'Thái Dương thủ Mệnh tại Ngọ',x=>x.branchIndex===6&&x.palace==='Mệnh'),
    check('Mệnh có duy nhất một chính tinh, là Thái Dương',meng.stars.length===1&&meng.stars[0]==='Thái Dương','Chính tinh tại Mệnh: '+(meng.stars.join(', ')||'không có'))],notes.specific),
  result('dinh-phu-02','Nhật Nguyệt giáp Tài','Định phú','patterns-dingfu.ts',
   'Vũ Khúc tọa Mệnh hoặc Tài Bạch; Thái Âm ở cung trước, Thái Dương ở cung sau. Phải xét vị trí kề ±1, không tính cách hai cung.',[
    place(wu,'Vũ Khúc tại Mệnh hoặc Tài Bạch',x=>['Mệnh','Tài Bạch'].includes(x.palace)),
    place(moon,'Thái Âm ở cung trước Vũ Khúc',x=>observed(wu)?x.branchIndex===mod(wu.branchIndex-1):null),
    place(sun,'Thái Dương ở cung sau Vũ Khúc',x=>observed(wu)?x.branchIndex===mod(wu.branchIndex+1):null)],notes.specific),
  result('dinh-quy-03','Nguyệt lạc Hợi cung','Định quý','patterns-dinggui.ts',
   'Thái Âm tọa Hợi tại cung Mệnh, còn được ghi là Nguyệt lãng Thiên Môn trong một số chú giải. Không mở rộng sang trường hợp chỉ hội chiếu.',[
    place(moon,'Thái Âm tại Hợi',x=>x.branchIndex===11),
    place(moon,'Cung Hợi là Mệnh',x=>x.palace==='Mệnh')],notes.specific),
  result('dinh-quy-04','Nguyệt sinh Thương Hải','Định quý','patterns-dinggui.ts',
   'Thái Âm ở Tý (Thương Hải) thủ Điền Trạch. Không đồng nhất điều kiện Điền Trạch với Mệnh hoặc đối cung.',[
    place(moon,'Thái Âm tọa Tý',x=>x.branchIndex===0),
    place(moon,'Cung Tý là Điền Trạch',x=>x.palace==='Điền Trạch')],notes.specific),
  result('dinh-quy-13','Minh châu xuất hải','Định quý','patterns-dinggui.ts',
   'Mệnh tại Mùi không có chính tinh; đối cung Sửu phải có cả Thái Dương và Thái Âm. Cần xét đúng cung và đúng lớp chính tinh.',[
    check('Mệnh ở Mùi',meng.branchIndex===7,'Mệnh chi số '+meng.branchIndex),
    check('Mệnh vô chính diệu',meng.stars.length===0,'Chính tinh tại Mệnh: '+(meng.stars.join(', ')||'không có')),
    place(sun,'Thái Dương ở đối cung Sửu',x=>x.branchIndex===1),
    place(moon,'Thái Âm cùng đối cung Sửu',x=>x.branchIndex===1)],notes.specific),
  result('dinh-quy-14','Nhật Nguyệt đồng lâm','Định quý','patterns-dinggui.ts',
   'Thái Dương và Thái Âm đồng cung Mệnh. Không xem hai sao ở Tam Hợp hay đối cung là đồng lâm.',[
    place(sun,'Thái Dương ở Mệnh',x=>x.palace==='Mệnh'),
    place(moon,'Thái Âm ở đúng cung Mệnh cùng Thái Dương',x=>observed(sun)?x.palace==='Mệnh'&&x.branchIndex===sun.branchIndex:null)],notes.specific),
  result('dinh-quy-17','Tham Hỏa tương phùng','Định quý','patterns-dinggui.ts',
   'Tham Lang và Hỏa Tinh nguyên cục cùng thủ Mệnh; nguyên chú giải còn yêu cầu cả hai ở Miếu/Vượng. Thiên Đồ hiện chỉ có độ sáng Tham Lang trong bảng 14 chính tinh, nên KHÔNG thể xác nhận cách cục này.',[
    place(tham,'Tham Lang chính tinh nguyên cục thủ Mệnh',x=>x.branchIndex===meng.branchIndex),
    place(fire,'Hỏa Tinh nguyên cục đồng tọa Mệnh',x=>x.branchIndex===meng.branchIndex),
    check('Hỏa Tinh được xác minh từ năm/giờ theo bảng Tam Hợp có phiên bản',
      fireAudit.verified?true:null,fireAudit.reason),
    check('Độ sáng Tham Lang được đối chiếu theo bảng 14 chính tinh của Thiên Đồ',
      thamStrength.known?true:null,thamStrength.reason),
    check('Tham Lang thuộc Miếu hoặc Vượng tại cung Mệnh',
      thamStrength.known?['M','V'].includes(thamStrength.status):null,thamStrength.reason),
    check('Hỏa Tinh cũng thuộc Miếu hoặc Vượng theo nguồn học thuật được thẩm định',
      null,'Chưa có bảng độ sáng Hỏa Tinh đã định phiên bản trong engine; không lấy độ sáng của 14 chính tinh thay thế.')],
   'Kể cả các điều kiện vị trí đều khớp, mục này vẫn cần thẩm định độ sáng Hỏa Tinh. Không suy diễn thành phán đoán vận mệnh.'),
  result('dinh-quy-18','Vũ Khúc thủ viên','Định quý','patterns-dinggui.ts',
   'Vũ Khúc thủ Mệnh tại Mão; chú giải tham khảo giới hạn riêng cung Mão, không suy rộng ra cung khác.',[
    place(wu,'Vũ Khúc ở Mão',x=>x.branchIndex===3),
    place(wu,'Mão là cung Mệnh',x=>x.palace==='Mệnh')],notes.specific),
  result('dinh-quy-24','Cự Cơ cư Mão','Định quý','patterns-dinggui.ts',
   'Cự Môn và Thiên Cơ phải đồng cung Mệnh tại Mão; không dùng thế hội chiếu để thay thế.',[
    check('Mệnh tọa Mão',meng.branchIndex===3,'Mệnh chi số '+meng.branchIndex),
    place(co,'Cự Môn ở Mão và tọa Mệnh',x=>x.branchIndex===3&&x.palace==='Mệnh'),
    place(ki,'Thiên Cơ ở Mão và tọa Mệnh',x=>x.branchIndex===3&&x.palace==='Mệnh')],notes.specific),
  result('dinh-quy-05','Phụ Bật củng chủ','Định quý','patterns-dinggui.ts',
   'Tử Vi thủ Mệnh, Tả Phụ và Hữu Bật đồng thời hội Tứ chính, giáp Mệnh hoặc cùng tọa Mệnh theo quy tắc tham khảo; không tính một sao đơn lẻ.',[
    place(zi,'Tử Vi tọa cung Mệnh',x=>x.palace==='Mệnh'),
    check('Tả Phụ và Hữu Bật cùng hội, giáp hoặc đồng tọa Mệnh',observed(ta)&&observed(huu)?
      (([meng.branchIndex,mod(meng.branchIndex+4),mod(meng.branchIndex+8),mod(meng.branchIndex+6)].includes(ta.branchIndex)&&[meng.branchIndex,mod(meng.branchIndex+4),mod(meng.branchIndex+8),mod(meng.branchIndex+6)].includes(huu.branchIndex))||
      (ta.branchIndex===mod(meng.branchIndex-1)&&huu.branchIndex===mod(meng.branchIndex+1))||
      (huu.branchIndex===mod(meng.branchIndex-1)&&ta.branchIndex===mod(meng.branchIndex+1))):null,
      observed(ta)&&observed(huu)?'Tả Phụ tại chi số '+ta.branchIndex+'; Hữu Bật tại chi số '+huu.branchIndex:'Thiếu hoặc trùng vị trí Tả Phụ/Hữu Bật')],notes.specific),
  result('dinh-quy-06','Quân thần khánh hội','Định quý','patterns-dinggui.ts',
   'Tử Vi, Tả Phụ, Hữu Bật phải đồng tọa cung Mệnh. Hội chiếu mà không đồng cung không đủ điều kiện.',[
    place(zi,'Tử Vi tại Mệnh',x=>x.palace==='Mệnh'),
    place(ta,'Tả Phụ cùng tọa Mệnh',x=>x.palace==='Mệnh'),
    place(huu,'Hữu Bật cùng tọa Mệnh',x=>x.palace==='Mệnh')],notes.specific),
  result('dinh-quy-09','Tọa quý hướng quý','Định quý','patterns-dinggui.ts',
   'Thiên Khôi và Thiên Việt phân tọa Mệnh và đối cung: một sao tọa, một sao hướng. Không đồng nhất với thế giáp Mệnh.',[
    check('Khôi Việt phân tọa Mệnh và đối cung',observed(khoi)&&observed(viet)?
      ((khoi.branchIndex===meng.branchIndex&&viet.branchIndex===mod(meng.branchIndex+6))||
      (viet.branchIndex===meng.branchIndex&&khoi.branchIndex===mod(meng.branchIndex+6))):null,
      observed(khoi)&&observed(viet)?'Khôi chi số '+khoi.branchIndex+'; Việt chi số '+viet.branchIndex:'Thiếu hoặc trùng vị trí Khôi/Việt')],notes.specific),
  result('dinh-quy-16','Khoa Quyền Lộc củng','Định quý','patterns-dinggui.ts',
   'Cả Hóa Khoa, Hóa Quyền và Hóa Lộc nguyên cục cùng nằm trong Tam phương Tứ chính của Mệnh; không sử dụng Tứ Hóa lưu hạn để thế chỗ.',[
    check('Tứ Hóa nguyên cục được xác minh đầy đủ',hua.known?true:null,hua.reason),
    check('Hóa Khoa, Hóa Quyền và Hóa Lộc đều hội Tứ chính Mệnh',hua.known?
      ['Hóa Khoa','Hóa Quyền','Hóa Lộc'].every(name=>[meng.branchIndex,mod(meng.branchIndex+4),mod(meng.branchIndex+8),mod(meng.branchIndex+6)].includes(hua.byName.get(name).branchIndex)):null,
      hua.known?['Hóa Khoa','Hóa Quyền','Hóa Lộc'].map(name=>name+' tại chi số '+hua.byName.get(name).branchIndex).join('; '):hua.reason)],notes.specific),
  result('dinh-quy-20','Tử Phủ triều viên','Định quý','patterns-dinggui.ts',
   'Mệnh tại Dần hoặc Thân, đồng thời Tử Vi và Thiên Phủ đồng tọa Mệnh; không lấy hội chiếu hoặc đối cung thay đồng cung.',[
    check('Mệnh tại Dần hoặc Thân',[2,8].includes(meng.branchIndex),'Mệnh chi số '+meng.branchIndex),
    place(zi,'Tử Vi tại cung Mệnh',x=>x.palace==='Mệnh'),
    place(fu,'Thiên Phủ cùng tọa Mệnh',x=>x.palace==='Mệnh')],notes.specific),
  result('dinh-quy-11','Thất Sát triều đẩu','Định quý','patterns-dinggui.ts',
   'Thất Sát nguyên cục thủ cung Mệnh tại Tý, Dần, Ngọ hoặc Thân; không thay thế bằng hội chiếu hay lớp sao vận hạn.',[
    check('Mệnh tọa Tý, Dần, Ngọ hoặc Thân',[0,2,6,8].includes(meng.branchIndex),'Chi số Mệnh: '+meng.branchIndex),
    place(sat,'Thất Sát nguyên cục thủ Mệnh',x=>x.branchIndex===meng.branchIndex&&x.palace==='Mệnh')],notes.specific),
  result('dinh-quy-19','Phủ Tướng triều viên','Định quý','patterns-dinggui.ts',
   'Mệnh ở Dần hoặc Thân, Thiên Phủ và Thiên Tướng phân tọa Tài Bạch và Quan Lộc, theo cả hai chiều. Chỉ hội Tam phương hoặc cùng ở một cung không đủ.',[
    check('Mệnh tại Dần hoặc Thân',[2,8].includes(meng.branchIndex),'Chi số Mệnh: '+meng.branchIndex),
    check('Thiên Phủ / Thiên Tướng phân tọa Tài Bạch và Quan Lộc',
      observed(fu)&&observed(tuong)?
      ((fu.palace==='Tài Bạch'&&tuong.palace==='Quan Lộc')||
       (fu.palace==='Quan Lộc'&&tuong.palace==='Tài Bạch')):null,
      observed(fu)&&observed(tuong)?'Thiên Phủ: '+fu.palace+' (chi số '+fu.branchIndex+'); Thiên Tướng: '+tuong.palace+' (chi số '+tuong.branchIndex+')':'Thiếu hoặc trùng lớp chính tinh Thiên Phủ / Thiên Tướng')],notes.specific),
  result('dinh-quy-22','Quyền Lộc sinh phùng','Định quý','patterns-dinggui.ts',
   'Cả Hóa Lộc và Hóa Quyền thuộc Tứ Hóa năm sinh cùng đóng Mệnh, đồng thời hai chính tinh nhận Hóa được bảng độ sáng Thiên Đồ xác nhận ở Miếu hoặc Vượng. Cách đọc này giữ nguyên nghĩa hẹp của chú giải và không trộn vận hạn.',[
    check('Bốn Tứ Hóa và sao nhận Hóa đúng bảng can năm của Thiên Đồ',verifiedYearHua.known?true:null,verifiedYearHua.reason),
    check('Hóa Lộc và Hóa Quyền nguyên cục đều tọa Mệnh',
      verifiedYearHua.known?verifiedYearHua.loc.branchIndex===meng.branchIndex&&verifiedYearHua.quyen.branchIndex===meng.branchIndex:null,
      verifiedYearHua.known?'Hóa Lộc: '+verifiedYearHua.loc.star+' / '+verifiedYearHua.loc.branchIndex+
       '; Hóa Quyền: '+verifiedYearHua.quyen.star+' / '+verifiedYearHua.quyen.branchIndex:verifiedYearHua.reason),
    check('Hai sao nhận Hóa là chính tinh đúng vị trí, có hồ sơ độ sáng xác minh',
      verifiedYearHua.known?
       (locHuaStrength&&quyenHuaStrength&&locHuaStrength.known&&quyenHuaStrength.known?true:null):null,
      verifiedYearHua.known?'Lộc: '+(locHuaStrength?.reason||'chưa thấy chính tinh')+
       '; Quyền: '+(quyenHuaStrength?.reason||'chưa thấy chính tinh'):verifiedYearHua.reason),
    check('Hai sao nhận Hóa cùng đạt Miếu hoặc Vượng',
      locHuaStrength?.known&&quyenHuaStrength?.known?
       (['M','V'].includes(locHuaStrength.status)&&['M','V'].includes(quyenHuaStrength.status)):null,
      'Chỉ chấp nhận M/V theo bảng đang áp dụng; không tự coi Đắc/Bình tương đương Miếu/Vượng.')],
   'Nguồn tham khảo dùng phép đọc “không Hãm”; bản nghiên cứu Thiên Đồ chọn nghĩa hẹp Miếu/Vượng theo câu chú giải, có thể cho kết quả khác. Sao nhận Hóa ngoài 14 chính tinh phải thẩm định riêng.'),
  result('dinh-quy-25','Minh Lộc ám Lộc','Định quý','patterns-dinggui.ts',
   'Lộc Tồn thủ Mệnh và Hóa Lộc nguyên cục chiếu từ đối cung; không đồng nhất Lộc Tồn với Hóa Lộc.',[
    place(loc,'Lộc Tồn tọa Mệnh',x=>x.palace==='Mệnh'),
    check('Tứ Hóa nguyên cục được xác minh đầy đủ',hua.known?true:null,hua.reason),
    check('Hóa Lộc ở đối cung Mệnh',hua.known?hua.byName.get('Hóa Lộc').branchIndex===mod(meng.branchIndex+6):null,
      hua.known?'Hóa Lộc tại chi số '+hua.byName.get('Hóa Lộc').branchIndex:hua.reason)],notes.specific),
  result('dinh-phu-03','Tài Lộc giáp Mã','Định phú','patterns-dingfu.ts',
   'Thiên Mã tại Mệnh, Vũ Khúc ở cung trước và Lộc Tồn ở cung sau, đối chiếu đúng chiều của bộ sao theo trường phái tham khảo.',[
    place(horse,'Thiên Mã tọa Mệnh',x=>x.palace==='Mệnh'),
    place(wu,'Vũ Khúc ở cung trước Thiên Mã',x=>observed(horse)?x.branchIndex===mod(horse.branchIndex-1):null),
    place(loc,'Lộc Tồn ở cung sau Thiên Mã',x=>observed(horse)?x.branchIndex===mod(horse.branchIndex+1):null)],notes.specific),
  result('dinh-quy-08','Lộc Mã bội ấn','Định quý','patterns-dinggui.ts',
   'Thiên Mã và Thiên Tướng cùng thủ Mệnh. Lộc Tồn hoặc Hóa Lộc nguyên cục tọa Mệnh hay cung kế tiếp theo chiều địa chi; không trộn Hóa Lộc vận hạn.',[
    place(horse,'Thiên Mã từ lớp sao năm thủ Mệnh',x=>x.branchIndex===meng.branchIndex),
    place(tuong,'Thiên Tướng chính tinh thủ Mệnh',x=>x.branchIndex===meng.branchIndex),
    check('Lộc Tồn hoặc Hóa Lộc nguyên cục ở Mệnh hay cung sau',observed(horse)?locOrNatalHua:null,
      'Lộc Tồn: '+(observed(loc)?'chi số '+loc.branchIndex:loc.status)+
      '; Hóa Lộc: '+(hua.known?'chi số '+hua.byName.get('Hóa Lộc').branchIndex:hua.reason))],
   'Nguồn chọn một cách đọc có thể kiểm tra của điều kiện “Lộc Mã bội ấn”; cần đối chiếu thêm tập lá số chuẩn trước khi khẳng định tên cách cục.'),
  result('dinh-quy-23','Kình Dương nhập miếu','Định quý','patterns-dinggui.ts',
   'Kiểm tra Kình Dương thủ Mệnh tại Sửu, Thìn, Mùi hoặc Tuất và có cát tinh nguyên cục cùng Mệnh. Đây là điều kiện vị trí theo nguồn, chưa thay cho phép đối chiếu độ sáng giữa các trường phái.',[
    check('Mệnh ở một trong bốn chi Sửu, Thìn, Mùi, Tuất',[1,4,7,10].includes(meng.branchIndex),'Mệnh chi số '+meng.branchIndex),
    place(getPosition(chart,'Kình Dương','auxiliaryStars'),'Kình Dương thuộc sao phụ nguyên cục thủ Mệnh',x=>x.branchIndex===meng.branchIndex),
    check('Ít nhất một cát tinh hoặc Hóa Lộc/Quyền/Khoa nguyên cục tại Mệnh',hasBeneficInMenh,
      'Cát tinh được kiểm chứng: '+(verifiedHelpers.join(', ')||'chưa ghi nhận')+
      '; Tứ Hóa: '+(hua.known?'đã kiểm tra đủ bốn Hóa':hua.reason))],
   'Tên “nhập miếu” lấy theo bảng vị trí của nguồn; dữ liệu độ sáng của Thiên Đồ chưa được coi là đã thống nhất trường phái.'),
  result('dinh-quy-15','Hình Tù giáp Ấn','Định quý','patterns-dinggui.ts',
   'Trong cách đọc được nguồn sử dụng, Thiên Hình và Liêm Trinh phải đồng cung, tại Mệnh hoặc Thân. Dù tên có chữ “giáp”, không tự thêm điều kiện giáp Thiên Tướng khi chú giải không yêu cầu.',[
    check('Thiên Hình và Liêm Trinh đồng cung nguyên cục',
      observed(thienHinh)&&observed(liem)?thienHinh.branchIndex===liem.branchIndex:null,
      'Thiên Hình (additionalStars): '+(observed(thienHinh)?thienHinh.palace+' / '+thienHinh.branchIndex:thienHinh.status)+
      '; Liêm Trinh (stars): '+(observed(liem)?liem.palace+' / '+liem.branchIndex:liem.status)),
    check('Cung đồng tọa là Mệnh hoặc cung Thân',
      observed(thienHinh)&&observed(liem)?
       (than.known?(liem.palace==='Mệnh'||liem.branchIndex===than.branchIndex):null):null,
      than.known?'Thân tại '+than.palace+' (chi số '+than.branchIndex+')':than.reason)],
   'Chỉ là đối chiếu quan hệ sao theo chú giải được ghim; không suy ra đặc điểm nhân cách hoặc nghề nghiệp.'),
  result('dinh-ban-05','Tài dữ Tù cừu','Định bần','patterns-dingpin.ts',
   'Đối chiếu hai sao Vũ Khúc và Liêm Trinh phân thủ Mệnh–Thân theo hai chiều. Tên gọi cổ thuộc danh mục thư tịch, không dùng để kết luận nghèo khó hay thân phận một người.',[
    check('Cung Thân nguyên cục được xác minh và khác cung Mệnh',
      than.known?than.branchIndex!==meng.branchIndex:null,
      than.known?'Thân '+than.palace+' / '+than.branchIndex+'; Mệnh / '+meng.branchIndex:than.reason),
    check('Vũ Khúc và Liêm Trinh phân tọa hai cung Mệnh–Thân',
      observed(wu)&&observed(liem)&&than.known?
       ((wu.branchIndex===meng.branchIndex&&liem.branchIndex===than.branchIndex)||
        (liem.branchIndex===meng.branchIndex&&wu.branchIndex===than.branchIndex)):null,
      'Vũ Khúc: '+(observed(wu)?wu.palace+' / '+wu.branchIndex:wu.status)+
      '; Liêm Trinh: '+(observed(liem)?liem.palace+' / '+liem.branchIndex:liem.status))],
   'Chỉ so sánh cấu trúc Mệnh–Thân theo tài liệu, không phải dự đoán tài chính hay định mệnh.'),
  result('dinh-ban-06','Phá Quân thủ Mệnh hãm địa','Định bần','patterns-dingpin.ts',
   'Chỉ kiểm tra Phá Quân chính tinh thủ Mệnh và được xếp Hãm trong đúng hồ sơ độ sáng 14 sao của Thiên Đồ. Bảng của trường phái khác có thể cho kết quả khác.',[
    place(pha,'Phá Quân nguyên cục thủ Mệnh',x=>x.branchIndex===meng.branchIndex),
    check('Độ sáng Phá Quân đã được đối chiếu với bảng nguồn chính thức của Thiên Đồ',
      phaStrength.known?true:null,phaStrength.reason),
    check('Phá Quân được ghi nhận ở cấp Hãm',
      phaStrength.known?phaStrength.status==='H':null,phaStrength.reason)],
   'Danh xưng nguyên bản có hàm ý tiêu cực; kết quả chỉ là quan hệ sao–cung–độ sáng, không kết luận cuộc đời hoặc tài chính.'),
  result('dinh-ban-08','Lưỡng trùng Hoa Cái','Định bần','patterns-dingpin.ts',
   'Bộ đối chiếu nghiêm ngặt: Lộc Tồn và Hóa Lộc nguyên cục cùng tọa Mệnh; có Địa Không hoặc Địa Kiếp nguyên cục cùng Mệnh. Không tính lớp lưu hạn.',[
    place(loc,'Lộc Tồn nguyên cục thủ Mệnh',x=>x.branchIndex===meng.branchIndex),
    check('Tứ Hóa nguyên cục đầy đủ và nhất quán',hua.known?true:null,hua.reason),
    check('Hóa Lộc nguyên cục ở Mệnh',hua.known?hua.byName.get('Hóa Lộc').branchIndex===meng.branchIndex:null,
      hua.known?'Hóa Lộc tại chi số '+hua.byName.get('Hóa Lộc').branchIndex:hua.reason),
    check('Địa Không hoặc Địa Kiếp nguyên cục tại Mệnh',
      observed(khong)&&observed(kiep)?
       (khong.branchIndex===meng.branchIndex||kiep.branchIndex===meng.branchIndex):null,
      'Địa Không: '+(observed(khong)?'chi số '+khong.branchIndex:khong.status)+
      '; Địa Kiếp: '+(observed(kiep)?'chi số '+kiep.branchIndex:kiep.status))],
   'Chỉ ghi nhận tổ hợp sao theo một cách đọc nghiêm ngặt của thư tịch. Không dự báo nghèo khó, công danh hay sự kiện đời sống.')
 ];
 // R17: source-pinned *partial* evidence only. Neither entry enters "records"
 // because the source requires six named Không Vong stars, not only Tuần/Triệt.
 const pendingEvidence=Object.freeze([
  Object.freeze({
   id:'dinh-ban-01',title:'Sinh bất phùng thời',scope:'natal-research',
   status:'partial-evidence',sourceCriterionVerified:false,
   sourceUrl:SOURCE+'/blob/'+SOURCE_COMMIT+'/lib/ziwei/patterns-dingpin.ts',
   checks:Object.freeze([
    Object.freeze(place(liem,'Liêm Trinh nguyên cục đóng Mệnh',x=>x.branchIndex===meng.branchIndex)),
    Object.freeze(check('Tuần/Triệt nguyên cục được đối chiếu, chỉ là chứng cứ phụ',
      obstructionAudit.verified?true:null,obstructionAudit.reason)),
    Object.freeze(check('Không Vong theo quy tắc an sao và tên sao nguồn được thẩm định',
      null,notes.void))
   ])
  }),
  Object.freeze({
   id:'dinh-ban-02',title:'Lộc phùng lưỡng sát',scope:'natal-research',
   status:'partial-evidence',sourceCriterionVerified:false,
   sourceUrl:SOURCE+'/blob/'+SOURCE_COMMIT+'/lib/ziwei/patterns-dingpin.ts',
   checks:Object.freeze([
    Object.freeze(check('Lộc Tồn hoặc Hóa Lộc nguyên cục tọa Mệnh',
      dingPin02LocEvidence,
      'Lộc Tồn: '+(observed(loc)?'chi '+loc.branchIndex:loc.status)+
      '; Hóa Lộc: '+(verifiedYearHua.known?'chi '+verifiedYearHua.loc.branchIndex:verifiedYearHua.reason))),
    Object.freeze(check('Địa Không và Địa Kiếp nguyên cục cùng đóng Mệnh',
      fireAudit.verified&&observed(khong)&&observed(kiep)?
       (khong.branchIndex===meng.branchIndex&&kiep.branchIndex===meng.branchIndex):null,
      fireAudit.verified?
       'Địa Không chi '+khong.branchIndex+'; Địa Kiếp chi '+kiep.branchIndex:
       'Bộ an Không/Kiếp chưa được kiểm tra toàn vẹn: '+fireAudit.reason)),
    Object.freeze(check('Không Vong theo quy tắc an sao và tên sao nguồn được thẩm định',
      null,notes.void))
   ])
  })
 ]);
 const matched=records.filter(x=>x.status==='structural-match').length;
 const reviewed=records.filter(x=>x.status==='needs-review').length;
 return Object.freeze({edition:'thiendo-classical-research-2026-11-10-r12',scope:'natal-only',
  groups:GROUPS,referenceTotal:49,assessed:records.length,matched,needsReview:reviewed,
  records:Object.freeze(records),pendingEvidence,obstructionAudit,fireAudit,brightnessComparison,expertReviewed:false,
  notice:'28/49 chỉ mục có điều kiện khảo sát, trong đó Tham Hỏa còn thiếu chứng cứ độ sáng Hỏa Tinh; 21 mục chưa được ánh xạ. Đây không phải 28 cách cục được xác nhận.'});
}
module.exports=Object.freeze({SOURCE,SOURCE_COMMIT,GROUPS,auditClassicalPatternCandidates});
