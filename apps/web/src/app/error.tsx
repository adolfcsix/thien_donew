'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Recoverable route failures; never echo internal error details to visitors. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server owns detailed logging; avoid exposing personal chart inputs.
    if (process.env.NODE_ENV !== 'production') console.error('Page rendering error', error);
  }, [error]);
  return <section className="route-feedback" role="alert" aria-labelledby="route-error-title">
    <span className="route-feedback__seal" aria-hidden="true">!</span>
    <span className="route-feedback__eyebrow">THIÊN ĐỒ · TRẠNG THÁI HỆ THỐNG</span>
    <h1 id="route-error-title">Trang chưa thể hiển thị</h1>
    <p>Đã xảy ra lỗi khi tải trang này. Bạn có thể thử tải lại trang hoặc trở về trang chủ. Nếu đang nhập dữ liệu chưa lưu, hãy kiểm tra lại sau khi tải.</p>
    <div className="route-feedback__actions">
      <button type="button" className="btn gold" onClick={reset}>Thử tải lại ↻</button>
      <Link className="btn secondary" href="/">Về trang chủ ↗</Link>
    </div>
  </section>;
}
