'use client';

import { useState } from 'react';
import { useAdminResource } from '@/features/admin/use-admin-resource';
import { useAdminTask } from '@/features/admin/use-admin-task';
import { moderationApi, type Inspection } from './moderation-api';
export function useModeration(canWrite: boolean = false) {
  const resource = useAdminResource(moderationApi.queue);
  const task = useAdminTask();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const locked = task.pending || resource.loading || !!resource.error;
  async function act(path: string, body: unknown, method = 'POST') {
    if (!canWrite) return;
    if (resource.loading || resource.error) return;
    await task.run(async signal => {
      await moderationApi.update(path, body, signal, method);
      if (signal.aborted) return;
      const refreshed = await resource.reload();
      return 'Đã cập nhật trên hệ thống, có ghi nhật ký.' + (refreshed ? '' : ' Chưa tải lại được danh sách; hãy kiểm tra trước khi gửi lại.');
    });
  }
  async function inspect(id: string) {
    if (!canWrite) return;
    if (resource.loading || resource.error) return;
    await task.run(async signal => {
      setInspection(null);
      const content = await moderationApi.inspect(id, signal);
      if (!signal.aborted) setInspection(content);
    });
  }
  return {
    resource,
    task,
    inspection,
    setInspection,
    locked,
    act,
    inspect
  };
}
