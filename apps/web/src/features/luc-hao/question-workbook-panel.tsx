'use client';
import {useEffect,useMemo,useState} from 'react';
import {QUESTION_GUIDES,type Topic,type Family} from './question-evidence.cjs';
import type {TemporalContext} from './temporal.cjs';
import {buildLucHaoWorkbook} from '../research-workbook/luc-hao-workbook.cjs';
import {WorkbookPanel} from '../research-workbook/workbook-panel';
import styles from '../research-workbook/workbook.module.css';
export function LucHaoQuestionWorkbook({chart,movingPositions,context,blockedReason=null}:{chart:unknown;movingPositions:number[];context:TemporalContext|null;blockedReason?:string|null}){
 const [topic,setTopic]=useState(''),[checked,setChecked]=useState(false),[instant,setInstant]=useState(''),[confirmedKey,setConfirmedKey]=useState('');
 const boardKey=JSON.stringify([chart,movingPositions,context,blockedReason]);
 useEffect(()=>setConfirmedKey(''),[boardKey]);
 const key=JSON.stringify([boardKey,topic,instant,checked]);
 const guide=topic?QUESTION_GUIDES[topic as Topic]:null;
 const confirmed=!blockedReason&&!!guide&&checked&&key===confirmedKey;
 const result=useMemo(()=>{if(!confirmed||!guide)return {report:null,error:''};try{return {report:buildLucHaoWorkbook(chart,{questionId:topic as Topic,confirmedFamily:guide.family as Family,context,movingPositions,instantIso:instant.trim()||null}),error:''};}catch(e){return {report:null,error:e instanceof Error?e.message:'Không đủ điều kiện đối chiếu.'};}},[confirmed,guide,chart,topic,context,movingPositions,instant]);
 return <section className={styles.panel} aria-label="Lục Hào: câu hỏi và ứng viên hiện phục">
  <h3>Câu hỏi · ứng viên hiện/Phục Thần · đa hiện</h3><p>Chọn một trong năm phạm vi hẹp rồi tự xác nhận Lục Thân. Hồ sơ giữ đầy đủ ứng viên, dấu Nhật/Nguyệt và quan hệ Phi/Phục; không tự chọn một hào Dụng Thần.</p>
  <label>Phạm vi câu hỏi Lục Hào<select value={topic} onChange={e=>{setConfirmedKey('');setChecked(false);setTopic(e.target.value);}}><option value="">Chọn phạm vi có đối tượng rõ</option>{Object.entries(QUESTION_GUIDES).map(([id,g])=><option key={id} value={id}>{g.scope}</option>)}</select></label>
  {guide&&<label><input type="checkbox" checked={checked} onChange={e=>{setConfirmedKey('');setChecked(e.target.checked);}}/> Tôi xác nhận Lục Thân {guide.family} phù hợp phạm vi đang hỏi; chưa chọn một hào Dụng Thần.</label>}
  <details className={styles.section}><summary>Đối chiếu giao tiết bằng mốc UTC đã biết (tùy chọn)</summary><label>Mốc UTC có múi giờ<input type="text" value={instant} maxLength={40} onChange={e=>{setConfirmedKey('');setInstant(e.target.value);}} placeholder="2026-06-01T00:00:00Z"/></label><p>Chỉ dùng khi đã nhập riêng Can Chi ngày/tháng. Bảng Jie 2025–2027 là tham chiếu thứ cấp tới phút, chặn ±60 giây quanh giao tiết. Khớp bảng không phải xác minh ephemeris.</p></details>
  <button type="button" disabled={!guide||!checked||!!blockedReason} onClick={()=>setConfirmedKey(key)}>Xác nhận hồ sơ Lục Hào</button>
  {!confirmed&&guide&&<p role="status">Cần xác nhận cho quẻ, lịch pháp và phạm vi hiện tại.</p>}
  {blockedReason&&<p role="alert">Dữ liệu lịch chưa hợp lệ: {blockedReason}. Kiểm tra lại trước khi xác nhận hồ sơ.</p>}
  {result.error&&<p role="alert">{result.error}</p>}
  {result.report&&<WorkbookPanel report={result.report}/>}
 </section>;
}
