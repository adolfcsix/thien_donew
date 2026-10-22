/** Explanatory labels only; never affect the chart engine. */
export function ChartStrengthLegend() {
  return <>
    <div className="atlas-strength-legend" aria-label="Chú giải mức độ chính tinh theo bảng tham khảo">
      <span>CHÚ GIẢI CHÍNH TINH</span>
      <b className="atlas-strength-badge atlas-strength-m" title="Miếu">M</b><small>Miếu</small>
      <b className="atlas-strength-badge atlas-strength-v" title="Vượng">V</b><small>Vượng</small>
      <b className="atlas-strength-badge atlas-strength-d" title="Đắc">Đ</b><small>Đắc</small>
      <b className="atlas-strength-badge atlas-strength-b" title="Bình">B</b><small>Bình</small>
      <b className="atlas-strength-badge atlas-strength-h" title="Hãm">H</b><small>Hãm</small>
      <small className="atlas-legend-note">Theo bảng quy ước đang chọn; không phải đánh giá cát hung.</small>
    </div>
  </>;
}
