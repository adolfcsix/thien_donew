'use client';
import {NumerologyStudy} from '@/features/western/numerology-study';
import {DisciplineNavigation} from '@/features/western/discipline-navigation';
import {ExpertOnly} from '@/components/view-mode';
import {SymbolObservatory} from '@/features/western/symbol-observatory';
import {MysticScene} from '@/features/western/mystic-scene';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {calculate,validateInput,METHOD,type NumerologyInput,type NumerologyResult,type NumberTrace} from '@thiendo/astrology-engine/src/numerology-pythagorean.cjs';
import {calculate as advancedCalculate} from '@thiendo/astrology-engine/src/numerology-advanced.cjs';
import {SaveStudy} from '@/features/study-room/save-study';
import {studyApi,birthProfileApi} from '@/lib/api';
import {useAuth} from '@/components/auth-provider';
import styles from './numerology.module.css';
import {downloadBlobFile} from '@/lib/download-blob';

const motifs:Record<number,[string,string]>={1:['Khởi xướng','Mình chủ động ở đâu, và có để người khác góp ý không?'],2:['Hợp tác','Mình cân bằng nhu cầu cá nhân với quan hệ thế nào?'],3:['Biểu đạt','Ý tưởng nào cần được diễn đạt rõ hơn?'],4:['Cấu trúc','Thói quen nào giúp mình làm việc đều đặn?'],5:['Trải nghiệm','Thay đổi nào hữu ích, thay đổi nào chỉ để tránh khó khăn?'],6:['Chăm sóc','Mình có nhận trách nhiệm vượt quá giới hạn không?'],7:['Nghiên cứu','Mình đã kiểm tra bằng chứng trước khi tin chưa?'],8:['Tổ chức','Mình đo hiệu quả công việc bằng tiêu chí gì?'],9:['Hoàn tất','Điều gì nên kết thúc hoặc trao lại?'],11:['Cảm hứng · nền 2','Cảm nhận cá nhân đã được kiểm tra với thực tế chưa?'],22:['Kiến tạo · nền 4','Ý tưởng lớn cần bước nhỏ nào để thực hiện?'],33:['Chăm sóc · nền 6','Mình có đang kỳ vọng quá cao vào vai trò giúp đỡ không?']};
function Trace({trace}:{trace:NumberTrace|null}){return trace?<details><summary>Xem phép tính</summary>{trace.parts?.map((p,i)=><p key={i}>{p.word?`${p.word} (${p.letters||'không có chữ phù hợp'}): `:['Tháng: ','Ngày: ','Năm: '][i]}{p.steps.join(' → ')}</p>)}<p>Tổng sau rút gọn từng phần: {trace.steps.join(' → ')}</p></details>:<p>Không có chữ phù hợp để tính; không gán số 0.</p>;}
export default function NumerologyPage(){
 const {user,loading}=useAuth();
 const [input,setInput]=useState<NumerologyInput>({method:METHOD,name:'',date:'2000-01-01',year:2026,yMode:'consonant',masters:true});
 const [result,setResult]=useState<NumerologyResult|null>(null),[message,setMessage]=useState(''),[restoring,setRestoring]=useState(false);
 const revision=useRef(0);
 function update<K extends keyof NumerologyInput>(key:K,value:NumerologyInput[K]){revision.current++;setInput(s=>({...s,[key]:value}));setResult(null);setMessage('');}
 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get('entry');if(!id||loading)return;
  setResult(null);setInput(s=>({...s,name:''}));
  if(!/^[0-9a-f-]{36}$/i.test(id)){setMessage('Mã hồ sơ không hợp lệ.');return;}
  if(!user){setMessage('Đăng nhập đúng tài khoản để mở hồ sơ từ Thư phòng.');return;}
  const controller=new AbortController(),version=revision.current;setRestoring(true);setResult(null);
  void studyApi.get(id,controller.signal).then(data=>{if(controller.signal.aborted||version!==revision.current)return;if(data.entry.discipline!=='numerology')throw Error('Hồ sơ thuộc bộ môn khác.');const restored=validateInput(data.entry.snapshot);setInput(restored);setResult(calculate(restored));setMessage('Đã mở lại đầu vào; kết quả được tính lại theo phương pháp đã lưu.');}).catch(error=>{if(!controller.signal.aborted&&version===revision.current)setMessage(error.message);}).finally(()=>{if(!controller.signal.aborted)setRestoring(false);});
  return()=>controller.abort();
 },[user?.id,loading]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),id=params.get('profile');
  if(!id||params.has('entry')||loading)return;
  setResult(null);
  if(!/^[0-9a-f-]{36}$/i.test(id)){setMessage('Mã hồ sơ sinh không hợp lệ.');return;}
  if(!user){setMessage('Đăng nhập đúng tài khoản để nạp hồ sơ sinh.');return;}
  const controller=new AbortController(),version=revision.current;
  setRestoring(true);
  void birthProfileApi.get(id,controller.signal).then(({profile:p})=>{
   if(controller.signal.aborted||revision.current!==version)return;
   if(p.calendar!=='solar')throw Error('Thần số học cần ngày sinh dương lịch; không tự chuyển ngày âm.');
   // Profiles come from an API: validate the date before copying it into the form.
   // A malformed date would otherwise make the selected year NaN.
   if(typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date+'T00:00:00Z'))||new Date(p.date+'T00:00:00Z').toISOString().slice(0,10)!==p.date||+p.date.slice(0,4)<1900||+p.date.slice(0,4)>2100||typeof p.name!=='string')throw Error('Dữ liệu ngày sinh trong hồ sơ không hợp lệ.');
   // Keep the selected personal year only if it remains within the valid range
   // for the restored birth date; this also handles a saved profile born later.
   setInput(s=>({...s,name:p.name,date:p.date,year:Math.max(s.year,Number(p.date.slice(0,4)))}));setResult(null);
   setMessage('Đã nạp dữ liệu sinh; kiểm tra tên dùng để tính và bấm Tính và đối chiếu.');
  }).catch(e=>{if(!controller.signal.aborted&&revision.current===version)setMessage((e as Error).message);})
   .finally(()=>{if(!controller.signal.aborted)setRestoring(false);});
  return()=>controller.abort();
 },[user?.id,loading]);
 function submit(e:FormEvent){e.preventDefault();try{setResult(calculate(input));setMessage('');}catch(error){setResult(null);setMessage((error as Error).message);}}
 function exportJson(){if(!result)return;downloadBlobFile(new Blob([JSON.stringify({format:'thien-do.numerology-result',version:1,result},null,2)],{type:'application/json'}),'thien-do-pythagoras.json');}
 const advanced=result?advancedCalculate(result.input):null;
 const metrics=result?[['Đường đời',result.lifePath],['Biểu đạt',result.expression],['Linh hồn',result.soulUrge],['Nhân cách',result.personality]] as const:[];
 return <div className={`${styles.root} western-world-page`}><DisciplineNavigation current="/numerology"/>
  <header className={styles.hero}><div className={styles.heroScene}><MysticScene variant="numerology"/></div><span>THIÊN ĐỒ / PYTHAGORAS</span><h1>Hình học của những con số</h1><p>Đối chiếu từng bước tính từ ngày sinh và tên. Một hệ biểu tượng hiện đại để nghiên cứu và tự suy ngẫm; các con số không xác định tính cách hay tương lai bằng khoa học.</p><div className={styles.badges}><b>Thư viện: nền tảng</b><b>Công cụ: đã triển khai</b><b>Chỉ số nâng cao: có đối chiếu</b></div></header><ExpertOnly defer title="Xưởng học biểu tượng 3D"><SymbolObservatory discipline="numerology"/></ExpertOnly>
  <section className={styles.panel}><h2>01 / Chọn dữ liệu và quy ước</h2><form onSubmit={submit} className={styles.form}>
   <label>Họ tên theo giấy khai sinh<input value={input.name} required maxLength={100} disabled={restoring} onChange={e=>update('name',e.target.value)} autoComplete="off" placeholder="Nhập tên hoặc bản chuyển tự muốn nghiên cứu"/></label>
   <label>Ngày sinh dương lịch<input type="date" value={input.date} min="1900-01-01" max="2100-12-31" required disabled={restoring} onChange={e=>update('date',e.target.value)}/></label>
   <label>Năm cá nhân cần xem<input type="number" value={input.year} min={+input.date.slice(0,4)||1900} max={2100} required disabled={restoring} onChange={e=>update('year',Number(e.target.value))}/></label>
   <label>Quy ước chữ Y<select value={input.yMode} disabled={restoring} onChange={e=>update('yMode',e.target.value as NumerologyInput['yMode'])}><option value="consonant">Y là phụ âm</option><option value="vowel">Y là nguyên âm</option></select></label>
   <label>Rút gọn chỉ số gốc<select value={input.masters?'preserve':'reduce'} disabled={restoring} onChange={e=>update('masters',e.target.value==='preserve')}><option value="preserve">Giữ 11, 22, 33</option><option value="reduce">Đối chiếu: rút về 1–9</option></select></label>
   <button type="submit" disabled={restoring}>{restoring?'Đang mở hồ sơ…':'Tính và đối chiếu'}</button>
  </form><p>Tên tiếng Việt bỏ dấu, Đ → D; dấu nối và nháy tách thành phần tên. Bảng A–Z lặp 1–9. Y được chọn thủ công vì phụ thuộc cách phát âm; không tự đoán. Ngày sinh chia tháng/ngày/năm, tên chia từng thành phần trước khi cộng. Năm cá nhân luôn về 1–9 theo năm dương lịch, không theo sinh nhật.</p></section>
  {message&&<p role="status" className={styles.panel}>{message}</p>}
  {result&&<>
   <section className={styles.panel}><h2>02 / Những chỉ số đã tính</h2><p>Tên chuyển đổi: <strong>{result.normalizedName}</strong> · {result.input.masters?'Giữ số chủ':'Rút về 1–9'} · Y là {result.input.yMode==='vowel'?'nguyên âm':'phụ âm'}</p><div className={styles.cards}>{metrics.map(([label,trace])=><article key={label}><span>{label}</span><strong>{trace?.value??'—'}</strong><h3>{trace?motifs[trace.value]?.[0]: 'Chưa có chỉ số'}</h3><p>{trace?motifs[trace.value]?.[1]:'Tên không có chữ thuộc nhóm này.'}</p><Trace trace={trace}/></article>)}</div><details><summary>Bảng chữ cái của tên</summary><div className={styles.letters}>{result.letters.map((letter,i)=><span key={i}>{letter.letter}<b>{letter.value}</b><small>{letter.vowel?'Nguyên âm':'Phụ âm'}</small></span>)}</div></details><p>Số ngày sinh nguyên gốc: {result.birthday}. Các câu hỏi trên do Thiên Đồ biên soạn để tự đối chiếu, không phải kết luận cá nhân.</p></section>
   <section className={styles.panel}><h2>03 / Biểu đồ ngày sinh</h2><div className={styles.grid} aria-label="Tần suất chữ số ngày sinh">{[3,6,9,2,5,8,1,4,7].map(n=><div key={n}><small>Số {n}</small><b>{result.digitCounts[n]?'●'.repeat(result.digitCounts[n]):'—'}</b><span>{result.digitCounts[n]} lần</span></div>)}</div><p>Đếm chữ số 1–9 trong ngày/tháng/năm sinh; bỏ 0. Bố trí 3–6–9 / 2–5–8 / 1–4–7 là quy ước hiển thị. Ô trống chỉ nghĩa là không có chữ số đó, không chứng minh một khuyết điểm.</p></section>
   <ExpertOnly defer title="Chu kỳ và chỉ số nâng cao"><section className={styles.panel}><h2>04 / Chu kỳ để nghiên cứu</h2><div className={styles.years}>{result.personalYears.map(p=><article key={p.year}><span>{p.year}</span><b>{p.value}</b><small>{p.steps.join(' → ')}</small></article>)}</div><p>Năm cá nhân = tháng sinh + ngày sinh + năm xem, rút về 1–9. Hiển thị tối đa 9 năm, dừng ở 2100.</p><div className={styles.cards}>{result.pinnacles.map((p,i)=><article key={i}><span>Đỉnh {i+1}</span><strong>{p.value}</strong><p>Tuổi tròn từ {p.fromAge} đến {p.toAgeExclusive===null?'về sau':`trước ${p.toAgeExclusive}`}</p><small>{p.steps.join(' → ')}</small></article>)}</div><p>Đỉnh: tháng+ngày; ngày+năm; đỉnh 1+đỉnh 2; tháng+năm (các phần đã rút gọn). Mốc chuyển đầu = 36 − Đường đời rút về 1–9, hai khoảng tiếp dài 9 năm. Ranh giới tuổi dùng khoảng nửa mở để không trùng; không xác định ngày ứng nghiệm.</p><p>Bốn chỉ số thách thức: {result.challenges.join(' · ')}. Dùng chênh lệch tuyệt đối các phần ngày sinh đã về 1–9; số 0 hợp lệ, không gán thời điểm hay biến cố.</p></section>
   {advanced&&<section className={styles.panel} aria-labelledby="advanced-num-title"><h2 id="advanced-num-title">05 / Nâng cao · đối chiếu phương pháp</h2><p><strong>Phương pháp:</strong> Pythagoras có kiểm toán; kết quả bên dưới không thay đổi phép tính gốc hoặc kết quả đã lưu trong Thư phòng.</p>
    <div className={styles.cards}><article><span>Đường đời · phân đoạn</span><strong>{advanced.lifePathComparison.segmented.value}</strong><p>{advanced.lifePathComparison.segmented.parts.map(p=>p.steps.join(' → ')).join(' + ')} → {advanced.lifePathComparison.segmented.steps.join(' → ')}</p></article><article><span>Đường đời · tổng chữ số trực tiếp</span><strong>{advanced.lifePathComparison.allDigits.value}</strong><p>{advanced.lifePathComparison.allDigits.steps.join(' → ')}</p></article><article><span>Chỉ số trưởng thành</span><strong>{advanced.maturity?.value??'—'}</strong><p>{advanced.maturity?`${result.lifePath.value} + ${result.expression?.value} → ${advanced.maturity.steps.join(' → ')}`:'Thiếu chỉ số tên'}</p></article><article><span>So hai cách rút</span><strong>{advanced.lifePathComparison.agrees?'=':'≠'}</strong><p>{advanced.lifePathComparison.note}</p></article></div>
    <h3>Tần suất giá trị từ tên</h3><div className={styles.letters}>{Object.entries(advanced.nameFrequency.counts).map(([digit,count])=><span key={digit}>{digit}<b>{count}</b><small>lần</small></span>)}</div>
    <p>Giá trị xuất hiện nhiều nhất: {advanced.nameFrequency.hiddenPassion.join(', ')} · Giá trị vắng mặt: {advanced.nameFrequency.missingNumbers.length?advanced.nameFrequency.missingNumbers.join(', '):'Không có'}. Đây chỉ là phép đếm trên bảng chữ được chọn, không gán phẩm chất hay khiếm khuyết.</p>
    <h3>12 tháng cá nhân của năm {result.input.year}</h3><div className={styles.years}>{advanced.personalMonths.map(item=><article key={item.month}><span>Tháng {String(item.month).padStart(2,'0')}</span><b>{item.value}</b><small>{item.steps.join(' → ')}</small></article>)}</div><p>Tháng cá nhân = năm cá nhân + tháng dương lịch. Chỉ số ngày cũng tính được theo cùng hệ quy tắc nhưng không tự động tạo dự báo sự kiện.</p><p>{advanced.limitations.join(' ')}</p>
   </section>}
   </ExpertOnly><ExpertOnly defer title="Hồ sơ Thần số học chuyên sâu"><NumerologyStudy input={result.input}/></ExpertOnly>
   <button className={styles.export} onClick={exportJson}>↓ Xuất JSON đầy đủ (có tên và ngày sinh)</button>
   <SaveStudy draft={{discipline:'numerology',title:`Pythagoras · ${result.input.date}`,summary:`Đường đời ${result.lifePath.value} · phương pháp phân đoạn`,notes:'',tags:['Pythagoras'],snapshot:{...result.input}}}/>
  </>}
  <section className={styles.panel}><h2>Phương pháp và thư viện chung</h2><p>Pythagoras ở đây là tên hệ số học hiện đại, không khẳng định mọi quy ước bắt nguồn trực tiếp từ Pythagoras cổ đại. Chuyển tự tiếng Việt, lựa chọn Y và biến thể rút số được ghi riêng. Chaldean chưa có engine; Kabbalah là lĩnh vực nghiên cứu độc lập, không phải hệ số học thay thế Pythagoras. <Link href="/western-symbols">Mở atlas Kabbalah & Tarot →</Link></p><ul>{[{title:'Hans Decoz — phương pháp tính chỉ số',url:'https://www.worldnumerology.com/do-your-own-reading/'},{title:'Numerology.com — tính Đường đời',url:'https://www.numerology.com/articles/your-numerology-chart/life-path-number-meanings/'}].map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></li>)}</ul><p>Nguồn là tác giả/trang thực hành số học, dùng đối chiếu quy ước, không phải bằng chứng xác thực khoa học.</p><Link href="/library">Tra từ điển chung ↗</Link> · <Link href="/research/development">Xem mức phát triển từng chuyên môn ↗</Link></section>
 </div>;
}
