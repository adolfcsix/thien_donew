'use client';
import {StartChat} from '@/features/community-hub/start-chat';
import {CommunityBadges} from '@/features/community-hub/identity';


import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import styles from '../../forum.module.css';
type Member = {
  id: string;
  name: string;
  joinedAt: string;
};
type Thread = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
};
type Profile = {
  member: Member;
  threads: Thread[];
  tinhVanPoints: number;
};
export default function ForumProfile() {
  const {
      id
    } = useParams<{
      id: string;
    }>(),
    {
      user,
      loading
    } = useAuth();
  if (loading && !user) return <main className={styles.page}>
    <p role="status">Đang xác minh tài khoản…</p>
  </main>;
  // A profile may contain the viewer's private threads. Never reuse it across sessions.
  return <ProfileContent key={id + ':' + (user?.id || 'guest')} id={id} />;
}
function ProfileContent({
  id
}: {
  id: string;
}) {
  const [data, setData] = useState<Profile | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    void api<Profile>('/api/forum/members/' + encodeURIComponent(id), {
      signal: controller.signal,
      timeoutMs: 15000
    }).then(value => {
      if (value.member?.id !== id || typeof value.member.name !== 'string' || !Number.isFinite(Date.parse(value.member.joinedAt)) || !Number.isSafeInteger(value.tinhVanPoints) || !Array.isArray(value.threads) || value.threads.some(thread => !thread || typeof thread.id !== 'string' || typeof thread.title !== 'string' || typeof thread.category !== 'string' || !Number.isFinite(Date.parse(thread.updatedAt)))) throw Error('Phản hồi hồ sơ chưa hợp lệ.');
      if (!controller.signal.aborted) setData(value);
    }).catch(reason => {
      if (!controller.signal.aborted) setError((reason as Error).message);
    });
    return () => controller.abort();
  }, [id, retry]);
  return <main className={styles.page}>
    <Link className={styles.link} href="/forum">← Luận Đàn</Link>
    {error ? <div role="alert" className={styles.error}>
      <p>
        {error}
      </p>
      <button type="button" onClick={() => setRetry(value => value + 1)}>Tải lại hồ sơ</button>
    </div> : !data ? <p role="status">Đang tải hồ sơ…</p> : <>
      <header className={styles.hero}>
        <h1>
          {data.member.name}
        </h1>
        <p>Tham gia từ {new Date(data.member.joinedAt).toLocaleDateString('vi-VN')} · <strong>{data.tinhVanPoints} Tinh Văn diễn đàn</strong></p>
        <CommunityBadges id={id} size={96}/><StartChat peer={id}/>
        <p className={styles.muted}>Hồ sơ diễn đàn không công khai email, lá số gốc hoặc ngày giờ sinh.</p>
      </header>
      <div className={styles.grid}>
        {data.threads.map(thread => <article key={thread.id} className={styles.card}>
          <h2>
            <Link className={styles.link} href={'/forum/' + thread.id}>
              {thread.title}
            </Link>
          </h2>
          <p className={styles.meta}>{thread.category} · {new Date(thread.updatedAt).toLocaleDateString('vi-VN')}</p>
        </article>)}
        {!data.threads.length && <p>Chưa có bài hiển thị theo quyền của bạn.</p>}
      </div>
    </>}
  </main>;
}
