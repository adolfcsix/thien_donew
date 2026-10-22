'use client';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {ModeIntroduction, ExpertOnly} from '@/components/view-mode';
import {ReadingQualityPanel} from '@/features/reading-quality/quality-panel';
import {MaiHoaCanvas} from '@/features/discipline-canvas/discipline-canvas';
import {buildMaiHoaQuality} from '@/features/reading-quality/quality.cjs';
import {useEffect,useMemo,useState} from 'react';
import {SaveStudy} from '@/features/study-room/save-study';
import {readStudyInput} from '@/features/study-room/study-links.cjs';
import Link from 'next/link';
import {BRANCHES,PRIOR_HEAVEN,castByLunarTime,castByNumbers,castByLaterHeaven,compareLaterHeavenWithTwoNumbers} from '@/features/mai-hoa/casting.cjs';
import {makeDeepReading} from '@/features/mai-hoa/deep-reading.cjs';
import {makeLineTrace} from '@/features/mai-hoa/line-trace.cjs';
import {buildMaiHoaWorkbook} from '@/features/research-workbook/mai-hoa-workbook.cjs';
import {WorkbookPanel} from '@/features/research-workbook/workbook-panel';
import {MaiHoaEvidencePanel} from '@/features/mai-hoa/evidence-panel';
import styles from '../huyen-hoc/workbench.module.css';

