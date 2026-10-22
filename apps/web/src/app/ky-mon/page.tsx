'use client';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {ModeIntroduction, ExpertOnly, useViewMode} from '@/components/view-mode';
import {ReadingQualityPanel} from '@/features/reading-quality/quality-panel';
import {KyMonCanvas} from '@/features/discipline-canvas/discipline-canvas';
import {buildKyMonQuality} from '@/features/reading-quality/quality.cjs';
import {useEffect,useMemo,useState} from 'react';
import {SaveStudy} from '@/features/study-room/save-study';
import {readStudyInput} from '@/features/study-room/study-links.cjs';
import Link from 'next/link';
import Engine from '@thiendo/astrology-engine';
import {PALACES,EIGHT_GATES,THREE_WONDERS,SIX_INSTRUMENTS,NINE_STARS,EIGHT_DEITIES,getPalace,oppositePalace,verifyLuoShu} from '@/features/ky-mon/luoshu.cjs';
import {CYCLE,SOLAR_TERMS,hourForDayBranch,hoursForDay,makeBaseFormation} from '@/features/ky-mon/formation.cjs';
import {suggestKymonContext,type CalendarSuggestion} from '@/features/ky-mon/calendar-context.cjs';
import {buildRotatingHourPlate} from '@/features/ky-mon/hour-plate.cjs';
import {analyzeHourSignals} from '@/features/ky-mon/hour-signals.cjs';
import {buildPalaceLedger} from '@/features/ky-mon/palace-ledger.cjs';
import {PalaceEvidencePanel} from '@/features/ky-mon/palace-evidence-panel';
import {analyzeStructuralSignals} from '@/features/ky-mon/structural-signals.cjs';
import {StructuralEvidencePanel} from '@/features/ky-mon/structural-evidence-panel';
import {analyzePatternSignals} from '@/features/ky-mon/pattern-signals.cjs';
import {PatternEvidencePanel} from '@/features/ky-mon/pattern-evidence-panel';
import {analyzeMonthStrength} from '@/features/ky-mon/month-strength.cjs';
import {MonthStrengthPanel} from '@/features/ky-mon/month-strength-panel';
import {QuestionReadingPanel} from '@/features/ky-mon/question-reading-panel';
import styles from '../huyen-hoc/workbench.module.css';
import detail from './formation.module.css';
import timeStyle from './calendar.module.css';
import hourStyle from './hour-plate.module.css';

const EXAMPLE={solarTermIndex:0,dayCycleIndex:0,hourBranchIndex:0};
type InputMode='auto'|'manual';
type DayBoundary='midnight'|'late-zi';

