'use strict';
// Rules and independent expected tables were recorded before this algorithm.
const profileData=require('./structural-rule-profile.json');
const {STEMS}=require('./formation.cjs');
const {getPalace}=require('./luoshu.cjs');
const {buildPalaceLedger}=require('./palace-ledger.cjs');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const RULE_PROFILE=freeze(profileData);
const CONTROLS=Object.freeze({Mộc:'Thổ',Thổ:'Thủy',Thủy:'Hỏa',Hỏa:'Kim',Kim:'Mộc'});
const GENERATES=Object.freeze({Mộc:'Hỏa',Hỏa:'Thổ',Thổ:'Kim',Kim:'Thủy',Thủy:'Mộc'});
function palaceFor(number){const p=Number.isInteger(number)&&getPalace(number);if(!p)throw new RangeError('Cung phải là số nguyên 1–9');return p;}
function doorObservation(door,number){
 const palace=palaceFor(number);
 if(number===5){if(door!==null)throw new RangeError('Trung 5 không có Môn riêng');return freeze({status:'convention',door:null,relation:null,doorElement:null,palaceElement:palace.element,explanation:'Trung 5 không an Môn riêng trong quy ước Chuyển Bàn này.',sourceIds:[]});}
 if(typeof door!=='string'||!Object.hasOwn(RULE_PROFILE.doorElements,door))throw new RangeError('Cần một trong tám Môn thời bàn hợp lệ');
 const a=RULE_PROFILE.doorElements[door],b=palace.element;
 const relation=a===b?'same-element':CONTROLS[a]===b?'door-controls-palace':CONTROLS[b]===a?'palace-controls-door':GENERATES[a]===b?'door-generates-palace':'palace-generates-door';
 const descriptions={'same-element':'Môn và cung đồng hành','door-controls-palace':'Môn khắc cung','palace-controls-door':'Cung khắc Môn','door-generates-palace':'Môn sinh cung','palace-generates-door':'Cung sinh Môn'};
 return freeze({status:relation==='door-controls-palace'?'present':'absent',door,relation,doorElement:a,palaceElement:b,explanation:`${door} (${a}) tại ${palace.trigram} ${number} (${b}): ${descriptions[relation]}. Chỉ Môn khắc cung được gắn nhãn Môn Bách trong quy ước đã chọn.`,sourceIds:['dunjia-yanyi','baojian']});
}
function graveObservation(stem,number){
 const palace=palaceFor(number);
 if(number===5){if(stem!==null)throw new RangeError('Trung 5 không biểu diễn Thiên Can riêng');return freeze({status:'convention',stem:null,targetPalace:null,branch:null,explanation:'Trung 5 giữ Địa Can; không tự gán Can ký để xét Tam Kỳ Nhập Mộ.',sourceIds:[]});}
 if(!STEMS.includes(stem))throw new RangeError('Thiên Can không hợp lệ');
 const rule=RULE_PROFILE.threeWonderGraves.find(r=>r.stem===stem);
 if(!rule)return freeze({status:'out-of-scope',stem,targetPalace:null,branch:null,explanation:`Thiên Can ${stem} ngoài Tam Kỳ Ất–Bính–Đinh; lớp này chưa xét nhập mộ của Can đó.`,sourceIds:[]});
 return freeze({status:number===rule.palace?'present':'absent',stem,targetPalace:rule.palace,branch:rule.branch,explanation:`Thiên bàn ${stem} tại ${palace.trigram} ${number}; bảng Diễn Nghĩa quy chiếu ${rule.branch} → ${getPalace(rule.palace).trigram} ${rule.palace}${stem==='Đinh'?'; Bảo Giám có dị bản Đinh tại Càn 6, không áp dụng ở đây':''}.`,sourceIds:['dunjia-yanyi',...(stem==='Đinh'?['baojian']:[])]});
}
function unavailable(explanation){return freeze({status:'not-computed',explanation,sourceIds:[]});}
function analyzeStructuralSignals(base,plate=null){
 // Reuse strict reconstruction/forged-board checks; never classify arbitrary
 // caller-provided doors, heaven stems, method labels or mismatched layers.
 const ledger=buildPalaceLedger(base,plate);
 const entries=freeze(ledger.entries.map(({number,trigram,direction})=>({number,trigram,direction,
  door:plate?doorObservation(plate.byPalace[number].door,number):unavailable('Cần dữ kiện giờ và thời bàn hợp lệ để xét Môn Bách.'),
  grave:plate?graveObservation(plate.byPalace[number].heavenStem,number):unavailable('Cần dữ kiện giờ và Thiên Can thời bàn để xét Tam Kỳ Nhập Mộ.')})));
 const graveCoverage=freeze(RULE_PROFILE.threeWonderGraves.map(rule=>{
  if(!plate)return {stem:rule.stem,status:'not-computed',palaceNumber:null,targetPalace:rule.palace,explanation:'Chưa tính thời bàn.'};
  const cell=plate.palaces.find(p=>p.number!==5&&p.heavenStem===rule.stem);
  if(!cell)return {stem:rule.stem,status:'not-represented',palaceNumber:null,targetPalace:rule.palace,explanation:`${rule.stem} ở Địa Can Trung 5; bộ dựng chưa biểu diễn Can ký tương ứng trên Thiên bàn. Chưa kết luận nhập mộ.`};
  return {stem:rule.stem,status:entries.find(p=>p.number===cell.number).grave.status,palaceNumber:cell.number,targetPalace:rule.palace,explanation:`${rule.stem} đang biểu diễn ở Thiên bàn cung ${cell.number}; mộ quy chiếu cung ${rule.palace}.`};
 }));
 return freeze({kind:'structural-observations',status:plate?'research-only':'not-computed',profileId:RULE_PROFILE.id,profile:RULE_PROFILE,entries,byPalace:Object.fromEntries(entries.map(e=>[e.number,e])),graveCoverage,interpretation:null,
  limits:['Chỉ ghi quan hệ/vị trí theo quy ước đã chọn; chưa luận đoán cát hung, dụng thần hay ứng kỳ.','Nhập Mộ chỉ xét Tam Kỳ trên Thiên Can đang biểu diễn; không suy từ Địa Can, Can giờ dân dụng hoặc dữ liệu Trung 5 chưa được ký.','Nguồn là bản chép số tác phẩm cổ; chưa thẩm định ảnh bản in hoặc chứng nhận dòng truyền thừa.']});
}
module.exports={RULE_PROFILE,doorObservation,graveObservation,analyzeStructuralSignals};