const INIT={yearBranch:7,lunarMonth:8,lunarDay:15,hourBranch:7};
type Input=typeof INIT;
const NUMBER_INIT={first:3,second:8};
type NumberInput=typeof NUMBER_INIT;
const LATER_INIT={objectTrigram:3,directionTrigram:8,hourBranch:7};
type LaterInput=typeof LATER_INIT;
export default function MaiHoaPage(){
 const [legacyRestore,setLegacyRestore]=useState(false);
 useEffect(()=>{setLegacyRestore(new URLSearchParams(window.location.search).get('restore')==='1');},[]);
 return <div className={`${styles.page} ${styles.mai}`} style={{minWidth:0,gridTemplateColumns:"minmax(0,1fr)"}}><header className={styles.hero}><EasternScene variant="mai-hoa"/><span className={styles.kicker}>THIÊN ĐỒ / MAI HOA</span><h1>Mai Hoa Dịch Số</h1><p>Thể–Dụng, hỗ–biến, ngũ hành và thời ứng theo phương pháp xác định. Lưu căn cứ cùng bản đọc để mở lại và phản kiểm.</p><Link className={styles.back} href="/huyen-hoc">← Thư phòng huyền học</Link></header><DisciplineMethodGuide variant="mai-hoa"/>
 {legacyRestore?<><p role="status">Đang mở hồ sơ Mai Hoa theo phương pháp lưu trữ trước đây; giữ nguyên đầu vào và phép hỗ.</p><button type="button" className={styles.button} onClick={()=>{window.history.replaceState(null,'','/mai-hoa');setLegacyRestore(false);}}>Mở công cụ hiện hành với ví dụ mới</button><LegacyMaiHoaPage/></>:<><MaiHoaEvidencePanel/><details className={styles.accordion}><summary>Mở công cụ ba phương pháp lưu trữ trước đây</summary><LegacyMaiHoaPage/></details></>}
 </div>;
}
function LegacyMaiHoaPage(){
 const [input,setInput]=useState<Input>(INIT);
 const [mode,setMode]=useState<'time'|'numbers'|'later-heaven'>('time');
 const [numberInput,setNumberInput]=useState<NumberInput>(NUMBER_INIT);
 const [laterInput,setLaterInput]=useState<LaterInput>(LATER_INIT);
 const [error,setError]=useState('');
 const outcome=useMemo(()=>{try{return mode==='time'?castByLunarTime(input):mode==='numbers'?castByNumbers(numberInput):castByLaterHeaven(laterInput);}catch{return null;}},[input,numberInput,laterInput,mode]);
 const comparison=useMemo(()=>mode==='later-heaven'&&outcome?compareLaterHeavenWithTwoNumbers(laterInput):null,[mode,outcome,laterInput]);
 const depth=useMemo(()=>outcome?makeDeepReading(outcome):null,[outcome]);
 const trace=useMemo(()=>outcome?makeLineTrace(outcome):null,[outcome]);
 const workbook=useMemo(()=>outcome?buildMaiHoaWorkbook(outcome):null,[outcome]);
 const quality=useMemo(()=>buildMaiHoaQuality(outcome),[outcome]);
 useEffect(()=>{const saved=readStudyInput('mai-hoa',window.location.search);if(!saved){if(new URLSearchParams(window.location.search).get('restore')==='1')setError('Bản mở lại có tham số không hợp lệ; đang giữ dữ liệu mẫu, chưa khôi phục.');return;}
  setMode(saved.mode);if(saved.mode==='numbers')setNumberInput({first:saved.first,second:saved.second});
  else if(saved.mode==='later-heaven')setLaterInput({objectTrigram:saved.objectTrigram,directionTrigram:saved.directionTrigram,hourBranch:saved.hourBranch});
  else setInput({yearBranch:saved.yearBranch,lunarMonth:saved.lunarMonth,lunarDay:saved.lunarDay,hourBranch:saved.hourBranch});
 },[]);
 const savedDraft=outcome?{discipline:'mai-hoa' as const,title:`Mai Hoa · ${outcome.original.name}`,
  summary:`${mode==='time'?'Theo lịch âm':mode==='numbers'?'Hai số':'Hậu Thiên Đoan Pháp'} · Hào động ${outcome.changingLine} · Quẻ biến ${outcome.transformed.name}`,
  notes:'',tags:[],snapshot: mode==='time'?{mode,...input}:mode==='numbers'?{mode,...numberInput}:{mode,...laterInput}}:null;
 const set=(field:keyof Input,value:number)=>{setInput(prev=>({...prev,[field]:value}));setError('');};
 const setNumber=(field:keyof NumberInput,value:number)=>{setNumberInput(prev=>({...prev,[field]:value}));setError('');};
 const setLater=(field:keyof LaterInput,value:number)=>{setLaterInput(prev=>({...prev,[field]:value}));setError('');};
 return <section className={`${styles.page} ${styles.mai}`}><header className={styles.hero}><span className={styles.kicker}>THIÊN ĐỒ / TƯỢNG SỐ</span><h1>Mai Hoa Dịch Số</h1><p>Khởi quẻ theo thời gian âm lịch, hai số hoặc Hậu Thiên Đoan Pháp. Theo dõi từng phép chia dư, tìm quẻ chủ, hỗ quẻ, quẻ biến và quan hệ Thể – Dụng. Đây là một quy ước lập quẻ công khai, không đồng nhất với mọi truyền bản.</p><Link className={styles.back} href="/huyen-hoc">← Thư phòng huyền học</Link></header>
 <ModeIntroduction discipline="mai-hoa" summary={outcome?`Quẻ chủ ${outcome.original.name}; quẻ biến ${outcome.transformed.name}; hào động ${outcome.changingLine}.` : "Dữ liệu chưa hợp lệ."}/>
 <MaiHoaCanvas cast={outcome}/>
 <SaveStudy draft={savedDraft}/>
 <div className={styles.columns}><section className={styles.panel}><span className={styles.kicker}>01 / ĐẦU VÀO</span><h2>Chọn phương pháp khởi quẻ</h2><div className={styles.actions} role="group" aria-label="Phương pháp khởi quẻ"><button type="button" className={styles.button} aria-pressed={mode==='time'} onClick={()=>{setMode('time');setError('');}}>Theo năm/tháng/ngày/giờ âm</button><button type="button" className={styles.button} aria-pressed={mode==='numbers'} onClick={()=>{setMode('numbers');setError('');}}>Theo hai con số</button><button type="button" className={styles.button} aria-pressed={mode==='later-heaven'} onClick={()=>{setMode('later-heaven');setError('');}}>Hậu Thiên · vật tượng</button></div>
 {mode==='time'?<div className={styles.formGrid} style={{marginTop:18}}>
 <label className={styles.field}>Địa chi năm <select value={input.yearBranch} onChange={e=>set('yearBranch',Number(e.target.value))}>{BRANCHES.map((name,i)=><option key={name} value={i+1}>{i+1} · {name}</option>)}</select></label>
 <label className={styles.field}>Tháng âm (1–12) <input type="number" min="1" max="12" value={input.lunarMonth} onChange={e=>set('lunarMonth',Number(e.target.value))}/></label>
 <label className={styles.field}>Ngày âm (1–30) <input type="number" min="1" max="30" value={input.lunarDay} onChange={e=>set('lunarDay',Number(e.target.value))}/></label>
 <label className={styles.field}>Địa chi giờ <select value={input.hourBranch} onChange={e=>set('hourBranch',Number(e.target.value))}>{BRANCHES.map((name,i)=><option key={name} value={i+1}>{i+1} · {name}</option>)}</select></label>
 </div>:mode==='numbers'?<div className={styles.formGrid} style={{marginTop:18}}><label className={styles.field}>Số thứ nhất · thượng quái<input type="number" min="1" max="1000000" value={numberInput.first} onChange={e=>setNumber('first',Number(e.target.value))}/></label><label className={styles.field}>Số thứ hai · hạ quái<input type="number" min="1" max="1000000" value={numberInput.second} onChange={e=>setNumber('second',Number(e.target.value))}/></label></div>:<div className={styles.formGrid} style={{marginTop:18}}>
 <label className={styles.field}>Vật tượng · thượng quái<select value={laterInput.objectTrigram} onChange={e=>setLater('objectTrigram',Number(e.target.value))}>{PRIOR_HEAVEN.map(trigram=><option key={trigram.number} value={trigram.number}>{trigram.number} · {trigram.name}</option>)}</select></label>
 <label className={styles.field}>Phương vị · hạ quái<select value={laterInput.directionTrigram} onChange={e=>setLater('directionTrigram',Number(e.target.value))}>{PRIOR_HEAVEN.map(trigram=><option key={trigram.number} value={trigram.number}>{trigram.number} · {trigram.name}</option>)}</select></label>
 <label className={styles.field}>Địa chi giờ<select value={laterInput.hourBranch} onChange={e=>setLater('hourBranch',Number(e.target.value))}>{BRANCHES.map((name,i)=><option key={name} value={i+1}>{i+1} · {name}</option>)}</select></label>
 </div>}
 <div className={styles.actions}><button type="button" className={styles.button} onClick={()=>{setInput(INIT);setNumberInput(NUMBER_INIT);setLaterInput(LATER_INIT);setError('');}}>Trở về ví dụ mẫu</button><button className={styles.button} type="button" onClick={()=>setError(outcome?'':'Dữ liệu chưa hợp lệ: hãy kiểm tra phạm vi số nguyên được nhập.')}>Kiểm tra dữ liệu</button></div>{error&&<p className={styles.error} role="alert">{error}</p>}
 <div className={styles.note}>{mode==='time'?<>Dữ liệu năm và giờ dùng <b>số địa chi (Tý = 1)</b>. Tháng và ngày phải là <b>lịch âm đã đối chiếu</b>. Không lấy trực tiếp ngày dương lịch và không tự xử lý tháng nhuận. <Link href="/calendar">Tra lịch âm – dương ↗</Link></>:mode==='numbers'?<>Quy ước hai số: chọn hai số nguyên dương <b>trước khi lập</b>; số thứ nhất lấy thượng quái, số thứ hai lấy hạ quái, tổng hai số chọn hào động. Không thêm giờ hay ngày nếu chưa chọn phương pháp đó.</>:<>Vật tượng và phương vị phải được <b>chọn số quái theo quy ước</b> trước khi lập. Hào động = số quái vật + số quái phương vị + số chi giờ. Không tự gán hướng la bàn hay tên đồ vật thành quái.</>}</div></section>
 <section className={styles.panel} aria-live="polite"><span className={styles.kicker}>02 / KẾT QUẢ CÓ THỂ KIỂM TRA</span><h2>Hồ sơ quẻ</h2>{outcome?<>
 <div className={styles.hexCards}>{([['Quẻ chủ',outcome.original],['Hỗ quẻ',outcome.nuclear],['Quẻ biến',outcome.transformed]] as const).map(([title,hex])=><div className={styles.hex} key={title}><small>{title} · số {hex.number}</small><strong>{hex.name}</strong><span>Thượng {hex.upper.symbol} {hex.upper.name} / Hạ {hex.lower.symbol} {hex.lower.name}</span><span>{hex.theme}</span></div>)}</div>
 <div className={styles.facts} style={{marginTop:15}}><div className={styles.fact}><span>Hào động</span><strong>Hào {outcome.changingLine}</strong><small>Đếm từ dưới lên</small></div><div className={styles.fact}><span>Thể / không động</span><strong>{outcome.body.name}</strong><small>{outcome.body.element}</small></div><div className={styles.fact}><span>Dụng / có động</span><strong>{outcome.use.name}</strong><small>{outcome.use.element}</small></div></div>
 <ExpertOnly title="Vết tính chia dư khởi quẻ"><div className={styles.trace}><h3>Vết tính không ẩn bước</h3><p>{mode==='time'?'Năm chi + tháng âm + ngày âm':mode==='numbers'?'Số thứ nhất':'Số quái vật tượng'} = <b>{outcome.arithmetic.base}</b>; chia 8 lấy dư <b className={styles.mark}>{outcome.arithmetic.upperRemainder}</b> → thượng quái <b>{outcome.upper.name}</b>.</p><p>{mode==='time'?'Cộng giờ chi':mode==='numbers'?'Số thứ hai':'Số quái phương vị'} = <b>{outcome.arithmetic.total}</b>; chia 8 lấy dư <b className={styles.mark}>{outcome.arithmetic.lowerRemainder}</b> → hạ quái <b>{outcome.lower.name}</b>.</p><p>{mode==='time'?'Tổng có giờ chi':mode==='numbers'?'Tổng hai số':'Vật tượng + phương vị + giờ chi'} = <b>{outcome.arithmetic.movingSeed}</b>; chia 6 lấy dư <b className={styles.mark}>{outcome.arithmetic.changingRemainder}</b> → hào động. Số dư 0 được đổi thành 8 hoặc 6 tương ứng.</p><p><b>Thể – Dụng:</b> {outcome.relationshipPerspective} ({outcome.relation.label}). {outcome.relation.summary}</p></div></ExpertOnly>
 {comparison&&<ExpertOnly title="Đối chiếu phương pháp Hậu Thiên và hai số"><div className={styles.trace}><p>Cùng quẻ chủ <b>{comparison.simple.original.name}</b>. Hai số: hào động <b>{comparison.simple.changingLine}</b>, quẻ biến <b>{comparison.simple.transformed.name}</b>. Hậu Thiên (cộng giờ): hào động <b>{comparison.later.changingLine}</b>, quẻ biến <b>{comparison.later.transformed.name}</b>.</p><p>{comparison.sameMovingLine?'Hai phương pháp trùng hào động ở đầu vào này.':'Hai phương pháp cho hào động khác nhau.'} Đây là so sánh quy tắc, không chọn trường phái thay người xem.</p></div></ExpertOnly>}
 </>:<p role="alert">Chưa lập quẻ vì dữ liệu chưa hợp lệ. Hãy kiểm tra đầu vào đang chọn.</p>}</section></div>
 <ReadingQualityPanel report={quality}/>
 <ExpertOnly title="Bảng Thể–Dụng và vết tính sáu hào">
 {workbook&&<WorkbookPanel report={workbook}/>}
 <section className={styles.panel}><span className={styles.kicker}>03 / THỂ · DỤNG · HỖ · BIẾN</span><h2>Bốn lớp đối chiếu với quái Thể</h2>{depth?<><p>Quái Thể: <b>{depth.body.name} ({depth.body.element})</b> · ở {depth.bodyLocation==='upper'?'thượng quái':'hạ quái'}. Quan hệ dưới đây được tính từ ngũ hành của quái Thể sang các quái đối chiếu; không phải điểm số tốt/xấu.</p><div className={styles.ledger}><table><thead><tr><th>Lớp quan sát</th><th>Quái</th><th>Quan hệ với Thể</th><th>Phương pháp</th></tr></thead><tbody>{depth.layers.map(layer=><tr key={layer.id}><td><b>{layer.stage}</b></td><td>{layer.trigram.name} · {layer.trigram.element}</td><td>{layer.relation.label}</td><td>{layer.what}</td></tr>)}</tbody></table></div><div className={styles.note}>{depth.limit}</div></>:<p>Nhập dữ liệu hợp lệ để xem đối chiếu.</p>}</section>
 <section className={styles.panel}><span className={styles.kicker}>04 / VẾT TÍNH SÁU HÀO</span>
 <h2>Hào nào tạo hỗ quẻ và quẻ biến?</h2>
 <p>Hỗ quẻ lấy các hào giữa của <b>quẻ chủ</b>: hạ hỗ = 2–3–4, thượng hỗ = 3–4–5. Quẻ biến chỉ đảo hào động đã chọn, không đảo các hào còn lại.</p>
 {trace?<><div className={styles.ledger}><table><thead><tr><th>Hào từ dưới lên</th><th>Quẻ chủ</th><th>Quẻ biến</th><th>Hạ hỗ</th><th>Thượng hỗ</th></tr></thead><tbody>
 {[...trace.lines].reverse().map(line=><tr key={line.position}><td><b>{line.position}{line.changing?' ↻ động':''}</b><small>{line.mainTrigram}</small></td><td>{line.before}</td><td>{line.after}</td><td>{line.inLowerNuclear?'Có':'—'}</td><td>{line.inUpperNuclear?'Có':'—'}</td></tr>)}
 </tbody></table></div>
 <details className={styles.accordion}><summary>Cách kiểm tra vị trí hào</summary>{trace.notes.map((note,i)=><p key={i}>{note}</p>)}</details>
 </>:<p>Nhập dữ liệu hợp lệ để kiểm tra hào.</p>}
 </section>
 </ExpertOnly>
 <section className={styles.panel}><span className={styles.kicker}>05 / SUY NGẪM THEO TƯỢNG QUẺ</span><h2>Ba câu hỏi ứng với các giai đoạn</h2>
 {outcome?<div className={styles.facts}>
 <div className={styles.fact}><span>Quẻ chủ · {outcome.original.name}</span><strong>Hiện tại</strong><small>{outcome.original.inquiry}</small></div>
 <div className={styles.fact}><span>Hỗ quẻ · {outcome.nuclear.name}</span><strong>Bên trong</strong><small>{outcome.nuclear.inquiry}</small></div>
 <div className={styles.fact}><span>Quẻ biến · {outcome.transformed.name}</span><strong>Hướng biến đổi</strong><small>{outcome.transformed.inquiry}</small></div>
 </div>:<p>Nhập dữ liệu hợp lệ để xem câu hỏi tương ứng.</p>}
 <div className={styles.note}>Các câu hỏi giúp tự đối chiếu hình tượng trong ba quẻ, không phải lời tiên đoán về diễn biến thực tế.</div></section>
 <section className={styles.panel}><span className={styles.kicker}>06 / CHIỀU SÂU VÀ GIỚI HẠN</span><h2>Đọc quẻ theo đúng tầng nghĩa</h2><div className={styles.facts}><div className={styles.fact}><span>Tầng 1</span><strong>Tượng quái</strong><small>Càn · Đoài · Ly · Chấn · Tốn · Khảm · Cấn · Khôn</small></div><div className={styles.fact}><span>Tầng 2</span><strong>Thể / Dụng</strong><small>Quái chứa hào động = Dụng; quái còn lại = Thể</small></div><div className={styles.fact}><span>Tầng 3</span><strong>Hỗ / Biến</strong><small>Hỗ quẻ từ hào 2–5, biến quẻ từ hào động</small></div></div><details className={styles.accordion}><summary>Phương pháp, giả định và sai lệch cần thẩm định</summary><p>Ba quy ước được tách riêng: năm chi + tháng ngày âm + giờ chi; hai số với tổng chọn hào động; hoặc Hậu Thiên dùng vật tượng, phương vị và số chi giờ. Tháng nhuận cần xác minh quy tắc của trường phái. Trình bày quan hệ ngũ hành chỉ là mô tả cấu trúc biểu tượng, không tự suy phúc họa, bệnh tật, tài vận hoặc kết quả thực tế. Các dị bản về phép khởi quẻ phải được cài thành cấu hình riêng và kiểm thử độc lập.</p></details></section><footer className={styles.disclaimer}>Bản công cụ học tập để minh họa một phương pháp khởi quẻ Mai Hoa, chưa qua thẩm định độc lập bởi chuyên gia từng trường phái.</footer></section>;
}
