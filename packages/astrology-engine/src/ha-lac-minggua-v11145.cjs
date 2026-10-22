'use strict';
/**
 * Hà Lạc · các bước dựng mệnh quẻ có nguồn đối chiếu (khảo cứu, không phải kiểm chứng dự báo).
 * KHÔNG thay đổi calculate() V11.136. Không giả định Tam Nguyên hoặc chí tiết chưa xác minh.
 * Các chuỗi bit quẻ đi từ hào 1 (dưới) lên hào 6 (trên).
 */
const BASE=require('./ha-lac-source.cjs');
const METHOD='he-luo-minggua-source-study-v11.145';
const RULE_SOURCES=Object.freeze([
  'https://www.shidianguji.com/book/NA09030/chapter/1m8od60nhc1me',
  'https://forum.shusquare.com/forum.php?mod=viewthread&tid=6079',
]);
const TRIGRAM_BY_NUMBER=Object.freeze({
  1:Object.freeze({name:'Khảm',han:'坎',bits:'010'}),
  2:Object.freeze({name:'Khôn',han:'坤',bits:'000'}),
  3:Object.freeze({name:'Chấn',han:'震',bits:'100'}),
  4:Object.freeze({name:'Tốn',han:'巽',bits:'011'}),
  6:Object.freeze({name:'Càn',han:'乾',bits:'111'}),
  7:Object.freeze({name:'Đoài',han:'兌',bits:'110'}),
  8:Object.freeze({name:'Cấn',han:'艮',bits:'001'}),
  9:Object.freeze({name:'Ly',han:'離',bits:'101'}),
});
const PERIODS=Object.freeze(['upper','middle','lower']);
const HOUR_BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
/** Subtract stated base only when greater; digit 0 means 10->1, 20->2, 30->3. */
function reduceNumber(total,kind){
  if(!Number.isInteger(total)||total<1||!['heaven','earth'].includes(kind))throw new RangeError('Thiên/Địa số không hợp lệ');
  const base=kind==='heaven'?25:30;
  const afterThreshold=total>base?total-base:total;
  // Note: heaven === 25 uses 5, earth === 30 uses 3, not zero.
  const result=(afterThreshold%10)||Math.floor(afterThreshold/10);
  return Object.freeze({total,base,afterThreshold,number:result,requiresCenter:result===5,explanation:total>base?`Trừ ${base}; lấy hàng đơn vị, gặp 10/20/30 dùng 1/2/3`:'Giữ tổng; gặp 10/20/30 dùng 1/2/3'});
}
function validateProfile(profile){
  if(profile===undefined)return null;
  if(profile===null)throw new TypeError('Hồ sơ phân mệnh quẻ không được để null');
  if(!profile||typeof profile!=='object'||Array.isArray(profile))throw new TypeError('Hồ sơ phân mệnh quẻ không hợp lệ');
  if(Object.keys(profile).some(k=>!['gender','period','periodReferenceId','periodReferenceDetail'].includes(k)))throw new TypeError('Hồ sơ mệnh quẻ có trường không được hỗ trợ');
  if(!['male','female'].includes(profile.gender))throw new RangeError('Chọn nam/nữ theo quy tắc truyền bản');
  const hasPeriod=Object.hasOwn(profile,'period');
  if(hasPeriod){
    if(!PERIODS.includes(profile.period))throw new RangeError('Tam Nguyên phải là thượng/trung/hạ');
    if(typeof profile.periodReferenceId!=='string'||profile.periodReferenceId.trim().length<4||profile.periodReferenceId.length>150||
       typeof profile.periodReferenceDetail!=='string'||profile.periodReferenceDetail.trim().length<8||profile.periodReferenceDetail.length>400)
      throw new TypeError('Tam Nguyên khai báo cần chứng bản và vị trí kiểm chứng');
  } else if(Object.hasOwn(profile,'periodReferenceId')||Object.hasOwn(profile,'periodReferenceDetail')){
    throw new TypeError('Không cho nhập chứng bản Tam Nguyên khi chưa chọn Tam Nguyên');
  }
  return Object.freeze({...profile});
}
/** Center number 5 must use an explicitly sourced Three-Era attribution. */
function centerTrigram(profile,yearYang){
  const p=profile.period;
  if(profile.gender==='male')return p==='upper'?8:p==='lower'?9:(yearYang?8:2);
  return p==='upper'?2:p==='lower'?7:(yearYang?2:8);
}
function placeYuanTang(bits,hourBranch){
  if(typeof bits!=='string'||!/^[01]{6}$/.test(bits)||!HOUR_BRANCHES.includes(hourBranch))throw new TypeError('Hào/giờ không hợp lệ');
  const all=bits.split('');
  const hourIndex=HOUR_BRANCHES.indexOf(hourBranch),firstHalf=hourIndex<6,slot=hourIndex%6;
  // The pure hexagrams require solstice and sex-specific special rules.
  if(all.every(v=>v===all[0]))return Object.freeze({status:'PENDING_PURE_HEXAGRAM_RULE',line:null,hourBranch,trace:Object.freeze([])});
  const preferred=firstHalf?'1':'0';
  const preferredLines=all.flatMap((v,i)=>v===preferred?[i+1]:[]);
  const otherLines=all.flatMap((v,i)=>v!==preferred?[i+1]:[]);
  // The received rhyme: 1/2 repeats then lodges elsewhere; 3 repeats without lodging;
  // 4/5 exhaust the preferred lines then lodge in the others, bottom to top.
  let allocation=[];
  if(preferredLines.length===1)allocation=[preferredLines[0],preferredLines[0],...otherLines.slice(0,4)];
  else if(preferredLines.length===2)allocation=[...preferredLines,...preferredLines,...otherLines.slice(0,2)];
  else if(preferredLines.length===3)allocation=[...preferredLines,...preferredLines];
  else if(preferredLines.length===4||preferredLines.length===5)allocation=[...preferredLines,...otherLines];
  else return Object.freeze({status:'PENDING_UNCOVERED_RULE',line:null,hourBranch,trace:Object.freeze([])});
  if(allocation.length!==6)throw new Error('Bảng Nguyên Đường thiếu sáu thời thần');
  return Object.freeze({status:'SOURCE_RULE_CANDIDATE',line:allocation[slot],hourBranch,
    preferredYao:preferred==='1'?'dương':'âm',preferredCount:preferredLines.length,
    trace:Object.freeze(allocation.map((line,i)=>Object.freeze({hourBranch:HOUR_BRANCHES[(firstHalf?0:6)+i],line}))) });
}
function nextHeavenHexagram(bits,yuanTangLine){
  if(typeof bits!=='string'||!/^[01]{6}$/.test(bits)||!Number.isInteger(yuanTangLine)||yuanTangLine<1||yuanTangLine>6)
    throw new RangeError('Phải có sáu hào và Nguyên Đường 1–6');
  const before=bits.split(''); const changed=[...before];changed[yuanTangLine-1]=changed[yuanTangLine-1]==='1'?'0':'1';
  const nextBits=changed.slice(3).join('')+changed.slice(0,3).join('');
  return Object.freeze({status:'SOURCE_RULE_CANDIDATE',bits:nextBits,changedBeforeSwap:changed.join(''),yuanTangLine:yuanTangLine<=3?yuanTangLine+3:yuanTangLine-3,
    operation:'Đảo âm dương hào Nguyên Đường, rồi đổi chỗ thượng/hạ quái'});
}
function calculateMinggua(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['pillars','hexagram','profile'].includes(k)))
    throw new TypeError('Đầu vào Hà Lạc không hợp lệ');
  const base=BASE.calculate({pillars:input.pillars,...(input.hexagram!==undefined?{hexagram:input.hexagram}:{})});
  const profile=validateProfile(input.profile);
  const heaven=reduceNumber(base.heaven.sum,'heaven'),earth=reduceNumber(base.earth.sum,'earth');
  const yearYang=['Giáp','Bính','Mậu','Canh','Nhâm'].includes(base.pillars[0].stem);
  const trace=[`Thiên ${heaven.total} → ${heaven.number}`,`Địa ${earth.total} → ${earth.number}`];
  let status='NEEDS_GENDER',upper=null,lower=null,early=null,yuanTang=null,later=null;
  if(profile){
    const needsCenter=heaven.requiresCenter||earth.requiresCenter;
    if(needsCenter&&!profile.period){status='NEEDS_PERIOD';trace.push('Có số 5: cần Tam Nguyên và chứng bản tương ứng');}
    else{
      const tn=heaven.requiresCenter?centerTrigram(profile,yearYang):heaven.number;
      const dn=earth.requiresCenter?centerTrigram(profile,yearYang):earth.number;
      const heavenTrigram=TRIGRAM_BY_NUMBER[tn],earthTrigram=TRIGRAM_BY_NUMBER[dn];
      if(!heavenTrigram||!earthTrigram)throw new RangeError('Phép giảm số không ánh xạ được bát quái');
      const heavenAbove=(profile.gender==='male'&&yearYang)||(profile.gender==='female'&&!yearYang);
      upper=heavenAbove?heavenTrigram:earthTrigram;
      lower=heavenAbove?earthTrigram:heavenTrigram;
      const bits=lower.bits+upper.bits;
      early=Object.freeze({status:'SOURCE_RULE_CANDIDATE',bits,upper,lower,heavenNumber:tn,earthNumber:dn,heavenAbove});
      yuanTang=placeYuanTang(bits,base.pillars[3].branch);
      if(yuanTang.line!==null){later=nextHeavenHexagram(bits,yuanTang.line);status='CANDIDATE_COMPLETE';}
      else status=yuanTang.status;
      trace.push(`Năm ${yearYang?'dương':'âm'}, quy ước ${profile.gender==='male'?'nam':'nữ'}; ${heavenAbove?'Thiên trên/Địa dưới':'Địa trên/Thiên dưới'}`);
      if(needsCenter)trace.push(`Số 5 ký ${profile.period} Nguyên theo bản khai: ${profile.periodReferenceId}`);
    }
  }
  return Object.freeze({method:METHOD,status,researchOnly:true,sourceUrls:RULE_SOURCES,numbering:Object.freeze({heaven,earth}),profile,
    inputPillars:Object.freeze([...base.pillars]),yearYang,early,yuanTang,later,sourceEntered:base.hexagram,
    trace:Object.freeze(trace),warnings:Object.freeze([
      'Quẻ và Nguyên Đường là phép dựng theo quy tắc văn bản, chưa phải hồ sơ truyền bản đã được chuyên gia thẩm định độc lập',
      'Không tự xác nhận thời điểm tiết khí, Tam Nguyên hay bốn trụ từ ngày giờ sinh',
      'Quẻ thuần âm/dương còn ngoại lệ giới tính và mùa chí: không tự chọn hào',
      'Chưa khởi đại vận/lưu niên hoặc luận đoán cát hung tự động',
    ])});
}
module.exports=Object.freeze({METHOD,RULE_SOURCES,TRIGRAM_BY_NUMBER,PERIODS,HOUR_BRANCHES,reduceNumber,validateProfile,centerTrigram,placeYuanTang,nextHeavenHexagram,calculateMinggua});
