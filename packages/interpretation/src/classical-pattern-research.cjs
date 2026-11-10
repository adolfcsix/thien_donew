'use strict';
/**
 * THIÊN ĐỒ — đối chiếu 20 điều kiện hình học và Tứ Hóa nguyên cục Tử Vi, KHÔNG phải bộ phán định 49 cách cục.
 * Nguồn phương pháp tham khảo: Renhuai123/ziwei-doushu, MIT; thuật toán/diễn giải độc lập.
 * Trả về chứng cứ, điều kiện chưa xét, sai lệch dữ liệu. Không sửa lá số và không dự báo.
 */
const SOURCE='https://github.com/Renhuai123/ziwei-doushu';
const SOURCE_COMMIT='7922285d947b36610e7e31c232d8f1e2a0d0871d';
const LAYERS=Object.freeze(['stars','auxiliaryStars','yearStars','additionalStars','traditionalStars','natalExtensionStars','beneficStars','advancedStars','positionalStars','derivedStars','missingStars']);
const SUPPORT=Object.freeze(['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã']);
const GROUPS=Object.freeze([
 Object.freeze({name:'Định phú',totalInReference:6,implementedHere:4,scope:'Bản mệnh'}),
 Object.freeze({name:'Định quý',totalInReference:27,implementedHere:18,scope:'Bản mệnh'}),
 Object.freeze({name:'Định bần',totalInReference:8,implementedHere:0,scope:'Bản mệnh'}),
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

/** Đánh giá độc lập, giữ nguyên địa bàn, không trộn lớp lưu hạn với sao bản mệnh. */
function auditClassicalPatternCandidates(chart){
 const {byBranch,byPalace}=validate(chart);
 const sun=getPosition(chart,'Thái Dương','stars');
 const moon=getPosition(chart,'Thái Âm','stars');
 const wu=getPosition(chart,'Vũ Khúc','stars');
 const horse=getPosition(chart,'Thiên Mã','yearStars');
 const loc=getPosition(chart,'Lộc Tồn','auxiliaryStars');
 const co=getPosition(chart,'Cự Môn','stars');
 const ki=getPosition(chart,'Thiên Cơ','stars');
 const zi=getPosition(chart,'Tử Vi','stars');
 const fu=getPosition(chart,'Thiên Phủ','stars');
 const sat=getPosition(chart,'Thất Sát','stars');
 const tuong=getPosition(chart,'Thiên Tướng','stars');
 const ta=getPosition(chart,'Tả Phụ','auxiliaryStars');
 const huu=getPosition(chart,'Hữu Bật','auxiliaryStars');
 const khoi=getPosition(chart,'Thiên Khôi','auxiliaryStars');
 const viet=getPosition(chart,'Thiên Việt','auxiliaryStars');
 const hua=readNatalFourHua(chart);
 const good=[...SUPPORT].filter(name=>LAYERS.some(layer=>{const h=byPalace.get('Mệnh');return Array.isArray(h[layer])&&h[layer].includes(name);}));
 const meng=byPalace.get('Mệnh');
 const observed=x=>x.status==='observed';
 // A duplicate or wrong-layer Loc Ton cannot be affirmative evidence.
 const locDataValid=observed(loc)||(loc.status==='unverified'&&loc.locations.length===0);
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
 const place=(x,desc,pred)=>check(desc,observed(x)?pred(x):null,observed(x)?x.name+': '+x.palace+', chi số '+x.branchIndex:x.name+': thiếu hoặc mâu thuẫn vị trí ('+x.status+')');
 const notes={
  specific:'Cần xác định đúng vị trí sao và quy ước trường phái trước khi đọc ý nghĩa.',
  void:'Chưa có ánh xạ được thẩm định giữa các sao Không Vong nguyên bản và dữ liệu Tuần/Triệt của Thiên Đồ; không thay thế chúng một cách cơ học.'
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
   'Tên “nhập miếu” lấy theo bảng vị trí của nguồn; dữ liệu độ sáng của Thiên Đồ chưa được coi là đã thống nhất trường phái.')
 ];
 const matched=records.filter(x=>x.status==='structural-match').length;
 const reviewed=records.filter(x=>x.status==='needs-review').length;
 return Object.freeze({edition:'thiendo-classical-research-2026-11-10-r5',scope:'natal-only',
  groups:GROUPS,referenceTotal:49,assessed:records.length,matched,needsReview:reviewed,
  records:Object.freeze(records),expertReviewed:false,
  notice:'22/49 chỉ mục được ánh xạ điều kiện nghiên cứu; 27 mục còn lại chưa được xác minh. Đây là đối chiếu nghiên cứu, không phải nhận định đầy đủ 49 cách cục.'});
}
module.exports=Object.freeze({SOURCE,SOURCE_COMMIT,GROUPS,auditClassicalPatternCandidates});
