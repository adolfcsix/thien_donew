'use client';
import {downloadBlobFile} from '@/lib/download-blob';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
import {buildTwelvePalaceLedger,compareLedgerRows,exportLedgerCsv,filterLedgerRows,ledgerLayers,type LedgerLayer,type LedgerRow} from '../lib/twelve-palace-ledger';

type Props = {chart:AstrologyResult; annual:AnnualOverview; selectedBranch:number; onSelect:(branch:number)=>void; showAnnual:boolean};

function EvidenceList({row,layers}:{row:LedgerRow;layers:readonly LedgerLayer[]}) {
  return <div className="ledger-evidence-layers">{ledgerLayers.filter(group=>layers.includes(group.id)).map(group => {
    const entries=row.records.filter(r=>r.layer===group.id);
    return <div className="ledger-evidence-layer" key={group.id}>
      <div className="ledger-evidence-label"><b>{group.label}</b><small>{entries.length} mục</small></div>
      {entries.length ? <ul>{entries.map(entry => <li key={entry.sourcePath}>
        {entry.layer==='main' ? <Link href={`/star-atlas?star=${encodeURIComponent(entry.star)}&branch=${row.branchIndex}&palace=${encodeURIComponent(row.palace)}`}>{entry.label} ↗</Link> : <span>{entry.label}</span>}
        
      </li>)}</ul> : <p className="ledger-no-data">Không có mục trong lớp này.</p>}
    </div>;
  })}</div>;
}

