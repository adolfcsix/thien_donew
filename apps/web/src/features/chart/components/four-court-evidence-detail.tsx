import type {FourCourtEvidence} from '@thiendo/interpretation';

const strengthName:Record<string,string>={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
const relationName:Record<string,string>={'toa-cung':'Tọa cung','tam-hop':'Tam hợp','doi-cung':'Đối cung'};

/** Render only evidence returned by the interpretation layer. No new placements or inference. */
export function FourCourtEvidenceDetail({data}:{data:FourCourtEvidence}){
  const supports=data.supports.filter(s=>s.status==='observed');
  const reviews=data.review.filter(s=>s.status==='observed');
  const incomplete=data.required.filter(s=>s.status!=='observed');
  return <div className="palace-reading-review" aria-label="Bằng chứng Tứ chính theo lá số gốc">
    <p><strong>Đối chiếu dữ liệu gốc:</strong> {data.summary.requiredObserved}/{data.summary.requiredTotal} chính tinh yêu cầu;
      {' '}{data.summary.supportsObserved} sao hỗ trợ; {data.summary.reviewObserved} sao cần xem thêm.
    </p>
    {supports.length>0&&<p><strong>Sao hỗ trợ có mặt:</strong> {supports.map(s=>`${s.star} — ${s.palace} (${relationName[s.relation??'']??'Tứ chính'})`).join(' · ')}</p>}
    {reviews.length>0&&<p><strong>Sao cần đối chiếu:</strong> {reviews.map(s=>`${s.star} — ${s.palace} (${relationName[s.relation??'']??'Tứ chính'})`).join(' · ')}</p>}
    <p><strong>Độ sáng theo dữ liệu:</strong> {data.strengths.map(s=>`${s.star}: ${s.status?strengthName[s.status]:'Chưa xác định'}`).join(' · ')}</p>
    <p><strong>Tứ Hóa năm sinh có sao đích hợp lệ:</strong> {data.transformations.length ? data.transformations.map(t=>`${t.name} (${t.target}) tại ${t.palace}`).join(' · ') : 'Chưa ghi nhận'}</p>
    {data.rejectedTransformations.length>0&&<p>Đang loại {data.rejectedTransformations.length} bản ghi Tứ Hóa chưa xác minh được sao đích tại cùng cung.</p>}
    {data.obstructions.length>0&&<p><strong>Tuần/Triệt:</strong> {data.obstructions.map(s=>`${s.marker} tại ${s.palace}`).join(' · ')}</p>}
    {incomplete.length>0&&<p><strong>Thiếu hoặc mâu thuẫn:</strong> {incomplete.map(s=>`${s.star} (${s.reason==='multi-palace'?'trùng nhiều cung':s.reason==='outside-four-courts'?'ngoài Tứ chính':'chưa ghi nhận'})`).join(' · ')}</p>}
    {data.flags.missingStrengthData&&<p>Chưa có dữ liệu độ sáng hợp lệ cho toàn bộ chính tinh trong nhóm.</p>}
    <small>{data.notice}</small>
  </div>;
}
