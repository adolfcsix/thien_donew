/**
 * Kinh Phòng / Hỏa Châu Lâm: Bát cung, Thế–Ứng, Nạp Giáp, Lục Thân, Lục Thần.
 * Hào từ dưới lên 1..6. Chỉ lắp bảng cấu trúc, không tự chọn Dụng Thần,
 * không suy nguyệt kiến/nhật thần từ ngày dương hoặc kết luận cát hung.
 */
'use strict';
const {TRIGRAMS,hexagramFromBits}=require('../iching/hexagrams.cjs');
const {compareElements}=require('../wuxing/elements.cjs');
const ELEMENT_IDS=Object.freeze({Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'});
const BRANCH_ELEMENTS=Object.freeze({Tý:'Thủy',Sửu:'Thổ',Dần:'Mộc',Mão:'Mộc',Thìn:'Thổ',Tỵ:'Hỏa',Ngọ:'Hỏa',Mùi:'Thổ',Thân:'Kim',Dậu:'Kim',Tuất:'Thổ',Hợi:'Thủy'});
const BRANCH_HAN=Object.freeze({Tý:'子',Sửu:'丑',Dần:'寅',Mão:'卯',Thìn:'辰',Tỵ:'巳',Ngọ:'午',Mùi:'未',Thân:'申',Dậu:'酉',Tuất:'戌',Hợi:'亥'});
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const SIX_SPIRITS=Object.freeze(['Thanh Long','Chu Tước','Câu Trần','Đằng Xà','Bạch Hổ','Huyền Vũ']);
const SPIRIT_HEAD=Object.freeze({Giáp:0,Ất:0,Bính:1,Đinh:1,Mậu:2,Kỷ:3,Canh:4,Tân:4,Nhâm:5,Quý:5});
// Cấu trúc: mỗi quái dùng ba hào NỘI khi ở dưới, ba hào NGOẠI khi ở trên.
// Đối chiếu: 火珠林, 周易古筮考 卷八, Jing Fang Na Jia.
const NA_JIA=Object.freeze({
 qian:{innerStem:'Giáp',outerStem:'Nhâm',inner:['Tý','Dần','Thìn'],outer:['Ngọ','Thân','Tuất']},
 dui:{innerStem:'Đinh',outerStem:'Đinh',inner:['Tỵ','Mão','Sửu'],outer:['Hợi','Dậu','Mùi']},
 li:{innerStem:'Kỷ',outerStem:'Kỷ',inner:['Mão','Sửu','Hợi'],outer:['Dậu','Mùi','Tỵ']},
 zhen:{innerStem:'Canh',outerStem:'Canh',inner:['Tý','Dần','Thìn'],outer:['Ngọ','Thân','Tuất']},
 xun:{innerStem:'Tân',outerStem:'Tân',inner:['Sửu','Hợi','Dậu'],outer:['Mùi','Tỵ','Mão']},
 kan:{innerStem:'Mậu',outerStem:'Mậu',inner:['Dần','Thìn','Ngọ'],outer:['Thân','Tuất','Tý']},
 gen:{innerStem:'Bính',outerStem:'Bính',inner:['Thìn','Ngọ','Thân'],outer:['Tuất','Tý','Dần']},
 kun:{innerStem:'Ất',outerStem:'Quý',inner:['Mùi','Tỵ','Mão'],outer:['Sửu','Hợi','Dậu']},
});
const STAGES=Object.freeze([
 {id:'pure',name:'Bản cung',self:6,response:3},
 {id:'first',name:'Nhất thế',self:1,response:4},
 {id:'second',name:'Nhị thế',self:2,response:5},
 {id:'third',name:'Tam thế',self:3,response:6},
 {id:'fourth',name:'Tứ thế',self:4,response:1},
 {id:'fifth',name:'Ngũ thế',self:5,response:2},
 {id:'wandering',name:'Du hồn',self:4,response:1},
 {id:'returning',name:'Quy hồn',self:3,response:6},
]);
function flip(bits,positions){const a=bits.split('');for(const pos of positions)a[pos-1]=a[pos-1]==='1'?'0':'1';return a.join('');}
const PALACE_BY_BITS=new Map();
for(const palace of TRIGRAMS){
 let bits=palace.bits+palace.bits;
 const sequence=[bits];
 for(let pos=1;pos<=5;pos++){bits=flip(bits,[pos]);sequence.push(bits);}
 bits=flip(bits,[4]);sequence.push(bits);
 bits=flip(bits,[1,2,3]);sequence.push(bits);
 for(let i=0;i<8;i++){
  if(PALACE_BY_BITS.has(sequence[i]))throw new Error(`Trùng Bát Cung: ${sequence[i]}`);
  PALACE_BY_BITS.set(sequence[i],Object.freeze({palace,stage:STAGES[i],bits:sequence[i],hexagram:hexagramFromBits(sequence[i])}));
 }
}
if(PALACE_BY_BITS.size!==64)throw new Error('Bảng Bát Cung phải phủ chính xác 64 quẻ.');
function getEightPalace(hexagram){
 if(!hexagram||typeof hexagram.bits!=='string'||!(/^[01]{6}$/).test(hexagram.bits))throw new TypeError('Quẻ phải có sáu hào từ dưới lên.');
 return PALACE_BY_BITS.get(hexagram.bits);
}
function familyFromElements(palaceElement,lineElement){
 const comparison=compareElements(ELEMENT_IDS[palaceElement],ELEMENT_IDS[lineElement]);
 return Object.freeze({relation:comparison.kind,family:({same:'Huynh Đệ',generate:'Tử Tôn','generated-by':'Phụ Mẫu',control:'Thê Tài','controlled-by':'Quan Quỷ'})[comparison.kind]});
}
function getSpirits(dayStem){
 if(dayStem==null||dayStem==='')return null;
 if(!STEMS.includes(dayStem))throw new RangeError('Nhật can phải thuộc 10 Thiên Can; không tự đoán theo ngày dương.');
 const head=SPIRIT_HEAD[dayStem];
 return Object.freeze(Array.from({length:6},(_,i)=>SIX_SPIRITS[(head+i)%6]));
}
function makeNaJiaChart(hexagram,{dayStem=null}={}){
 const palace=getEightPalace(hexagram);
 // Treat the six-line bit string as the only source of hexagram identity.
 // A mixed object (e.g. Qian bits with Kun lower/upper metadata) must never
 // produce a seemingly valid Na Jia chart for the wrong branches and stems.
 const canonical=hexagramFromBits(hexagram.bits);
 if((hexagram.upper!==undefined&&(hexagram.upper?.id!==canonical.upper.id||hexagram.upper?.bits!==canonical.upper.bits))||
    (hexagram.lower!==undefined&&(hexagram.lower?.id!==canonical.lower.id||hexagram.lower?.bits!==canonical.lower.bits))||
    (hexagram.number!==undefined&&hexagram.number!==canonical.number)){
  throw new RangeError('Quẻ và dữ liệu thượng/hạ quái không nhất quán với sáu hào.');
 }
 const lower=NA_JIA[canonical.lower.id],upper=NA_JIA[canonical.upper.id];
 if(!lower||!upper)throw new TypeError('Quái không nằm trong bảng Nạp Giáp.');
 const spirits=getSpirits(dayStem);
 const lines=Array.from({length:6},(_,i)=>{
  const lowerHalf=i<3;
  const table=lowerHalf?lower:upper;
  const branch=(lowerHalf?table.inner:table.outer)[i%3];
  const stem=lowerHalf?table.innerStem:table.outerStem;
  const element=BRANCH_ELEMENTS[branch];
  const family=familyFromElements(palace.palace.element,element);
  return Object.freeze({position:i+1,stem,branch,branchHan:BRANCH_HAN[branch],element,
   stemBranch:stem+branch,family:family.family,familyRelation:family.relation,
   role:i+1===palace.stage.self?'Thế':i+1===palace.stage.response?'Ứng':null,
   spirit:spirits?spirits[i]:null});
 });
 return Object.freeze({hexagram:canonical,palace:palace.palace,stage:palace.stage,method:'jing-fang-eight-palaces-na-jia',
  dayStem:dayStem||null,lines:Object.freeze(lines),
  notComputed:Object.freeze(['Giờ nhập tiết chính xác (nguyệt kiến cận ranh giới)','Dụng thần và phục thần','Vượng/suy toàn cục, nguyệt phá và nhật phá','Quy tắc luận đoán và ứng kỳ'])});
}
module.exports={BRANCH_ELEMENTS,NA_JIA,STAGES,STEMS,SIX_SPIRITS,getEightPalace,getSpirits,familyFromElements,makeNaJiaChart};
