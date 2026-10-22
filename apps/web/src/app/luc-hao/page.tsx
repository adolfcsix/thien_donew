'use client';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {ModeIntroduction, ExpertOnly} from '@/components/view-mode';
import {ReadingQualityPanel} from '@/features/reading-quality/quality-panel';
import {LucHaoCanvas} from '@/features/discipline-canvas/discipline-canvas';
import {buildLucHaoQuality} from '@/features/reading-quality/quality.cjs';
import {Suspense,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {SaveStudy} from '@/features/study-room/save-study';
import {readStudyInput} from '@/features/study-room/study-links.cjs';
import Link from 'next/link';
import Engine from '@thiendo/astrology-engine';
import {makeLineLedger,castThreeCoins} from '@/features/luc-hao/reading.cjs';
import {makeNaJiaChart,STEMS} from '@/features/luc-hao/na-jia.cjs';
import {BRANCHES,calendarContext,manualContext} from '@/features/luc-hao/temporal.cjs';
import {lineTemporalEvidence} from '@/features/luc-hao/temporal-relations.cjs';
import {RELATIVES,relativeFocus} from '@/features/luc-hao/relative-focus.cjs';
import {LucHaoQuestionWorkbook} from '@/features/luc-hao/question-workbook-panel';
import {LucHaoDepthPanel} from '@/features/luc-hao/depth-panel';
import styles from '../huyen-hoc/workbench.module.css';
import temporalStyles from './luc-temporal.module.css';
import focusStyles from './luc-focus.module.css';

const INIT=[7,8,7,8,7,8];
const CHOICES=[
  {n:6,t:'6 · Lão âm, động'},
  {n:7,t:'7 · Thiếu dương, tĩnh'},
  {n:8,t:'8 · Thiếu âm, tĩnh'},
  {n:9,t:'9 · Lão dương, động'},
];

type TemporalMode='calendar'|'manual';
export default function LucHaoPage(){return <Suspense fallback={<p>Đang mở bàn Lục Hào…</p>}><LucHaoPageContent/></Suspense>;}
function LucHaoPageContent(){
 const legacyRestore=useSearchParams().get('restore')==='1';
 return <div className={`${styles.page} ${styles.luc}`} style={{minWidth:0,gridTemplateColumns:'minmax(0,1fr)'}}><header className={styles.hero}><EasternScene variant="luc-hao"/><span className={styles.kicker}>THIÊN ĐỒ / LỤC HÀO</span><h1>Lục Hào chuyên sâu</h1><p>Dụng thần, Nguyên thần, Kỵ thần, Phục thần; Lục Thân/Lục Thú, động biến và Nhật–Nguyệt trong một hồ sơ có căn cứ.</p><Link href="/huyen-hoc">← Thư phòng huyền học</Link> · <Link href="/study">Thư phòng cá nhân ↗</Link></header><DisciplineMethodGuide variant="luc-hao"/>{legacyRestore?<><p role="status">Đang mở hồ sơ Lục Hào theo phương pháp lưu trữ trước đây; giữ nguyên đầu vào.</p><LegacyLucHaoPage/></>:<><LucHaoDepthPanel/><details className={styles.accordion}><summary>Mở công cụ Lục Hào lưu trữ</summary><LegacyLucHaoPage/></details></>}</div>;
}
function LegacyLucHaoPage(){
 const restoreQuery=useSearchParams().toString();
  const [lines,setLines]=useState<number[]>(INIT);
  const [mode,setMode]=useState<TemporalMode>('calendar');
  const [date,setDate]=useState('');
  const [dayStem,setDayStem]=useState('');
  const [dayBranch,setDayBranch]=useState('');
  const [monthBranch,setMonthBranch]=useState('');
  const [selectedRelative,setSelectedRelative]=useState('');
  const [restoreNotice,setRestoreNotice]=useState('');

  useEffect(()=>{const saved=readStudyInput('luc-hao',restoreQuery);if(!saved){if(new URLSearchParams(restoreQuery).get('restore')==='1')setRestoreNotice('Bản mở lại có tham số không hợp lệ; đang giữ dữ liệu mẫu, chưa khôi phục.');return;}
    setLines(saved.lines);setMode(saved.mode);setDate(saved.date||'');
    setDayStem(saved.dayStem||'');setDayBranch(saved.dayBranch||'');setMonthBranch(saved.monthBranch||'');
  },[restoreQuery]);
  const reading=useMemo(()=>makeLineLedger(lines),[lines]);
  const temporalState=useMemo(()=>{
    try{
      if(mode==='calendar'){
        if(!date)return {context:null,error:null};
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new RangeError('Ngày phải ở dạng YYYY-MM-DD.');
        const [year,month,day]=date.split('-').map(Number);
        return {context:calendarContext(Engine.calendarDay(year,month,day)),error:null};
      }
      if(!dayStem||!dayBranch||!monthBranch)return {context:null,error:null};
      return {context:manualContext({dayStem,dayBranch,monthBranch}),error:null};
    }catch(error){
      return {context:null,error:error instanceof Error?error.message:'Không xác minh được Can Chi.'};
    }
  },[date,mode,dayStem,dayBranch,monthBranch]);
  const temporal=temporalState.context;
  const naJia=useMemo(()=>makeNaJiaChart(reading.original,{dayStem:temporal?.dayStem||null}),[reading.original,temporal?.dayStem]);
  const evidence=useMemo(()=>lineTemporalEvidence(naJia,reading,temporal),[naJia,reading,temporal]);
  const focus=useMemo(()=>relativeFocus(naJia,reading,evidence,selectedRelative||null),[naJia,reading,evidence,selectedRelative]);
  const quality=useMemo(()=>buildLucHaoQuality(reading,naJia,evidence,focus),[reading,naJia,evidence,focus]);
  const savedDraft={discipline:'luc-hao' as const,title:`Lục Hào · ${reading.original.name}`,
    summary:`Quẻ biến ${reading.transformed.name} · ${reading.changing.length} hào động · ${temporal?'Đã có Nhật/Nguyệt':'Chưa đối chiếu Nhật/Nguyệt'}`,
    notes:'',tags:[],snapshot: mode==='calendar'?{mode,lines,...(date?{date}:{})}:{mode,lines,dayStem,dayBranch,monthBranch}};

  return <section className={`${styles.page} ${styles.luc}`}>
    <header className={styles.hero}>
      <span className={styles.kicker}>THIÊN ĐỒ / LỤC HÀO · BÁT CUNG NẠP GIÁP · NHẬT NGUYỆT</span>
      <h1>Lục Hào – Sáu hào và lịch pháp</h1>
      <p>Khởi sáu hào, xác định Bát Cung, Thế–Ứng, Nạp Giáp, Lục Thân, Lục Thần, Tuần Không và quan hệ hào với Nhật thần – Nguyệt kiến. Mỗi quy tắc có dấu vết dữ liệu; không tự chọn Dụng Thần hay đoán cát hung.</p>
      <Link href="/huyen-hoc" className={styles.back}>← Thư phòng huyền học</Link>
    </header>

    <ModeIntroduction discipline="luc-hao" summary={`Quẻ chủ ${reading.original.name}; ${reading.changing.length} hào động.`}/>
    {restoreNotice&&<p role="alert">{restoreNotice}</p>}
    <LucHaoCanvas original={reading.original} transformed={reading.transformed} changing={reading.changing}/>
    <SaveStudy draft={savedDraft}/>
    <div className={styles.columns}>
      <section className={styles.panel}>
        <span className={styles.kicker}>01 / KHỞI HÀO</span>
        <h2>Sáu hào từ dưới lên</h2>
        <div className={styles.yao}>{lines.map((value,index)=><label className={styles.yaoRow} key={index}>
          <span className={styles.yaoLabel}>Hào {index+1}</span>
          <select aria-label={`Hào ${index+1}`} value={value} onChange={e=>setLines(before=>before.map((n,i)=>i===index?Number(e.target.value):n))}>
            {CHOICES.map(x=><option key={x.n} value={x.n}>{x.t}</option>)}
          </select>
          <span className={styles.yaoMark}>{value===6||value===9?'↻ Hào động':'— Tĩnh'}</span>
        </label>)}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={()=>setLines(castThreeCoins())}>Mô phỏng 3 xu × 6</button>
          <button type="button" className={styles.button} onClick={()=>setLines(INIT)}>Đặt lại</button>
        </div>
        <p className={styles.small}>Ba đồng xu mô phỏng phân bố xác suất 6–9; hào được ghi từ dưới lên. Chưa có kiểm chứng khoa học về năng lực tiên đoán.</p>
      </section>

      <section className={styles.panel} aria-live="polite">
        <span className={styles.kicker}>02 / QUẺ VÀ CHỨNG CỨ</span>
        <h2>Đối chiếu từng hào</h2>
        <div className={styles.hexCards}>
          <div className={styles.hex}><small>Quẻ chủ · #{reading.original.number}</small><strong>{reading.original.name}</strong><span>{reading.original.upper.symbol} / {reading.original.lower.symbol}</span></div>
          <div className={styles.hex}><small>Quẻ biến · #{reading.transformed.number}</small><strong>{reading.transformed.name}</strong><span>{reading.transformed.upper.symbol} / {reading.transformed.lower.symbol}</span></div>
          <div className={styles.hex}><small>Tổng hào động</small><strong>{reading.changing.length} / 6</strong><span>{reading.changing.length?`Vị trí ${reading.changing.join(', ')}`:'Không có hào động'}</span></div>
        </div>
        <div className={styles.ledger} style={{marginTop:18}}><table><thead><tr><th>Hào</th><th>Trạng thái</th><th>Quẻ chủ</th><th>Quẻ biến</th></tr></thead><tbody>
          {[...reading.ledger].reverse().map(line=><tr key={line.position}><td>{line.position}</td><td>{line.state}{line.moving?' ↻':''}</td><td>{line.before}</td><td>{line.after}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>

    <ExpertOnly title="Bát Cung, Nạp Giáp và Nhật–Nguyệt">
    <section className={styles.panel}>
      <span className={styles.kicker}>03 / BÁT CUNG · THẾ ỨNG · NẠP GIÁP</span>
      <h2>Hồ sơ từng hào theo Kinh Phòng</h2>
      <div className={styles.facts}>
        <div className={styles.fact}><span>Cung gốc</span><strong>{naJia.palace.name}</strong><small>Hành {naJia.palace.element}</small></div>
        <div className={styles.fact}><span>Loại quẻ</span><strong>{naJia.stage.name}</strong><small>Hệ Bát Cung</small></div>
        <div className={styles.fact}><span>Thế / Ứng</span><strong>{naJia.stage.self} / {naJia.stage.response}</strong><small>Đếm từ dưới lên</small></div>
      </div>
      <div className={styles.ledger} style={{marginTop:18}}><table><thead><tr><th>Hào</th><th>Âm/Dương</th><th>Nạp Giáp</th><th>Ngũ hành</th><th>Lục Thân</th><th>Thế/Ứng</th><th>Lục Thần</th></tr></thead><tbody>
        {[...naJia.lines].reverse().map(line=><tr key={line.position}><td><b>{line.position}</b></td><td>{reading.ledger[line.position-1].before}{reading.ledger[line.position-1].moving?' ↻':''}</td><td><b>{line.stemBranch}</b> ({line.branchHan})</td><td>{line.element}</td><td>{line.family}</td><td><b>{line.role||'—'}</b></td><td>{line.spirit||'—'}</td></tr>)}
      </tbody></table></div>
      <div className={styles.note}>Nạp Giáp lấy ba hào dưới theo <b>quái nội</b>, ba hào trên theo <b>quái ngoại</b>. Lục Thân lấy hành của <b>cung quẻ chủ</b>; Thế/Ứng theo vị trí quẻ trong Bát Cung, không theo hào động.</div>
    </section>

    <section className={styles.panel}>
      <span className={styles.kicker}>04 / NHẬT THẦN · NGUYỆT KIẾN · TUẦN KHÔNG</span>
      <h2>Đối chiếu lịch pháp theo từng hào</h2>
      <div className={temporalStyles.selector} role="group" aria-label="Chọn nguồn Can Chi">
        <button type="button" aria-pressed={mode==='calendar'} onClick={()=>setMode('calendar')}>Tra ngày dương (UTC+7)</button>
        <button type="button" aria-pressed={mode==='manual'} onClick={()=>setMode('manual')}>Nhập Can Chi đã kiểm chứng</button>
      </div>
      {mode==='calendar'?<div className={styles.formGrid}>
        <label className={styles.field}>Ngày lập quẻ (dương lịch)<input type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>:<div className={styles.formGrid}>
        <label className={styles.field}>Nhật can<select value={dayStem} onChange={e=>setDayStem(e.target.value)}><option value="">— Chọn Can ngày —</option>{STEMS.map(stem=><option key={stem} value={stem}>{stem}</option>)}</select></label>
        <label className={styles.field}>Nhật chi<select value={dayBranch} onChange={e=>setDayBranch(e.target.value)}><option value="">— Chọn Chi ngày —</option>{BRANCHES.map(branch=><option key={branch} value={branch}>{branch}</option>)}</select></label>
        <label className={styles.field}>Nguyệt kiến (tháng theo tiết khí)<select value={monthBranch} onChange={e=>setMonthBranch(e.target.value)}><option value="">— Chọn Chi tháng —</option>{BRANCHES.map(branch=><option key={branch} value={branch}>{branch}</option>)}</select></label>
      </div>}
      {temporalState.error&&<p className={styles.error} role="alert">{temporalState.error}</p>}
      {temporal?<>
        <div className={`${styles.facts} ${temporalStyles.summary}`}>
          <div className={styles.fact}><span>Nhật thần</span><strong>{temporal.dayCanChi}</strong><small>Chi ngày: {temporal.dayBranch}</small></div>
          <div className={styles.fact}><span>Nguyệt kiến</span><strong>{temporal.monthBranch||'Chờ xác minh'}</strong><small>{temporal.monthCanChi||'Can Chi nhập thủ công'}{temporal.needsMonthVerification?' · gần chuyển tiết':''}</small></div>
          <div className={styles.fact}><span>Tuần Không</span><strong>{temporal.voidBranches.join(' · ')}</strong><small>Tuần {temporal.xun}</small></div>
        </div>
        {temporal.needsMonthVerification&&<div className={temporalStyles.warning} role="status">Ngày đã chọn gần chuyển tiết khí. Chưa tự kiểm định tiết khí tới giờ nhập tiết chính xác; hệ thống <b>tạm ẩn mọi quan hệ Nguyệt kiến</b>. Có thể chuyển sang nhập Can Chi đã kiểm chứng.</div>}
        <div className={`${styles.ledger} ${temporalStyles.ledger}`} style={{marginTop:18}}>
          <table><thead><tr><th>Hào</th><th>Chi hào</th><th>Nhật</th><th>Nguyệt</th><th>Tuần Không / Động</th><th>Hào hóa</th></tr></thead><tbody>
            {[...evidence.lines].reverse().map(line=><tr key={line.position}>
              <td><strong>{line.position}</strong></td><td>{line.branch}</td>
              <td><span>{line.day.join(', ')||'—'}</span><small>{line.dayElement}</small></td>
              <td><span>{temporal.monthBranch?(line.month.join(', ')||'—'):'Chờ tiết khí'}</span><small>{line.monthElement||'Không tính'}</small></td>
              <td><div className={temporalStyles.tags}>{line.void&&<span className={temporalStyles.void}>Tuần Không</span>}{line.moving&&<span className={temporalStyles.moving}>Động</span>}{!line.void&&!line.moving&&<span>—</span>}</div></td>
              <td>{line.changed?<><strong>{line.changed.stemBranch}</strong><small>Hành {line.changed.element}{line.changed.relation.length?` · ${line.changed.relation.join(', ')}`:''}</small></>:'—'}</td>
            </tr>)}
          </tbody></table>
        </div>
        <details className={styles.accordion}><summary>Phương pháp, nguồn dữ liệu và các giả định</summary>
          <p>Can Chi ngày tra từ lịch Thiên Đồ, đổi ngày ở 00:00 giờ Việt Nam (không dùng quy tắc giờ Tý muộn). Nguyệt kiến theo tháng tiết khí, ước lượng từ vị trí Mặt Trời lúc 12:00 Việt Nam; không phải giờ nhập tiết chính xác. Tuần Không là hai Chi ngoài mười ngày trong một tuần Giáp.</p>
          {temporal.warnings.map((warning,i)=><p key={i}>{warning}</p>)}
          {evidence.notes.map((note,i)=><p key={`ev-${i}`}>{note}</p>)}
        </details>
      </>:<div className={temporalStyles.empty}>Chọn ngày dương hoặc nhập đủ Nhật can – Nhật chi – Nguyệt kiến để hiện bảng đối chiếu. Khi chưa chọn ngày, hệ thống không tự gán Nhật/Nguyệt hoặc Tuần Không.</div>}
    </section>

    <section className={styles.panel}>
      <span className={styles.kicker}>05 / LỤC THÂN · TRA CỨU ỨNG VIÊN</span>
      <h2>Đối chiếu Lục Thân theo mục tiêu nghiên cứu</h2>
      <p>Chọn <b>Lục Thân cần khảo sát</b> để lọc các hào xuất hiện trên quẻ chủ. Đây chỉ là danh sách <b>ứng viên để xét Dụng Thần</b>, không phải hệ thống tự quyết định Dụng Thần hoặc kết luận cát hung.</p>
      <label className={focusStyles.field}>Lục Thân muốn khảo sát
        <select value={selectedRelative} onChange={e=>setSelectedRelative(e.target.value)}>
          <option value="">— Chưa chọn · xem hướng dẫn —</option>
          {RELATIVES.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      {focus.ready?<>
        <div className={focusStyles.summary} aria-live="polite">Đã tìm thấy <b>{focus.count}</b> hào mang Lục Thân <b>{selectedRelative}</b> trong quẻ chủ. {focus.hasTemporal?'Đã kèm đối chiếu lịch pháp nếu được xác minh.':'Chưa chọn Nhật/Nguyệt; phần lịch pháp để trống.'}</div>
        {focus.count?<div className={styles.ledger}><table><thead><tr><th>Hào</th><th>Nạp Giáp</th><th>Thế / Ứng</th><th>Động / Tĩnh</th><th>Tuần Không</th><th>Nhật / Nguyệt</th><th>Hào hóa</th></tr></thead><tbody>
          {[...focus.candidates].reverse().map(item=><tr key={item.position}>
            <td><b>{item.position}</b></td><td>{item.stemBranch} · {item.element}</td><td>{item.role||'—'}</td>
            <td>{item.moving?'Hào động':'Hào tĩnh'}</td>
            <td>{item.void===null?'Chưa có ngày':item.void?'Có':'Không'}</td>
            <td>{item.day===null?'Chưa có ngày':`Nhật: ${item.day.join(', ')||'—'}`}<small>{item.month===null?'Nguyệt: chưa xác minh':`Nguyệt: ${item.month.join(', ')||'—'}`}</small></td>
            <td>{item.changed?<><b>{item.changed.stemBranch}</b><small>{item.changed.element} · {item.changed.relation.join(', ')||'không có hợp/xung/đồng chi'}</small></>:'—'}</td>
          </tr>)}
        </tbody></table></div>:<div className={focusStyles.empty}>Không thấy hào {selectedRelative} hiển lộ trong quẻ chủ. <b>Không tự kết luận về Phục Thần</b> hoặc ứng kỳ: cần một phép tra Phục Thần được thẩm định riêng.</div>}
      </>:<div className={focusStyles.empty}>Hãy chọn một trong năm Lục Thân để tra chính xác những hào có mặt trong quẻ chủ.</div>}
      <details className={styles.accordion}><summary>Điều kiện cần xem trước khi định Dụng Thần</summary>
        {focus.notes.map((note,i)=><p key={i}>{note}</p>)}
      </details>
    </section>

    <LucHaoQuestionWorkbook chart={naJia} movingPositions={reading.changing} context={temporal} blockedReason={temporalState.error}/>
    </ExpertOnly>
    <section className={styles.panel}>
      <span className={styles.kicker}>06 / GIỚI HẠN VÀ CÁC LỚP CHƯA LUẬN</span>
      <h2>Quy tắc cần thẩm định tiếp</h2>
      <p>Các nhãn đồng chi, hợp, xung, ngũ hành và Tuần Không chỉ là dữ liệu đối chiếu. Chúng <b>không đủ</b> để tự kết luận vượng/suy tổng thể, nhật phá, lựa chọn Dụng Thần hay ứng kỳ. Nguyệt Phá trong hồ sơ nghiên cứu chỉ là dấu lục xung với tháng đã xác nhận.</p>
      <div className={styles.chips}>{naJia.notComputed.map(item=><span key={item}>{item} · chưa có kết luận tự động</span>)}</div>
      <details className={styles.accordion}><summary>Quy ước Bát Cung và những điểm khác trường phái</summary>
        <p>Bát Cung theo Bản cung → Nhất đến Ngũ thế → Du hồn → Quy hồn. Lục Thần khởi từ Nhật can đã chọn, Nạp Giáp theo hệ Kinh Phòng/Hỏa Châu Lâm. Bảng lịch pháp mới là lớp bổ sung độc lập; đã có hồ sơ ứng viên hiện/Phục Thần và đa hiện ở chế độ nghiên cứu; chưa tự chọn Dụng Thần, luận xuất phục, vượng tướng hưu tù hoặc ứng kỳ.</p>
      </details>
    </section>
    <ReadingQualityPanel report={quality}/>
    <footer className={styles.disclaimer}>Kết quả Lục Hào dùng để tra cứu và nghiên cứu. Trường hợp sát giao tiết hoặc khác biệt trường phái cần đối chiếu thêm.</footer>
  </section>;
}
