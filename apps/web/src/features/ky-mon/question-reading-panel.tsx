'use client';
import {useEffect,useMemo,useState} from 'react';
import {PALACES} from './luoshu.cjs';
import {TOPICS,INDICATORS,readQuestionBoard,type QuestionReadingReport,type QuestionTopic} from './question-reading.cjs';
import type {BaseFormation} from './formation.cjs';
import type {RotatingHourPlate} from './hour-plate.cjs';
import {buildQimenWorkbook} from '../research-workbook/ky-mon-workbook.cjs';
import {WorkbookPanel} from '../research-workbook/workbook-panel';
import styles from './question-reading-panel.module.css';

export function QuestionReadingPanel({base,plate,inputSignature,onSelect}:{base:BaseFormation;plate:RotatingHourPlate|null;inputSignature:string;onSelect:(palace:number)=>void}){
 const [topic,setTopic]=useState('');
 const [question,setQuestion]=useState('');
 const [indicatorId,setIndicatorId]=useState('');
 const [reference,setReference]=useState('');
 const [confirmedKey,setConfirmedKey]=useState('');
 const valid=!!topic&&!!indicatorId&&(topic!=='other'||question.trim().length>0);
 const boardKey=useMemo(()=>JSON.stringify([inputSignature,base.solarTermIndex,base.day,base.chief?.hourName,base.ju,base.dun,plate?.palaces]),[inputSignature,base,plate]);
 // A confirmation is single-use for the *current input state*. Changing the
 // formation and then returning to the original values must NOT revive consent.
 useEffect(()=>setConfirmedKey(''),[boardKey]);
 const selectionKey=JSON.stringify([boardKey,topic,question,indicatorId,reference]);
 const confirmed=valid&&confirmedKey===selectionKey;
 const report=useMemo<QuestionReadingReport|null>(()=>valid?readQuestionBoard(base,plate,{
  topic:topic as QuestionTopic,indicatorId,referencePalace:reference===''?null:Number(reference),confirmed,questionNote:question
 }):null,[base,plate,valid,topic,indicatorId,reference,confirmed,question]);
 const workbook=useMemo(()=>valid&&confirmed?buildQimenWorkbook(base,plate,{topic:topic as QuestionTopic,indicatorId,referencePalace:reference===''?null:Number(reference),confirmed,questionNote:question}):null,[base,plate,valid,confirmed,topic,indicatorId,reference,question]);
 function openPalace(number:number){onSelect(number);document.getElementById('ky-mon-palace-detail')?.scrollIntoView({behavior:'smooth',block:'start'});}
 return <section id="ky-mon-question-reading" className={styles.panel} aria-label="Đọc bàn theo câu hỏi">
  <div className={styles.heading}><h3>Đọc bàn theo câu hỏi</h3><span>Đối chiếu câu hỏi và hồ sơ chuyên sâu</span></div>
  <p className={styles.intro}>Chọn <b>chủ đề</b> và <b>Dụng thần</b> trên thời bàn. Bạn quyết định Dụng thần; hệ thống không tự suy từ câu hỏi. Cung tham chiếu là tùy chọn, chỉ chọn khi đã biết căn cứ xác định cung đó.</p>
  <div className={styles.fields}>
   <label>Chủ đề muốn xem
    <select value={topic} onChange={e=>{setConfirmedKey('');setTopic(e.target.value);}}><option value="">Chọn chủ đề</option>{TOPICS.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select>
   </label>
   <label>Dụng thần (tự chọn và kiểm tra)
    <select value={indicatorId} onChange={e=>{setConfirmedKey('');setIndicatorId(e.target.value);}}><option value="">Chọn Môn / Can / Sao / Thần</option>
     {(['door','stem','star','deity'] as const).map(kind=><optgroup key={kind} label={{door:'Bát Môn thời bàn',stem:'Thiên Can thời bàn',star:'Cửu Tinh thời bàn',deity:'Bát Thần thời bàn'}[kind]}>
      {INDICATORS.filter(v=>v.layer===kind).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
     </optgroup>)}
    </select>
   </label>
   <label>Cung tham chiếu (nếu đã xác minh)
    <select value={reference} onChange={e=>{setConfirmedKey('');setReference(e.target.value);}}><option value="">Chưa xác định · chỉ đọc cung Dụng thần</option>{PALACES.map(p=><option key={p.number} value={p.number}>{p.trigram} {p.number} · {p.direction}</option>)}</select>
   </label>
   <label>Diễn đạt câu hỏi (không bắt buộc, tối đa 280 ký tự)
    <textarea rows={2} maxLength={280} value={question} onChange={e=>{setConfirmedKey('');setQuestion(e.target.value);}} placeholder="Một câu hỏi cụ thể, không điền dữ liệu nhạy cảm"/>
   </label>
  </div>
  <div className={styles.actions}>
   <button type="button" disabled={!valid} onClick={()=>setConfirmedKey(selectionKey)}>Xác nhận chủ đề và Dụng thần</button>
   {confirmed&&<span role="status">Đã xác nhận cho thời bàn và lựa chọn hiện tại.</span>}
   {!confirmed&&valid&&<span role="status">Cần xác nhận để mở phần chứng cứ.</span>}
  </div>
  {!plate&&<p className={styles.notice} role="status">Thời bàn chưa tính. Bạn có thể xác nhận lựa chọn, nhưng hệ thống sẽ liệt kê dữ kiện còn thiếu thay vì dựng kết quả giả.</p>}
  {report&&confirmed&&<div className={styles.result} aria-live="polite" data-question-status={report.status}>
   <h4>Hồ sơ đối chiếu · {report.topic.name}</h4>
   <p><b>Dụng thần:</b> {report.indicator.name} · <b>Cung ứng:</b> {report.usePalace==null?'chưa xác định':`${report.usePalace} (${PALACES.find(p=>p.number===report.usePalace)?.trigram})`} · <b>Cung tham chiếu:</b> {report.referencePalace??'chưa chọn'}</p>
   {report.questionNote&&<p className={styles.question}>Câu hỏi: {report.questionNote}</p>}
   {report.usePalace!=null&&<button type="button" className={styles.jump} onClick={()=>openPalace(report.usePalace!)}>Xem cung Dụng thần {report.usePalace} trên bàn ↗</button>}
   <div className={styles.sections}>
    <EvidenceList title="Chứng cứ thuận" items={report.supportingEvidence} empty="Chưa có chứng cứ thuộc nhóm thuận theo phép đối chiếu đang áp dụng."/>
    <EvidenceList title="Chứng cứ nghịch / xung khắc" items={report.counterEvidence} empty="Chưa ghi nhận điều kiện nghịch trong phạm vi các quy tắc đang tính; không đồng nghĩa kết quả tốt."/>
   </div>
   <details className={styles.details} open><summary>Quan hệ giữa các cung và chứng cứ trung tính ({report.relations.length} quan hệ)</summary>
    {report.relations.length===0?<p>Chưa có cặp cung đầy đủ để đối chiếu.</p>:<ul>{report.relations.map(r=><li key={`${r.role}-${r.fromPalace}-${r.toPalace}`}>{r.description} <button type="button" className={styles.inline} onClick={()=>openPalace(r.toPalace)}>Xem cung {r.toPalace}</button></li>)}</ul>}
    <ul>{report.contextEvidence.map(e=><li key={e.id}>{e.text}</li>)}</ul>
   </details>
   <div className={styles.missing}><h5>Những điều chưa đủ dữ kiện / chưa thẩm định</h5><ul>{report.missingData.filter(m=>m.code!=='season-strength'||!workbook||workbook.status!=='ready'||report.indicator.layer==='deity').map(m=><li key={m.code}>{m.text}</li>)}</ul></div>
   {workbook&&<WorkbookPanel report={workbook}/>}
   <p className={styles.scope}>{report.note} Không tự động cho điểm cát/hung, tỷ lệ thành công hoặc dự báo sự kiện.</p>
  </div>}
  {!valid&&<p className={styles.notice}>Chưa có kết quả: hãy chọn chủ đề và Dụng thần{topic==='other'?' và mô tả câu hỏi':''}.</p>}
 </section>;
}
function EvidenceList({title,items,empty}:{title:string;items:QuestionReadingReport['supportingEvidence'];empty:string}){
 return <section className={styles.evidence}><h5>{title} <span>({items.length})</span></h5>
  {items.length?<ul>{items.map(e=><li key={e.id} data-evidence-kind={e.kind}>{e.text}</li>)}</ul>:<p>{empty}</p>}
 </section>;
}
