import type {NatalMultiStarStudy} from '@thiendo/interpretation';

/** Multi-star positioning evidence only, never a claim of verified cách cục. */
export function NatalMultiStarStudyPanel({study}:{study:NatalMultiStarStudy}){
  const guides=study.conditionalGuides;
  return <article className="palace-reading-editorial palace-reading-multi-star" aria-label="Nghiên cứu điều kiện tổ hợp sao gốc">
    <h4>Đọc tổ hợp sao có điều kiện</h4>
    <p className="palace-reading-scope">{guides.assessed} nhóm nghiên cứu theo Tọa cung – hai cung Tam hợp – Đối cung. Khớp đủ vị trí chỉ có nghĩa là đủ tên sao gốc để khảo sát, không phải xác nhận cách cục.</p>
    <p><strong>Đối chiếu:</strong> {guides.complete} nhóm đủ vị trí; {guides.partial} nhóm có từ hai sao; {guides.needsReview} nhóm có dữ liệu phải kiểm tra. Các nhóm còn lại chưa đủ điều kiện quan sát.</p>
    {guides.records.map(item=><details className="palace-reading-symbol" key={item.id}>
      <summary><strong>{item.title}</strong><span>{item.status==='complete'?'Đủ vị trí để nghiên cứu':item.status==='needs-review'?'Dữ liệu có mâu thuẫn':`${item.observed}/${item.required} sao hợp lệ`}</span></summary>
      <p><strong>Góc đọc:</strong> {item.focusAngle}</p>
      <p><strong>Điều kiện bắt buộc:</strong> Có đủ {item.stars.join(' · ')} trong Tứ chính của cung này, ở vị trí gốc duy nhất và không lặp cùng lớp.</p>
      <p>{item.observedNarrative}</p>
      {item.evidence.length>0&&<ul className="palace-reading-evidence">{item.evidence.map(place=><li key={`${item.id}-${place.star}`}>
        <strong>{place.star}</strong> · {place.palace} ({place.branch}) · {place.relation}; chính tinh cùng cung: {place.accompanyingMainStars.join(', ')||'không có'}
      </li>)}</ul>}
      {item.excluded.length>0&&<div className="palace-reading-review"><strong>Chưa được tính vào tổ hợp</strong><ul>{item.excluded.map(place=><li key={`${item.id}-${place.star}`}><b>{place.star}</b> — {place.explanation}</li>)}</ul></div>}
      {item.samePalacePairs.length>0&&<p><strong>Cặp thực sự đồng cung:</strong> {item.samePalacePairs.map(pair=>`${pair.stars.join(' – ')} tại ${pair.palace}`).join('; ')}. Các sao hội chiếu không được gọi là đồng cung.</p>}
      <p><strong>Ví dụ thực hành:</strong> {item.example}</p>
      <details className="palace-reading-symbol"><summary><strong>Hai lá số thử từ engine</strong><span>Khớp đủ và khớp một phần</span></summary>
       <p>Ví dụ độc lập với lá số đang xem, dùng để minh họa điều kiện qua các vị trí đã tính; không phải bằng chứng thẩm định ngoài hệ thống.</p>
       {item.referenceCases.map(example=><div key={`${item.id}-${example.status}`}>
        <p><strong>{example.status==='complete'?'Trường hợp đủ vị trí':'Trường hợp chưa đủ vị trí'}:</strong> {example.gender}, {example.date}, {example.hour}:30; cung {example.anchorPalace}.</p>
        <ul className="palace-reading-evidence">{example.expectedEvidence.map(site=><li key={`${example.status}-${site.star}`}>{site.star} · chi số {site.branchIndex} · {site.relation}</li>)}</ul>
        {example.expectedExcluded.length>0&&<p><strong>Không tính:</strong> {example.expectedExcluded.map(x=>`${x.star} (${x.reason==='outside'?'ngoài Tứ chính':x.reason==='absent'?'chưa có trong dữ liệu gốc':'cần kiểm tra'})`).join(' · ')}</p>}
       </div>)}
      </details>
      <p><strong>Phản chứng:</strong> {item.counterexample}</p>
      <p><strong>Bài tập:</strong> {item.practice}</p>
      <small>{item.boundary}</small>
    </details>)}
    {study.transformations.length>0&&<details className="palace-reading-symbol"><summary><strong>Tứ Hóa năm sinh đã đối chiếu vị trí đích</strong><span>{study.transformations.length} bản ghi</span></summary>
      <ul className="palace-reading-evidence">{study.transformations.map(item=><li key={`${item.name}-${item.target}-${item.branchIndex}`}>{item.name} ({item.target}) · {item.palace} — {item.relation}</li>)}</ul>
    </details>}
    {study.rejectedTransformations.length>0&&<p className="palace-reading-notice">{study.rejectedTransformations.length} bản ghi Tứ Hóa chưa đủ căn cứ hoặc mâu thuẫn đã bị loại khỏi phần đối chiếu hợp lệ.</p>}
    {study.annualOverlay&&<details className="palace-reading-symbol"><summary><strong>Lớp lưu niên {study.annualOverlay.year}</strong><span>Chỉ tham khảo riêng</span></summary>
      <p>{study.annualOverlay.stars.length} sao lưu và {study.annualOverlay.transformations.length} Tứ Hóa lưu nằm trong Tứ chính đang xét; không ghép vào vị trí gốc.</p>
      <ul className="palace-reading-evidence">{study.annualOverlay.stars.map((item,i)=><li key={`s-${i}`}>{item.name} · {item.palace}</li>)}{study.annualOverlay.transformations.map((item,i)=><li key={`h-${i}`}>{item.name} ({item.target}) · {item.palace}</li>)}</ul>
      <small>{study.annualOverlay.notice}</small>
    </details>}
    <small>{guides.notice}</small>
    <small>{study.notice}</small>
  </article>;
}
