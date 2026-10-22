'use client';

import { useAdminSession } from '@/features/membership/admin-session';
type Props = {
  loading: boolean;
  loadError: string;
  error: string;
  notice: string;
  pending: boolean;
  onRetry: () => void;
  errorClass?: string;
  noticeClass?: string;
};
export function AdminFeedback({
  loading,
  loadError,
  error,
  notice,
  pending,
  onRetry,
  errorClass,
  noticeClass
}: Props) {
  const {
    mfa,
    reverify
  } = useAdminSession();
  return <>
    {loading && <p role="status">Đang tải danh sách quản trị…</p>}
    {loadError && <div role="alert" className={errorClass}>
      <p>
        {loadError}
      </p>
      <button type="button" disabled={loading || pending} onClick={onRetry}>Tải lại dữ liệu quản trị</button>
    </div>}
    {error && <p role="alert" className={errorClass}>
      {error}
    </p>}
    {notice && <p role="status" className={noticeClass}>
      {notice}
    </p>}
    {(!mfa.stepUp || /MFA/.test(error)) && <button type="button" disabled={pending} onClick={reverify}>Xác minh lại MFA</button>}
  </>;
}