export function TwelvePalaceLedger({chart,annual,selectedBranch,onSelect,showAnnual}:Props) {
  const [expanded,setExpanded] = useState(false);
  const [query,setQuery] = useState('');
  const [timeScope,setTimeScope] = useState<'natal'|'all'>('all');
  const [activeLayer,setActiveLayer] = useState<LedgerLayer|'all'>('all');
  const [compareTarget,setCompareTarget] = useState<'opposite'|'tam1'|'tam2'|'manual'>('opposite');
  const [manualBranch,setManualBranch] = useState(0);
  const [notice,setNotice] = useState('');
  const rows = useMemo(()=>buildTwelvePalaceLedger(chart,annual),[chart,annual]);
  const effectiveLayer = ledgerLayers.some(x => x.id===activeLayer && x.annual && (!showAnnual || timeScope==='natal')) ? 'all' : activeLayer;
  const layers = useMemo(()=>ledgerLayers.filter(x => (showAnnual && timeScope==='all' || !x.annual) && (effectiveLayer==='all' || x.id===effectiveLayer)).map(x=>x.id),[showAnnual,timeScope,effectiveLayer]);
  const visible = useMemo(()=>filterLedgerRows(rows,query,layers),[rows,query,layers]);
  const current = rows.find(x=>x.branchIndex===selectedBranch) ?? rows[0];
  const targetBranch = compareTarget==='opposite' ? (selectedBranch+6)%12 : compareTarget==='tam1' ? (selectedBranch+4)%12 : compareTarget==='tam2' ? (selectedBranch+8)%12 : manualBranch;
  const target = rows.find(x=>x.branchIndex===targetBranch) ?? rows[0];
  const comparison = useMemo(()=>compareLedgerRows(current,target,layers),[current,target,layers]);
  const activeRecords=(row:LedgerRow)=>row.records.filter(item=>layers.includes(item.layer));
  function downloadCsv() {
    const csv=exportLedgerCsv(visible,layers,annual.year,{includeTechnical:false});
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    downloadBlobFile(blob,`thien-do-12-cung-${annual.year}.csv`);
    setNotice(`Đã tạo CSV gồm ${visible.length} cung từ dữ liệu đang hiển thị. Tệp nằm trên máy của bạn.`);
  }
  return <section className="twelve-palace-ledger" aria-label="Sổ đối chiếu dữ liệu 12 cung">
    <div className="ledger-cover">
      <div><span className="eyebrow">QUYỂN II.A · KIỂM KÊ THẬP NHỊ CUNG</span><h3 className="serif">Đối chiếu 12 cung <small>十二宮</small></h3><p>So sánh các lớp dữ liệu đã an sao ở toàn bộ 12 cung. Tra cứu và đối chiếu các tên sao đã an; không tự động suy luận tốt xấu.</p></div>
      <button className="ledger-open" type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} aria-controls="thiendo-ledger-content">{expanded?'− Thu gọn bảng':'＋ Mở sổ 12 cung'}</button>
    </div>
    {expanded && <div id="thiendo-ledger-content" className="ledger-content">
      <div className="ledger-toolbar">
        <label><span>Tìm cung hoặc tên sao</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setNotice('');}} placeholder="Ví dụ: Mệnh, Hóa Lộc, Thái Âm…"/></label>
        <label><span>Lớp dữ liệu</span><select value={effectiveLayer} onChange={e=>{const next=e.target.value as LedgerLayer|'all';setActiveLayer(next);if(ledgerLayers.some(x=>x.id===next&&x.annual))setTimeScope('all');setNotice('');}}><option value="all">Tất cả lớp</option>{ledgerLayers.filter(layer=>showAnnual||!layer.annual).map(layer=><option key={layer.id} value={layer.id}>{layer.label}</option>)}</select></label>
        <div className="ledger-scope" role="group" aria-label="Phạm vi thời gian"><span>Nguồn thời gian</span><div><button type="button" className={timeScope==='natal'?'active':''} aria-pressed={timeScope==='natal'} onClick={()=>{setTimeScope('natal');if(ledgerLayers.some(x=>x.annual && x.id===activeLayer)) setActiveLayer('all');}}>Năm sinh</button><button type="button" className={timeScope==='all'?'active':''} aria-pressed={timeScope==='all'} disabled={!showAnnual} onClick={()=>setTimeScope('all')}>+ Năm {annual.year}</button></div></div>
        <button type="button" className="ledger-download" disabled={!visible.length} onClick={downloadCsv}>↓ Xuất CSV</button>
      </div>
      <div className="ledger-count" role="status" aria-live="polite">{visible.length} / 12 cung · {visible.reduce((count,row)=>count+activeRecords(row).length,0)} bản ghi theo lớp đang chọn {notice && <span>{notice}</span>}</div>
      <div className="ledger-overview" aria-label="Danh sách 12 cung">
        {visible.map(row=><button type="button" key={row.branchIndex} className={`ledger-palace${row.branchIndex===selectedBranch?' active':''}`} aria-pressed={row.branchIndex===selectedBranch} onClick={()=>onSelect(row.branchIndex)}>
          <span className="ledger-palace-index">{String(row.branchIndex+1).padStart(2,'0')} <small>{row.stem} {row.branch}</small></span>
          <strong>{row.palace}{row.isThan && <em> · Thân</em>}</strong>
          <span className="ledger-palace-stars">{row.records.filter(r=>r.layer==='main').map(r=>r.star).join(' · ') || 'Vô chính diệu'}</span>
          <span className="ledger-palace-bottom"><span>{activeRecords(row).length} mục</span><span>ĐH {row.period}</span></span>
          {showAnnual && timeScope==='all' && row.markers.length>0 && <span className="ledger-markers">{row.markers.join(' · ')}</span>}
        </button>)}
        {visible.length===0 && <div className="ledger-empty">Không tìm thấy dữ liệu phù hợp. <button type="button" onClick={()=>{setQuery('');setActiveLayer('all');setTimeScope('all');}}>Xóa bộ lọc</button></div>}
      </div>
      <div className="ledger-compare-head"><div><span className="eyebrow">ĐỐI CHIẾU HAI CUNG</span><h4 className="serif">{current.palace} <span>↔</span> {target.palace}</h4></div><label>Chọn cung thứ hai <select value={compareTarget} onChange={e=>setCompareTarget(e.target.value as typeof compareTarget)}><option value="opposite">Đối cung (+6 chi)</option><option value="tam1">Tam hợp (+4 chi)</option><option value="tam2">Tam hợp (+8 chi)</option><option value="manual">Tự chọn</option></select></label>{compareTarget==='manual'&& <label>Cung muốn đối chiếu <select value={manualBranch} onChange={e=>setManualBranch(Number(e.target.value))}>{rows.map(row=><option key={row.branchIndex} value={row.branchIndex}>{row.palace} · {row.branch}</option>)}</select></label>}</div>
      <div className="ledger-difference" aria-label="Đối chiếu tên sao trong hai cung"><div><span>Xuất hiện ở cả hai cung</span><strong>{comparison.shared.length}</strong><p>{comparison.shared.join(' · ')||'Không có tên trùng trong các lớp đang chọn.'}</p></div><div><span>Chỉ xuất hiện ở {current.palace}</span><strong>{comparison.firstOnly.length}</strong><p>{comparison.firstOnly.join(' · ')||'—'}</p></div><div><span>Chỉ xuất hiện ở {target.palace}</span><strong>{comparison.secondOnly.length}</strong><p>{comparison.secondOnly.join(' · ')||'—'}</p></div></div>
      <div className="ledger-detail-pair"><article className="ledger-detail"><h5>{current.palace} <small>{current.stem} {current.branch}</small></h5><EvidenceList row={current} layers={layers}/></article><article className="ledger-detail"><h5>{target.palace} <small>{target.stem} {target.branch}</small></h5><EvidenceList row={target} layers={layers}/></article></div>
      {[current,target].some(row=>row.unmatchedTransformations.some(r=>layers.includes(r.layer))) && <div className="ledger-attention"><strong>Cần đối chiếu thêm:</strong> Một số Tứ Hóa trỏ tới sao chưa tìm thấy trong các lớp sao gốc của cung liên quan. Đây là giới hạn phạm vi dữ liệu, không tự điền vị trí còn thiếu.</div>}
      <footer className="ledger-foot">Các sao được phân nhóm theo cung và thời điểm. Tên sao trùng nhau không đồng nghĩa có tác động tương đồng. Năm {annual.year} được tính riêng, không ghi đè dữ liệu năm sinh. CSV chỉ xuất dữ liệu đang lọc, không đưa thông tin ngày giờ sinh.</footer>
    </div>}
  </section>;
}
