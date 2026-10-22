'use client';

import {useMemo} from 'react';
import {useViewMode} from '@/components/view-mode';
import {ReadingQualityPanel} from '@/features/reading-quality/quality-panel';
import {buildTuViQuality} from '@/features/reading-quality/quality.cjs';
import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
import {buildPalaceReading} from '@thiendo/interpretation/src/chart-reading.cjs';
import studyGuide from '@thiendo/knowledge/src/star-study-guide.json';
import {PrimaryContextPanel} from './primary-context-panel';
import {FourCourtEvidenceDetail} from './four-court-evidence-detail';
import {ClassicalReviewPanel} from './classical-review-panel';
import {FourCourtStudyPanel} from './four-court-study-panel';
import {NatalPairStudyPanel} from './natal-pair-study-panel';
import {NatalMultiStarStudyPanel} from './natal-multi-star-study-panel';
import {AnnualEvidencePanel} from './annual-evidence-panel';
import {TwelvePalaceStudyPanel} from './twelve-palace-study-panel';
import {FourCourtReadingLedgerPanel} from './four-court-reading-ledger';
import {PalaceArgumentMapPanel} from './palace-argument-map';
import {ConditionalPatternEvidencePanel} from './conditional-pattern-evidence';

type Props={chart:AstrologyResult;branchIndex:number;annual:AnnualOverview;showAnnual:boolean};

