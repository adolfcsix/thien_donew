import type {AnnualEvidence} from '@thiendo/interpretation';

const cause:Record<string,string>={
  'invalid-annual-placement':'Vị trí sao lưu không hợp lệ hoặc tên cung không khớp',
  'conflicting-annual-branches':'Một sao lưu xuất hiện tại nhiều cung',
  'invalid-transformation':'Bản ghi Lưu Tứ Hóa thiếu dữ liệu hợp lệ',
  'conflicting-transformation-target':'Một Hóa lưu có nhiều sao đích mâu thuẫn',
  'unverified-natal-target':'Sao đích không khớp vị trí duy nhất trong lá số gốc',
};
/** Read-only evidence; this panel never computes or places astrological stars. */
export function AnnualEvidencePanel({data}:{data:AnnualEvidence|null}){
  if(!data)return null;
  const inScope=data.stars.filter(s=>s.inFourCourts);
  const hoa=data.transformations.filter(s=>s.inFourCourts);
  const marks=data.markers.filter(s=>s.inFourCourts);
  return <article className="palace-reading-editorial" aria-label={`Kiểm toán dữ liệu lưu niên ${data.year}`}>
    <h4>Đối chiếu lớp lưu niên {data.year}</h4>
    <p className="palace-reading-scope">Sao gốc và sao lưu được kiểm tra ở hai lớp riêng. Chỉ các bản ghi đúng vị trí và không mâu thuẫn mới xuất hiện trong danh sách dưới đây.</p>
    <p><strong>Trong Tứ chính đang xem:</strong> {inScope.length} sao lưu, {hoa.length} Lưu Tứ Hóa, {marks.length} dấu hạn được xác định theo bản ghi năm xem.</p>
    {inScope.length>0&&<details className="palace-reading-symbol"><summary><strong>Sao lưu hợp lệ về cấu trúc</strong><span>{inScope.length} mục</span></summary><ul className="palace-reading-evidence">{inScope.map(s=><li key={`${s.name}-${s.branchIndex}`}>{s.name} · {s.palace} — {s.relation}</li>)}</ul></details>}
    {hoa.length>0&&<details className="palace-reading-symbol"><summary><strong>Lưu Tứ Hóa có sao đích đối chiếu được</strong><span>{hoa.length} mục</span></summary><ul className="palace-reading-evidence">{hoa.map(h=><li key={`${h.name}-${h.branchIndex}`}>{h.name} ({h.target}) · {h.palace} — {h.relation}</li>)}</ul></details>}
    {marks.length>0&&<p><strong>Các dấu hạn:</strong> {marks.map(m=>`${m.name} tại ${m.palace}`).join(' · ')}</p>}
    {(data.rejectedStars.length+data.rejectedTransformations.length)>0&&<details className="palace-reading-symbol"><summary><strong>Dữ liệu cần kiểm tra lại</strong><span>{data.rejectedStars.length+data.rejectedTransformations.length} mục không được sử dụng</span></summary><ul className="palace-reading-evidence">{[...data.rejectedStars,...data.rejectedTransformations].map((x,i)=><li key={`${x.name}-${x.reason}-${i}`}>{x.name??'Bản ghi không rõ tên'} — {cause[x.reason]??'Chưa đủ căn cứ dữ liệu'}</li>)}</ul></details>}
    <small>{data.methodology}. Chưa thẩm định chuyên gia, không phải kết luận vận mệnh.</small>
  </article>;
}
