import Link from 'next/link';

export default function NotFound() {
  return <section className="route-feedback" aria-labelledby="missing-route-title">
    <span className="route-feedback__seal" aria-hidden="true">404</span>
    <span className="route-feedback__eyebrow">THIÊN ĐỒ · LẠC ĐƯỜNG</span>
    <h1 id="missing-route-title">Không tìm thấy thư phòng này</h1>
    <p>Đường dẫn có thể đã thay đổi hoặc chưa được tạo. Bạn có thể trở về tổng quan hay vào phòng lập lá số.</p>
    <div className="route-feedback__actions">
      <Link className="btn gold" href="/">Trở về tổng quan ↗</Link>
      <Link className="btn secondary" href="/chart">Lập lá số ↗</Link>
    </div>
  </section>;
}
