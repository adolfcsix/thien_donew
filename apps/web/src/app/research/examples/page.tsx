'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import casebook from '@thiendo/knowledge/src/worked-examples.json';
import './examples.css';
const statusLabel:Record<string,string>={observed:'Đủ điều kiện vị trí',partial:'Mới có một phần', 'no-data':'Chưa có bằng chứng', 'needs-review':'Cần kiểm tra lại'};
const families:Record<string,string>={relational:'Quan hệ giữa các cung',conditional:'Phối hợp cùng cung'};
/** Study cases generated from immutable fixtures, not live prediction or placement rules. */
export default function WorkedExamplesPage(){
 const [palace,setPalace]=useState('all');
 const [family,setFamily]=useState('all');
 const [status,setStatus]=useState('all');
 const data=useMemo(()=>casebook.cases.filter(item=>(palace==='all'||item.palace===palace)&&
  (family==='all'||item.family===family)&&(status==='all'||item.status===status)),[palace,family,status]);
 return <div className="worked-shell">
  <header className="page-heading"><div className="eyebrow">THIÊN ĐỒ · THỰC HÀNH CÓ THỂ KIỂM CHỨNG</div>
   <h1 className="serif">12 ca đối chiếu lá số</h1>
   <p>Ví dụ lấy từ bộ dữ liệu thử nghiệm cố định, gắn với từng cung. Mỗi ca có câu hỏi, điều kiện phải kiểm tra, sao làm bằng chứng và bước thực hành. Các ca được chạy lại tự động sau khi code thay đổi.</p>
  </header>
  <div className="worked-context" role="note"><strong>Phạm vi:</strong> {casebook.notice} Dữ liệu bên dưới là quan sát từ thuật toán của dự án, không phải sự công nhận của chuyên gia hoặc bằng chứng dự báo. Hệ thống không gán các ví dụ này cho một trường phái được chứng nhận.</div>
  <div className="worked-filter" aria-label="Bộ lọc ca nghiên cứu">
   <label>Cung<select value={palace} onChange={e=>setPalace(e.target.value)}><option value="all">Cả 12 cung</option>{casebook.cases.map(c=><option value={c.palace} key={c.id}>{c.palace}</option>)}</select></label>
   <label>Quan hệ<select value={family} onChange={e=>setFamily(e.target.value)}><option value="all">Tất cả quan hệ</option>{Object.entries(families).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
   <label>Kết quả đối chiếu<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabel).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
  </div>
  <p role="status" className="worked-count">Hiển thị <strong>{data.length}</strong> trong tổng số {casebook.cases.length} ca nghiên cứu.</p>
  <section className="worked-list" aria-label="Các ví dụ đã được tái lập">
  {data.map((c,index)=><article className="worked-card" key={c.id}>
   <div className="worked-card-header"><span>{String(index+1).padStart(2,'0')} · {families[c.family]}</span><span className="worked-state">{statusLabel[c.status]}</span></div>
   <h2 className="serif">{c.palace}: {c.title}</h2>
   <p className="worked-question">{c.question}</p>
   <dl className="worked-fixture"><div><dt>Lá số thử nghiệm</dt><dd>{c.input.date} ({c.input.calendar==='solar'?'dương lịch':'âm lịch'}) · {c.input.gender} · {String(c.input.hour).padStart(2,'0')}:{String(c.input.minute).padStart(2,'0')}</dd></div><div><dt>Cung đối chiếu</dt><dd>{c.palace} ({c.branch})</dd></div><div><dt>Nhóm quy tắc</dt><dd>{c.recordId}</dd></div></dl>
   <details className="worked-answer"><summary>Xem lời giải có kiểm tra từng điều kiện</summary>
    <div className="worked-answer-body">
     <h3>Điều kiện có thể kiểm tra</h3>
     <ul className="worked-checks">{c.checks.map((check,i)=><li key={i}><span aria-label={check.met?'Đạt':'Chưa đạt'}>{check.met?'✓':'–'}</span>{check.label}</li>)}</ul>
     <h3>Bằng chứng từ lá số</h3>
     {c.evidence.length ? <ul className="worked-evidence">{c.evidence.map((item,i)=><li key={`${item.star}-${i}`}><b>{item.transformation?`${item.transformation} → ${item.star}`:item.star}</b> · {item.palace} ({item.branch??'chưa xác định'}){item.relation?` · ${item.relation}`:''}{item.strength?` · Độ sáng ${item.strength}`:''}{item.scope==='annual'?' · Lưu niên':' · Bản mệnh'}</li>)}</ul>:<p>Chưa quan sát được sao đủ điều kiện trong nhóm này.</p>}
     {c.matchedPairs.length>0&&<p><b>Cặp sao đủ điều kiện:</b> {c.matchedPairs.map(pair=>pair.join(' – ')).join('; ')}</p>}
     {c.missing.length>0&&<div className="worked-gaps"><b>Chưa đủ / cần đối chiếu</b><ul>{c.missing.map((gap,i)=><li key={i}>{gap}</li>)}</ul></div>}
     <h3>Thử tự kiểm chứng</h3><p>{c.exercise}</p>
     <p className="worked-boundary">Trạng thái chỉ đánh giá bằng chứng cấu trúc. Không được suy ra mức độ may rủi, sự kiện tương lai hoặc “thành cách”.</p>
    </div>
   </details>
  </article>)}
  {data.length===0&&<p className="worked-empty">Không có trường hợp phù hợp với bộ lọc hiện tại. Hãy chọn lại nhóm khác.</p>}
  </section>
  <nav className="research-next" aria-label="Đi đến tài liệu liên quan"><Link className="btn secondary" href="/research">Bách khoa huyền học</Link><Link className="btn secondary" href="/research/schools">Hồ sơ phương pháp</Link><Link className="btn gold" href="/chart">Mở lá số để thực hành ↗</Link></nav>
 </div>;
}
