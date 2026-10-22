'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import review from '@thiendo/knowledge/src/school-review-registry.json';
import protocols from '@thiendo/knowledge/src/school-validation-protocols.json';
import './schools.css';
/** Read-only editorial research. No engine imports, no automatic approval. */
export default function SchoolReviewPage(){
 const [schoolId,setSchoolId]=useState('all');
 const [search,setSearch]=useState('');
 const items=useMemo(()=>review.records.filter(item=>(schoolId==='all'||item.schoolId===schoolId) &&
  `${item.title} ${item.question} ${item.limitation}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN'))),[schoolId,search]);
 const labelById=new Map(review.schools.map(s=>[s.id,s.name]));
 const protocolById=new Map(protocols.protocols.map(p=>[p.ruleId,p]));
 return <div className="school-review-shell">
  <header className="page-heading"><div className="eyebrow">THIÊN ĐỒ · HỒ SƠ PHƯƠNG PHÁP</div><h1 className="serif">Kiểm chứng quy tắc & trường phái</h1>
  <p>Tra cứu cách tiếp cận và dị bản theo phương pháp. Chưa có hai nguồn độc lập và đủ ca đối chứng để xác nhận các quy tắc đang nghiên cứu.</p></header>
  
  <section className="school-review-overview" aria-label="Các nhóm phương pháp">
  {review.schools.map(s=><article key={s.id} className="school-review-method"><h2>{s.name}</h2><p>{s.scope}</p><p><strong>Lưu ý:</strong> {s.caution}</p></article>)}
  </section>
  <div className="school-review-controls">
   <label>Nhóm phương pháp<select value={schoolId} onChange={e=>setSchoolId(e.target.value)}><option value="all">Tất cả các nhóm</option>{review.schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Tìm hồ sơ<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tứ Hóa, Hồng Diễm, Tả Hữu…"/></label>
  </div>
  <p className="school-review-count" role="status">Hiển thị <strong>{items.length}</strong> / {review.records.length} hồ sơ.</p>
  <section className="school-review-list" aria-label="Hồ sơ quy tắc cần thẩm định">
  {items.map(item=><article className="school-review-card" key={item.id}>
   <div className="school-review-meta"><span>{labelById.get(item.schoolId)}</span><span>Đang nghiên cứu</span></div>
   <h2 className="serif">{item.title}</h2><p>{item.question}</p><p><b>Điều cần tránh:</b> {item.limitation}</p>
   <details><summary>Xem điều kiện trước khi duyệt quy tắc</summary>
    <ol><li>Thu thập ít nhất hai mục thư mục học có tác giả, ấn bản và vị trí trích dẫn chính xác.</li>
     <li>Chuẩn bị ít nhất hai ca so sánh độc lập có đầu vào, kết quả và xuất xứ rõ ràng.</li>
     <li>Đối chiếu và ghi nhận cách xử lý những dị bản.</li>
     <li>Có người thẩm định ký duyệt theo phiên bản dữ liệu cụ thể.</li></ol>

   </details>
   {protocolById.get(item.id) && <details className="school-review-protocol">
    <summary>Phép thử và cách nhận biết quy tắc sai</summary>
    {(()=>{const plan=protocolById.get(item.id)!;return <div className="school-review-protocol-body">
      <p><strong>Dữ liệu đầu vào cần xác định:</strong> {plan.inputDimensions.join(' · ')}</p>
      <section><h3>Phép thử kiểm chứng</h3><p>{plan.positiveControl.procedure}</p></section>
      <section><h3>Phép thử phản chứng</h3><p>{plan.negativeControl.procedure}</p></section>
      <section><h3>Điểm dễ nhầm</h3><p>{plan.prohibitedShortcut}</p></section>
      <section><h3>Cần đối chiếu từ tài liệu</h3><p>{plan.sourceComparisonPrompt}</p></section>
      <p><strong>Giới hạn:</strong> {plan.interpretationLimit}</p>

    </div>})()}
   </details>}
  </article>)}
  {items.length===0&&<p>Không có hồ sơ phù hợp. Vui lòng thay đổi bộ lọc.</p>}
  </section>
  <nav className="research-next" aria-label="Tài liệu liên quan"><Link href="/research" className="btn secondary">Bách khoa huyền học</Link><Link href="/research/examples" className="btn gold">Xem ví dụ thực hành ↗</Link></nav>
 </div>;
}
