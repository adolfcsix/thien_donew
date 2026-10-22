'use client';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {ModeIntroduction, ExpertOnly} from '@/components/view-mode';
import {useEffect,useRef,useState, type FormEvent} from 'react';
import {useAuth} from '@/components/auth-provider';
import {studyApi} from '@/lib/api';
import {SaveStudy} from '@/features/study-room/save-study';
import {createBaziSnapshot,validateBaziSnapshot} from '@thiendo/astrology-engine/src/bazi-study-snapshot.cjs';
import Engine from '@thiendo/astrology-engine';
import {assessResearchCoverage} from '@/features/bazi/research-coverage.cjs';
import {resolveJieDayEvidence} from '@thiendo/astrology-engine/src/bazi-jie-day-ledger-v111496.cjs';
import {resolvePrimaryHkoJie} from '@thiendo/astrology-engine/src/bazi-jie-hko-primary-v111497.cjs';
import {resolveOfficialHkoJieDay} from '@thiendo/astrology-engine/src/bazi-jie-hko-days-v111498.cjs';
import {resolveNaOJJie} from '@thiendo/astrology-engine/src/bazi-jie-naoj-minute-v111499.cjs';
const order=[['year','Năm sinh'],['month','Tháng tiết khí'],['day','Ngày sinh'],['hour','Giờ sinh']] as const;
type Boundary='midnight'|'late-zi';
type RuleSex='male'|'female';
const starter={date:'2026-02-19',hour:10,minute:30,dayBoundary:'midnight' as Boundary,sex:'male' as RuleSex};
export default function BaZiPage(){
  const [draft,setDraft]=useState(starter);
  const [input,setInput]=useState(starter);
  const [error,setError]=useState('');
  const [restoring,setRestoring]=useState(false);
  const {user,loading}=useAuth();
  const revision=useRef(0);
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('entry');
    if(!id||loading)return;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
      setRestoring(false);setError('Mã hồ sơ không hợp lệ.');return;
    }
    if(!user){setRestoring(false);setError('Đăng nhập đúng tài khoản để mở hồ sơ Bát Tự.');return;}
    const controller=new AbortController(),seq=++revision.current;
    setRestoring(true);
    void studyApi.get(id,controller.signal).then(data=>{
      if(controller.signal.aborted||seq!==revision.current)return;
      if(data.entry.discipline!=='bazi')throw Error('Hồ sơ thuộc bộ môn khác.');
      const s=validateBaziSnapshot(data.entry.snapshot);
      const next={date:s.date,hour:s.hour,minute:s.minute,dayBoundary:s.dayBoundary,sex:s.sex};
      Engine.baziCalculate(next);
      setDraft(next);setInput(next);setError('');
    }).catch(e=>{if(!controller.signal.aborted&&seq===revision.current)setError((e as Error).message);})
     .finally(()=>{if(!controller.signal.aborted&&seq===revision.current)setRestoring(false);});
    return()=>{controller.abort();revision.current++;};
  },[user?.id,loading]);
  const result=Engine.baziCalculate(input);
  const daYun=Engine.baziDaYun(input);
  // The research layer fails closed outside the limited Jie transcript; legacy remains independently viewable.
  const ziping=Engine.zipingDeepResearch({...input,utcOffsetMinutes:420,longitudeDeg:105});
  const coverage=assessResearchCoverage(ziping);
  // Read-only official HKO calendar date evidence; NEVER used to infer research pillars.
  const dayEvidence=resolveJieDayEvidence({instantIso:`${input.date}T${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}:00+07:00`});
  // HKO's primary almanac timestamps are in HKT (UTC+8); input remains VN UTC+7. This layer is read-only.
  const primaryJie=resolvePrimaryHkoJie({instantIso:`${input.date}T${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}:00+07:00`});
  // 2017–2023 official HKO PDF evidence is DATE-ONLY. It cannot resolve the actual ingress minute.
  const officialDay2017to2023=resolveOfficialHkoJieDay({instantIso:`${input.date}T${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}:00+07:00`});
  const calendarDayEvidence=officialDay2017to2023.status==='OUT_OF_COVERAGE'?dayEvidence:officialDay2017to2023;
  // NAOJ JST minute observations are independently cross-checked against HKO civil dates. Never fed into natal/Da Yun engines.
  const naojMinuteEvidence=resolveNaOJJie({instantIso:`${input.date}T${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}:00+07:00`});
  const update=(key:'date'|'hour'|'minute'|'dayBoundary'|'sex',value:string)=>setDraft(prev=>({...prev,[key]:key==='hour'||key==='minute'?Number(value):value}));
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(restoring)return;try{Engine.baziCalculate(draft);setError('');setInput({...draft});}catch(e){setError(e instanceof Error?e.message:'Dữ liệu không hợp lệ');}};
  const snapshot=createBaziSnapshot(input);
  return <div className="bz-page"><header className="page-heading"><EasternScene variant="bat-tu"/><div className="eyebrow">THIÊN ĐỒ · BÁT TỰ – TỨ TRỤ</div><h1 className="serif">Tứ trụ, bốn dấu mốc thời gian</h1><p>Khởi tạo bốn trụ Can Chi từ ngày giờ sinh theo lịch tiết khí. Tách riêng phép tính lịch pháp và diễn giải truyền thống để dễ đối chiếu.</p></header><DisciplineMethodGuide variant="bat-tu"/>
    <ModeIntroduction discipline="bat-tu" summary={`Nhật Chủ: ${result.dayMaster.stem} (${result.dayMaster.element}); bốn trụ đã an từ ngày ${input.date}.`}/>
    <div className="bz-layout"><section className="bz-card bz-input"><div className="eyebrow">THÔNG TIN SINH</div><h2 className="serif">Khởi lập Tứ Trụ</h2><form onSubmit={submit}>
       <label htmlFor="bz-date">Ngày dương lịch (Việt Nam)</label><input id="bz-date" type="date" min="1900-01-01" max="2100-12-31" value={draft.date} required disabled={restoring} onChange={e=>update('date',e.target.value)} />
       <div className="bz-fields"><div><label htmlFor="bz-hour">Giờ</label><input type="number" id="bz-hour" min="0" max="23" required value={draft.hour} disabled={restoring} onChange={e=>update('hour',e.target.value)} /></div><div><label htmlFor="bz-minute">Phút</label><input type="number" id="bz-minute" min="0" max="59" required value={draft.minute} disabled={restoring} onChange={e=>update('minute',e.target.value)} /></div></div>
       <label htmlFor="bz-boundary">Quy ước đổi ngày</label><select id="bz-boundary" value={draft.dayBoundary} disabled={restoring} onChange={e=>update('dayBoundary',e.target.value)}><option value="midnight">00:00 — Ngày dân sự</option><option value="late-zi">23:00 — Đổi ngày ở giờ Tý</option></select>
       <label htmlFor="bz-sex">Quy ước Nam/Nữ để an chiều Đại Vận</label><select id="bz-sex" value={draft.sex} disabled={restoring} onChange={e=>update('sex',e.target.value)}><option value="male">Nam (quy tắc truyền thống)</option><option value="female">Nữ (quy tắc truyền thống)</option></select>
       <p className="bz-hint">Múi giờ cố định UTC+7. Chưa tự hiệu chỉnh nơi sinh và chân thái dương thời.</p><button type="submit" className="bz-action" disabled={restoring}>{restoring?'Đang mở hồ sơ…':'Lập Bát Tự'} <span>↗</span></button>{error&&<p role="alert" className="bz-error">{error}</p>}</form></section>
     <section className="bz-result" aria-live="polite">{result&&<><div className="bz-coverage" data-level={coverage.level} role="status" aria-label="Phạm vi xác minh Bát Tự"><strong>{coverage.title}</strong><p>{coverage.explanation}</p><small>{coverage.coreChartScope}</small></div><div className="bz-card bz-head"><div className="eyebrow">LÁ SỐ BÁT TỰ · {result.input.date} · {String(result.input.hour).padStart(2,'0')}:{String(result.input.minute).padStart(2,'0')}</div><h2 className="serif">Thiên Can · Địa Chi</h2><div className="bz-pillars">{order.map(([key,title])=>{const a=result!.pillars[key];return <div key={key} className={'bz-pillar '+(key==='day'?'bz-day':'')}><div className="bz-pillar-label">{title}</div><div className="bz-stem">{a.stem}</div><div className="bz-branch">{a.branch}</div><div className="bz-element">{a.polarity} · {a.element}</div><div className="bz-god">{a.tenGod??'Nhật Chủ'}</div><div className="bz-hidden-label">TÀNG CAN</div><div className="bz-hidden-stems">{a.hiddenStems.map((h,i)=><div key={i} className="bz-hidden-item" title={h.role+' · '+h.element+' '+h.polarity}><span>{h.stem}</span><small>{h.tenGod}</small></div>)}</div></div>})}</div><p className="bz-master">Nhật Chủ (Can ngày): <strong>{result.dayMaster.stem} · {result.dayMaster.element} {result.dayMaster.polarity}</strong></p></div>
     <ExpertOnly title="Cách cục, Dụng thần và Đại vận theo bảng Jie nghiên cứu"><section className="bz-card bz-depth" aria-label="Tử Bình nghiên cứu">
       <div className="eyebrow">TỬ BÌNH CHUYÊN SÂU · NGHIÊN CỨU</div>
       <h2 className="serif">Cách cục · Dụng thần · Đại vận</h2>
       <p className="bz-hint">Ba phép xét riêng biệt: Cách cục theo Nguyệt Lệnh, Phù ức và Điều hậu. Không có một Dụng thần duy nhất được máy tự công nhận.</p>
       {ziping.methods.status==='BLOCKED' ? <p className="bz-warning">Chưa đủ lịch Jie đối chiếu cho ngày đã nhập ({ziping.methods.reason}). Bảng nghiên cứu hiện chỉ có 2025–2027; các trụ V9.8 hiển thị phía trên là phép tính xấp xỉ riêng.</p> : <div className="bz-method-grid">{ziping.methods.methods.map(method=><article key={method.method} className="bz-method"><h3>{method.label}</h3><p><strong>Trạng thái:</strong> {method.status}</p>{method.candidate&&<p><strong>Ứng viên khí tháng:</strong> {method.candidate}</p>}<ul>{method.observations.map((line,i)=><li key={i}>{line}</li>)}</ul><p className="bz-hint">{method.pending}</p></article>)}</div>}
       {ziping.methods.status==='BLOCKED'&&primaryJie.status!=='OUT_OF_COVERAGE'&&<aside className="bz-hint" aria-label="Đối chứng phút Tiết chính thức HKO 2013–2016"><h3>Mốc Tiết chính thức HKO — 2013–2016</h3><p>{primaryJie.note} Giờ HKO UTC+8 nhanh hơn giờ Việt Nam 1 giờ. Dữ liệu này hiện chỉ phục vụ đối chứng, <strong>không tự thay đổi trụ tháng, Đại vận hoặc hồ sơ đã lưu</strong>.</p>{primaryJie.status==='BOUNDARY_REVIEW'&&primaryJie.boundary&&<p role="status">Sát giao tiết: <strong>{primaryJie.boundary.term}</strong> · {primaryJie.boundary.localHkt}. Cần rà thêm độ chính xác thời điểm.</p>}{primaryJie.active&&<p>Tiết gần nhất: <strong>{primaryJie.active.term}</strong> · {primaryJie.active.localHkt}</p>}{primaryJie.next&&<p>Tiết kế tiếp: <strong>{primaryJie.next.term}</strong> · {primaryJie.next.localHkt}</p>}{(primaryJie.active||primaryJie.boundary||primaryJie.next)?.sourceUrl&&<a href={(primaryJie.active||primaryJie.boundary||primaryJie.next)!.sourceUrl} target="_blank" rel="noopener noreferrer">Bảng giờ Tiết HKO chính thức ↗</a>}</aside>}
       {ziping.methods.status==='BLOCKED'&&naojMinuteEvidence.status!=='OUT_OF_COVERAGE'&&<aside className="bz-hint" aria-label="Đối chứng Tiết NAOJ 2017–2023 có giờ phút"><h3>Đối chiếu thiên văn NAOJ — 2017–2023</h3><p>Đài Thiên văn Quốc gia Nhật Bản công bố thời điểm Tiết theo giờ Nhật JST (UTC+9). Thiên Đồ chuyển sang giờ Hồng Kông UTC+8; ngày đã được kiểm tra riêng với lịch HKO. <strong>Chỉ dùng để tra cứu; không tự thay đổi trụ tháng, Đại vận hoặc hồ sơ đã lưu.</strong></p>{naojMinuteEvidence.status==='BOUNDARY_REVIEW'&&naojMinuteEvidence.boundary&&<p role="status">Sinh sát giao Tiết (±2 phút): <strong>{naojMinuteEvidence.boundary.term}</strong> · {naojMinuteEvidence.boundary.localHkt} (HKT). Chưa đủ để chốt kết quả tự động.</p>}{naojMinuteEvidence.active&&<p>Tiết gần nhất: <strong>{naojMinuteEvidence.active.term}</strong> · {naojMinuteEvidence.active.localHkt} (HKT)</p>}{naojMinuteEvidence.next&&<p>Tiết kế tiếp: <strong>{naojMinuteEvidence.next.term}</strong> · {naojMinuteEvidence.next.localHkt} (HKT)</p>}{(naojMinuteEvidence.active||naojMinuteEvidence.boundary||naojMinuteEvidence.next)?.sourceUrl&&<p><a href={(naojMinuteEvidence.active||naojMinuteEvidence.boundary||naojMinuteEvidence.next)!.sourceUrl} target="_blank" rel="noopener noreferrer">Thời điểm Tiết NAOJ ↗</a> · <a href={(naojMinuteEvidence.active||naojMinuteEvidence.boundary||naojMinuteEvidence.next)!.hkoDayWitnessUrl} target="_blank" rel="noopener noreferrer">Đối chiếu ngày HKO ↗</a></p>}</aside>}
       {ziping.methods.status==='BLOCKED'&&calendarDayEvidence.status!=='OUT_OF_COVERAGE'&&<aside className="bz-hint" aria-label="Lịch Tiết theo ngày HKO"><h3>Lịch Tiết HKO theo ngày — {calendarDayEvidence.localHktDate} (HKT UTC+8)</h3><p>{calendarDayEvidence.note} Đây chỉ là đối chiếu ngày, không phải thời điểm giao tiết có giờ/phút, không tự tính trụ tháng.</p>{calendarDayEvidence.active&&<p>Tiết gần nhất trong năm: <strong>{calendarDayEvidence.active.term}</strong> · {calendarDayEvidence.active.localHktDate}</p>}{calendarDayEvidence.next&&<p>Tiết kế tiếp: <strong>{calendarDayEvidence.next.term}</strong> · {calendarDayEvidence.next.localHktDate}</p>}{calendarDayEvidence.sourceUrl&&<a href={calendarDayEvidence.sourceUrl} target="_blank" rel="noopener noreferrer">Lịch chính thức HKO ↗</a>}</aside>}
       <h3>Đại vận theo Jie tham chiếu</h3>
       {ziping.luck.status==='PROVISIONAL'&&ziping.luck.startingAge&&ziping.luck.referenceJie? <><p className="bz-hint">Chiều {ziping.luck.directionLabel}, khởi vận khoảng {ziping.luck.startingAge.decimalYears} tuổi; mốc {ziping.luck.referenceJie.term} ({ziping.luck.referenceJie.instantUtc}).</p><div className="bz-luck-grid">{ziping.luck.cycles.map(c=><div key={c.index} className="bz-luck-item"><small>VẬN {c.index}</small><strong>{c.name}</strong><span>{c.tenGod}</span><span>{c.startingAgeYears}–{c.endingAgeYears} tuổi</span></div>)}</div></>:<p className="bz-warning">Chưa xác định Đại vận theo bảng Jie tham chiếu: {ziping.luck.reason}. Đại vận V9.8 vẫn là ước tính độc lập.</p>}
       <p className="bz-hint">Giả định UTC+7, kinh độ 105°Đ; dữ liệu Jie phút 2025–2027 hiện là bản chép thứ cấp chưa đối chứng hoàn toàn. Đây là dữ liệu nghiên cứu, không phải kết luận hỷ–kỵ.</p>
      </section></ExpertOnly>
     <SaveStudy disabled={restoring} draft={{discipline:'bazi',title:`Bát Tự · ${input.date} · ${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}`,summary:`Tứ trụ nền UTC+7 (xấp xỉ) · Nhật Chủ ${result.dayMaster.stem} · Jie: ${coverage.sourceStatus} · ${input.dayBoundary==='late-zi'?'Đổi ngày 23:00':'Đổi ngày 00:00'}`,notes:'',tags:['Bát Tự'],snapshot:{...snapshot}}}/>
     <ExpertOnly title="Tàng Can, quan hệ Can Chi và Đại Vận"><div className="bz-card bz-details"><h3>Ngũ hành của 4 Thiên Can</h3><div className="bz-element-grid">{Object.entries(result.elementCounts).map(([name,value])=><div key={name}><b>{value}</b><span>{name}</span></div>)}</div><p className="bz-hint">{result.elementCountScope}</p><h3>Ngũ hành của Tàng Can (đếm ký hiệu)</h3><div className="bz-element-grid">{Object.entries(result.hiddenElementCounts).map(([name,value])=><div key={name}><b>{value}</b><span>{name}</span></div>)}</div><p className="bz-hint">{result.elementCountNote}</p><h3>Chú giải Thập Thần</h3><p className="bz-hint">Mỗi Thập Thần được tính tương đối với Nhật Chủ bằng ngũ hành sinh–khắc và âm dương. Tàng Can liệt kê chính khí trước, tiếp theo là khí phụ và dư khí (nếu có). Không coi số lượng ký hiệu là độ mạnh của ngũ hành.</p><h3>Quan hệ Thiên Can – Địa Chi</h3><p className="bz-hint">Chỉ liệt kê quan hệ theo bảng đối chiếu. Ngũ Hợp không đồng nghĩa tự động hóa khí; Tam Hợp chỉ hiển thị khi có đủ ba Chi khác nhau.</p>
      <div className="bz-relations">{([
        ['Ngũ Hợp Thiên Can',result.relations.stemCombinations],
        ['Xung Thiên Can',result.relations.stemClashes],
        ['Lục Hợp Địa Chi',result.relations.branchCombinations],
        ['Lục Xung Địa Chi',result.relations.branchClashes],
        ['Tam Hợp (đủ ba Chi)',result.relations.branchTriads]
      ] as const).map(([title,items])=><div key={title} className="bz-relation-group"><h4>{title} <span>({items.length})</span></h4>{items.length?<ul>{items.map((item,i)=><li key={i}><b>{item.symbols.join(' – ')}</b> · {item.pillars.map(k=>({year:'Năm',month:'Tháng',day:'Ngày',hour:'Giờ'}[k as 'year'|'month'|'day'|'hour'])).join(' · ')}{item.traditionalElement?' · Hướng hóa quy ước: '+item.traditionalElement:''}</li>)}</ul>:<p>Không có cặp/bộ đủ điều kiện trong bốn trụ.</p>}</div>)}</div><p className="bz-hint">{result.relations.note}</p><h3>Đại Vận Bát Tự — các chu kỳ 10 năm</h3>
      <div className="bz-luck-summary"><span>Chiều <strong>{daYun.directionLabel}</strong></span><span>Khởi vận ≈ <strong>{daYun.startingAge.years} năm {daYun.startingAge.months} tháng</strong></span><span>Tiết đối chiếu: <strong>{daYun.referenceJie.name}</strong> · {daYun.referenceJie.approxVietnamTime} (UTC+7, xấp xỉ)</span></div>
      <div className="bz-luck-grid">{daYun.cycles.map(c=><div className="bz-luck-item" key={c.index}><small>ĐẠI VẬN {String(c.index).padStart(2,'0')}</small><strong>{c.name}</strong><span>{c.tenGod}</span><span>≈ {c.startingAgeYears}–{c.endingAgeYears} tuổi</span><span>≈ {c.estimatedStartCalendarYear}–{c.estimatedEndCalendarYear}</span></div>)}</div>
      <ul>{daYun.notes.map((note,i)=><li key={i}>{note}</li>)}</ul><h3>Quy ước & giới hạn</h3><ul>{result.warnings.map((v,i)=><li key={i}>{v}</li>)}</ul><p className="bz-rule">Giờ tính theo {result.input.timeZone}. Vị trí tiết khí được tính gần đúng nên cần kiểm tra thêm nếu sinh sát thời điểm chuyển tiết.</p></div></ExpertOnly></>}</section></div>
   <p className="bz-footer">Bát Tự ở đây dùng để tham khảo lịch pháp và nghiên cứu phương pháp truyền thống. Phép tính nền đã có Thập Thần, Tàng Can, quan hệ Can–Chi và Đại Vận ước tính; ở chế độ Chuyên sâu có so sánh ba phương pháp nghiên cứu Cách cục, Phù ức và Điều hậu nhưng chưa xác minh một Dụng thần kết luận, hóa khí hoặc ứng nghiệm. Bảng Jie cho 2025–2027 vẫn là bản chép thứ cấp; lớp mốc Tiết chính thức 2013–2016 đối chiếu đến phút, lớp NAOJ 2017–2023 đối chiếu đến phút với ngày HKO, còn lớp lịch 2024 và 2028 chỉ có ngày; cả hai chưa đưa vào phép tính lá số. Cần đối chiếu nguồn thiên văn độc lập khi sinh gần giao tiết.</p></div>;
}
