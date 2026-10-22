'use client';
import {useState} from 'react';
import reference from '@thiendo/knowledge/src/method-comparison-profiles.json';

/** A read-only editorial comparison. Does not pass selections to astrology-engine. */
export default function MethodComparisonReference() {
  const [selected, setSelected] = useState(reference.profiles[0].id);
  const profile = reference.profiles.find(item => item.id === selected) ?? reference.profiles[0];
  const choices = profile.inputAxis === 'reference-year-branch' ? reference.branches : reference.stems;
  const [inputByProfile, setInputByProfile] = useState<Record<string,string>>({});
  const input = inputByProfile[profile.id] ?? choices[0];
  const lookup = profile.lookup as Record<string,string | undefined>;
  const result = lookup[input];
  return <section className="research-method-comparison" aria-label="Đối chiếu phương pháp an sao tham khảo">
    <p className="eyebrow">KHẢO CỨU · PHƯƠNG PHÁP VÀ DỊ BẢN</p>
    <h2 className="serif">Ba phương pháp cần phân biệt</h2>
    <p className="research-method-lead">Chọn phương pháp và đầu vào để xem bảng tra thử nghiệm. Các bảng không được gửi tới bộ lập lá số và chưa có thẩm định chuyên gia.</p>
    <div className="research-method-controls">
      <label>Hệ và tên sao
        <select value={profile.id} onChange={event => setSelected(event.target.value)}>
          {reference.profiles.map(item => <option value={item.id} key={item.id}>{item.name} · {item.system === 'bat-tu-tu-tru-reference' ? 'Bát Tự' : item.system === 'tue-tien-12-reference' ? 'Tuế Tiền' : 'Tử Vi'}</option>)}
        </select>
      </label>
      <label>{profile.inputLabel}
        <select value={input} onChange={event => setInputByProfile(previous => ({...previous,[profile.id]:event.target.value}))}>
          {choices.map(name => <option value={name} key={name}>{name}</option>)}
        </select>
      </label>
    </div>
    <div className="research-method-result" role="status">
      <div>Vị trí trong bảng khảo cứu</div><strong>{result ?? 'Chưa có bảng tra'}</strong>
      <span>Ứng với {profile.inputLabel.toLowerCase()}: {input}</span>
    </div>
    <p className="research-method-alert"><b>Cần lưu ý:</b> {profile.warning}</p>
    <p className="research-method-lead">{profile.sourceNotes}</p>
    <details className="research-method-deferred"><summary>Phương pháp chưa đủ bảng tra</summary>
      {reference.deferredMethods.map(item => <p key={item.id}><b>{item.name} — Tử Vi:</b> {item.reason}</p>)}
    </details>
    <p className="research-study-caution">Đây là dữ liệu biên tập để đối chiếu phương pháp, không phải kết quả lá số hoặc dự đoán. Thông tin xuất xứ và các bước duyệt được lưu trong tài liệu nội bộ, không làm rối giao diện người xem.</p>
  </section>;
}
