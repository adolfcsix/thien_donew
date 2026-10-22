import type {PrimaryPalaceContext} from '@thiendo/interpretation';

type Props={records:PrimaryPalaceContext[]};

/** Clearly separated editorial guidance vs. actual chart observations. */
export function PrimaryContextPanel({records}:Props){
  return <article className="palace-reading-editorial palace-reading-primary-context" aria-label="Luận giải chính tinh theo cung">
    <h4>Chính tinh × Cung · Phân tích theo dữ liệu</h4>
    <p className="palace-reading-scope">Luận giải được đối chiếu với vị trí sao thực tế. Đây là góc đọc văn hóa chưa thẩm định chuyên gia; không phải dự báo.</p>
    {records.length===0 ? <p>Cung này chưa có chính tinh được hỗ trợ trong kho luận giải 14 chính tinh × 12 cung. Không tự suy đoán từ sao vắng mặt.</p> :
      records.map(record=><details className="palace-reading-symbol" key={`${record.star}-${record.palace}`}>
        <summary><strong>{record.star} tại {record.palace}</strong><span>{record.evidence.strength.label}</span></summary>
        <p><strong>Chủ đề:</strong> {record.focus}</p>
        <p><strong>Góc nhìn phát triển:</strong> {record.potential}</p>
        <p><strong>Điểm cần cân nhắc:</strong> {record.tradeoff}</p>
        <p><strong>Câu hỏi tự đối chiếu:</strong> {record.reflection}</p>
        <div className="palace-reading-review">
          <strong>Dấu hiệu thực sự hiện diện trong lá số</strong>
          <ul>
            <li>Trạng thái tại {record.branch}: {record.evidence.strength.label} (theo dữ liệu engine, chưa đối chiếu chuyên gia)</li>
            <li>Chính tinh đồng cung: {record.evidence.samePalaceMainStars.join(' · ')||'Không có'}</li>
            <li>Sao bổ trợ tại cung: {record.evidence.samePalaceSupportingStars.join(' · ')||'Không ghi nhận'}</li>
            <li>Tứ Hóa năm sinh gắn vào {record.star}: {record.evidence.natalTransformations.join(' · ')||'Không có'}</li>
            <li>Tuần / Triệt: {record.evidence.obstructionMarkers.join(' · ')||'Không có'}</li>
            {record.evidence.tamHop.map(h=><li key={h.branchIndex}>Tam hợp · {h.palace} ({h.branch}): {h.mainStars.join(' · ')||'Vô chính diệu'}</li>)}
            <li>Đối cung · {record.evidence.opposite.palace} ({record.evidence.opposite.branch}): {record.evidence.opposite.mainStars.join(' · ')||'Vô chính diệu'}</li>
          </ul>
        </div>
        <small>Chỉ nêu các dấu hiệu có dữ liệu. Không tự hình thành cách cục hoặc kết luận tốt/xấu từ số lượng sao.</small>
      </details>)}
  </article>;
}
