'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {TarotReadingSynthesis} from './reading-synthesis';
import {useMemo,useState} from 'react';
import {getTarotCardDepth,studyTarotSnapshot} from '@thiendo/interpretation/src/tarot-depth.cjs';
import type {TarotSnapshot} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import styles from './tarot-depth.module.css';
const contexts=[['general','Tổng quát'],['work','Công việc / học tập'],['relationship','Quan hệ / giao tiếp'],['resources','Nguồn lực / thời gian']] as const;
export function TarotCardDossier({id}:{id:string}){
 const card=useMemo(()=>getTarotCardDepth(id),[id]),d=card.depth;
 const [orientation,setOrientation]=useState<'upright'|'reversed'>('upright');
 return <section className={styles.root} aria-label="Hồ sơ chuyên sâu lá Tarot"><span className={styles.eyebrow}>78 HỒ SƠ</span><h3>{card.nameVi} · đọc sâu biểu tượng</h3>
  <p className={styles.note}>Các hướng đọc dưới đây do Thiên Đồ biên soạn; hình ảnh được đối chiếu với truyền thống RWS, không phải bản dịch nguyên văn nghĩa lịch sử.</p>
  <h4>Biểu tượng và lớp nghĩa</h4><ul>{d.symbols.map(s=><li key={s.image}><strong>{s.image}:</strong> {s.study}. Đây là điểm gợi suy ngẫm, cần đọc cùng toàn cảnh lá.</li>)}</ul>
  <details><summary>Nguyên tố và số học</summary><p><strong>Nguyên tố:</strong> {d.element.value??'Không gán một nguyên tố duy nhất'} · Tương ứng tham khảo: {d.element.attribution}.</p><p>{d.element.note}</p><p><strong>{d.number.label}:</strong> {d.number.study}</p></details>
  <label className={styles.select}>Chiều lá để nghiên cứu<select aria-label="Chiều lá trong hồ sơ Tarot" value={orientation} onChange={e=>setOrientation(e.target.value as typeof orientation)}><option value="upright">Xuôi</option><option value="reversed">Ngược</option></select></label>
  <div className={styles.orientation}><h4>{orientation==='upright'?'Luận chiều xuôi':'Các khả năng của chiều ngược'}</h4><p>{d[orientation].meaning}</p>{orientation==='reversed'&&<ul>{d.reversed.alternatives.map(s=><li key={s}>{s}</li>)}</ul>}<p><strong>Tự đối chiếu:</strong> {d[orientation].question}</p></div>
  <details><summary>Ba bối cảnh diễn giải</summary>{d.contexts.map(c=><article key={c.id}><h4>{c.title}</h4><p>{c.prompt}</p><small>{c.check}</small></article>)}</details>
  <details><summary>Tình huống thực hành</summary>{d.scenarios.map(s=><article key={s.orientation}><h4>{s.orientation==='upright'?'Xuôi':'Ngược'} · {s.situation}</h4><p>{s.interpretation}</p><small><strong>Điều cần xác minh:</strong> {s.verify}</small></article>)}</details>
  <details><summary>Lá để đối chiếu cùng</summary>{d.companions.map(c=><article key={c.id}><h4>{getTarotCardDepth(c.id).nameVi} · {c.angle}</h4><p>{c.discussion}</p><small>{c.question}</small></article>)}<p>Đây là bài tập phối hợp được biên soạn, không phải một tổ hợp luôn dẫn đến cùng kết quả.</p></details>
  <p className={styles.warning}><strong>Tránh suy quá mức:</strong> {d.avoid}</p>
  <details><summary>Nguồn và phương pháp</summary><p><a href={d.source.url} target="_blank" rel="noreferrer">{d.source.title} ↗</a></p><p>{d.source.scope}</p><p>Nguyên tố tham khảo Golden Dawn Book T; số học là khung học Thiên Đồ. Vai trò Page/Knight/Queen/King không được dùng để suy giới tính hoặc tuổi người thật.</p></details>
 </section>;
}
export function TarotDepthReadingPanel({snapshot,onContextChange}:{snapshot:TarotSnapshot;onContextChange?:(context:(typeof contexts)[number][0])=>void}){
 const [legacyContext,setLegacyContext]=useState<(typeof contexts)[number][0]>('general');
 const context=snapshot.version===2?snapshot.context:legacyContext;
 const report=useMemo(()=>studyTarotSnapshot(snapshot,{context}),[snapshot,context]);
 const [pairAnchor,setPairAnchor]=useState(-1);
 const effectiveAnchor=pairAnchor<report.positions.length?pairAnchor:-1;
 const visiblePairs=effectiveAnchor===-1?report.combinations:report.combinations.filter(c=>c.indexes.includes(effectiveAnchor));
 function download(){downloadBlobFile(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json;charset=utf-8'}),'THIEN_DO_TAROT_LUAN_SAU.json');}
 return <section className={styles.root} aria-label="Diễn giải chuyên sâu trải Tarot"><h3>Nối các lá theo vị trí và bối cảnh</h3><p className={styles.note}>Chọn bối cảnh để học cách diễn giải; hệ thống không tự đoán bối cảnh từ câu hỏi. {snapshot.version===2?'Bối cảnh được ghi cùng hồ sơ phương pháp 2; đổi bối cảnh không rút lại lá.':'Hồ sơ cũ không ghi bối cảnh; lựa chọn học ở đây không đổi hồ sơ cũ.'}</p>
  <div className={styles.toolbar}><label className={styles.select}>Bối cảnh nghiên cứu<select aria-label="Bối cảnh luận Tarot" value={context} onChange={e=>{const next=e.target.value as typeof context;if(snapshot.version===2)onContextChange?.(next);else setLegacyContext(next);}}>{contexts.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button type="button" className={styles.button} onClick={download}>Xuất luận sâu JSON</button></div>
  <p className={styles.note}>JSON luận sâu bỏ câu hỏi chính, nhưng có thể chứa nhãn và câu hỏi vị trí tự chọn. Để nhập lại đúng các lá đã rút, dùng “Xuất JSON trải bài”.</p>
  <div role="status" className={styles.note}>{report.positions.length} lá · {report.combinations.length} cặp đối chiếu · bối cảnh {contexts.find(c=>c[0]===context)?.[1]}</div>
  {report.positions.length>3&&<label className={styles.select}>Mạch đọc theo vị trí<select aria-label="Vị trí để lọc tổ hợp Tarot" value={effectiveAnchor} onChange={e=>setPairAnchor(+e.target.value)}><option value={-1}>Tất cả các cặp ({report.combinations.length})</option>{report.positions.map(p=><option value={p.index} key={p.id}>{p.index+1}. {p.label}</option>)}</select></label>}<TarotReadingSynthesis report={report} anchor={effectiveAnchor}/>
  {report.positions.map(p=><details key={p.id} open={p.index===0}><summary>{p.index+1}. {p.label} · {p.name} ({p.orientation==='upright'?'xuôi':'ngược'})</summary><p>{p.positionReading}</p><p>{p.interpretation}</p>{p.alternatives.length>0&&<ul>{p.alternatives.map(s=><li key={s}>{s}</li>)}</ul>}<p><strong>Đối chiếu:</strong> {p.context?.prompt??p.question}</p>{p.context&&<small>{p.context.check}</small>}<p className={styles.warning}>Tránh: {p.avoid}</p></details>)}
  <h4>Toàn bộ cặp trong phạm vi đã chọn</h4><p role="status">Đang liệt kê {visiblePairs.length} / {report.combinations.length} cặp.</p>{report.combinations.length===0&&<p>Một lá không có tổ hợp nội bộ. Không tự thêm lá hoặc rút lại để tạo cặp.</p>}
  {visiblePairs.map(c=><details key={c.indexes.join('-')}><summary>{c.title} · vị trí {c.indexes.map(x=>x+1).join(' / ')}</summary><p>{c.discussion}</p><p>{c.orientationNote}</p><p><strong>Bối cảnh:</strong> {c.contextQuestion}</p><small>{c.limit}</small></details>)}
  <details><summary>Phương pháp của bài luận</summary>{Object.entries(report.method).map(([id,text])=><p key={id}>{text}</p>)}{report.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></p>)}</details><p className={styles.note}>{report.notice}</p>
 </section>;
}
