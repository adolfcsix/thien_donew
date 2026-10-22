'use client';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {ModeIntroduction, ExpertOnly} from '@/components/view-mode';
import Link from 'next/link';
import {useState} from 'react';
import {ELEMENTS,SHENG,KE,compareElements} from '@/features/wuxing/elements.cjs';
import styles from './ngu-hanh.module.css';

export default function NguHanhPage(){
 const [first,setFirst]=useState('wood');const [second,setSecond]=useState('fire');
 const relation=compareElements(first,second);
 return <div className={styles.page}><header className={styles.heading}><EasternScene variant="dich-hoc"/><div className="eyebrow">THIÊN ĐỒ · NỀN TẢNG NGŨ HÀNH</div><h1 className="serif">Ngũ hành: tương sinh, tương khắc.</h1><p>Một công cụ thực hành để hiểu năm hành và chiều tương tác giữa chúng trong hệ quy chiếu truyền thống, làm nền cho Tử Vi, Bát Tự và một số phương pháp phong thủy.</p><Link href="/huyen-hoc">← Trở về thư phòng huyền học</Link></header>
  <ModeIntroduction discipline="ngu-hanh" summary={relation.summary}/>
  <section className={styles.panel}><div><span className="eyebrow">01 / CÁC HÀNH</span><h2 className="serif">Năm hành, năm hình tượng</h2><div className={styles.elements}>{ELEMENTS.map(item=><div key={item.id} className={styles.element}><div style={{color:item.color}}>{item.symbol}</div><strong>{item.name}</strong><span>{item.theme}</span><small>{item.image}</small></div>)}</div></div>
    <div className={styles.cycles}><div><span className="eyebrow">VÒNG TƯƠNG SINH</span><p>Mộc → Hỏa → Thổ → Kim → Thủy → Mộc</p><small>Quan hệ sinh trợ theo chu kỳ; không đồng nghĩa một cặp hành luôn mang kết quả tốt.</small></div><div><span className="eyebrow">VÒNG TƯƠNG KHẮC</span><p>Mộc → Thổ → Thủy → Hỏa → Kim → Mộc</p><small>Quan hệ chế ước theo chu kỳ; không đồng nghĩa một cặp hành luôn mang kết quả xấu.</small></div></div></section>
  <section className={styles.panel}><div className="eyebrow">02 / TƯƠNG TÁC</div><h2 className="serif">Chọn hai hành để đối chiếu</h2><p>Thay đổi thứ tự hai hành và xem chiều quan hệ. Không gán năm sinh hoặc mệnh nạp âm khi chưa có phép tính tương ứng.</p><div className={styles.selector}><label>Hành thứ nhất<select value={first} onChange={e=>setFirst(e.target.value)}>{ELEMENTS.map(e=><option key={e.id} value={e.id}>{e.name} · {e.image}</option>)}</select></label><span>↔</span><label>Hành thứ hai<select value={second} onChange={e=>setSecond(e.target.value)}>{ELEMENTS.map(e=><option key={e.id} value={e.id}>{e.name} · {e.image}</option>)}</select></label></div>
   <div className={styles.result} aria-live="polite"><span className="eyebrow">QUAN HỆ TRONG NGŨ HÀNH</span><h3 className="serif">{relation.label}</h3><p>{relation.summary}</p><small>Lưu ý: quan hệ này là mô hình biểu tượng; cần bối cảnh tổng thể để luận giải theo từng trường phái.</small></div>
   <details className={styles.explain}><summary>Tại sao tương sinh và tương khắc không đồng nghĩa tốt/xấu?</summary><p>Ngũ hành là một hệ quy chiếu cổ điển về vận động và chế ước. Một hành có thể sinh hoặc khắc một hành khác, nhưng mức độ, mùa, vượng suy, vị trí và mục đích sử dụng mới tạo nên bối cảnh luận giải. Công cụ chỉ kiểm tra quan hệ trực tiếp; không tính Dụng thần, hành vượng theo tiết khí hay vận hạn.</p></details>
  </section>
  <ExpertOnly title="Ma trận tương tác Ngũ hành 5×5"><section className={styles.panel}><span className="eyebrow">03 / BẢNG QUY TẮC</span><h2 className="serif">Đối chiếu ngũ hành theo ma trận</h2><div className={styles.tableWrap}><table><caption>Chiều hàng tác động lên chiều cột; ký hiệu S = Sinh, K = Khắc, ← = nhận tác động; • = cùng hành</caption><thead><tr><th scope="col">Hành</th>{ELEMENTS.map(e=><th key={e.id} scope="col">{e.name}</th>)}</tr></thead><tbody>{ELEMENTS.map(a=><tr key={a.id}><th scope="row">{a.name}</th>{ELEMENTS.map(b=><td key={b.id} title={compareElements(a.id,b.id).label}>{a.id===b.id?'•':SHENG[a.id]===b.id?'S':KE[a.id]===b.id?'K':SHENG[b.id]===a.id?'← S':'← K'}</td>)}</tr>)}</tbody></table></div><p className={styles.footnote}>Ma trận được tính từ hai vòng tương sinh/tương khắc cố định. Các biến thể ứng dụng của Tử Vi và Bát Tự cần lớp thuật toán riêng.</p></section></ExpertOnly>
 </div>;
}
