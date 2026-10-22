import type {TwelvePalaceStudy} from '@thiendo/interpretation';
/** Editorial reading grounded in checked natal/annual positions. */
export function TwelvePalaceStudyPanel({study}:{study:TwelvePalaceStudy}){
  if(study.status!=='research-only'||!study.steps)return null;
  return <article className="palace-reading-editorial" aria-label={`Chuyên đề nghiên cứu cung ${study.palace}`}>
    <h4>Chuyên đề {study.palace}: {study.focus}</h4>
    <p className="palace-reading-scope">Ba bước đọc riêng của cung đang chọn, dựa trên sao tọa cung, đối cung và lớp lưu niên đã kiểm tra.</p>
    {study.steps.map(step=><details className="palace-reading-symbol" key={step.scope}>
      <summary><strong>{step.scope}</strong><span>Xem bằng chứng và câu hỏi</span></summary>
      <p><strong>Dữ liệu:</strong> {step.evidence}</p><p><strong>Cần đối chiếu:</strong> {step.question}</p>
    </details>)}
    {study.deepDives?.length ? <section className="palace-reading-evidence-lenses" aria-label="Chuyên khảo theo cung">
      <h4>Đọc sâu theo từng chủ đề</h4>
      <p className="palace-reading-scope">Các chủ đề được biên soạn riêng cho cung này và nối với chính tinh, Tứ Hóa thực tế ở những cung cần đối chiếu. Liên kết chủ đề không có nghĩa hai cung tam hợp hay đối cung.</p>
      {study.deepDives.map(item=><details key={item.id} className="palace-reading-symbol">
        <summary><strong>{item.title}</strong><span>Phương pháp · Dữ liệu · Phản chứng</span></summary>
        <p>{item.discussion}</p><p><strong>Câu hỏi kiểm tra:</strong> {item.question}</p>
        <ul className="palace-reading-evidence">{item.related.map(place=><li key={place.palace}>
          <strong>{place.palace}</strong>{place.branch?` (${place.branch})`:''} · {place.unavailable?'Không có cung hợp lệ trong dữ liệu':place.stars.length?place.stars.join(' · '):'Vô chính diệu'}
          {place.transformations.length?` · ${place.transformations.join(' · ')}`:''}
        </li>)}</ul>
      </details>)}
    </section>:null}
    {study.evidenceLenses?.status==='research-only'&&<div className="palace-reading-evidence-lenses" aria-label="Bốn hướng đối chiếu sao bản mệnh">
      <h4>Đối chiếu theo bằng chứng bản mệnh</h4>
      <p className="palace-reading-scope">Chỉ dùng sao năm sinh. Những bản ghi sai lệch được tách riêng, không dùng để luận đoán.</p>
      {study.evidenceLenses.lenses.map(lens=><details key={lens.id} className="palace-reading-symbol">
        <summary><strong>{lens.title}</strong><span>{lens.status==='needs-review'?'Cần kiểm tra dữ liệu':lens.status==='no-data'?'Chưa có dữ liệu thuộc nhóm':`${lens.observedCount} sao / ghi nhận`}</span></summary>
        <p><strong>Câu hỏi riêng của cung:</strong> {lens.question}</p>
        {lens.observed.length>0&&<ul className="palace-reading-evidence">{lens.observed.map((item,i)=><li key={`${item.star}-${i}`}>
          <strong>{item.transformation?`${item.transformation} → ${item.star}`:item.star}</strong> · {item.palace} ({item.branch}){item.strength?` · Độ sáng ${item.strength}`:''}
        </li>)}</ul>}
        {lens.status==='no-data'&&<p>Chưa quan sát được sao thuộc nhóm đang xét tại cung này; không có nghĩa cung không có ý nghĩa khác.</p>}
        {lens.problems.length>0&&<div className="palace-reading-review"><strong>Cần đối chiếu lại</strong><ul>{lens.problems.map((item,i)=><li key={`${item.star}-${i}`}>
          {item.star} · {item.strengthStatus==='unverified'?'Độ sáng chưa được xác minh':item.status==='ambiguous'?'Sao trùng tại nhiều cung':'Bản ghi chưa đủ điều kiện'}
        </li>)}</ul></div>}
      </details>)}
    </div>}
    {study.conditionalSynthesis?.status==='research-only'&&<section aria-label="Luận giải phối hợp có điều kiện" className="palace-reading-evidence-lenses">
      <h4>Đối chiếu phối hợp có điều kiện</h4>
      <p className="palace-reading-scope">Đây là những câu hỏi nghiên cứu, không phải kết luận tốt/xấu hoặc chứng nhận cách cục. Sao năm xem và sao bản mệnh luôn được ghi riêng.</p>
      {study.conditionalSynthesis.records.map(record=><details className="palace-reading-symbol" key={record.id}>
        <summary><strong>{record.title}</strong><span>{record.status==='observed'?'Có đủ chứng cứ vị trí':record.status==='needs-review'?'Cần kiểm tra dữ liệu':record.status==='partial'?'Thiếu điều kiện':'Chưa có dữ liệu'}</span></summary>
        <p><strong>Vấn đề nghiên cứu:</strong> {record.question}</p>
        {record.evidence.length>0&&<ul className="palace-reading-evidence">{record.evidence.map((item,i)=><li key={`${record.id}-${item.star}-${i}`}>
          <strong>{item.transformation?`${item.transformation} → ${item.star}`:item.star}</strong> · {item.kind} · {item.palace}{item.branch?` (${item.branch})`:''}{item.strength?` · Độ sáng ${item.strength}`:''}{item.scope==='annual'?` · Năm ${item.year}`:' · Bản mệnh'}
        </li>)}</ul>}
        {record.missing.length>0&&<div className="palace-reading-review"><strong>Cần kiểm tra / chưa đủ</strong><ul>{record.missing.map((reason,i)=><li key={i}>{reason}</li>)}</ul></div>}
      </details>)}
    </section>}
    {study.relationalSynthesis?.status==='research-only'&&<section aria-label="Đối chiếu Tam hợp Đối cung Giáp cung" className="palace-reading-evidence-lenses">
      <h4>Quan hệ cung và bằng chứng vị trí</h4>
      <p className="palace-reading-scope">Tam hợp, đối cung và hai cung kề chỉ là quan hệ hình học trên lá số. Bảng này không chứng nhận cách cục hoặc dự đoán sự kiện.</p>
      {study.relationalSynthesis.records.map(record=><details key={record.id} className="palace-reading-symbol">
        <summary><strong>{record.title}</strong><span>{record.status==='observed'?'Đủ bằng chứng vị trí':record.status==='needs-review'?'Cần rà lại dữ liệu':record.status==='partial'?'Có một phần bằng chứng':'Chưa ghi nhận'}</span></summary>
        <p><strong>Câu hỏi theo cung:</strong> {record.question}</p>
        {record.focusIsVoChinhDieu&&<p><strong>Cung đang xem:</strong> Vô chính diệu trong dữ liệu sao gốc.</p>}
        <ul className="palace-reading-evidence">{record.checks.map((check,i)=><li key={i}>
          <strong>{check.met?'Đã kiểm tra':'Còn thiếu'}:</strong> {check.label}
        </li>)}</ul>
        {record.evidence.length>0&&<ul className="palace-reading-evidence">{record.evidence.map((item,i)=><li key={`${record.id}-${item.star}-${i}`}>
          <strong>{item.star}</strong> · {item.kind} · {item.palace} ({item.branch}) · {item.relation}{item.side?` · phía ${item.side}`:''}{item.strength?` · Độ sáng ${item.strength}`:''} · Bản mệnh
        </li>)}</ul>}
        {record.matchedPairs?.length? <p><strong>Cặp sao giáp cung:</strong> {record.matchedPairs.map(pair=>pair.join(' – ')).join('; ')}</p>:null}
        {record.missing.length>0&&<div className="palace-reading-review"><strong>Cần kiểm tra / chưa đủ</strong><ul>{record.missing.map((reason,i)=><li key={i}>{reason}</li>)}</ul></div>}
      </details>)}
    </section>}
    <small>{study.notice}</small>
  </article>;
}
