'use client';
import {useState} from 'react';
import study from '@thiendo/knowledge/src/tuong-tien-study-table.json';

/** Read-only editorial reference: not the live Tử Vi placement engine. */
export default function TuongTienReference() {
 const [index, setIndex] = useState(0);
 const row = study.rows[index];
 return <section className="research-study-circle" aria-label="Bảng khảo cứu Tướng Tiền">
  <div className="research-study-circle-heading">
   <div><p className="eyebrow">KHẢO CỨU · TƯỚNG TIỀN THẬP NHỊ THẦN</p>
    <h2 className="serif">Bảng vị trí tham khảo theo 12 địa chi</h2>
    <p>Chọn chi năm để xem cách khởi Tướng Tinh theo nhóm tam hợp, sau đó thuận hành 12 thần. Đây là bảng học thuật độc lập, <strong>không tự thêm sao vào lá số</strong>.</p>
   </div>
   <label>Chi năm tham khảo
    <select value={index} onChange={event => setIndex(Number(event.target.value))}>
      {study.branches.map((name, i) => <option key={name} value={i}>{name}</option>)}
    </select>
   </label>
  </div>
  <p className="research-study-start">Nhóm tam hợp: khởi Tướng Tinh tại <b>{row.groupStart}</b>. Chọn chi khác để so sánh vị trí.</p>
  <div className="research-study-table-scroll"><table className="research-study-table">
   <caption>Danh sách 12 thần và vị trí tham khảo, không phải bảng luận đoán vận mệnh.</caption>
   <thead><tr><th scope="col">Thứ tự</th><th scope="col">Tên thần</th><th scope="col">Tại chi</th><th scope="col">Đối chiếu engine</th></tr></thead>
   <tbody>{row.placements.map((item, i)=><tr key={item.name}>
    <td>{String(i+1).padStart(2,'0')}</td><th scope="row">{item.name}</th><td>{item.branch}</td>
    <td>{study.overlapEngineNames.includes(item.name) ? 'Đã đối chiếu vị trí 12 chi; chưa thẩm định chuyên gia' : 'Chưa đưa vào engine'}</td>
   </tr>)}</tbody>
  </table></div>
  <p className="research-study-caution">Bảng mô tả một quy ước được nhiều tài liệu đề cập; từng trường phái có thể sử dụng khác nhau ở nguyên bàn và lưu hạn. Không dùng bảng này làm khẳng định dự báo.</p>
 </section>;
}
