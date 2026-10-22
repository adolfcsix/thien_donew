'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useVisibleRefresh } from '@/lib/use-visible-refresh';
import { TinhCanhMedal } from '@/components/tinh-canh-medal';
import { publicRankResponse, type PublicRank } from './public-rank-contract';
import {SpecialtyBadge,specialtyBadgeRows,type SpecialtyGrant} from './specialty-badge';

/** Parent keys by target AND viewer: owner-only responses cannot survive an account switch. */
export function PublicRankBadge({
  userId
}: {
  userId: string;
}) {
  const [specialty,setSpecialty]=useState<SpecialtyGrant[]>([]);
  const [rank, setRank] = useState<PublicRank | null>(null),
    [message, setMessage] = useState('Đang tải cảnh giới…'),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRank(null);
    setMessage('Đang tải cảnh giới…');
    void api<unknown>('/api/tinh-canh/members/' + encodeURIComponent(userId), {
      signal: controller.signal,
      timeoutMs: 15000
    }).then(raw => {
      const result = publicRankResponse(raw);
      if (!controller.signal.aborted) {
        setRank(result);
        setSpecialty(specialtyBadgeRows(raw));
        setMessage('');
      }
    }).catch(error => {
      if (!controller.signal.aborted) setMessage('Chưa hiển thị được cảnh giới. Hồ sơ có thể không công khai hoặc dịch vụ chưa sẵn sàng. ' + (error as Error).message);
    });
    return () => controller.abort();
  }, [userId, retry]);
  useVisibleRefresh(() => setRetry(value => value + 1));
  return <section aria-label="Huy hiệu cảnh giới thành viên">
    {rank ? <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap'
    }}>
      <TinhCanhMedal level={rank.level} size={96} />
      <div>
        <strong>
          {rank.name}
        </strong>
        <p>Cảnh {rank.level} · {rank.stageName} · {rank.points} Tinh Văn đã xác minh</p>
        {rank.source === 'admin' && <p>Huy hiệu do Admin cấp; điểm đóng góp không thay đổi.</p>}
        {specialty.length>0&&<div aria-label="Danh hiệu chuyên môn được cấp" style={{display:"flex",flexWrap:"wrap",gap:12,margin:"10px 0"}}>{specialty.map(item=><SpecialtyBadge key={item.badgeId} badgeId={item.badgeId} showName size={56}/>)}</div>}
        <Link href="/tinh-canh">Xem Thập Bát Tinh Cảnh ↗</Link>
      </div>
    </div> : <p role="status">{message} <button type="button" onClick={() => setRetry(value => value + 1)}>Tải lại cảnh giới</button></p>}
  </section>;
}