/** Contextual editorial reading; neither the component nor package places stars. */
export function PalaceReading({chart,branchIndex,annual,showAnnual}:Props){
  const {mode, setMode} = useViewMode();
  const level = mode === 'expert' ? 'deep' : 'basic';
  const reading=useMemo(()=>buildPalaceReading({chart,branchIndex,guide:studyGuide,annual,includeAnnual:showAnnual}),[chart,branchIndex,annual,showAnnual]);
  const quality=useMemo(()=>buildTuViQuality(reading),[reading]);
  return <section className="palace-reading" aria-label={`Giải thích cung ${reading.palace}`}>
    <header className="palace-reading-head">
      <div><span className="eyebrow">GIẢI NGHĨA DỄ HIỂU · THẬP NHỊ CUNG</span><h3 className="serif">Khám phá cung {reading.palace}</h3><p>{reading.title} · {reading.stem} {reading.branch}</p></div>
      <div className="palace-reading-level" role="group" aria-label="Mức độ giải thích">
        <button type="button" aria-pressed={level==='basic'} onClick={()=>setMode('basic')}>Cơ bản</button>
        <button type="button" aria-pressed={level==='deep'} onClick={()=>setMode('expert')}>Chuyên sâu</button>
      </div>
    </header>
    <ReadingQualityPanel report={quality}/>
    <div className="palace-reading-lead"><strong>Ý nghĩa của cung</strong><p>{reading.introduction}</p><p className="palace-reading-reflection">{reading.reflection}</p></div>
    {reading.menhThan.status==='verified'&&reading.menhThan.relevant&&<div className="palace-reading-lead" aria-label="Đối chiếu Mệnh và Thân">
      <strong>Mệnh & Thân · {reading.menhThan.scope}</strong>
      <p>{reading.menhThan.explanation}</p>
    </div>}
    <div className="palace-reading-body">
      <article><h4>Chính tinh tại cung</h4>
        {reading.isVoChinhDieu ? <p>Đây là cung <strong>Vô chính diệu</strong>. Không có chính tinh tọa thủ; cần kết hợp Đối cung và Tam phương, không tự thêm sao vào cung.</p>
        : reading.stars.map(star=><div className="palace-reading-star" key={star.name}><div><strong>{star.name}</strong>{star.strength&&<span>{star.strength}</span>}</div><p>{star.motif?`Hình tượng: ${star.motif}. ${star.explanation}`:`Chưa có bài giải thích riêng cho ${star.name}; chỉ giữ tên sao đã an.`}</p>{level==='deep'&&star.caution&&<small>{star.caution}</small>}</div>)}
      </article>
      <article><h4>Ý nghĩa sao phụ nổi bật</h4>
        {reading.supportingProfiles.length ? <div className="palace-reading-quick">
          {reading.supportingProfiles.slice(0,2).map(star=><div key={star.name}><strong>{star.name}</strong><p>{star.motif ?? 'Đang cập nhật giải nghĩa cho sao này.'}</p></div>)}
          {reading.supportingProfiles.length>2 && <small>Còn {reading.supportingProfiles.length-2} sao khác trong chế độ Chuyên sâu.</small>}
        </div> : <p>Không có phụ tinh thuộc những lớp đang an tại cung này.</p>}
        <p className="palace-reading-notice">{reading.boundary}</p><p className="palace-reading-notice">{reading.notice}</p></article>
    </div>
    {level==='deep'&&<div className="palace-reading-deep" aria-label="Phân tích chuyên sâu theo dữ liệu đã có">
      <ConditionalPatternEvidencePanel data={reading.conditionalPatternEvidence}/>
      <FourCourtReadingLedgerPanel ledger={reading.fourCourtReadingLedger}/>
      <PalaceArgumentMapPanel map={reading.palaceArgumentMap}/>
      <TwelvePalaceStudyPanel study={reading.twelvePalaceStudy}/>
      <PrimaryContextPanel records={reading.primaryPalaceContexts}/>
      <article className="palace-reading-editorial"><h4>Hồ sơ sao phụ tại cung</h4>
        {reading.supportingProfiles.length ? reading.supportingProfiles.map(star=><details key={star.name} className="palace-reading-symbol"><summary><strong>{star.name}</strong><span>{star.motif ?? 'Chưa có nội dung'}</span></summary>
          <p>{star.context ?? 'Chưa có hồ sơ riêng cho sao này; giữ nguyên dữ liệu an sao.'}</p>
          {star.caution&&<small>{star.caution}</small>}
        </details>) : <p>Không có sao thuộc các nhóm bổ trợ đang hỗ trợ giải nghĩa.</p>}
        <p><strong>Tứ Hóa năm sinh:</strong> {reading.natalHoa.length?reading.natalHoa.join(' · '):'Không có Tứ Hóa tọa tại cung này.'}</p></article>
      {reading.obstructionProfiles.length>0&&<article className="palace-reading-editorial"><h4>Dấu án ngữ</h4>
        {reading.obstructionProfiles.map(marker=><div key={marker.name} className="palace-reading-combination"><h5>{marker.name} — {marker.motif??'Đang cập nhật'}</h5><p>{marker.context??'Chưa có nội dung.'}</p><small>{marker.caution}</small></div>)}
      </article>}
      <article className="palace-reading-editorial" aria-label="Các thế sao bản mệnh đã đối chiếu hình học"><h4>Quan hệ sao qua nhiều cung</h4>
        <p className="palace-reading-scope">Các cặp sao dưới đây có vị trí liên hệ đã được kiểm tra trong cả 12 cung. Không đánh đồng đồng cung với đối cung, tam hợp hoặc giáp cung.</p>
        {reading.geometryMatches.length ? reading.geometryMatches.map(item=><details key={item.id} className="palace-reading-symbol">
          <summary><strong>{item.title}</strong><span>{item.relation}</span></summary>
          <p>{item.interpretation}</p>
          <ul className="palace-reading-evidence">{item.evidence.map(p=><li key={p.star}><strong>{p.star}</strong> · {p.palace} ({p.branch}) · {p.position}</li>)}</ul>
          <small>{item.caution}</small>
        </details>):<p>Chưa có thế sao trong nhóm đang khảo sát liên hệ trực tiếp với cung này; không có nghĩa lá số không có các quan hệ khác.</p>}
      </article>
      <article className="palace-reading-editorial"><h4>Tổ hợp có điều kiện</h4>
        {reading.combinations.length ? reading.combinations.map(item=><div className="palace-reading-combination" key={item.id}>
          <h5>{item.title}</h5><p>{item.interpretation}</p>
          <small>Dấu hiệu đối chiếu: {item.evidence.stars.join(' · ')}{item.evidence.transformation?` · ${item.evidence.transformation}`:''}</small>
          <small>{item.caution}</small>
        </div>) : <p>Chưa có tổ hợp nào khớp với các điều kiện đang được hỗ trợ tại cung này. Không có nghĩa là cung không tồn tại các cách cục truyền thống khác.</p>}
        <small>Chỉ những vị trí sao đã an mới được đối chiếu; đây chưa phải bộ xác định toàn bộ cách cục.</small></article>
      {reading.palace==='Mệnh'&&<article className="palace-reading-editorial palace-reading-classical" aria-label="Bộ chính tinh tại Mệnh">
        <h4>Bộ chính tinh hội về Mệnh</h4>
        <p className="palace-reading-scope">Nhận diện bộ sao để học cách đọc. Có đủ sao chưa có nghĩa đã thành cách cục cổ điển.</p>
        {reading.classicalMatches.some(item=>reading.classicalCriteria.find(criteria=>criteria.id===item.id)?.reviewMatrix.structuralCriteriaMet) ? reading.classicalMatches.map(item=>reading.classicalCriteria.find(criteria=>criteria.id===item.id)?.reviewMatrix.structuralCriteriaMet&&<details className="palace-reading-symbol" key={item.id}>
          <summary><strong>{item.title}</strong><span>{item.assessment}</span></summary>
          <p>{item.interpretation}</p>
          <strong className="palace-reading-label">Các sao trong bộ</strong>
          <ul className="palace-reading-evidence">{item.evidence.placements.map(place=><li key={place.star}>
            <strong>{place.star}</strong> · {place.palace} ({place.branch}) — {place.relation}
          </li>)}</ul>
          <p><strong>Độ sáng của sao:</strong> {item.evidence.strengths.map(entry=>`${entry.star}: ${entry.status==='M'?'Miếu':entry.status==='V'?'Vượng':entry.status==='D'?'Đắc':entry.status==='B'?'Bình':entry.status==='H'?'Hãm':'Chưa xác định'}`).join(' · ')}</p>
          {item.evidence.supports.length>0&&<p><strong>Sao hỗ trợ cùng hội:</strong> {item.evidence.supports.map(s=>`${s.star} (${s.palace})`).join(' · ')}</p>}
          {item.evidence.reviewSignals.length>0&&<div className="palace-reading-review"><strong>Các điểm cần đối chiếu thêm</strong><ul>{item.evidence.reviewSignals.map((signal,i)=><li key={`${signal.type}-${signal.star}-${i}`}>{signal.star} · {signal.palace} ({signal.branch}) — {signal.type}</li>)}</ul></div>}
          {item.evidence.uncertainStrength&&<p>Chưa đủ dữ liệu độ sáng cho mọi chính tinh trong bộ; không thể đánh giá đầy đủ.</p>}
          {reading.classicalCriteria.find(criteria=>criteria.id===item.id)?.evidenceReview &&
            <><FourCourtEvidenceDetail data={reading.classicalCriteria.find(criteria=>criteria.id===item.id)!.evidenceReview}/><FourCourtStudyPanel study={reading.classicalCriteria.find(criteria=>criteria.id===item.id)!.studyGuide}/><ClassicalReviewPanel review={reading.classicalCriteria.find(criteria=>criteria.id===item.id)!.reviewMatrix}/></>}
          <small>{item.boundary}</small>
        </details>) : <p>Chưa có bộ sao nào khớp đủ các tiêu chí sơ bộ đang hỗ trợ tại Mệnh. Không đồng nghĩa với việc lá số không có cách cục.</p>}
      </article>}
      {reading.palace==='Mệnh'&&reading.classicalCriteria.some(item=>!item.reviewMatrix.structuralCriteriaMet)&&
        <article className="palace-reading-editorial palace-reading-criteria" aria-label="Kiểm tra điều kiện chưa khớp">
          <h4>Vì sao một số bộ sao chưa được nhận diện?</h4>
          <p className="palace-reading-scope">Chỉ đối chiếu vị trí chính tinh tại Mệnh và Tam phương Tứ chính. Thiếu dữ liệu hoặc chưa khớp không có nghĩa là lá số không có cách cục khác.</p>
          {reading.classicalCriteria.filter(item=>!item.reviewMatrix.structuralCriteriaMet).map(item=><details className="palace-reading-symbol" key={item.id}>
            <summary><strong>{item.title}</strong><span>Chưa khớp tiêu chí khảo sát</span></summary>
            <p><b>Điều kiện cần kiểm tra:</b> {item.missing.length?item.missing.map(m=>`${m.star} (${m.status==='ambiguous-duplicate'?'trùng vị trí':'chưa có trong Tứ chính'})`).join(' · '):'Không có chính tinh yêu cầu tọa Mệnh.'}</p>
            {!item.focusStarPresent&&<p>Chưa tìm thấy chính tinh làm điểm tựa ở cung Mệnh.</p>}
            <FourCourtEvidenceDetail data={item.evidenceReview}/><FourCourtStudyPanel study={item.studyGuide}/><ClassicalReviewPanel review={item.reviewMatrix}/>
            <small>{item.boundary}</small>
          </details>)}
        </article>}
      <NatalPairStudyPanel study={reading.natalPairStudy}/>
      <NatalMultiStarStudyPanel study={reading.natalMultiStarStudy}/>
      {showAnnual&&<AnnualEvidencePanel data={reading.annualEvidence}/>}
      <article className="palace-reading-editorial palace-reading-adjacent" aria-label="Sao giáp hai bên cung">
        <h4>Hai cung giáp & các cặp sao</h4>
        <p className="palace-reading-scope">Chỉ ghi nhận cặp sao ở hai cung kề hai bên cung đang xem. Đây là thế giáp để nghiên cứu, chưa phải kết luận cách cục.</p>
        {reading.adjacentMatches.length ? reading.adjacentMatches.map(item=><details className="palace-reading-symbol" key={item.id}>
          <summary><strong>{item.title}</strong><span>Giáp cung</span></summary>
          <p>{item.interpretation}</p>
          <ul className="palace-reading-evidence">{item.evidence.placements.map(p=><li key={p.star}>
            <strong>{p.star}</strong> · {p.palace} ({p.branch}) — {p.side}
          </li>)}</ul>
          <small>{item.caution}</small>
        </details>) : <p>Chưa có cặp sao nào nằm đúng hai cung giáp theo bộ tiêu chí đang hỗ trợ. Không đồng nghĩa với việc cung không có cách cục khác.</p>}
      </article>
      {reading.menhThan.status==='verified'&&<article className="palace-reading-editorial palace-reading-menh-than" aria-label="Đối chiếu Mệnh Thân">
        <h4>Đối chiếu cung Mệnh – cung Thân</h4>
        <p><strong>{reading.menhThan.scope}</strong> · {reading.menhThan.explanation}</p>
        <div className="palace-reading-links">
          <div><span>Mệnh · {reading.menhThan.menh.palace} ({reading.menhThan.menh.branch})</span><strong>{reading.menhThan.menh.stars.join(' · ')||'Vô chính diệu'}</strong></div>
          <div><span>Thân · {reading.menhThan.than.palace} ({reading.menhThan.than.branch})</span><strong>{reading.menhThan.than.stars.join(' · ')||'Vô chính diệu'}</strong></div>
        </div>
        <small>{reading.menhThan.notice}</small>
      </article>}
      {reading.menhThan.status==='unavailable'&&<article className="palace-reading-editorial"><h4>Đối chiếu Mệnh – Thân</h4><p>{reading.menhThan.notice}</p></article>}
      <article className="palace-reading-editorial palace-reading-relations"><h4>Đối chiếu sao hội chiếu</h4>
        <p className="palace-reading-scope">Cấu hình sao trong Tam hợp hoặc Tứ chính, không tự động xác lập cách cục cổ điển.</p>
        {reading.relationshipMatches.length ? reading.relationshipMatches.map(item=><details className="palace-reading-symbol" key={item.id}>
          <summary><strong>{item.title}</strong><span>{item.evidence.scope==='tam-hop'?'Tam hợp':'Tứ chính'}</span></summary>
          <p>{item.interpretation}</p>
          <ul className="palace-reading-evidence">{item.evidence.placements.map(place=><li key={`${place.star}-${place.branchIndex}`}>
            <strong>{place.star}</strong> · {place.palace} ({place.branch}) — {place.relation}
          </li>)}</ul>
          <small>{item.caution}</small>
        </details>) : <p>Chưa ghi nhận cấu hình hội chiếu nào khớp bộ tiêu chí hiện hỗ trợ. Điều này không có nghĩa là cung không có cách cục khác.</p>}
      </article>
      <article className="palace-reading-editorial"><h4>Ba vòng sao</h4>
        {['Vòng Thái Tuế','Vòng Bác Sĩ','Vòng Tràng Sinh'].map(family=><div className="palace-reading-cycle" key={family}>
          <h5>{family}</h5>{reading.cycleProfiles.filter(star=>star.family===family).map(star=><details key={`${family}-${star.name}`} className="palace-reading-symbol">
            <summary><strong>{star.name}</strong><span>{star.motif ?? 'Đang cập nhật'}</span></summary>
            <p>{star.context ?? 'Chưa có hồ sơ vòng sao.'}</p><small>{star.caution}</small>
          </details>)}
        </div>)}
      </article>
      <article><h4>Tam phương Tứ chính</h4><div className="palace-reading-links">{reading.linked.map(link=><div key={`${link.kind}-${link.branch}`}><span>{link.kind} · {link.palace} ({link.branch})</span><strong>{link.starNames.join(' · ')||'Vô chính diệu'}</strong></div>)}</div></article>
      <article><h4>Trình tự tìm hiểu</h4><ol>{reading.guidance.map(line=><li key={line}>{line}</li>)}</ol></article>
      {reading.period&&<article><h4>Thông tin năm {reading.period.year}</h4>
        <p>{reading.period.markers.join(' · ')||'Cung này không phải vị trí đánh dấu các hạn đang xét.'}</p>
        <p><strong>Sao lưu:</strong> {reading.period.annualStars.join(' · ')||'Không có sao lưu thuộc danh mục hiện an tại cung này.'}</p>
        <p><strong>Lưu Tứ Hóa:</strong> {reading.period.annualHoa.join(' · ')||'Không có sao Lưu Tứ Hóa tọa tại cung này.'}</p>
        {reading.period.rejectedCount>0&&<p><strong>Đã loại {reading.period.rejectedCount} bản ghi không hợp lệ trên toàn lá số.</strong> Không dùng các bản ghi này trong tóm tắt cung.</p>}
        <small>Chưa có bộ phân tích toàn diện Lưu niên, Lưu nguyệt, Lưu nhật và Lưu thời.</small></article>}
      {reading.coverage.unknownMainStars.length>0&&<p>Chưa có nội dung biên soạn cho: {reading.coverage.unknownMainStars.join(', ')}.</p>}
    </div>}
  </section>;
}
