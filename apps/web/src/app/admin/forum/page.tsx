'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/features/membership/admin-session';
import { AdminFeedback } from '@/features/admin/admin-feedback';
import { useModeration } from '@/features/forum/use-moderation';
import styles from '../../forum/forum.module.css';

/** UI fields only. Queue loading and audited actions live in useModeration. */
export default function Moderation() {
  const {capabilities} = useAdminSession();
  const canWrite = capabilities.includes('community.write');
  const {
    resource,
    task,
    inspection,
    setInspection,
    locked,
    act,
    inspect
  } = useModeration(canWrite);
  const reports = resource.data?.reports || [],
    appeals = resource.data?.appeals || [],
    audit = resource.data?.audit || [];
  const [reason, setReason] = useState('Vi phạm quy tắc cộng đồng'),
    [target, setTarget] = useState(''),
    [targetKind, setTargetKind] = useState<'thread' | 'comment'>('thread');
  const [action, setAction] = useState('hide'),
    [userId, setUserId] = useState(''),
    [days, setDays] = useState('1');
  return <main className={styles.page}>
    <Link className={styles.link} href="/forum">← Luận Đàn</Link>
    <header className={styles.hero}>
      <h1>Kiểm duyệt Luận Đàn</h1>
      <p>Cần quyền Admin và phiên MFA còn hiệu lực. Mọi thao tác được ghi nhật ký và có cơ chế khiếu nại.</p>
    </header>
    {!canWrite && <p role="status">Bạn được xem phân hệ này. Quyền chỉnh sửa do chủ hệ thống phân công.</p>}
    <AdminFeedback errorClass={styles.error} noticeClass={styles.notice} loading={resource.loading} loadError={resource.error} error={task.error} notice={task.notice} pending={task.pending} onRetry={() => void resource.reload()} />
    {inspection && <section className={styles.notice}>
      <h2>Bản kiểm duyệt — chỉ dùng nội bộ</h2>
      <strong>
        {inspection.title || 'Bình luận'}
      </strong>
      <p className={styles.post}>
        {inspection.body}
      </p>
      {inspection.imageDataUrl && <img className={styles.threadImage} src={inspection.imageDataUrl} alt="Ảnh đính kèm trong nội dung đang kiểm duyệt" />}
      <button className={styles.button} onClick={() => setInspection(null)}>Đóng</button>
    </section>}
    <div className={styles.modgrid}>
      <section className={styles.panel}>
        <h2>Báo cáo chưa giải quyết{resource.data && !resource.loading && !resource.error ? ` (${reports.length})` : ''}</h2>
        {!resource.loading && !resource.error && reports.map(r => <article className={styles.card} key={r.id}>
          <p><strong>
              {r.reason}
            </strong> · {new Date(r.createdAt).toLocaleString('vi-VN')}</p>
          <p className={styles.small}>{r.threadId ? 'Bài' : 'Bình luận'}: {r.threadId || r.commentId}</p>
          <p>
            {r.status}
          </p>
          <div className={styles.actions}>
            <button disabled={locked || !canWrite} className={styles.button} onClick={() => void inspect(r.id)}>Xem nội dung (ghi audit)</button>
            <button disabled={locked || !canWrite} className={styles.button} onClick={() => void act('/api/forum/moderation/reports/' + r.id, {
              status: 'reviewing'
            }, 'PATCH')}>Đang xem xét</button>
            <button disabled={locked || !canWrite} className={styles.button} onClick={() => void act('/api/forum/moderation/reports/' + r.id, {
              status: 'resolved'
            }, 'PATCH')}>Đã xử lý</button>
            <button disabled={locked || !canWrite} className={styles.button} onClick={() => void act('/api/forum/moderation/reports/' + r.id, {
              status: 'dismissed'
            }, 'PATCH')}>Không vi phạm</button>
          </div>
        </article>)}
        {!resource.loading && !resource.error && resource.data && !reports.length && <p>Không có báo cáo đang chờ.</p>}
      </section>
      <section className={styles.panel}>
        <h2>Khiếu nại{resource.data && !resource.loading && !resource.error ? ` (${appeals.length})` : ''}</h2>
        {!resource.loading && !resource.error && appeals.map(a => <article key={a.id} className={styles.card}>
          <p>
            {a.reason}
          </p>
          <div className={styles.actions}>
            <button disabled={locked || !canWrite} className={styles.button} onClick={() => void act('/api/forum/moderation/appeals/' + a.id, {
              decision: 'approved',
              reason
            })}>Chấp nhận và khôi phục</button>
            <button disabled={locked || !canWrite} className={styles.button} onClick={() => void act('/api/forum/moderation/appeals/' + a.id, {
              decision: 'denied',
              reason
            })}>Từ chối</button>
          </div>
        </article>)}
        {!resource.loading && !resource.error && resource.data && !appeals.length && <p>Không có khiếu nại.</p>}
      </section>
    </div>
    <section className={styles.panel}>
      <h2>Thao tác kiểm duyệt</h2>
      <fieldset disabled={locked || !canWrite} className={styles.form} style={{
        border: 0,
        margin: 0,
        minWidth: 0
      }}>
        <label>Loại nội dung<select value={targetKind} onChange={e => {
            const next = e.target.value as 'thread' | 'comment';
            setTargetKind(next);
            if (next === 'comment' && !['hide', 'restore'].includes(action)) setAction('hide');
          }}>
            <option value="thread">Bài viết</option>
            <option value="comment">Bình luận</option>
          </select></label>
        <label>ID nội dung<input value={target} onChange={e => setTarget(e.target.value)} placeholder="UUID" /></label>
        <label>Hành động<select value={action} onChange={e => setAction(e.target.value)}>
            {['hide', 'restore', 'lock', 'unlock', 'pin', 'unpin'].filter(a => targetKind === 'thread' || ['hide', 'restore'].includes(a)).map(a => <option key={a}>
              {a}
            </option>)}
          </select></label>
        <label>Lý do (lưu nhật ký)<textarea maxLength={800} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <button className={styles.primary} disabled={locked || !canWrite} onClick={() => void act(`/api/forum/moderation/${targetKind === 'thread' ? 'threads' : 'comments'}/${target}`, {
          action,
          reason
        })}>Thực hiện</button>
      </fieldset>
    </section>
    <section className={styles.panel}>
      <h2>Cảnh báo và hạn chế tài khoản</h2>
      <fieldset disabled={locked || !canWrite} className={styles.form} style={{
        border: 0,
        margin: 0,
        minWidth: 0
      }}>
        <label>ID thành viên<input value={userId} onChange={e => setUserId(e.target.value)} placeholder="UUID" /></label>
        <label>Số ngày tạm khóa (1–30)<input type="number" min={1} max={30} value={days} onChange={e => setDays(e.target.value)} /></label>
        <div className={styles.actions}>
          {['warn', 'suspend', 'unsuspend'].map(a => <button key={a} className={styles.button} disabled={locked || !canWrite} onClick={() => void act('/api/forum/moderation/members/' + userId, {
            action: a,
            reason,
            days: Number(days)
          })}>
            {a}
          </button>)}
        </div>
      </fieldset>
    </section>
    <section className={styles.panel}>
      <h2>Nhật ký kiểm duyệt</h2>
      {!resource.loading && !resource.error && audit.map((a, i) => <p className={styles.meta} key={i}>{new Date(a.createdAt).toLocaleString('vi-VN')} · {a.action} — {a.reason}</p>)}
    </section>
  </main>;
}
