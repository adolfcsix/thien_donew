import type {AnnualOverview,AstrologyResult} from '@thiendo/shared-types';
/** Projection of existing engine output: no additional placement or prediction. */
export function ChartProfileLedger({result,annual,label}:{result:AstrologyResult;annual:AnnualOverview;label:string}) {
  const transformations=result.houses.flatMap(h=>h.tuHoa.map(t=>({...t,palace:h.palace,branch:h.branch})));
  const mainCount=result.houses.reduce((n,h)=>n+h.stars.length,0);
  return <details className="chart-profile-ledger" open><summary>Hồ sơ đối chiếu · Mệnh, Thân và Tứ Hóa</summary><p>Đọc lớp năm sinh trước, rồi đối chiếu lưu niên {annual.canChi}. Các mục dưới đây đi theo dữ liệu của lá số đang mở.</p>
    <dl className="chart-profile-facts">
      <div><dt>Người lập lá số</dt><dd>{label.trim()||'Chưa đặt tên'} · {result.gender}</dd></div>
      <div><dt>Dương lịch</dt><dd>{result.solar.day}/{result.solar.month}/{result.solar.year} · {String(result.hour).padStart(2,'0')}:{String(result.minute).padStart(2,'0')}</dd></div>
      <div><dt>Âm lịch</dt><dd>{result.lunar.day}/{result.lunar.month}/{result.lunar.year}{result.lunar.leap?' · Tháng nhuận':''} · Giờ {result.hourBranch}</dd></div>
      <div><dt>Năm sinh · Ngũ hành cục</dt><dd>{result.yearCanChi} · {result.cuc.name}</dd></div>
      <div><dt>Cung Mệnh · Thân cư</dt><dd>Mệnh tại {result.menh} · Thân tại {result.than} · {result.thanPalace}</dd></div>
      <div><dt>Đại hạn đang xem</dt><dd>{annual.activeDaiHan?`${annual.activeDaiHan.palace} · ${annual.activeDaiHan.fromAge}–${annual.activeDaiHan.toAge} tuổi`:'Chưa vào đại hạn trong bảng 12 kỳ'}</dd></div>
    </dl>
    <div className="chart-transformation-pair"><section aria-label="Tứ Hóa năm sinh trong hồ sơ"><h3>Tứ Hóa năm sinh</h3><ul>{transformations.map(t=><li key={`${t.name}-${t.star}-${t.branch}`}><strong>{t.name}</strong><span>{t.star} · {t.palace} ({t.branch})</span></li>)}</ul>{!transformations.length&&<p>Không có dữ liệu Tứ Hóa năm sinh trong kết quả này.</p>}</section><section aria-label="Lưu Tứ Hóa trong hồ sơ"><h3>Lưu Tứ Hóa · {annual.canChi}</h3><ul>{annual.luuTuHoa.items.map(t=><li key={`${t.name}-${t.star}`}><strong>{t.name}</strong><span>{t.star} · {t.palace}</span></li>)}</ul></section></div>
    <p className="chart-profile-note">{result.houses.length} cung · {mainCount} chính tinh được an trong kết quả. Miếu/Vượng dùng bảng tham khảo riêng. Các tên sao chưa đủ chứng cứ vẫn được theo dõi ở <a href="/research/star-audit">Thẩm định sao</a>; không bổ sung vị trí suy đoán.</p>
  </details>;
}
