'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {useMemo,useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {buildDeepChartReading,type DeepEvidence,type DeepTransformation} from '@thiendo/interpretation/src/chart-reading.cjs';
import styles from './deep-chart-reading.module.css';
const strength:Record<string,string>={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
function Evidence({items}:{items:DeepEvidence[]}){
 return items.length?<details className={styles.evidence}><summary>{items.length} chứng cứ vị trí</summary><ul>{items.map(e=><li key={e.id}>
  <strong>{e.transformation?`${e.scope==='annual'?'Lưu ':''}${e.transformation} → `:''}{e.star}</strong> · {e.palace} ({e.branch}) · {e.relation}
  {e.strength?` · ${strength[e.strength]}`:''} · {e.scope==='annual'?`năm âm lịch ${e.year}`:'bản mệnh'}
 </li>)}</ul></details>:null;
}
function Hoa({items}:{items:DeepTransformation[]}){
 return items.length?<div className={styles.hoa}>{items.map(x=><article key={x.evidence.id}><p>{x.interpretation}</p><small>{x.caution}</small><Evidence items={[x.evidence]}/></article>)}</div>:<p>Không có Tứ Hóa đã xác minh trong phạm vi bốn cung này.</p>;
}
export function DeepChartReadingPanel({chart,year}:{chart:AstrologyResult;year:number}){
 const outcome=useMemo(()=>{try{return {report:buildDeepChartReading(chart,year),error:null};}catch(e){return {report:null,error:e instanceof Error?e.message:'Chưa đủ dữ liệu để lập bài luận.'};}},[chart,year]);
 const [selected,setSelected]=useState('all');
 const [layer,setLayer]=useState<'both'|'natal'|'annual'>('both');
 const [onlyReview,setOnlyReview]=useState(false);
 const report=outcome.report;
 if(!report)return <section className={styles.root} aria-label="Luận giải chuyên sâu Tử Vi"><p role="alert">{outcome.error}</p></section>;
 const visible=report.palaces.filter(p=>(selected==='all'||p.palace===selected)&&(!onlyReview||p.natal.issues.length||p.annual.rejected.length));
 const exportJson=()=>{
  const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json;charset=utf-8'});
  downloadBlobFile(blob,`THIEN_DO_LUAN_SAU_${report.year}_V11_123.json`);
 };
 return <section className={styles.root} aria-label="Luận giải chuyên sâu Tử Vi">
  <header><span className="eyebrow">BÀI LUẬN CÓ DỮ KIỆN</span><h3>Luận giải chuyên sâu: từ bản mệnh đến năm xem</h3>
   <p>12 cung, tam phương tứ chính và quan hệ giữa các sao. Đọc biểu tượng theo vị trí thực tế, cùng điều kiện đối chiếu và giới hạn của từng lớp.</p>
  </header>
  <div className={styles.stats} role="status"><strong>Năm âm lịch {report.year} · {report.canChi} · {report.ageMu} tuổi mụ</strong><span>{visible.length} / 12 cung đang hiển thị</span></div>
  <p className={styles.note}>Năm xem đồng bộ với mục “Năm âm lịch cần xem” trên lá số. Bản mệnh giữ nguyên khi đổi năm.</p>
  <div className={styles.toolbar}>
   <label>Cung cần đọc<select aria-label="Cung trong bài luận chuyên sâu" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">Tất cả 12 cung</option>{report.palaces.map(p=><option key={p.palace} value={p.palace}>{p.palace}</option>)}</select></label>
   <label>Lớp luận<select aria-label="Lớp luận chuyên sâu" value={layer} onChange={e=>setLayer(e.target.value as typeof layer)}><option value="both">Bản mệnh & năm xem</option><option value="natal">Chỉ bản mệnh</option><option value="annual">Chỉ năm xem</option></select></label>
   <label className={styles.check}><input type="checkbox" checked={onlyReview} onChange={e=>setOnlyReview(e.target.checked)}/> Chỉ cung cần kiểm tra</label>
   <button type="button" className="btn secondary small" onClick={exportJson}>Xuất bài luận JSON</button>
  </div>
  {layer!=='natal'&&<details className={styles.entry} open><summary>Đại hạn · Tiểu hạn · Lưu niên {report.year}</summary><div className={styles.body}>
   {report.periods.beforeFirstDaiHan&&<p>Chưa có Đại hạn áp dụng ở tuổi mụ này theo khoảng hạn hiện hành; không tự tạo một đại hạn mới.</p>}
   {report.periods.daiHanStatus==='outside-range'&&<p>Tuổi mụ đang xem nằm ngoài dãy Đại hạn được hỗ trợ trên lá số; không kéo dài hoặc lặp lại một khoảng hạn.</p>}
   {report.periods.items.map(p=><article key={p.name}><h4>{p.name}: {p.palace} ({p.branch}){p.fromAge?` · ${p.fromAge}–${p.toAge} tuổi mụ`:''}</h4><p>{p.interpretation}</p></article>)}
   {report.periods.overlaps.map((p,i)=><p className={styles.note} key={i}>{p.text}</p>)}
   {report.periods.issues.map(x=><p role="alert" key={x}>{x}</p>)}<p className={styles.note}>{report.periods.notice}</p>
  </div></details>}
  <details className={styles.entry}><summary>Tứ Hóa: sao đích, cung và lớp áp dụng</summary><div className={styles.body}>
   <div className={styles.tableWrap}><table aria-label="Đối chiếu Tứ Hóa bản mệnh và năm xem"><caption>Hai lớp độc lập; Hóa không phải một sao được thêm vào địa bàn</caption><thead><tr><th>Lớp</th><th>Hóa</th><th>Sao đích</th><th>Cung</th></tr></thead><tbody>{[...(layer!=='annual'?report.natalTransformations:[]),...(layer!=='natal'?report.annualTransformations:[])].map(x=><tr key={x.evidence.id}><td>{x.evidence.scope==='natal'?'Năm sinh':`Lưu ${report.year}`}</td><td>{x.evidence.transformation}</td><td>{x.evidence.star}</td><td>{x.evidence.palace} ({x.evidence.branch})</td></tr>)}</tbody></table></div>
   {layer==='both'&&report.transformationLinks.map((x,i)=><p key={i}>{x.text}</p>)}
   <p>Đọc Tứ Hóa cùng sao nhận Hóa và chủ đề cung. Bài này chưa xét Phi Hóa cung can, tự hóa hoặc Đại hạn Tứ Hóa.</p>
  </div></details>
  <div className={styles.list}>
   {visible.length===0&&<p role="status">Không có cung cần kiểm tra theo bộ điều kiện dữ liệu hiện tại. Điều này chưa xác nhận nội dung luận đoán.</p>}
   {visible.map(p=><details key={p.palace} className={styles.entry} open={p.order===1||selected!=='all'}>
    <summary><span>{String(p.order).padStart(2,'0')}</span><strong>{p.palace} ({p.branch}) · {p.natal.theme}</strong><small>{p.natal.status==='needs-review'?'Cần kiểm tra dữ liệu':p.natal.voChinhDieu?'Vô chính diệu':'Có chứng cứ vị trí'}</small></summary>
    <div className={styles.body}>
     {layer!=='annual'&&<div aria-label={`Bản mệnh cung ${p.palace}`}>
      {p.natal.paragraphs.map(x=><article key={x.id}><h4>{x.title}</h4><p>{x.text}</p><Evidence items={x.evidence}/></article>)}
      <details className={styles.sub}><summary>Bốn vị trí trong tứ chính</summary><div className={styles.tableWrap}><table aria-label={`Tứ chính của ${p.palace}`}><thead><tr><th>Quan hệ</th><th>Cung</th><th>Chính tinh đã xác minh</th></tr></thead><tbody>{p.natal.courts.map(c=><tr key={c.branchIndex}><td>{c.relation}</td><td>{c.palace} ({c.branch})</td><td>{c.isVoChinhDieu?'Vô chính diệu':c.groups.main.map(s=>`${s.star} (${strength[s.strength]})`).join(', ')||'Chưa đủ chứng cứ'}</td></tr>)}</tbody></table></div></details>
      <h4>Quan hệ giữa các sao</h4>
      {p.natal.relationships.length+p.natal.groups.length===0&&<p>Chưa có cặp hoặc nhóm đủ điều kiện trong phạm vi khảo sát; không ghép sao ở ngoài phạm vi thành bộ.</p>}
      {[...p.natal.relationships,...p.natal.groups].map(x=><details className={styles.sub} key={x.id}><summary>{x.title}</summary><p>{x.text}</p><Evidence items={x.evidence}/></details>)}
      <details className={styles.sub}><summary>Biểu tượng phụ tinh khác tại cung ({p.natal.otherSymbols.length})</summary>{p.natal.otherSymbols.map(x=><article key={x.evidence.id}><h4>{x.evidence.star} · {x.motif}</h4><p>{x.context}</p><small>{x.caution}</small><Evidence items={[x.evidence]}/></article>)}</details>
      <h4>Tứ Hóa năm sinh trong tứ chính</h4><Hoa items={p.natal.transformations}/>
      {p.natal.issues.length>0&&<div className={styles.warning}><strong>Chứng cứ không dùng để diễn nghĩa</strong><ul>{p.natal.issues.map((x,i)=><li key={i}>{x.star} ở {x.palace}: {x.reason}</li>)}</ul></div>}
     </div>}
     {layer!=='natal'&&<section className={styles.annual} aria-label={`Năm ${report.year} cung ${p.palace}`}><span className="eyebrow">LỚP NĂM ÂM LỊCH {report.year}</span><h4>{p.annual.paragraph.title}</h4><p>{p.annual.paragraph.text}</p><Evidence items={p.annual.stars}/><h4>Lưu Tứ Hóa trong tứ chính</h4><Hoa items={p.annual.transformations}/>{p.annual.rejected.length>0&&<p className={styles.warning}>Có {p.annual.rejected.length} bản ghi lưu niên không đạt kiểm tra; không dùng để luận.</p>}</section>}
     <aside className={styles.reflection}><strong>Đối chiếu đời sống:</strong> {p.natal.question}<p><strong>Cách giải thích khác:</strong> {p.natal.counterexample}</p><small>{p.natal.boundary}</small></aside>
    </div>
   </details>)}
  </div>
  <details className={styles.entry}><summary>Phương pháp và giới hạn bài luận</summary><div className={styles.body}><p>{report.method.description}</p><ul>{report.limitations.map(x=><li key={x}>{x}</li>)}</ul><p>Hồ sơ biên soạn sử dụng: {report.method.sourceRefs.map(x=>x.title).join('; ')}.</p></div></details>
  <p className={styles.note}>{report.notice}</p>
 </section>;
}
