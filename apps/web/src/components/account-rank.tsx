'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { TinhCanhMedal } from './tinh-canh-medal';
import { MedalInspector } from '@/features/tinh-canh/medal-inspector';

type Rank = { level: number; name: string; points: number; stageName: string };
type Progress = {
  rank: Rank; earnedRank: Rank; rankSource: 'earned' | 'admin'; points: number;
  nextRank: Rank | null;
  blockedBy: null | { paths: number; events: number; havePaths: number; haveEvents: number };
};

/** Personal progress always comes from the authenticated ledger, even when public rank is hidden. */
export function AccountRank() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [viewingMedal, setViewingMedal] = useState<number | null>(null);
  useEffect(() => {
    const request = new AbortController();
    setError('');
    setProgress(null);
    void api<{ progress: Progress }>('/api/tinh-canh/me', { signal: request.signal, timeoutMs: 15000 })
      .then(value => {
        if (!value.progress?.rank || !value.progress.earnedRank || !Number.isSafeInteger(value.progress.points)) throw Error('Dữ liệu cảnh giới chưa hợp lệ.');
        if (!request.signal.aborted) setProgress(value.progress);
      }).catch(reason => { if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không thể tải cảnh giới.'); });
    return () => request.abort();
  }, [retry]);
  const start = progress?.earnedRank.points ?? 0;
  const next = progress?.nextRank;
  const percent = progress ? next && next.points > start ? Math.max(0, Math.min(100, (progress.points - start) / (next.points - start) * 100)) : next ? 0 : 100 : 0;
  return <section className="account-section account-rank" aria-label="Huy hiệu và tiến độ thăng cấp">
    <h3>Cảnh giới của bạn</h3>
    {error ? <div role="alert"><p>{error}</p><button type="button" className="btn secondary" onClick={() => setRetry(value => value + 1)}>Tải lại cảnh giới</button></div>
      : !progress ? <p role="status">Đang tải huy hiệu và tiến độ…</p> : <>
        <div className="account-rank-identity"><button type="button" className="account-rank-medal-trigger" onClick={() => setViewingMedal(progress.rank.level)} aria-label={`Xem chi tiết huy hiệu ${progress.rank.name}`} title="Xem huy hiệu lớn"><TinhCanhMedal level={progress.rank.level} size={72} /></button><div>
          <strong>{progress.rank.name}</strong><p>Cảnh {progress.rank.level}/18 · {progress.rank.stageName}</p>
          <p>{progress.points} Tinh Văn đã xác minh</p>
        </div></div>
        {progress.rankSource === 'admin' && <p>Huy hiệu do Admin cấp. Tiến độ đóng góp thực: {progress.earnedRank.name}; điểm không thay đổi.</p>}
        <progress aria-label="Tiến độ điểm tới cảnh giới tiếp theo" max={100} value={percent} />
        <p className="account-control-hint">{next ? `Mốc tiếp theo: ${next.name} · ${progress.points}/${next.points} Tinh Văn.` : 'Đã đạt cảnh giới đóng góp cao nhất.'}</p>
        {progress.blockedBy && <p className="account-control-hint">Cần đủ {progress.blockedBy.paths} hướng đóng góp và {progress.blockedBy.events} minh chứng; hiện có {progress.blockedBy.havePaths} hướng và {progress.blockedBy.haveEvents} minh chứng. Đạt điểm chưa đồng nghĩa tự động thăng cấp.</p>}
        <Link href="/tinh-canh">Xem 18 huy hiệu, nhật ký và quyền hiển thị ↗</Link>
      </>}
    <MedalInspector level={viewingMedal} onChoose={setViewingMedal} onClose={() => setViewingMedal(null)} />
  </section>;
}
