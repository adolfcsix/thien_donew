'use client';

import Link from 'next/link';
import type { PalaceResearchPerspective, PalaceResearchResult } from '@thiendo/shared-types';

type Props = {
  research: PalaceResearchResult;
  showAnnual: boolean;
  onSelect: (branchIndex: number) => void;
};

const roleLabels = ['CUNG ĐANG XÉT', 'TAM HỢP · 01', 'TAM HỢP · 02', 'ĐỐI CUNG'];

function Perspective({perspective, index, annualYear, showAnnual, onSelect}: {
  perspective: PalaceResearchPerspective; index: number; annualYear: number | null;
  showAnnual: boolean; onSelect: (branchIndex: number) => void;
}) {
  const natal = perspective.layers.filter(layer => layer.id === 'main' || layer.id === 'auxiliary' || layer.id === 'year' || layer.id === 'additional');
  const birthHoa = perspective.layers.find(layer => layer.id === 'birth-transformation')?.records ?? [];
  const annualHoa = perspective.layers.find(layer => layer.id === 'annual-transformation')?.records ?? [];
  const annualStars = perspective.layers.find(layer => layer.id === 'annual-star')?.records ?? [];
  return <article className={`palace-research-card ${index === 0 ? 'research-selected' : ''}`}>
    <div className="palace-research-card-heading">
      <div><span className="palace-research-role">{roleLabels[index]}</span>
        <h4>{perspective.palace}</h4><small>{perspective.stem} {perspective.branch} · Chi số {perspective.branchIndex}</small>
      </div>
      {index > 0 && <button type="button" className="palace-research-jump" onClick={() => onSelect(perspective.branchIndex)} aria-label={`Xem chi tiết cung ${perspective.palace}`}>Xem cung ↗</button>}
    </div>
    <p className="palace-research-count"><strong>{perspective.natalStarCount}</strong> sao khác tên tại cùng cung, tính trên những nhóm sao hiện có. Không tính Tứ Hóa là một sao mới.</p>
    <div className="palace-research-layers">
      {natal.map(layer => <div key={layer.id} className="palace-research-layer">
        <strong>{layer.label} <small>{layer.records.length}</small></strong>
        <div className="palace-research-names">{layer.records.length ? layer.records.map((record, i) => layer.id === 'main'
          ? <Link key={`${record.name}-${i}`} href={`/star-atlas?star=${encodeURIComponent(record.name)}&branch=${perspective.branchIndex}&palace=${encodeURIComponent(perspective.palace)}`} title={`Tra cứu ${record.name} tại ${perspective.branch}`}>
              {record.name} <span aria-hidden="true">↗</span></Link>
          : <span key={`${record.name}-${i}`}>{record.name}</span>) : <em>Không có dữ liệu trong lớp này</em>}</div>
      </div>)}
    </div>
    <div className="palace-research-transformations">
      <strong>Tứ Hóa năm sinh <small>{birthHoa.length}</small></strong>
      <p>{birthHoa.length ? birthHoa.map((record, index) => <span key={`${record.name}-${record.transformation}-${index}`}>{record.transformation} → {record.name}</span>) : <em>Không có trong cung</em>}</p>
      {showAnnual && <><strong>Tứ Hóa năm xem {annualYear ?? ''} <small>{annualHoa.length}</small></strong>
        <p>{annualHoa.length ? annualHoa.map((record, index) => <span key={`${record.name}-${record.transformation}-${index}`}>{record.transformation} → {record.name}</span>) : <em>Không có trong cung</em>}</p>
        {annualStars.length > 0 && <><strong>Lưu tinh cùng cung</strong><p>{annualStars.map((record,i) => <span key={`${record.name}-${i}`}>{record.name}</span>)}</p></>}
      </>}
    </div>
    {perspective.transformationTargets.some(record => !record.targetPresentInNatal && (showAnnual || record.kind !== 'annual-transformation')) &&
      <p className="palace-research-missing-target">Có Tứ Hóa trỏ tới sao chưa có trong các lớp sao gốc của cung này. Hãy đối chiếu lại phạm vi an sao của engine, không tự điền kết quả.</p>}

  </article>;
}

export function PalaceResearchPanel({research,showAnnual,onSelect}:Props) {
  return <section className="palace-research" aria-label="Phân tích cấu trúc đồng cung và tam phương tứ chính">
    <div className="palace-research-heading"><div><span className="eyebrow">QUYỂN II · NGHIÊN CỨU CẤU TRÚC</span>
      <h3 className="serif">Đồng cung &amp; Tam phương Tứ chính</h3>
      <p>So sánh bốn vị trí trên địa bàn khi đang chọn cung <strong>{research.palace}</strong>. Chạm vào tên chính tinh để đọc thêm ý nghĩa và so sánh các nhóm sao hội chiếu.</p>
    </div></div>
    <div className="palace-research-grid">
      {research.perspectives.map((item,index) => <Perspective key={`${item.role}-${item.branchIndex}`} perspective={item} index={index} annualYear={research.annualYear} showAnnual={showAnnual} onSelect={onSelect}/>)}
    </div>
    <div className="palace-research-warning"><strong>Phạm vi:</strong> Chỉ so sánh vị trí các sao và dấu mốc trên địa bàn. Sao đồng cung chưa đủ để kết luận tốt hoặc xấu.</div>
  </section>;
}
