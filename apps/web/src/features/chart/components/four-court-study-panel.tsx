import type {FourCourtStudyGuide} from '@thiendo/interpretation';

/** Educational prompts selected from verified natal evidence. No placement or prediction. */
export function FourCourtStudyPanel({study}:{study:FourCourtStudyGuide}){
  return <section className="palace-reading-review" aria-label="Tình huống nghiên cứu bộ chính tinh">
    <h5>Hướng nghiên cứu theo bộ sao</h5>
    <p>{study.focus}</p>
    <ol>{study.studySteps.map((step,i)=><li key={i}>{step}</li>)}</ol>
    {study.cases.map(item=><div key={item.id} className="palace-reading-symbol">
      <strong>{item.title}</strong>
      <p>{item.question}</p>
      {item.observations.length>0&&<ul>{item.observations.map((observation,i)=><li key={i}>{observation}</li>)}</ul>}
      <p>{item.action}</p>
    </div>)}
    {study.cases.length===0&&<p>Chưa phát hiện tình huống nghiên cứu bổ sung trong ba nhóm đang hỗ trợ. Tiếp tục đọc từng chính tinh và vị trí hội chiếu.</p>}
    {study.evidenceSummary.unknownStrengths.length>0&&<p>Chưa có độ sáng hợp lệ cho: {study.evidenceSummary.unknownStrengths.join(', ')}.</p>}
    <small>{study.notice}</small>
  </section>;
}
