export default function Loading() {
  return <section className="route-feedback route-loading" role="status" aria-label="Đang tải nội dung">
    <span className="route-feedback__eyebrow">THIÊN ĐỒ · THƯ PHÒNG</span>
    <div className="route-loading__line" aria-hidden="true" />
    <div className="route-loading__line" aria-hidden="true" />
    <div className="route-loading__line" aria-hidden="true" />
    <p>Đang chuẩn bị nội dung…</p>
  </section>;
}
