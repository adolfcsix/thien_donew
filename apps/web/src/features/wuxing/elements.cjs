/** Các quan hệ NGŨ HÀNH cổ điển, tính trên chu trình khép kín; không chấm cát hung. */
'use strict';
const ELEMENTS = Object.freeze([
  {id:'wood',name:'Mộc',han:'木',symbol:'木',theme:'Sinh trưởng',image:'Cây cối',color:'#82BE9A'},
  {id:'fire',name:'Hỏa',han:'火',symbol:'火',theme:'Bốc lên',image:'Lửa',color:'#E6A17D'},
  {id:'earth',name:'Thổ',han:'土',symbol:'土',theme:'Nuôi dưỡng',image:'Đất',color:'#D8BC84'},
  {id:'metal',name:'Kim',han:'金',symbol:'金',theme:'Thu liễm',image:'Kim loại',color:'#B3C8D8'},
  {id:'water',name:'Thủy',han:'水',symbol:'水',theme:'Nhuận xuống',image:'Nước',color:'#87AEE6'},
]);
const BY_ID = new Map(ELEMENTS.map(item=>[item.id,item]));
const SHENG = Object.freeze({wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'});
const KE = Object.freeze({wood:'earth',earth:'water',water:'fire',fire:'metal',metal:'wood'});
function elementById(id){return BY_ID.get(id)||null;}
function compareElements(a,b){
 const first=elementById(a),second=elementById(b);
 if(!first||!second)throw new TypeError('Hành không tồn tại trong bảng Ngũ hành.');
 if(a===b)return {kind:'same',from:first,to:second,label:'Đồng hành',summary:`${first.name} và ${second.name} cùng một hành. Sự đồng loại không tự xác nhận trạng thái cân bằng.`,direction:null};
 if(SHENG[a]===b)return {kind:'generate',from:first,to:second,label:`${first.name} sinh ${second.name}`,summary:`Theo vòng tương sinh: ${first.name} là hành sinh, ${second.name} là hành được sinh.`,direction:'forward'};
 if(SHENG[b]===a)return {kind:'generated-by',from:second,to:first,label:`${second.name} sinh ${first.name}`,summary:`Theo vòng tương sinh: ${second.name} là hành sinh, ${first.name} là hành được sinh.`,direction:'reverse'};
 if(KE[a]===b)return {kind:'control',from:first,to:second,label:`${first.name} khắc ${second.name}`,summary:`Theo vòng tương khắc: ${first.name} là hành khắc, ${second.name} là hành chịu khắc.`,direction:'forward'};
 if(KE[b]===a)return {kind:'controlled-by',from:second,to:first,label:`${second.name} khắc ${first.name}`,summary:`Theo vòng tương khắc: ${second.name} là hành khắc, ${first.name} là hành chịu khắc.`,direction:'reverse'};
 throw new Error('Hai hành chưa có quan hệ trực tiếp trong bảng chuẩn.');
}
module.exports={ELEMENTS,SHENG,KE,elementById,compareElements};
