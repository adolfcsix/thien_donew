 'use strict';
const P=require('@thiendo/astrology-engine/src/luc-hao-profile.cjs'),K=require('@thiendo/knowledge/src/luc-hao-depth-v11130.json');
const Engine=require('@thiendo/astrology-engine'),N=require('./na-jia.cjs'),T=require('./temporal.cjs'),H=require('./hidden-relative.cjs');
const {makeLineLedger}=require('./reading.cjs'),{relation}=require('./temporal-relations.cjs'),{compareElements}=require('../wuxing/elements.cjs');
const IDS={Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'};
function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
function contextFor(c){
 if(c.mode==='none')return null;
 if(c.mode==='manual')return {...T.manualContext({...c,monthBranch:c.monthBranch??'Tý'}),monthBranch:c.monthBranch,suggestedMonthBranch:c.monthBranch,needsMonthVerification:c.monthBranch===null};
 const [year,month,day]=c.date.split('-').map(Number),x=T.calendarContext(Engine.calendarDay(year,month,day));
 return {...x,monthBranch:null,needsMonthVerification:true,warnings:[...x.warnings,'Profile V11.130 giữ Nguyệt kiến tự tính ở mức gợi ý; cần nguồn xác minh riêng.']};
}
function clocks(line,c){
 if(!c)return {day:null,month:null,void:null};
 const measure=(branch)=>({branch,flags:relation(line.branch,branch),element:compareElements(IDS[N.BRANCH_ELEMENTS[branch]],IDS[line.element]).label});
 return {day:measure(c.dayBranch),month:c.monthBranch?{...measure(c.monthBranch),monthBreak:relation(line.branch,c.monthBranch).includes('lục xung')}:null,void:c.voidBranches.includes(line.branch)};
}
function studyLucHao(raw){
 const input=P.validateLucHaoProfile(raw),reading=makeLineLedger(input.lines),context=contextFor(input.calendar),chart=N.makeNaJiaChart(reading.original,{dayStem:context?.dayStem??null}),changed=N.makeNaJiaChart(reading.transformed);
 const hidden=H.hiddenRelativeEvidence(chart,input.family,{context}),candidates=[...hidden.visible.map(x=>({kind:'visible',position:x.line.position,line:x.line})),...hidden.hidden.map(x=>({kind:'hidden',position:x.position,line:x.hidden}))];
 const selected=input.selection?candidates.find(c=>c.kind===input.selection.kind&&c.position===input.selection.position):null;
 if(input.selection&&!selected)throw new RangeError('Dụng đã chọn không thuộc ứng viên Lục Thân ở quẻ này; hãy chọn lại.');
 const purpose=selected?.line??null;
 function role(line,kind){
  if(!purpose)return {name:'Chưa chọn Dụng',kind:null,relation:null};
  if(kind===selected.kind&&line.position===selected.position)return {name:'Dụng đã chọn',kind:'selected',relation:null};
  const rel=compareElements(IDS[line.element],IDS[purpose.element]),name=rel.kind==='generate'?'Nguyên thần tiềm năng':rel.kind==='control'?'Kỵ thần tiềm năng':rel.kind==='same'?'Tỷ hòa về hành':rel.kind==='generated-by'?'Dụng sinh ra':'Dụng khắc ra';
  return {name,kind:rel.kind,relation:rel.label};
 }
 const rows=chart.lines.map((line,i)=>{
  const moving=reading.ledger[i].moving,next=changed.lines[i],conversion=moving?{branch:next.branch,element:next.element,family:N.familyFromElements(chart.palace.element,next.element).family,stemBranch:next.stemBranch,
   reverse:compareElements(IDS[next.element],IDS[line.element]).label,reverseKind:compareElements(IDS[next.element],IDS[line.element]).kind,
   label:{generate:'Hồi đầu sinh',control:'Hồi đầu khắc',same:'Hóa cùng hành','generated-by':'Hào gốc sinh hào hóa','controlled-by':'Hào gốc khắc hào hóa'}[compareElements(IDS[next.element],IDS[line.element]).kind],flags:relation(line.branch,next.branch),clock:clocks(next,context)}:null;
  return {...line,moving,clock:clocks(line,context),purposeRole:role(line,'visible'),conversion,spiritMeaning:line.spirit?K.spirits[line.spirit]:null};
 });
 const hiddenRows=[];
 for(const family of P.FAMILIES){const f=H.hiddenRelativeEvidence(chart,family,{context});for(const x of f.hidden)hiddenRows.push({...x.hidden,kind:'hidden',flying:x.flying,flyingMoving:reading.ledger[x.position-1].moving,purposeRole:role(x.hidden,'hidden'),clock:clocks(x.hidden,context),flyingClock:clocks(x.flying,context),flyingToHidden:compareElements(IDS[x.flying.element],IDS[x.hidden.element]).label,hiddenToFlying:compareElements(IDS[x.hidden.element],IDS[x.flying.element]).label});}
 const potentials=[...rows.map(r=>({kind:'visible',position:r.position,stemBranch:r.stemBranch,moving:r.moving,role:r.purposeRole,clock:r.clock})),...hiddenRows.map(r=>({kind:'hidden',position:r.position,stemBranch:r.stemBranch,moving:null,role:r.purposeRole,clock:r.clock}))];
 const warnings=[];
 if(!selected)warnings.push('Chưa chọn và xác nhận một Dụng thần; giữ toàn bộ ứng viên, chưa gán Nguyên/Kỵ theo mốc duy nhất.');
 if(candidates.length>1)warnings.push('Có nhiều ứng viên cùng Lục Thân; không tự xếp hạng hoặc thay thế lựa chọn đã ghi.');
 if(selected?.kind==='hidden')warnings.push('Dụng đang chọn là Phục thần tham chiếu; chưa kết luận xuất phục, không gán động cho Phục theo động của Phi.');
 if(context&&!context.monthBranch)warnings.push('Chưa có Nguyệt kiến xác minh; không gán Nguyệt phá hoặc quan hệ tháng.');
 if(!context)warnings.push('Chưa có Nhật can/chi; Lục Thú, Tuần Không và quan hệ Nhật–Nguyệt để trống.');
 const synthesis={generators:potentials.filter(x=>x.role.kind==='generate'),controllers:potentials.filter(x=>x.role.kind==='control'),note:'Giữ cả Nguyên và Kỵ, hào hiện và Phục tham chiếu. Động không tự đồng nghĩa có lực; Tuần Không/Nguyệt phá không tự vô hiệu hóa hào. Nhật xung chỉ ghi xung, chưa gán Nhật phá hay ám động.',missing:[...(selected?[]:['Dụng thần và lý do chọn']),...(input.question?[]:['Câu hỏi khảo sát']),...(!context?['Nhật can/chi']:[]),...(!context?.monthBranch?['Nguyệt kiến xác minh']:[])]};
 return freeze({input,reading,chart,context,candidates,selected,rows,hiddenRows,potentials,synthesis,warnings,roles:K.roles,sources:K.sources,limits:K.limits});
}
module.exports={studyLucHao,contextFor};
