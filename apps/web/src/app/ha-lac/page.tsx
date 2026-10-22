'use client';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {SaveStudy} from '@/features/study-room/save-study';
import {readStudyInput} from '@/features/study-room/study-links.cjs';
import {hexagramByNumber,hexagramFromBits} from '@/features/iching/hexagrams.cjs';
import {calculateMinggua,RULE_SOURCES} from '@thiendo/astrology-engine/src/ha-lac-minggua-v11145.cjs';
import {BRANCH_OPTIONS,STEM_NUMBER,LO_SHU,LO_CHECK,HE_TU,calculate,SOURCE_URLS} from '@thiendo/astrology-engine/src/ha-lac-source.cjs';
import styles from '../huyen-hoc/workbench.module.css';
const START=['Giáp Tý','Ất Sửu','Bính Dần','Đinh Mão'];
export default function HaLacPage(){
 const [pillars,setPillars]=useState<string[]>(START);
 const [number,setNumber]=useState(0);
 const [line,setLine]=useState(1);
 const [source,setSource]=useState('');
 const [location,setLocation]=useState('');
 const [gender,setGender]=useState('');
 const [period,setPeriod]=useState('');
 const [periodRef,setPeriodRef]=useState('');
 const [periodDetail,setPeriodDetail]=useState('');
 useEffect(()=>{const restored=readStudyInput('ha-lac',window.location.search);if(restored){setPillars([...restored.pillars]);if(restored.hexagram){setNumber(restored.hexagram.kingWen);setLine(restored.hexagram.yuanTangLine);setSource(restored.hexagram.referenceId);setLocation(restored.hexagram.referenceDetail);}if(restored.profile){setGender(restored.profile.gender);if(restored.profile.period){setPeriod(restored.profile.period);setPeriodRef(restored.profile.periodReferenceId??'');setPeriodDetail(restored.profile.periodReferenceDetail??'');}}}},[]);
 const spec=useMemo(()=>({pillars,...(gender?{profile:{gender,...(period?{period,periodReferenceId:periodRef,periodReferenceDetail:periodDetail}:{})}}:{}),...(number?{hexagram:{kingWen:number,yuanTangLine:line,referenceId:source,referenceDetail:location}}:{})}),[pillars,gender,period,periodRef,periodDetail,number,line,source,location]);
 const outcome=useMemo(()=>{try{return {result:calculate({pillars,...(number?{hexagram:{kingWen:number,yuanTangLine:line,referenceId:source,referenceDetail:location}}:{})}),error:''};}catch(e){return {result:null,error:(e as Error).message};}},[spec]);
 const advanced=useMemo(()=>{try{return {result:calculateMinggua(spec),error:''};}catch(e){return {result:null,error:(e as Error).message};}},[spec]);
 const active=number?hexagramByNumber(number):null;
 const early=advanced.result?.early?hexagramFromBits(advanced.result.early.bits):null;
 const later=advanced.result?.later?hexagramFromBits(advanced.result.later.bits):null;
 const draft=outcome.result&&advanced.result?{discipline:'ha-lac' as const,title:'Hà Lạc · Bốn trụ và thiên địa số',summary:`Thiên ${outcome.result.heaven.sum} · Địa ${outcome.result.earth.sum} · ${advanced.result?.status??'khảo cứu'}`,notes:'',tags:[],snapshot:spec}:null;
 function updatePillar(i:number,value:string){setPillars(old=>old.map((v,k)=>k===i?value:v));}
 const stems=Object.keys(STEM_NUMBER);
 const branches=Object.keys(BRANCH_OPTIONS);
 return <div className={`${styles.page} ${styles.mai}`} style={{minWidth:0,gridTemplateColumns:'minmax(0,1fr)'}}><header className={styles.hero}><EasternScene variant="ha-lac"/><span className={styles.kicker}>HÀ LẠC LÝ SỐ · 河洛理數</span><h1>Hà Lạc · Thiên địa số &amp; hồ sơ quẻ</h1><p>Từ bốn trụ tính Thiên–Địa số, dựng mệnh quẻ và Nguyên Đường theo quy tắc có dấu vết. Những nhánh cần Tam Nguyên hoặc ngoại lệ thời chí không được tự suy đoán. Quẻ nhập từ sách vẫn được lưu riêng.</p><Link className={styles.back} href="/huyen-hoc">← Trung tâm Khám phá</Link></header><DisciplineMethodGuide variant="ha-lac"/>
 <div className={styles.columns}><section className={styles.panel}><span className={styles.kicker}>01 / ĐỐI CHỨNG BỐN TRỤ</span><h2>Can Chi và số nguồn</h2><p>Chọn bốn trụ đã được xác minh qua lịch pháp. Theo bảng này, mỗi Chi đóng góp cả hai số; không tự chọn một số rồi bỏ số kia.</p>{pillars.map((p,i)=><div key={i} className={styles.formGrid} style={{marginBottom:12}}><label className={styles.field}>Trụ {['Năm','Tháng','Ngày','Giờ'][i]}<select value={p} onChange={e=>updatePillar(i,e.target.value)}>{stems.flatMap((s,si)=>branches.filter((_,bi)=>si%2===bi%2).map(b=><option key={`${s}-${b}`} value={`${s} ${b}`}>{s} {b}</option>))}</select></label><div className={styles.fact}><span>Hai số Chi {p.split(' ')[1]}</span><strong>{BRANCH_OPTIONS[p.split(' ')[1]].join(" · ")}</strong><small>Cộng cả hai vào Thiên/Địa số</small></div></div>)}<p className={styles.note}>Bảng số là một bản ghi chép cần khảo dị; mỗi địa chi có hai số lẻ/chẵn theo ngũ hành, đều được dùng. <Link href="/calendar">Mở kiểm tra Can Chi ↗</Link></p></section>
 <section className={styles.panel} aria-live="polite"><span className={styles.kicker}>02 / VẾT TÍNH MINH BẠCH</span><h2>Thiên số – Địa số</h2>{outcome.result?<><div className={styles.facts}><div className={styles.fact}><span>Thiên · các số lẻ</span><strong>{outcome.result.heaven.sum}</strong><small>{outcome.result.heaven.contributions.join(' + ')}</small></div><div className={styles.fact}><span>Địa · các số chẵn</span><strong>{outcome.result.earth.sum}</strong><small>{outcome.result.earth.contributions.join(' + ')}</small></div><div className={styles.fact}><span>Trạng thái</span><strong>Khảo cứu</strong><small>Chưa chốt quẻ tự động</small></div></div><div className={styles.ledger}><table><thead><tr><th>Trụ</th><th>Số Can</th><th>Cặp số Chi</th><th>Đóng góp</th></tr></thead><tbody>{outcome.result.trace.map((r,i)=><tr key={i}><td>{r.pillar}</td><td>{r.stemValue}</td><td>{r.branchNumbers.join(' / ')}</td><td>{r.branchNumbers.join(' + ')}</td></tr>)}</tbody></table></div></>:<p role="alert" className={styles.error}>{outcome.error}</p>}</section></div>
 <section className={styles.panel} aria-live="polite" style={{marginTop:16}}>
  <span className={styles.kicker}>03 / LẬP MỆNH QUẺ · QUY TẮC CÓ NGUỒN</span>
  <h2>Tiên Thiên – Nguyên Đường – Hậu Thiên</h2>
  <p>Chọn nam/nữ theo phép lập quẻ trong tài liệu. Chỉ khi số 5 xuất hiện, chọn Tam Nguyên đã được xác định từ tư liệu lịch pháp riêng. Không suy Tam Nguyên chỉ từ số của năm sinh.</p>
  <div className={styles.formGrid}>
   <label className={styles.field}>Quy ước nam/nữ<select value={gender} onChange={e=>setGender(e.target.value)}><option value="">Chưa khai báo</option><option value="male">Nam mệnh</option><option value="female">Nữ mệnh</option></select></label>
   <label className={styles.field}>Tam Nguyên (khi gặp số 5)<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="">Chưa có đối chiếu</option><option value="upper">Thượng Nguyên</option><option value="middle">Trung Nguyên</option><option value="lower">Hạ Nguyên</option></select></label>
   {period&&<><label className={styles.field}>Chứng bản phân Tam Nguyên<input value={periodRef} maxLength={150} onChange={e=>setPeriodRef(e.target.value)} placeholder="Mã nguồn/ấn bản"/></label><label className={styles.field}>Vị trí quy tắc trong chứng bản<input value={periodDetail} maxLength={400} onChange={e=>setPeriodDetail(e.target.value)} placeholder="Quyển, mục, trang, dòng"/></label></>}
  </div>
  {advanced.result?<>
    <div className={styles.facts}>
      <div className={styles.fact}><span>Giảm Thiên số</span><strong>{advanced.result.numbering.heaven.number}</strong><small>{advanced.result.numbering.heaven.total} → {advanced.result.numbering.heaven.afterThreshold}</small></div>
      <div className={styles.fact}><span>Giảm Địa số</span><strong>{advanced.result.numbering.earth.number}</strong><small>{advanced.result.numbering.earth.total} → {advanced.result.numbering.earth.afterThreshold}</small></div>
      <div className={styles.fact}><span>Trạng thái chứng cứ</span><strong>{advanced.result.status==='CANDIDATE_COMPLETE'?'Có quẻ khảo cứu':'Chưa đủ điều kiện'}</strong><small>{advanced.result.status}</small></div>
    </div>
    {advanced.result.early&&early&&<div className={styles.note}><strong>Tiên Thiên: {early.number} · {early.name}</strong><p>Thượng quái {advanced.result.early.upper.name} – hạ quái {advanced.result.early.lower.name} · hào dưới lên: {advanced.result.early.bits}</p></div>}
    {advanced.result.yuanTang&&<div className={styles.note}><strong>Nguyên Đường: {advanced.result.yuanTang.line?`hào ${advanced.result.yuanTang.line}`:'chưa phân giải'}</strong><p>Giờ sinh {advanced.result.yuanTang.hourBranch} · {advanced.result.yuanTang.status}</p>{advanced.result.yuanTang.trace.length>0&&<div className={styles.chips}>{advanced.result.yuanTang.trace.map(item=><span key={item.hourBranch}>{item.hourBranch}: hào {item.line}</span>)}</div>}</div>}
    {advanced.result.later&&later&&<div className={styles.note}><strong>Hậu Thiên: {later.number} · {later.name}</strong><p>Hào Nguyên Đường sau đổi quái: {advanced.result.later.yuanTangLine} · {advanced.result.later.operation}</p></div>}
    <details className={styles.accordion}><summary>Vết tính, căn cứ và ngoại lệ</summary><div>{advanced.result.trace.map((item,i)=><p key={i}>{i+1}. {item}</p>)}</div>{advanced.result.warnings.map((w,i)=><p key={i}>{w}</p>)}{RULE_SOURCES.map(url=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">Tư liệu quy tắc ↗</a></p>)}</details>
  </>:<p className={styles.error} role="alert">{advanced.error}</p>}
 </section>
 <div className={styles.columns}><section className={styles.panel}><span className={styles.kicker}>04 / LẠC THƯ</span><h2>Cửu cung Lạc Thư</h2><div className={styles.loGrid}>{LO_SHU.flatMap((row,r)=>row.map((value,c)=><div className={styles.palace} key={`${r}-${c}`} style={{cursor:'default'}}><b>{value}</b></div>))}</div><p>Tổng hàng: {LO_CHECK.rows.join(', ')} · cột: {LO_CHECK.columns.join(', ')} · chéo: {LO_CHECK.diagonals.join(', ')}.</p><div className={styles.chips}>{HE_TU.map(x=><span key={x.direction}>{x.direction}: {x.pair.join('–')} · {x.element}</span>)}</div></section>
 <section className={styles.panel}><span className={styles.kicker}>05 / QUẺ SỐ &amp; NGUYÊN ĐƯỜNG</span><h2>Ghi quẻ theo chứng bản</h2><div className={styles.formGrid}><label className={styles.field}>Số quẻ Văn Vương (không bắt buộc)<select value={number} onChange={e=>setNumber(Number(e.target.value))}><option value={0}>Chưa có đối chiếu</option>{Array.from({length:64},(_,i)=>hexagramByNumber(i+1)).filter((h): h is NonNullable<typeof h> => h !== null).map(h=><option key={h.number} value={h.number}>{h.number} · {h.name}</option>)}</select></label><label className={styles.field}>Hào Nguyên Đường<select value={line} onChange={e=>setLine(Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Hào {n}</option>)}</select></label><label className={styles.field}>Mã sách / bản khắc<input value={source} maxLength={150} onChange={e=>setSource(e.target.value)} placeholder="Mã thư mục / dị bản"/></label><label className={styles.field}>Trang, đoạn hoặc số dòng<input value={location} maxLength={400} onChange={e=>setLocation(e.target.value)} placeholder="Trang 12, mục ..."/></label></div>{active&&<div className={styles.note}><b>Quẻ {active.number} · {active.name}</b> · thượng {active.upper.name}, hạ {active.lower.name}. Đây là số quẻ đã nhập, không phải quẻ Thiên Đồ suy ra từ bốn trụ.</div>}<SaveStudy draft={draft}/><details className={styles.accordion}><summary>Tài liệu đang khảo dị &amp; giới hạn</summary><p>Đối chiếu hai tài liệu diễn giải số Hà Lạc; việc xác định Tam Nguyên (nếu có số 5), ngoại lệ quẻ thuần âm/dương theo mùa chí và khởi đại vận vẫn cần chứng bản hoặc điều kiện bổ sung.</p>{SOURCE_URLS.map(url=><p key={url}><a target="_blank" rel="noopener noreferrer" href={url}>Nguồn tham khảo ↗</a></p>)}</details></section></div>
 <footer className={styles.disclaimer}>Tài liệu phục vụ nghiên cứu tượng số; không phải phép dự đoán đã được kiểm định. Quẻ nghiên cứu là kết quả theo quy tắc nguồn, chưa qua nghiệm chứng dự báo; không dùng ma phương Lạc Thư thay thế phép lập mệnh quẻ.</footer></div>;
}
