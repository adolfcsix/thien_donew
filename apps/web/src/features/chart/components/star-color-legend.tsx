import '../styles/chart-semantic-stars.css';
/** Neutral, non-prognostic legend. Colors are mapped once for all chart views. */
const items = [
  ['main','Chính tinh'], ['support','Nhóm trợ lực'], ['challenging','Lục sát'],
  ['transform','Tứ Hóa'], ['annual','Lưu niên'], ['cycle','Vòng sao'], ['neutral','Nhóm khác'],
] as const;
export function StarColorLegend() {
  return <div className="star-color-legend" aria-label="Chú giải màu sao trên lá số">
    <span className="star-color-legend-heading">MÀU SAO</span>
    {items.map(([tone,label]) => <span className="star-color-legend-item" data-tone={tone} key={tone}><i aria-hidden="true"/>{label}</span>)}
    <p className="star-color-legend-note">Màu là quy ước phân loại để dễ đọc, không phải bảng xếp hạng tốt/xấu. Lưu Hà là sao bản mệnh dù tên có chữ “Lưu”; sao lưu năm được tách theo lớp dữ liệu.</p>
  </div>;
}
