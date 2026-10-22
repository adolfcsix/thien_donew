'use client';
import type {AstrologyHouse} from '@thiendo/shared-types';
import {buildStarEvidenceMatrix} from '@thiendo/interpretation/src/chart-reading.cjs';

type Props={houses:readonly AstrologyHouse[];branchIndex:number;star:string};
/** Four actual chart positions, no inferred extra stars or annual overlays. */
export function StarFourCourtEvidence({houses,branchIndex,star}:Props){
  const evidence=buildStarEvidenceMatrix(houses,branchIndex,star);
  return <div className="star-four-court" aria-label={`Tam phương Tứ chính của ${star}`}>
    <div className="star-four-court-heading"><strong>Đối chiếu Tam phương Tứ chính</strong><small>4 cung · bản mệnh</small></div>
    <p>Vị trí và các sao có thật trên lá số. Đọc cùng cung và quan hệ, không coi sự hiện diện của sao là kết luận tốt/xấu.</p>
    <div className="star-four-court-grid">
      {evidence.courts.map(court=><div key={court.branchIndex} className="star-four-court-item">
        <div className="star-four-court-title"><b>{court.relation}</b><strong>{court.palace} · {court.branch}</strong></div>
        <dl>
          <div><dt>Chính tinh</dt><dd>{court.mainStars.length ? court.mainStars.map(name=>{
            const strength=court.mainStrengths.find(item=>item.name===name);
            return strength?`${name} (${strength.status==='D'?'Đ':strength.status})`:name;
          }).join(' · ') : 'Vô chính diệu'}</dd></div>
          <div><dt>Sao trợ lực</dt><dd>{court.supportStars.length?court.supportStars.join(' · '):'Không ghi nhận trong nhóm khảo sát'}</dd></div>
          <div><dt>Nhóm sát tinh</dt><dd>{court.challengingStars.length?court.challengingStars.join(' · '):'Không ghi nhận trong nhóm khảo sát'}</dd></div>
          <div><dt>Tứ Hóa gốc</dt><dd>{court.transformations.length?court.transformations.map(item=>`${item.name} → ${item.target}${item.verified?'':' (cần kiểm tra)'}`).join(' · '):'—'}</dd></div>
          {court.obstructions.length>0&&<div><dt>Tuần/Triệt</dt><dd>{court.obstructions.join(' · ')}</dd></div>}
        </dl>
        <small>{court.starCount} tên sao bản mệnh / vòng sao được ghi nhận</small>
      </div>)}
    </div>
    {evidence.voChinhDieu && <p className="star-four-court-alert"><strong>Cung vô chính diệu:</strong> đối cung {evidence.courts[3].palace} {evidence.oppositeMainStarsForReference.length?`có ${evidence.oppositeMainStarsForReference.join(' · ')} để đối chiếu.`:'cũng chưa ghi nhận chính tinh; cần kiểm tra toàn bộ kết cấu.'}</p>}
    {evidence.selectedTransformations.length>0 && <p className="star-four-court-alert"><strong>Tứ Hóa gắn với sao đang xét:</strong> {evidence.selectedTransformations.map(t=>t.name).join(' · ')}</p>}
    {evidence.issues.length>0 && <div className="star-four-court-alert" role="note"><strong>Dữ liệu cần kiểm tra:</strong><ul>{evidence.issues.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
    <small className="star-four-court-notice">{evidence.notice}</small>
  </div>;
}
