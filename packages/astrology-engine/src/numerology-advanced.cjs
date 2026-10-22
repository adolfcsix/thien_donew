'use strict';
/** V11.137: explicit derived Pythagorean indicators. Never a scientific personality inference. */
const base=require('./numerology-pythagorean.cjs');
const METHOD='pythagorean-advanced-comparison-v1';
const reduce=base.reduction;
function calculate(raw){
 const core=base.calculate(raw),{date,year,masters}=core.input;
 const [birthYear,month,day]=date.split('-').map(Number);
 const fullDigits=date.replaceAll('-','').split('').reduce((sum,x)=>sum+Number(x),0);
 const direct=reduce(fullDigits,masters);
 const contrast={segmented:{value:core.lifePath.value,steps:core.lifePath.steps,parts:core.lifePath.parts},allDigits:direct,agrees:direct.value===core.lifePath.value,
  note:'Hai phép rút được hiển thị song song; không đổi phương pháp chính của hồ sơ Pythagoras.'};
 const maturity=core.expression?reduce(core.lifePath.value+core.expression.value,masters):null;
 const counts=Object.fromEntries(Array.from({length:9},(_,i)=>[String(i+1),0]));
 for(const l of core.letters)counts[l.value]++;
 const maximum=Math.max(...Object.values(counts));
 const hiddenPassion=Object.keys(counts).filter(x=>counts[x]===maximum).map(Number);
 const missingNumbers=Object.keys(counts).filter(x=>counts[x]===0).map(Number);
 const physicalMonths=Array.from({length:12},(_,index)=>({month:index+1,...reduce(month+day+year+index+1,false)}));
 const personalDay=(selected)=>{
  if(typeof selected!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(selected))throw Error('Ngày đối chiếu không hợp lệ.');
  const d=new Date(selected+'T00:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==selected||+selected.slice(0,4)<birthYear||+selected.slice(0,4)>2100)throw Error('Ngày đối chiếu ngoài phạm vi.');
  const [y,m,dayOfMonth]=selected.split('-').map(Number);
  const personalYear=reduce(month+day+y,false);
  const personalMonth=reduce(personalYear.value+m,false);
  return {date:selected,personalYear,personalMonth,personalDay:reduce(personalMonth.value+dayOfMonth,false)};
 };
 return {method:METHOD,baseMethod:base.METHOD,input:core.input,lifePathComparison:contrast,maturity,
  nameFrequency:{counts,hiddenPassion,missingNumbers},personalMonths:physicalMonths,exampleDate:personalDay(`${year}-01-01`),
  limitations:['Chỉ dùng bảng chữ Latin Pythagoras và quy tắc Y do người dùng chọn.', 'Tên đã chuyển tự sẽ tạo kết quả khác; không hỗ trợ tự động chuyển bảng Chaldean.', 'Mọi ý nghĩa là thực hành biểu tượng, không phải phát hiện thực nghiệm.']};
}
module.exports={METHOD,calculate};
