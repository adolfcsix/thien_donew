'use client';
import {downloadBlobFile} from '@/lib/download-blob';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import type {LedgerRow} from '../lib/twelve-palace-ledger';
import studyGuide from '@thiendo/knowledge/src/star-study-guide.json';
import {buildPalaceStudyWorksheet,exportStudyMarkdown,worksheetEvidence,type StudyMode} from '../lib/palace-study-workbench';

type Props={rows:readonly LedgerRow[];selectedBranch:number;showAnnual:boolean;year:number;onSelect:(branch:number)=>void};
type Tab='context'|'stars'|'evidence';

const roleName:Record<string,string>={'focus':'Cung đang xét','tam-hop-1':'Tam hợp I','tam-hop-2':'Tam hợp II','opposite':'Đối cung'};

export function PalaceStudyWorkbench({rows,selectedBranch,showAnnual,year,onSelect}:Props){
  const [expanded,setExpanded]=useState(false);
  const [tab,setTab]=useState<Tab>('context');
  const [mode,setMode]=useState<StudyMode>('relations');
  const [notes,setNotes]=useState<Record<number,string>>({});
  const [starFilter,setStarFilter]=useState('');
  const [message,setMessage]=useState('');
  const worksheet=useMemo(()=>buildPalaceStudyWorksheet(rows,selectedBranch,studyGuide,showAnnual,mode),[rows,selectedBranch,showAnnual,mode]);
  const evidence=useMemo(()=>worksheetEvidence(worksheet,mode,showAnnual),[worksheet,mode,showAnnual]);
  const filteredCards=useMemo(()=>worksheet.cards.filter(card=>!starFilter||card.role===starFilter),[worksheet.cards,starFilter]);
  const note=notes[selectedBranch]??'';

  function exportNotes(){
    const content=exportStudyMarkdown(worksheet,mode,note,showAnnual,year,{includeTechnical:false});
    const file=new Blob([content],{type:'text/markdown;charset=utf-8'});
    downloadBlobFile(file,`thien-do-so-tay-cung-${selectedBranch}-${showAnnual?year:'nam-sinh'}.md`);
    setMessage(`Đã tạo sổ tay cung ${worksheet.focus.palace}. Không gửi nội dung lên máy chủ.`);
  }

  return <section className="palace-study-workbench" aria-label="Sổ tay giải thích cung có dẫn chứng">
    <div className="study-cover">
      <div className="study-cover-copy"><span className="eyebrow">QUYỂN II.B · PHÒNG ĐỌC CUNG SAO</span>
        <h3 className="serif">Luận cứ &amp; Ngữ cảnh <small>宮星研讀</small></h3>
        <p>Đọc <strong>cung {worksheet.focus.palace}</strong> qua dữ liệu engine, hình tượng 14 chính tinh và quan hệ Tam phương Tứ chính. Các lời dẫn là <em>câu hỏi học tập</em>, không phải dự đoán số mệnh.</p>
      </div>
      <button type="button" className="study-open" aria-expanded={expanded} aria-controls="thiendo-study-content" onClick={()=>setExpanded(previous=>!previous)}>{expanded?'− Đóng phòng đọc':'＋ Mở phòng đọc chuyên sâu'}</button>
    </div>
    {expanded&&<div id="thiendo-study-content" className="study-body">
      <div className="study-topline"><span>ĐANG NGHIÊN CỨU <strong>{worksheet.focus.palace} · {worksheet.focus.branch}</strong></span><span>Hướng dẫn <strong>Đọc có bối cảnh</strong></span><span>PHẠM VI <strong>{showAnnual?`Năm sinh + ${year}`:'Chỉ năm sinh'}</strong></span></div>
      <div className="study-workspace">
        <div className="study-network" aria-label="Sơ đồ liên hệ bốn cung">
          <div className="study-network-heading"><span className="eyebrow">TAM PHƯƠNG TỨ CHÍNH</span><h4 className="serif">Bốn vị trí cần đối chiếu</h4><p>Nhấn vào cung để đồng bộ với địa bàn. Liên hệ hiển thị theo địa chi, không phải đánh giá tốt/xấu.</p></div>
          <div className="study-network-grid">
            {worksheet.perspectives.map(p=><button key={p.role} type="button" className={'study-node study-node-'+p.role} onClick={()=>{onSelect(p.branchIndex);setMessage('');}} aria-pressed={p.branchIndex===selectedBranch} aria-label={`Chọn ${p.palace}, ${roleName[p.role]}, ${p.stars.length} chính tinh`}>
              <span>{roleName[p.role]}</span><strong>{p.palace}</strong><small>{p.branch} · {p.stars.length} chính tinh</small>
              <em>{p.stars.map(s=>s.star).join(' · ')||'Vô chính diệu'}</em>
            </button>)}
          </div>
          <p className="study-relation-note">Quy tắc địa chi: cung gốc +4 / +8 là Tam hợp; +6 là Đối cung. Các cung liên hệ chỉ đóng vai trò ngữ cảnh để kiểm tra.</p>
          <fieldset className="study-mode"><legend>Phạm vi tra cứu</legend><button type="button" aria-pressed={mode==='focus'} className={mode==='focus'?'active':''} onClick={()=>{setMode('focus');setStarFilter('');}}>Một cung</button><button type="button" aria-pressed={mode==='relations'} className={mode==='relations'?'active':''} onClick={()=>setMode('relations')}>Cả bốn cung</button></fieldset>
        </div>
        <div className="study-main">
          <div className="study-tabs" role="group" aria-label="Nội dung phòng nghiên cứu"><button className={tab==='context'?'active':''} aria-pressed={tab==='context'} type="button" onClick={()=>setTab('context')}>01 · Ngữ cảnh</button><button className={tab==='stars'?'active':''} aria-pressed={tab==='stars'} type="button" onClick={()=>setTab('stars')}>02 · Hình tượng sao</button><button className={tab==='evidence'?'active':''} aria-pressed={tab==='evidence'} type="button" onClick={()=>setTab('evidence')}>03 · Dữ liệu đối chiếu</button></div>
          {tab==='context'&&<div className="study-topic" aria-label="Khung học tập cung đang chọn">
            <span className="eyebrow">HỒ SƠ CHỦ ĐỀ · {worksheet.focus.palace.toUpperCase()}</span>
            <h4 className="serif">Mở đầu từ chủ đề, không từ kết luận</h4>
            <div className="study-topic-grid"><article><span>01 / CHỦ ĐỀ TRUYỀN THỐNG</span><p>{worksheet.topic?.scope??'Chưa có dữ liệu biên soạn cho cung này.'}</p></article><article><span>02 / CÂU HỎI HỌC TẬP</span><p>{worksheet.topic?.question??'Cần bổ sung chủ đề biên soạn.'}</p></article><article><span>03 / ĐỐI CHIẾU TRƯỚC KHI VIẾT</span><p>{worksheet.topic?.crossCheck??'Kiểm tra các nguồn dữ liệu liên quan.'}</p></article><article className="study-caution"><span>04 / KHÔNG THỂ SUY RA</span><p>{worksheet.topic?.caution??'Không đủ dữ liệu để nhận định.'}</p></article></div>
            <p className="study-source-line"><Link href={`/star-atlas?palace=${encodeURIComponent(worksheet.focus.palace)}`}>Đọc hướng dẫn 14 chính tinh ↗</Link></p>
          </div>}
          {tab==='stars'&&<div className="study-stars" aria-label="Các thẻ nghiên cứu chính tinh">
            <div className="study-section-head"><div><span className="eyebrow">DỮ LIỆU SAO × BỘ KIẾN THỨC</span><h4 className="serif">{worksheet.cards.length} thẻ hình tượng</h4></div><label>Lọc theo vị trí <select value={starFilter} onChange={e=>setStarFilter(e.target.value)}><option value="">Tất cả vị trí</option>{worksheet.perspectives.filter(p=>mode==='relations'||p.role==='focus').map(p=><option key={p.role} value={p.role}>{p.palace} · {roleName[p.role]}</option>)}</select></label></div>
            {filteredCards.length>0?<div className="study-star-grid">{filteredCards.map(card=><article key={`${card.role}:${card.evidencePath}`} className="study-star-card"><span>{roleName[card.role]} · {card.palace} ({card.branch})</span><h5>{card.star}</h5><strong>{card.motif}</strong><p>{card.study}</p><details><summary>Đối chiếu &amp; giới hạn</summary><p>{card.crossCheck}</p><p className="study-star-caution">{card.caution}</p></details><Link href={`/star-atlas?star=${encodeURIComponent(card.star)}&branch=${card.branchIndex}&palace=${encodeURIComponent(card.palace)}`}>Tra sao trong thư viện ↗</Link></article>)}</div>:<p className="study-blank">Không có chính tinh để hiển thị ở phạm vi này. Không tự bịa thêm sao cho cung vô chính diệu.</p>}
            {worksheet.uncovered.length>0&&<div className="study-warning">{worksheet.uncovered.length} tên sao chưa có thẻ biên soạn; phần mềm giữ nguyên tên sao, không tự tạo lời giải thích thay thế.</div>}
          </div>}
          {tab==='evidence'&&<div className="study-evidence" aria-label="Danh sách sao đối chiếu"><div className="study-section-head"><div><span className="eyebrow">ĐỐI CHIẾU SAO</span><h4 className="serif">{evidence.length} mục đã an</h4></div></div><p>Các sao được nhóm theo cung và lớp thời gian. Tứ Hóa năm sinh và Tứ Hóa năm xem được phân biệt để dễ theo dõi.</p><div className="study-evidence-table" role="region" aria-label="Bảng sao theo cung và lớp" tabIndex={0}><table><thead><tr><th>Cung</th><th>Loại</th><th>Sao / biến hóa</th></tr></thead><tbody>{evidence.map((item,index)=><tr key={`${item.path}:${index}`}><td>{item.palace}</td><td>{item.layer}</td><td>{item.label}</td></tr>)}</tbody></table>{evidence.length===0&&<p>Không có mục nào trong phạm vi chọn.</p>}</div></div>}
        </div>
      </div>
      <div className="study-notebook"><div><span className="eyebrow">TRANG GHI CHÚ · LƯU CỤC BỘ TRONG PHIÊN</span><h4 className="serif">Sổ tay cung {worksheet.focus.palace}</h4><p>Ghi giả thuyết, câu hỏi và những điểm cần kiểm chứng. Mỗi cung có ghi chú riêng trong phiên mở trang; không tự gửi lên máy chủ hay tự lưu vĩnh viễn.</p></div><label htmlFor="thiendo-study-note">Ghi chú nghiên cứu của bạn</label><textarea id="thiendo-study-note" rows={4} maxLength={4000} value={note} placeholder="Ví dụ: Cần đối chiếu Tứ Hóa năm sinh với sao đồng cung…" onChange={e=>{setNotes(old=>({...old,[selectedBranch]:e.target.value}));setMessage('');}}/><div className="study-notebook-bottom"><small>{note.length}/4000 ký tự · Chỉ ghi nội dung mà bạn muốn xuất trong tài liệu.</small><button type="button" onClick={exportNotes}>↓ Tải sổ tay Markdown</button></div><div role="status" aria-live="polite" className="study-status">{message}</div></div>
      <footer className="study-footer"><strong>Giới hạn:</strong> {studyGuide.disclaimer} Phần này chỉ hướng dẫn đối chiếu các vị trí sao đã an; không dự báo sự kiện cá nhân. Chức năng này chỉ hoạt động trong chế độ Chuyên sâu.</footer>
    </div>}
  </section>;
}
