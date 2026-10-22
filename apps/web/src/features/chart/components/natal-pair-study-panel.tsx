import type {NatalPairStudy} from '@thiendo/interpretation';

const statusLabel:Record<string,string>={ambiguous:'Dữ liệu trùng cung', 'outside-scope':'Chưa thuộc quan hệ đang xét', 'not-observed':'Chưa đủ vị trí gốc'};
/** The UI renders positional evidence only: no star placement, no score, no prediction. */
export function NatalPairStudyPanel({study}:{study:NatalPairStudy}){
  const observations=study.records.filter(item=>item.status==='matched'||item.status==='ambiguous');
  return <article className="palace-reading-editorial palace-reading-pair-study" aria-label="Đối chiếu cặp sao bản mệnh">
    <h4>Đối chiếu cặp cát tinh và sát tinh</h4>
    <p className="palace-reading-scope">Khảo sát {study.assessed} cặp sao theo Đồng cung, Tam hợp, Đối cung và Giáp cung. Chỉ dùng vị trí sao gốc, không tính sao lưu năm xem.</p>
    <p><strong>Ghi nhận:</strong> {study.matched} cặp có quan hệ đang xét{study.ambiguous>0?`; ${study.ambiguous} cặp có vị trí mâu thuẫn`:''}.</p>
    {observations.length ? observations.map(item=><details className="palace-reading-symbol" key={item.id}>
      <summary><strong>{item.title}</strong><span>{item.relationLabel??statusLabel[item.status]}</span></summary>
      <p><strong>Nhóm:</strong> {item.category}. {item.question}</p>
      <ul className="palace-reading-evidence">{item.placements.map(place=><li key={place.star}>
        <strong>{place.star}</strong>{place.status==='observed'
          ? ` — ${place.palace} (${place.branch}); lớp ${place.layers?.join(', ')}`
          : place.status==='ambiguous' ? ` — Trùng ở ${place.branches.length} cung; chưa sử dụng để luận giải` : ' — Chưa ghi nhận trên lá số gốc'}
      </li>)}</ul>
      <p>{item.nextStep}</p>
    </details>) : <p>Chưa có cặp sao nào khớp đúng bốn quan hệ được khảo sát tại cung này. Không có nghĩa là không tồn tại các tổ hợp khác.</p>}
    <small>{study.notice}</small>
  </article>;
}
