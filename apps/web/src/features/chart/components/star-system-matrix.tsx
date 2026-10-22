'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
import {catalogRows,buildChartMatrix,counts,filterRows,getResolutions,type MatrixBucket} from '@thiendo/knowledge/src/star-system-matrix.cjs';
import styles from './star-system-matrix.module.css';
import resolutionData from '@thiendo/knowledge/src/star-resolution-v11122.json';
const categories:[MatrixBucket,string][]=[['all','Tất cả lớp'],['main','Chính tinh'],['support','Phụ tinh lẻ'],['cycle','Ba vòng sao'],['annual','Lưu tinh'],['special','Án ngữ / Hóa / điểm lưu']];
const layerNames:Record<string,string>={natal:'Năm sinh / bản mệnh',cycle:'Vòng bản mệnh',annual:'Năm xem',obstruction:'Án ngữ bản mệnh','natal-transformation':'Tứ Hóa năm sinh','annual-transformation':'Tứ Hóa năm xem','annual-locator':'Điểm năm xem'};
const decisionNames:Record<string,string>={'terminology-mapped':'Đã làm rõ thuật ngữ','method-dependent':'Khác cách an theo nguồn','paired-marker-compared':'Đã so cặp cung','representation-conflict':'Khác biểu diễn','source-scoped-rule':'Đã làm rõ quy tắc/lớp','conflicting-source-tables':'Hai bảng còn mâu thuẫn','insufficient-source':'Chưa đủ nguồn','source-table-captured':'Đã ghi bảng ứng viên'};
export function StarSystemMatrix({chart,annual}:{chart?:AstrologyResult;annual?:AnnualOverview}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState<MatrixBucket>('all'),[resolutionType,setResolutionType]=useState<'all'|'missing'|'alias'>('all');
 const data=useMemo(()=>{try{return {rows:chart?buildChartMatrix(chart,annual??null).rows:catalogRows(),error:''};}catch(error){return {rows:[],error:(error as Error).message};}},[chart,annual]);
 const total=counts(),rows=filterRows(data.rows,query,category),resolutions=getResolutions('',resolutionType);
 function exportMatrix(){if(data.error)return;
  const matrix=chart?buildChartMatrix(chart,annual??null):{schemaVersion:1,format:'thien-do.star-layer-matrix',rows:data.rows,counts:total,annualYear:null};
  const payload={...matrix,exportedAt:new Date().toISOString(),resolutions:getResolutions(),scope:chart?'computed-chart-inventory':'identity-catalog',notice:'104 sao gốc/vòng sao; các lớp khác giữ riêng. Hồ sơ tên chưa đủ duyệt không được tự an hoặc tự gộp.'};
  downloadBlobFile(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'thien-do-star-layer-matrix.json');
 }
 return <section className={styles.root} aria-label="Ma trận hệ thống sao Tử Vi">
  <header><span className={styles.eyebrow}>THIÊN ĐỒ / KIỂM KÊ CÁC LỚP SAO</span><h2>Ma trận chính · phụ · lưu tinh</h2><p>{total.main} chính tinh + {total.support} phụ tinh lẻ + {total.cycles} tên trong ba vòng = <b>{total.natalAndCycle} tên gốc/vòng sao</b>. {total.annual} lưu tinh năm xem được đếm riêng. Án ngữ, Tứ Hóa và điểm Lưu Thái Tuế là các lớp khác.</p>
  <p>{chart?`Vị trí lấy trực tiếp từ lá số đang xem${annual?`; lưu niên ${annual.year} · ${annual.canChi}`:''}.`:'Danh mục hệ thống; lập lá số để xem vị trí tính toán theo từng cung.'} Danh mục này chưa xác nhận đầy đủ mọi trường phái.</p></header>
  {data.error?<p role="alert">Chưa thể kiểm kê: {data.error}. Không hiển thị ma trận thiếu dữ liệu.</p>:<>
   <div className={styles.controls}><label>Tìm trong ma trận sao<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Thiên Mã, Hóa Lộc, sao gốc…"/></label><label>Lớp sao trong ma trận<select value={category} onChange={e=>setCategory(e.target.value as MatrixBucket)}>{categories.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button type="button" onClick={exportMatrix}>↓ Xuất ma trận JSON</button></div>
   <p role="status">Ma trận: {rows.length} / {data.rows.length} định danh phù hợp. Số định danh bao gồm các lớp riêng; không gọi tất cả là sao gốc.</p>
   {rows.length?<div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Bảng ma trận có thể cuộn ngang"><table><caption>Ma trận tên sao và lớp dữ liệu</caption><thead><tr><th>Tên / nhóm</th><th>Lớp</th><th>Sao gốc liên quan</th><th>Vị trí hiện hành</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th scope="row">{row.name}<small>{row.groupLabel}</small>{row.lookupTerms.length>0&&<small>Tên tham khảo: {row.lookupTerms.join(', ')} · liên kết thuật ngữ</small>}</th><td>{layerNames[row.layer]||row.layer}</td><td>{row.originName||'—'}{row.layer==='annual-locator'&&<small>Điểm định vị, không cộng vào 12 lưu tinh</small>}</td><td>{row.placements.length?row.placements.map(p=><span key={p.branchIndex}>{p.branch} · {p.palace}{p.star?` · ${p.star}`:''}<br/></span>):chart?'Chưa chọn lớp năm xem':'Xem trên lá số'}</td></tr>)}</tbody></table></div>:<p>Không có định danh phù hợp. Thử từ khóa hoặc lớp sao khác.</p>}
  </>}
  <details className={styles.decisions}><summary>Tiến độ phân xử 11 tên thiếu và 4 dị danh</summary><p>9 tên đã làm rõ quy tắc/lớp theo nguồn riêng; Văn Tinh còn mâu thuẫn bảng; Hồng Diễm đã có bảng ứng viên của một tác giả nhưng chưa có đối chứng độc lập. Trường Sinh được làm rõ quan hệ thuật ngữ trong ma trận; ba tên còn lại cần giữ khác biệt quy tắc hoặc biểu diễn. Các hồ sơ này không tự thêm sao vào lá số.</p><label>Nhóm hồ sơ phân xử<select value={resolutionType} onChange={e=>setResolutionType(e.target.value as 'all'|'missing'|'alias')}><option value="all">15 hồ sơ</option><option value="missing">11 tên thiếu</option><option value="alias">4 dị danh</option></select></label>
  {resolutions.map(row=><article key={row.name}><h3>{row.name}{row.candidate?` → đối chiếu ${row.candidate}`:''}</h3><b>{decisionNames[row.state]}</b><p>{row.decision}</p><p>Phạm vi: {row.ruleScope}</p><p>Còn cần: {row.remaining}</p><p>Nguồn: {row.sourceIds.map(id=>{const source=resolutionData.sources.find(s=>s.id===id)!;return <span key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><br/></span>;})}</p><Link href="/research/star-audit">Xem nguồn và điều kiện thẩm định ↗</Link></article>)}</details>
  <p className={styles.footer}><Link href="/research/star-system">Danh mục toàn hệ thống ↗</Link> · <Link href="/research/star-audit">Đối chiếu nguồn và dị bản ↗</Link></p>
 </section>;
}
