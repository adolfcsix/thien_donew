/** Lục Hào · chỉ bảng bằng chứng sáu hào; không tự gán Nạp Giáp/Thế Ứng. */
'use strict';
const {hexagramFromLines,castThreeCoins}=require('../iching/hexagrams.cjs');
const LINE_STATES=Object.freeze({6:{name:'Lão âm',moving:true,yang:false},7:{name:'Thiếu dương',moving:false,yang:true},8:{name:'Thiếu âm',moving:false,yang:false},9:{name:'Lão dương',moving:true,yang:true}});
function makeLineLedger(lines){
 const reading=hexagramFromLines(lines);
 const ledger=lines.map((value,index)=>Object.freeze({position:index+1,state:LINE_STATES[value].name,moving:LINE_STATES[value].moving,
   before:reading.original.bits[index]==='1'?'Dương':'Âm',after:reading.transformed.bits[index]==='1'?'Dương':'Âm'}));
 return Object.freeze({...reading,ledger:Object.freeze(ledger),
   notComputed:['Nạp Giáp từng hào','Thế và Ứng','Lục thân','Lục thú','Nguyệt kiến / Nhật thần','Dụng thần / Tuần Không']});
}
module.exports={LINE_STATES,makeLineLedger,castThreeCoins};
