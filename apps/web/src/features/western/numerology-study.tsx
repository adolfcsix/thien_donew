'use client';
import {useMemo,useState} from 'react';
import type {NumerologyInput} from '@thiendo/astrology-engine/src/numerology-pythagorean.cjs';
import {buildNumerologyStudy} from '@thiendo/interpretation/src/numerology-study.cjs';
import {downloadBlobFile} from '@/lib/download-blob';
import styles from './study-workbench.module.css';
export function NumerologyStudy({input}:{input:NumerologyInput}){
 const [metric,setMetric]=useState('lifePath'),[choice,setChoice]=useState({year:input.year,date:input.year+'-01-01'});
 const selectedDate=choice.year===input.year?choice.date:input.year+'-01-01';
 const state=useMemo(()=>{try{if(!selectedDate.startsWith(input.year+'-'))throw Error('Chọn ngày trong năm '+input.year+'.');return {report:buildNumerologyStudy(input,selectedDate),error:''};}catch(e){return {report:null,error:(e as Error).message};}},[input,selectedDate]);
 const report=state.report,item=report?.metrics.find(m=>m.id===metric),p=item?.profile;
 function download(){if(report)downloadBlobFile(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}),'thien-do-than-so-hoc-suy-ngam.json');}
 return <section className={styles.root} aria-label="Hồ sơ Thần số học chuyên sâu"><h2>Hồ sơ Thần số học chuyên sâu</h2><p>Mỗi chỉ số có vai trò riêng. Chọn để đọc trọng tâm, nguồn lực, điểm cần cân bằng và bài tập có thể kiểm tra.</p><label>Ngày cá nhân để đối chiếu<input type="date" min={input.year+'-01-01'} max={input.year+'-12-31'} value={selectedDate} onChange={e=>setChoice({year:input.year,date:e.target.value})}/></label>{state.error&&<p role="alert">{state.error} Chọn lại ngày hợp lệ.</p>}
 {report&&<><div className={styles.facts} aria-label="Năm tháng ngày cá nhân"><span>Năm cá nhân<b>{report.personalDate.personalYear.value}</b>{report.personalDate.personalYear.steps.join(' → ')}</span><span>Tháng cá nhân<b>{report.personalDate.personalMonth.value}</b>{report.personalDate.personalMonth.steps.join(' → ')}</span><span>Ngày cá nhân<b>{report.personalDate.personalDay.value}</b>{report.personalDate.personalDay.steps.join(' → ')}</span></div><p>Tháng sinh + ngày sinh + năm đối chiếu → năm cá nhân; cộng tháng dương lịch → tháng cá nhân; cộng ngày trong tháng → ngày cá nhân. Ba lớp rút về 1–9, kể cả khi giữ số chủ ở chỉ số gốc.</p>
 <label>Chỉ số để đọc sâu<select value={metric} onChange={e=>setMetric(e.target.value)}>{report.metrics.map(m=><option key={m.id} value={m.id}>{m.label} · {m.value??'chưa có'}</option>)}</select></label><p>{item?.lens}</p>
 {item&&p?<article aria-label="Diễn giải chỉ số đã chọn"><h3>{item.label} {item.value} · {p.title}</h3><p>Phép rút: {item.steps.join(' → ')}</p><div className={styles.grid}><article><h4>Trọng tâm để hiểu</h4><p>{p.focus}</p><p>{p.resource}</p></article><article><h4>Điểm cần cân bằng</h4><p>{p.tension}</p><p>{p.check}</p></article><article><h4>Bài tập gắn với thực tế</h4><p>{p.practice}</p><p>Ghi cả tình huống không khớp; không ép trải nghiệm vào con số.</p></article></div></article>:<p role="status">Không có chữ thuộc nhóm đã chọn nên chưa tính chỉ số. Không tự gán số 0 hoặc đặc điểm thay thế.</p>}
 <div className={styles.exercise}><h4>Hai phép tính Đường đời</h4><p>Phân đoạn: {report.comparison.segmented} · cộng chữ số trực tiếp: {report.comparison.allDigits}. {report.comparison.agrees?'Trùng trong đầu vào này.':'Khác nhau: giữ phương pháp đã chọn, không chọn theo ý nghĩa dễ chịu hơn.'}</p></div><p className={styles.muted}>{report.notice}</p><button type="button" onClick={download}>Xuất hồ sơ suy ngẫm JSON</button><p className={styles.muted}>Bỏ tên/ngày sinh gốc, giữ các chỉ số và ngày đối chiếu. Ngày chọn chỉ giữ trong màn hình, chưa lưu riêng vào Thư phòng. JSON này không phải định dạng import Study.</p></>}
 </section>;
}