export default function KyMonPage(){
 const [restoreNotice,setRestoreNotice]=useState('');
 const {mode: viewMode} = useViewMode();
 const isExpert = viewMode === 'expert';
 const [selected,setSelected]=useState(1);
 const [mode,setMode]=useState<InputMode>('auto');
 const [manual,setManual]=useState(EXAMPLE);
 const [withHour,setWithHour]=useState(true);
 const [showHourPlate,setShowHourPlate]=useState(true);
 const [date,setDate]=useState('');
 const [hour,setHour]=useState(12);
 const [minute,setMinute]=useState(0);
 const [dayBoundary,setDayBoundary]=useState<DayBoundary>('midnight');
 const [lateZiAcknowledged,setLateZiAcknowledged]=useState(false);
 useEffect(()=>{const saved=readStudyInput('ky-mon',window.location.search);if(!saved){if(new URLSearchParams(window.location.search).get('restore')==='1')setRestoreNotice('Bản mở lại có tham số không hợp lệ; đang giữ dữ liệu mẫu, chưa khôi phục.');return;}
  setMode(saved.mode);setWithHour(saved.withHour);
  if(saved.mode==='manual')setManual({solarTermIndex:saved.solarTermIndex,dayCycleIndex:saved.dayCycleIndex,hourBranchIndex:saved.hourBranchIndex});
  else {setDate(saved.date);setHour(saved.hour);setMinute(saved.minute);setDayBoundary(saved.dayBoundary);setLateZiAcknowledged(saved.lateZiAcknowledged??false);}
 },[]);
 const manualHours=useMemo(()=>hoursForDay(manual.dayCycleIndex),[manual.dayCycleIndex]);
 const autoState=useMemo<{decision:CalendarSuggestion|null;error:string|null}>(()=>{
  if(!date)return {decision:null,error:null};
  try{
   const result=Engine.baziCalculate({date,hour,minute,dayBoundary});
   const [y,m,d]=date.split('-').map(Number);
   const calendar=Engine.calendarDay(y,m,d);
   if(hour!==23&&calendar.dayCanChi!==result.pillars.day.name)
    throw new Error('Lịch vạn niên và bộ Bát Tự cho Can Chi ngày không giống nhau; cần kiểm tra lại engine.');
   return {decision:suggestKymonContext({date,hour,minute,dayBoundary,
    longitudeDeg:result.solarTerm.longitudeDeg,
    dayCanChi:result.pillars.day.name,hourCanChi:result.pillars.hour.name,lateZiAcknowledged}),error:null};
  }catch(e){return {decision:null,error:e instanceof Error?e.message:'Không đọc được lịch pháp.'};}
 },[date,hour,minute,dayBoundary,lateZiAcknowledged]);
 const formation=useMemo(()=>{
  if(mode==='manual')return makeBaseFormation({solarTermIndex:manual.solarTermIndex,dayCycleIndex:manual.dayCycleIndex,
   hourCycleIndex:withHour?hourForDayBranch(manual.dayCycleIndex,manual.hourBranchIndex).index:null});
  const ctx=autoState.decision;
  if(!ctx?.canAutoForm)return null;
  return makeBaseFormation({solarTermIndex:ctx.solarTerm.index,dayCycleIndex:ctx.dayCycleIndex,
   hourCycleIndex:withHour?ctx.hourCycleIndex:null});
 },[mode,manual,autoState.decision,withHour]);
 const hourPlate=useMemo(()=>formation?.chief?buildRotatingHourPlate(formation):null,[formation]);
 const hourSignals=useMemo(()=>formation&&hourPlate?analyzeHourSignals(formation,hourPlate):null,[formation,hourPlate]);
 const quality=useMemo(()=>buildKyMonQuality(formation,{source:mode,decision:autoState.decision,withHour,hourPlate}),[formation,mode,autoState.decision,withHour,hourPlate]);
 const savedDraft=formation?{discipline:'ky-mon' as const,title:`Kỳ Môn · ${formation.dun} độn ${formation.ju} cục`,
  summary:`${mode==='auto'?'Lịch pháp':'Nhập thủ công'} · ${formation.term} · ${withHour?'Có thời bàn':'Địa bàn'}`,
  notes:'',tags:[],snapshot:mode==='manual'?{mode,withHour,...manual}:{mode,withHour,date,hour,minute,dayBoundary,lateZiAcknowledged}}:null;
 const palaceLedger=useMemo(()=>formation?buildPalaceLedger(formation,hourPlate):null,[formation,hourPlate]);
 const structuralReport=useMemo(()=>formation?analyzeStructuralSignals(formation,hourPlate):null,[formation,hourPlate]);
 const patternReport=useMemo(()=>formation?analyzePatternSignals(formation,hourPlate):null,[formation,hourPlate]);
 const monthReport=useMemo(()=>formation?analyzeMonthStrength(formation,hourPlate):null,[formation,hourPlate]);
 const palace=getPalace(selected)!;
 const opposite=oppositePalace(selected)!;
 const detailPalace=formation?.palaces.find(p=>p.number===selected);
 const check=verifyLuoShu();
 const changeManual=(key:keyof typeof EXAMPLE,value:number)=>setManual(prev=>({...prev,[key]:value}));
 function loadExample(){setMode('manual');setManual(EXAMPLE);setWithHour(true);setSelected(1);}
 return <div className={`${styles.page} ${styles.ky}`}>
  <Link href="/ky-mon/depth">↗ Kỳ Môn chuyên sâu · phương pháp và đối chứng</Link>
  <header className={styles.hero}><EasternScene variant="ky-mon"/>
   <span className={styles.kicker}>THIÊN ĐỒ / KỲ MÔN ĐỘN GIÁP · CHAI BỔ · KIỂM CHỨNG LỊCH PHÁP</span>
   <h1>Kỳ Môn Độn Giáp</h1>
   <p>Đọc <b>tiết khí, Can Chi</b> và an <b>địa bàn Tam Kỳ – Lục Nghi</b>, sau đó trình bày <b>Thiên bàn, Bát Môn, Bát Thần theo Chuyển Bàn</b> khi có giờ hợp lệ. Đây là một phương pháp và quy ước tính cụ thể; gần giao tiết, giờ Tý hoặc khác trường phái cần xác minh. Có lớp đối chiếu theo câu hỏi ở chế độ Chuyên sâu, nhưng chưa suy luận cách cục hoặc kết quả sự kiện toàn diện.</p>
   <Link href="/huyen-hoc" className={styles.back}>← Thư phòng huyền học</Link>
  </header><DisciplineMethodGuide variant="ky-mon"/>
  {restoreNotice&&<p role="alert">{restoreNotice}</p>}
  <ModeIntroduction discipline="ky-mon" summary={formation ? `${formation.dun} độn · ${formation.ju} cục; ${formation.term}.` : "Đang chờ ngày giờ đủ điều kiện lập cục."}/>
  <KyMonCanvas palaces={PALACES} selected={selected} onSelect={setSelected}/>
  <SaveStudy draft={savedDraft}/>
  <section id="ky-mon-workspace" className={styles.panel}>
   <span className={styles.kicker}>01 / PHƯƠNG PHÁP · CHAI BỔ (拆補)</span>
   <h2>Dữ kiện khởi cục</h2>
   <div className={timeStyle.mode} role="group" aria-label="Nguồn dữ kiện Kỳ Môn">
    <button type="button" aria-pressed={mode==='auto'} onClick={()=>setMode('auto')}>Gợi ý từ ngày giờ dương lịch</button>
    <button type="button" aria-pressed={mode==='manual'} onClick={()=>setMode('manual')}>Nhập thông tin đã đối chiếu</button>
   </div>
   {mode==='auto'?<>
    <div className={timeStyle.inputs}>
     <label className={styles.field}>Ngày dương (Việt Nam, UTC+7)
      <input type="date" value={date} min="1900-01-01" max="2100-12-31" onChange={e=>{setDate(e.target.value);setLateZiAcknowledged(false);}}/>
     </label>
     <label className={styles.field}>Giờ địa phương (0–23)
      <select value={hour} onChange={e=>{setHour(Number(e.target.value));setLateZiAcknowledged(false);}}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')} giờ</option>)}</select>
     </label>
     <label className={styles.field}>Phút
      <select value={minute} onChange={e=>setMinute(Number(e.target.value))}>{Array.from({length:60},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}</option>)}</select>
     </label>
     <label className={styles.field}>Quy ước bắt đầu ngày Can Chi
      <select value={dayBoundary} onChange={e=>{setDayBoundary(e.target.value as DayBoundary);setLateZiAcknowledged(false);}}>
       <option value="midnight">00:00 — hết ngày dương mới đổi Can Chi</option>
       <option value="late-zi">23:00 — giờ Tý muộn chuyển sang ngày sau</option>
      </select>
     </label>
    </div>
    {hour===23&&<label className={timeStyle.confirm}>
     <input type="checkbox" checked={lateZiAcknowledged} onChange={e=>setLateZiAcknowledged(e.target.checked)}/>
     Tôi đã xác nhận quy ước đổi ngày lúc {dayBoundary==='late-zi'?'23:00':'00:00'} và hiểu rằng hai cách có thể cho kết quả khác nhau.
    </label>}
    {!date&&<p className={styles.note}>Nhập ngày và giờ để đọc dữ kiện lịch pháp. Hệ thống không tự lấy thời gian hiện tại hoặc mặc định một lá số cá nhân.</p>}
    {autoState.error&&<p className={timeStyle.warning} role="alert">Lỗi dữ liệu lịch: {autoState.error}</p>}
    {autoState.decision&&<div className={timeStyle.report} aria-live="polite">
     <div className={styles.facts}>
      <div className={styles.fact}><span>Tiết khí dự kiến</span><strong>{autoState.decision.solarTerm.name}</strong><small>λ ≈ {autoState.decision.solarTerm.longitudeDeg.toFixed(3)}°</small></div>
      <div className={styles.fact}><span>Ngày Can Chi</span><strong>{autoState.decision.dayCanChi}</strong><small>Trụ ngày Bát Tự</small></div>
      <div className={styles.fact}><span>Giờ Can Chi</span><strong>{autoState.decision.hourCanChi}</strong><small>Ngũ Tý Độn · UTC+7</small></div>
      <div className={styles.fact}><span>Độ cách ranh giới tiết</span><strong>{autoState.decision.solarTerm.boundaryDistanceDeg}°</strong><small>Chỉ là ước lượng góc</small></div>
     </div>
     <p className={autoState.decision.canAutoForm?timeStyle.success:timeStyle.warning} role="status">
      {autoState.decision.canAutoForm?'Đủ điều kiện đề xuất địa bàn theo phương pháp đã chọn. Chưa phải nhập tiết có độ chính xác thiên văn.':'Chưa tự chốt cục số vì dữ kiện có yếu tố cần xác minh.'}
     </p>
     {autoState.decision.reasons.length>0&&<ul className={timeStyle.reasons}>{autoState.decision.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
     <p className={styles.small}>{autoState.decision.solarTerm.precision}. Dùng chế độ nhập thủ công khi đã có mốc nhập tiết đáng tin cậy. Không hiệu chỉnh chân thái dương thời.</p>
    </div>}
   </>:<>
    <div className={detail.inputs}>
     <label className={styles.field}>Tiết khí đã xác nhận
      <select value={manual.solarTermIndex} onChange={e=>changeManual('solarTermIndex',Number(e.target.value))}>{SOLAR_TERMS.map(t=><option key={t.index} value={t.index}>{t.name} · {t.dun==='dương'?'Dương':'Âm'} độn</option>)}</select>
     </label>
     <label className={styles.field}>Can Chi ngày đã xác nhận
      <select value={manual.dayCycleIndex} onChange={e=>changeManual('dayCycleIndex',Number(e.target.value))}>{CYCLE.map(day=><option key={day.index} value={day.index}>{day.name} · #{day.index+1}</option>)}</select>
     </label>
     <label className={styles.field}>Can Chi giờ theo Ngũ Tý Độn
      <select disabled={!withHour} value={manual.hourBranchIndex} onChange={e=>changeManual('hourBranchIndex',Number(e.target.value))}>{manualHours.map((item,i)=><option key={item.index} value={i}>{item.name}</option>)}</select>
     </label>
    </div>
    <p className={styles.note}>Chế độ nhập tay không đối chiếu tổ hợp tiết khí/Can Chi với ngày giờ lịch thực. Bạn chịu trách nhiệm xác nhận các dữ kiện và lựa chọn trường phái. Không lấy tháng âm lịch thay tiết khí.</p>
    <button type="button" className={styles.button} onClick={loadExample}>Nạp ví dụ Đông Chí · Giáp Tý</button>
   </>}
   <div className={detail.inlineControls}>
    <label className={detail.toggle}><input type="checkbox" checked={withHour} onChange={e=>setWithHour(e.target.checked)}/> Tính địa bàn, thời bàn và Tuần Không khi có giờ</label>
   </div>
   {withHour&&isExpert&&<label className={detail.toggle}><input type="checkbox" checked={showHourPlate} onChange={e=>setShowHourPlate(e.target.checked)}/> Hiển thị các lớp Chuyển Bàn theo giờ trên từng cung</label>}
  </section>
  {formation? <>
   <div className={styles.columns}>
    <section className={styles.panel}>
     <span className={styles.kicker}>02 / CỤC SỐ & ĐỊA BÀN</span>
     <h2>{formation.dun==='dương'?'Dương':'Âm'} độn · {formation.ju} cục</h2>
     <div className={styles.facts}>
      <div className={styles.fact}><span>Tiết khí</span><strong>{formation.term}</strong><small>{mode==='auto'?'Từ lịch pháp gần đúng':'Người dùng xác nhận'}</small></div>
      <div className={styles.fact}><span>Nguyên</span><strong>{formation.yuan.name}</strong><small>Từ {formation.yuan.blockStartName}</small></div>
      <div className={styles.fact}><span>Chiều an</span><strong>{formation.dun==='dương'?'Thuận':'Nghịch'}</strong><small>Theo số cung 1–9</small></div>
     </div>
     <ExpertOnly title="Phương pháp an cục và Tam Kỳ–Lục Nghi"><div className={styles.trace}>
      <p>{formation.term} có bảng cục <b>{SOLAR_TERMS[formation.solarTermIndex].ju.join(' – ')}</b> (Thượng–Trung–Hạ). Can Chi ngày <b>{formation.day}</b> thuộc nhóm bắt đầu từ <b>{formation.yuan.blockStartName}</b>, nên lấy <b>{formation.ju}</b> cục.</p>
      <p>Mậu khởi tại cung {formation.ju}; Kỷ, Canh, Tân, Nhâm, Quý, Đinh, Bính, Ất an theo {formation.dun==='dương'?'thuận':'nghịch'} số cung, quay vòng 1–9.</p>
     </div>
     </ExpertOnly>
     <div className={styles.loGrid} role="group" aria-label="Địa bàn chín cung Lạc Thư có Tam Kỳ Lục Nghi">
      {formation.palaces.map(p=><button type="button" className={`${styles.palace} ${detail.formationPalace}`} key={p.number}
       aria-pressed={selected===p.number} aria-label={`Cung ${p.number}, ${p.direction}, địa bàn ${p.earthStem}${p.doorTimeCandidate?', vị trí Trực Sử ứng giờ':''}${p.voidAtPalace?', dấu Tuần Không theo giờ':''}`}
       onClick={()=>setSelected(p.number)}>
       <small>{p.direction}</small><b>{p.number}</b><strong className={detail.stem}>{p.earthStem}</strong>
       <span>{p.symbol} {p.trigram==='Không có quái riêng'?'Trung':p.trigram}</span>
       {isExpert&&showHourPlate&&hourPlate?.byPalace[p.number]&&p.number!==5&&<span className={hourStyle.palaceLayers}>
        <span>Thiên {hourPlate.byPalace[p.number].heavenStem}</span>
        <span className={hourStyle.star}>{hourPlate.byPalace[p.number].star}{hourPlate.byPalace[p.number].lodgedTianQin?' + Thiên Cầm':''}</span>
        <span className={hourStyle.door}>{hourPlate.byPalace[p.number].door} Môn</span>
        <span className={hourStyle.deity}>{hourPlate.byPalace[p.number].deity}</span>
       </span>}
       {isExpert&&showHourPlate&&hourPlate?.byPalace[p.number].chiefStarLanding&&<em className={hourStyle.starFlag}>Trực Phù ứng giờ</em>}
       {p.chiefHome&&<em className={detail.flag}>Trực Phù gốc</em>}
       {p.doorTimeCandidate&&<em className={timeStyle.doorFlag}>Trực Sử ứng giờ</em>}
       {p.voidAtPalace&&<em className={timeStyle.voidFlag}>Tuần Không</em>}
      </button>)}
     </div>
     <p className={styles.small}>Sơ đồ Nam ở trên. Tổng hàng/cột/chéo Lạc Thư = {check.sums[0]} ({check.valid?'đạt':'lỗi'}). Chữ Can lớn là <b>địa bàn</b>; {isExpert?<>các lớp màu là <b>Thiên bàn / Cửu Tinh / Bát Môn / Bát Thần</b> theo Chuyển Bàn, chỉ xuất hiện khi đủ giờ và bật hiển thị.</>:<>bật Chuyên sâu để xem lớp Thiên bàn, Cửu Tinh, Bát Môn và Bát Thần khi có giờ hợp lệ.</>} Dấu Tuần Không không phải kết luận tốt/xấu. Trung 5 không an riêng môn và thần.</p>
    </section>
    <ExpertOnly title="Chi tiết từng cung và Chuyển Bàn thời gian"><section className={styles.panel} aria-live="polite">
     <span id="ky-mon-palace-detail" className={styles.kicker}>03 / DỮ LIỆU TỪNG CUNG</span><h2>Cung {palace.number} — {palace.direction}</h2>
     <div className={styles.facts}>
      <div className={styles.fact}><span>Địa bàn Tam Kỳ / Lục Nghi</span><strong>{detailPalace?.earthStem}</strong><small>{formation.dun} độn {formation.ju} cục</small></div>
      <div className={styles.fact}><span>Cửu Tinh bản vị</span><strong className={detail.smallTitle}>{detailPalace?.homeStar}</strong><small>Bản vị tham chiếu; không phải sao đã chuyển theo giờ</small></div>
      <div className={styles.fact}><span>Bát Môn bản vị</span><strong>{detailPalace?.homeDoor??'—'}</strong><small>{selected===5?'Trung cung không có môn riêng':'Bản vị tham chiếu; không phải môn theo giờ'}</small></div>
     </div>
     {palaceLedger&&<PalaceEvidencePanel ledger={palaceLedger} selected={selected} onSelect={setSelected}/>}
     {structuralReport&&<StructuralEvidencePanel report={structuralReport} selected={selected} onSelect={setSelected}/>}
     {patternReport&&<PatternEvidencePanel report={patternReport} selected={selected} onSelect={setSelected}/>}
     {monthReport&&<MonthStrengthPanel report={monthReport} selected={selected} onSelect={setSelected}/>}
     <QuestionReadingPanel base={formation} plate={hourPlate} inputSignature={JSON.stringify([mode,manual,withHour,date,hour,minute,dayBoundary,lateZiAcknowledged])} onSelect={setSelected}/>
     <div className={styles.trace}>
      <h3>Đối cung và quái gốc</h3>
      <p>{palace.symbol} {palace.trigram} · {palace.element}; đối cung {opposite.number} ({opposite.direction}). Không suy kết luận cát hung từ riêng địa bàn.</p>
      <h3>Tuần giờ · Trực Phù / Trực Sử tại cung gốc</h3>
      {formation.chief?<>
       <p>Giờ <b>{formation.chief.hourName}</b> thuộc tuần <b>{formation.chief.xunHead}</b>, Giáp ẩn dưới <b>{formation.chief.hiddenStem}</b> tại cung <b>{formation.chief.originalPalace}</b>. Trực Phù gốc: <b>{formation.chief.chiefStar}</b>; Trực Sử gốc: <b>{formation.chief.chiefDoor}</b>.</p>
       <p><b>Trực Sử theo giờ:</b> tính {formation.chief.doorTime.stepsFromXunHead} bước từ cung gốc {formation.chief.originalPalace} theo chiều {formation.dun==='dương'?'thuận':'nghịch'} số cung → cung {formation.chief.doorTime.rawPalace}{formation.chief.doorTime.borrowedCenter?' (mượn Khôn 2 theo quy ước ký môn)':''}. {formation.chief.doorTime.note}</p>
       <p><b>Tuần Không giờ:</b> {formation.chief.voids.branches.join(' – ')}; các cung quy chiếu {formation.chief.voids.palaceNumbers.join(', ')}. {formation.chief.voids.note}</p>
       {formation.chief.borrowedCenter&&<p>Trực Phù gốc ở Trung cung 5; Trực Sử mượn Khôn 2 theo quy ước ký môn. Cần đối chiếu dị bản khi an bàn thời gian.</p>}
       <p className={detail.caution}>{hourPlate?"Dữ kiện Trực Phù/Trực Sử gốc vẫn giữ để truy nguyên; các lớp thời bàn mới chỉ áp dụng theo hệ Chai Bổ – Chuyển Bàn đã nêu, không chứng nhận mọi dị bản." : formation.chief.caution}</p>
      </>:<p>Chưa chọn hoặc đã tắt giờ; không tự gán các dữ liệu giờ.</p>}
      {!hourPlate&&<p>Chưa an Thiên bàn, Bát Môn và Bát Thần khi chưa có dữ liệu giờ hợp lệ.</p>}
      {hourPlate&&<div className={hourStyle.readout}>
       <h3>Thời bàn cung {selected}: Chuyển Bàn</h3>

       <p>Trực Phù <b>{hourPlate.chiefStar}</b>: cung gốc {formation.chief?.originalPalace} → cung {hourPlate.chiefStarLanding} theo Can giờ {hourPlate.trueHourStem}; Trực Sử <b>{hourPlate.chiefDoor}</b> → cung {hourPlate.chiefDoorLanding}. Phép xoay sao +{hourPlate.starShift} và môn +{hourPlate.doorShift} vị trí qua vòng tám cung ngoài.</p>
       {hourSignals&&<details className={styles.accordion}><summary>Mã Tinh và Lục Nghi Kích Hình</summary>
        <p><b>Mã Tinh theo giờ {hourSignals.hourHorse.basisBranch}:</b> {hourSignals.hourHorse.horseBranch} · cung {hourSignals.hourHorse.palaceNumber} ({hourSignals.hourHorse.direction}). <b>Đối chiếu theo ngày:</b> {hourSignals.dayHorse.horseBranch} · cung {hourSignals.dayHorse.palaceNumber}.</p>
        <p><b>Cung {selected}:</b> {hourSignals.byPalace[selected].hourHorse?'có Mã Tinh giờ':'không có Mã Tinh giờ'}; {hourSignals.byPalace[selected].strikingInstruments.length?`Thiên bàn ${hourSignals.byPalace[selected].strikingInstruments.join(', ')} trùng vị trí Kích Hình`:'không có Lục Nghi trùng vị trí Kích Hình'}.</p>
        <p>{hourSignals.striking.length?`Toàn bàn có ${hourSignals.striking.length} vị trí Lục Nghi Kích Hình cần đối chiếu.`:'Chưa thấy Lục Nghi trùng vị trí Kích Hình trên Thiên bàn.'} Đây chỉ là dấu hiệu cấu trúc, không phải kết luận cát hung.</p>
        <p><b>Truy nguyên Mã Tinh giờ:</b> nhóm {hourSignals.hourHorse.group} → chi {hourSignals.hourHorse.horseBranch} → cung {hourSignals.hourHorse.palaceNumber}. Mã Tinh ngày dùng chi {hourSignals.dayHorse.basisBranch}, nhóm {hourSignals.dayHorse.group}; chỉ để đối chiếu.</p>
        {hourSignals.striking.length>0&&<ul>{hourSignals.striking.map(hit=><li key={hit.instrument}>{hit.xun} ẩn {hit.instrument} → Thiên bàn {hit.heavenStem} tại cung {hit.palace} ({getPalace(hit.palace)?.direction}) → {hit.relation}. <button type="button" onClick={()=>setSelected(hit.palace)}>Xem cung {hit.palace}</button></li>)}</ul>}
        <p>Lớp Mã Tinh / Kích Hình được đối chiếu riêng sau khi dựng thời bàn; các mục chưa tính của thời bàn bên dưới mô tả phạm vi bộ dựng bàn.</p>
       </details>}
       <p>Cung có sao Thiên Nhuế sẽ ký thêm Thiên Cầm; ở Trung 5 chỉ giữ Can địa bàn {hourPlate.centerEarthStem}.</p>
      </div>}
      <h3>Giới hạn / dữ liệu cần thẩm định</h3>
      <ul className={detail.missing}>{(hourPlate?hourPlate.limitations:formation.notComputed).map(item=><li key={item}>{hourPlate&&item.startsWith('Chưa tính Mã Tinh')?'Mã Tinh, Kích Hình, Môn Bách và Tam Kỳ Nhập Mộ có lớp đối chiếu cấu trúc riêng; chưa xét nhập mộ Lục Nghi/Môn/ngày giờ, cách cục tổng hợp và luận đoán.':item}</li>)}</ul>
     </div>
    </section></ExpertOnly>
   </div>
  </>:<section className={styles.panel} aria-live="polite">
   <span className={styles.kicker}>02 / CHỜ XÁC NHẬN ĐẦU VÀO</span>
   <h2>Chưa lập địa bàn</h2>
   <p>{!date?'Nhập một ngày giờ dương lịch để bắt đầu.':'Kết quả lịch pháp chưa đủ điều kiện tự chốt cục số. Bạn có thể tra lại mốc nhập tiết và chuyển sang chế độ nhập thủ công khi đã xác minh.'}</p>
   <p className={styles.small}>Đây là kiểm soát chất lượng dữ liệu, không phải lỗi mất chức năng. Website không dựng một kỳ bàn sai chỉ để hiển thị đủ chín cung.</p>
  </section>}
  <ExpertOnly title="Bảng kiểm chứng thành phần Kỳ Môn"><section className={styles.panel}>
   <span className={styles.kicker}>04 / THẨM ĐỊNH PHƯƠNG PHÁP</span><h2>Danh mục sao – môn – thần</h2>
   <div className={styles.facts}>{([['Tam Kỳ',THREE_WONDERS],['Lục Nghi',SIX_INSTRUMENTS],['Bát Môn',EIGHT_GATES],['Cửu Tinh',NINE_STARS],['Bát Thần',EIGHT_DEITIES]] as const).map(([name,items])=><div className={styles.fact} key={name}><span>{name} · {items.length}</span><div className={styles.chips}>{items.map(item=><span key={item}>{item}</span>)}</div></div>)}</div>
   <details className={styles.accordion}><summary>Phân biệt địa bàn, dữ liệu lịch pháp và kỳ bàn hoàn chỉnh</summary>
    <p>Công cụ tính các vòng <b>Thiên bàn/Cửu Tinh, Nhân bàn/Bát Môn, Thần bàn/Bát Thần</b> khi đủ giờ theo quy ước <b>Thời gia Chai Bổ – Chuyển Bàn</b>. Sao đi theo địa bàn Can giờ, môn đi theo bước giờ từ Tuần thủ, thần theo chiều Âm/Dương độn, Thiên Cầm ký Thiên Nhuế. Mã Tinh giờ/ngày, trùng vị trí Kích Hình, Môn Bách và Tam Kỳ Nhập Mộ được đối chiếu riêng ở phần Chuyên sâu theo quy ước ghi nguồn. Chưa tính: mốc nhập tiết chuẩn, chân thái dương thời, cách cục và luận đoán. Không ghép phép Chuyển Bàn với Phi Bàn hoặc Trí Nhuận.</p>
   </details>
  </section></ExpertOnly>
  <footer className={styles.disclaimer}>Đây không phải bàn Kỳ Môn hoàn chỉnh; các lớp hiện tại dùng để học tập và đối chiếu.</footer>
 <ReadingQualityPanel report={quality}/>
 </div>;
}
