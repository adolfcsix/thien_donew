import Link from 'next/link';
import type { AstrologyHouse, AnnualOverview } from '@thiendo/shared-types';
import { AstrologyGroup } from './star-groups';
import starDossiers from '@thiendo/knowledge/src/star-dossiers.json';

export function PalaceDetails({house,ruleSet,annual,showAnnual,showStrength,detailId}:{house:AstrologyHouse;ruleSet:string;annual:AnnualOverview;showAnnual:boolean;showStrength:boolean;detailId:string}) {
  const annualHoa = annual.luuTuHoa.items.filter(t => t.branch === house.branchIndex).map(t => `${t.name} (${t.star})`);
  const annualStars = annual.luuStars.items.filter(t => t.branch === house.branchIndex).map(t => t.name);
  // Cross-links use only already-calculated natal positions: never promote annual overlays.
  const natalNames = new Set([
    ...house.auxiliaryStars, ...house.yearStars,
    ...house.cycleStars.thaiTue, ...house.cycleStars.bacSi, ...house.cycleStars.trangSinh,
    ...(house.additionalStars ?? []), ...(house.natalExtensionStars ?? []),
    ...(house.beneficStars ?? []), ...(house.positionalStars ?? []),
    ...(house.missingStars ?? []), ...(house.derivedStars ?? []),
    ...(house.traditionalStars ?? []), ...(house.advancedStars ?? []),
  ]);
  const deepStudyStars = [...natalNames].filter(name => Object.hasOwn(starDossiers.profiles, name));
  return <section className="palace-detail atlas-detail" id={detailId} aria-label={`Chi tiết cung ${house.palace}`}>
    <div className="atlas-detail-heading"><div><span className="eyebrow">HỒ SƠ CHI TIẾT / THẬP NHỊ CUNG</span><h3 className="serif">{house.palace} <small>{house.stem} {house.branch}{house.isThan ? ' · Cung Thân' : ''}</small></h3></div><span className="atlas-detail-index">{String(house.branchIndex+1).padStart(2,'0')} / 12</span></div>
    <div className="atlas-detail-sub">Đại hạn {house.daiHan?.fromAge ?? '—'}–{house.daiHan?.toAge ?? '—'} tuổi mụ · {house.stem} {house.branch}</div>
    <div className="atlas-details-grid">
      <div className="atlas-detail-card"><AstrologyGroup label="01 · CHÍNH TINH" items={house.stars.length ? (showStrength ? house.stars.map(name => {const status=house.mainStarStrengths?.find(s=>s.name===name);return status ? `${name} [${status.status}]` : name;}) : house.stars) : ['Vô chính diệu']} variant="main"/></div>
      {house.stars.length > 0 && <div className="atlas-detail-card atlas-study-card"><span className="atlas-group-label">ĐỌC SAO TRONG NGỮ CẢNH CUNG</span><p>Chọn chính tinh để mở thư viện đúng sao, địa chi và cung chức đang xét.</p><div className="atlas-study-links">{house.stars.map(star => <Link key={star} href={`/star-atlas?star=${encodeURIComponent(star)}&branch=${house.branchIndex}&palace=${encodeURIComponent(house.palace)}`} title={`Tra cứu ${star} tại cung ${house.palace}, ${house.branch}`}>{star} <span aria-hidden="true">↗</span></Link>)}</div><small>Nội dung giải nghĩa để tham khảo, không phải dự đoán sự kiện cá nhân.</small></div>}
      {showStrength && house.mainStarStrengths?.length ? <div className="atlas-detail-card atlas-strength-card"><span className="atlas-group-label">BẢNG MỨC ĐỘ CHÍNH TINH · THAM KHẢO</span>{house.mainStarStrengths.map(star=><div className="atlas-strength-entry" key={star.name}><strong>{star.name}</strong><span>{star.status} · {star.label}</span></div>)}<small>Trạng thái là ký hiệu tham khảo theo cách an đang dùng, không tự xác định tốt hoặc xấu.</small></div> : null}
      <div className="atlas-detail-card"><AstrologyGroup label="02 · PHỤ TINH" items={house.auxiliaryStars}/></div>
      {deepStudyStars.length > 0 && <div className="atlas-detail-card atlas-study-card">
        <span className="atlas-group-label">CHUYÊN KHẢO SAO ĐANG CÓ TRONG CUNG</span>
        <p>{deepStudyStars.length} sao tại cung {house.palace} đã có chuyên khảo minh họa, phản chứng và gợi ý đối chiếu. Đây là sao bản mệnh hoặc vòng sao, không bao gồm sao lưu năm xem.</p>
        <div className="atlas-study-links">{deepStudyStars.map(star =>
          <Link href={`/star-atlas?star=${encodeURIComponent(star)}`} key={star} title={`Đọc chuyên khảo ${star}`}>
            {star} <span aria-hidden="true">↗</span>
          </Link>)}</div>
      </div>}
      <div className="atlas-detail-card"><AstrologyGroup label="03 · SAO CHI NĂM SINH" items={house.yearStars} variant="year"/></div>
      <div className="atlas-detail-card"><AstrologyGroup label="04 · TỨ HÓA NĂM SINH" items={house.tuHoa.map(t => `${t.name} · ${t.star}`)} variant="gold"/></div>
      <div className="atlas-detail-card"><AstrologyGroup label="05 · VÒNG THÁI TUẾ" items={house.cycleStars.thaiTue} layer="cycle"/><AstrologyGroup label="VÒNG BÁC SĨ" items={house.cycleStars.bacSi} layer="cycle"/><AstrologyGroup label="VÒNG TRÀNG SINH" items={house.cycleStars.trangSinh} layer="cycle"/></div>
      {(house.additionalStars?.length ?? 0) > 0 && <div className="atlas-detail-card">
        <AstrologyGroup label="SAO BỔ SUNG · QUY TẮC ĐỐI CHIẾU" items={house.additionalStars ?? []} variant="year"/>
        <div className="atlas-rule-legend" aria-label="Căn cứ an từng sao">
          {(house.additionalStarDetails ?? []).map(star => <div key={star.name}>
            <strong>{star.name}</strong><span>{star.basis === 'thang-am' ? 'Tháng sinh âm lịch' : star.basis === 'chi-nam-sinh' ? 'Địa chi năm sinh' : star.basis === 'ta-phu-va-ngay-am' ? 'Tả Phụ + ngày sinh âm' : 'Hữu Bật + ngày sinh âm'}</span>
          </div>)}
        </div>
        <small>Đây là các vị trí sao theo cách an được lựa chọn; cần xem cùng toàn bộ lá số.</small>
      </div>}
      {(house.natalExtensionStars?.length ?? 0) > 0 && <div className="atlas-detail-card"><AstrologyGroup label="SAO MỞ RỘNG" items={house.natalExtensionStars ?? []} variant="year"/><small>Đọc các sao trong tổng thể cung, không dùng riêng lẻ để dự đoán.</small></div>}
      {(house.beneficStars?.length ?? 0) > 0 && <div className="atlas-detail-card"><AstrologyGroup label="SAO ĐỨC · GIẢI" items={house.beneficStars ?? []} variant="year"/><small>Đọc cùng sao tọa thủ, Tam phương Tứ chính và bối cảnh cung.</small></div>}
      {(house.positionalStars?.length ?? 0) > 0 && <div className="atlas-detail-card"><AstrologyGroup label="DẤU LA · VÕNG VÀ SAO THƯƠNG · SỨ" items={house.positionalStars ?? []} variant="year"/><small>La–Võng cố định theo địa chi; Thương–Sứ cố định theo cung chức. Không suy diễn biến cố từ riêng nhóm này.</small></div>}
      {(house.missingStars?.length ?? 0) > 0 && <div className="atlas-detail-card"><AstrologyGroup label="THIÊN TRÙ · LƯU HÀ · THIÊN KHÔNG · ĐẨU QUÂN" items={house.missingStars ?? []} variant="year"/></div>}
      {(house.derivedStars?.length ?? 0) > 0 && <div className="atlas-detail-card"><AstrologyGroup label="THIÊN TÀI · THIÊN THỌ · ĐƯỜNG PHÙ" items={house.derivedStars ?? []} variant="year"/><small>Vị trí được tính từ Mệnh, Thân và Lộc Tồn. Nội dung sao chỉ mang tính nghiên cứu biểu tượng.</small></div>}
      {(house.traditionalStars?.length ?? 0) > 0 && <div className="atlas-detail-card"><AstrologyGroup label="SAO TRUYỀN THỐNG" items={house.traditionalStars ?? []} variant="year"/><small>Nhóm sao theo năm sinh và sao phái sinh từ Xương–Khúc; đọc cùng toàn bộ cung và các sao hội chiếu.</small></div>}
      {(house.advancedStars?.length ?? 0) > 0 && <div className="atlas-detail-card">
        <AstrologyGroup label="SÁT TINH · MỞ RỘNG" items={house.advancedStars ?? []} variant="year"/>
        <small>Địa Không/Địa Kiếp an theo giờ; Hỏa/Linh an theo năm, giờ, âm dương và giới tính. Có dị bản truyền thống.</small>
        <div className="atlas-rule-legend">{(house.advancedStarDetails ?? []).map(star => <div key={star.name}><strong>{star.name}</strong><span>{star.basis}</span></div>)}</div>
      </div>}
      {!!house.obstructionMarkers?.length && <div className="atlas-detail-card atlas-void-detail">
        <AstrologyGroup label="TUẦN / TRIỆT ÁN NGỮ" items={house.obstructionMarkers} variant="gold"/>
        <small>Mỗi nhãn án một cặp cung liền nhau. Không cộng thành các ngôi sao độc lập.</small>
      </div>}
      {showAnnual && <div className="atlas-detail-card"><AstrologyGroup label={`06 · LƯU TỨ HÓA ${annual.year}`} items={annualHoa} variant="gold" layer="annual"/><AstrologyGroup label="LƯU TINH" items={annualStars} variant="year" layer="annual"/></div>}
    </div>
    <div className="atlas-detail-note">{showAnnual && annual.luuThaiTueBranchIndex === house.branchIndex ? '• Chi năm đang xem ở cung này. ' : ''}{showAnnual && annual.activeDaiHan?.branchIndex === house.branchIndex ? '• Đại hạn đang xét ở cung này. ' : ''}{showAnnual && annual.tieuHan.branchIndex === house.branchIndex ? '• Tiểu hạn năm xem ở cung này. ' : ''}Các vị trí sao là dữ liệu đã an; để hiểu ý nghĩa, hãy xem phần “Khám phá cung” phía trên.</div>
  </section>;
}
