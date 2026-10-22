'use client';

import {useEffect, useState} from 'react';

export const academyProgressPrefix = 'thiendo.academy.completed.v1:';
export function AcademyProgress({slugs}: {slugs: string[]}) {
  const [completed, setCompleted] = useState<number | null>(null);
  useEffect(() => {
    try { setCompleted(slugs.filter(slug => window.localStorage.getItem(`${academyProgressPrefix}${slug}`) === 'yes').length); }
    catch { setCompleted(0); }
  }, [slugs.join('|')]);
  if (completed === null) return <p className="academy-progress">Tiến độ được lưu cục bộ trên trình duyệt, không gửi lên máy chủ.</p>;
  return <div className="academy-progress" aria-label={`Đã hoàn thành ${completed} trên ${slugs.length} bài`}>
    <div className="academy-progress-row"><span>Tiến độ trên thiết bị này</span><strong>{completed} / {slugs.length} bài</strong></div>
    <div className="academy-progress-track"><span style={{width: `${Math.round(100*completed/slugs.length)}%`}} /></div>
    <small>Đánh dấu hoàn thành khi trả lời đúng toàn bộ câu luyện tập. Xóa dữ liệu trình duyệt sẽ xóa tiến độ.</small>
  </div>;
}
