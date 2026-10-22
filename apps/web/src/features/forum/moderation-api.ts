import { api } from '@/lib/api';
import { adminId, adminList, adminObject, adminString, adminUpdated, invalidAdminResponse } from '@/features/admin/response-contract';
export type ModerationRecord = {
  id: string;
  reason: string;
  status: string;
  threadId: string | null;
  commentId: string | null;
  createdAt: string;
};
export type ModerationAudit = {
  action: string;
  reason: string;
  createdAt: string;
};
export type Inspection = {
  title?: string;
  body: string;
  imageDataUrl?: string;
};
function item(value: unknown): ModerationRecord {
  const row = adminObject(value);
  adminId(row.id);
  for (const key of ['reason', 'status', 'createdAt']) adminString(row[key]);
  for (const key of ['threadId', 'commentId']) if (row[key] !== null) adminId(row[key]);
  return row as ModerationRecord;
}
export const moderationApi = {
  async queue(signal: AbortSignal) {
    const [queue, audit] = await Promise.all([api<unknown>('/api/forum/moderation/queue', {
      signal,
      timeoutMs: 15_000
    }), api<unknown>('/api/forum/moderation/audit', {
      signal,
      timeoutMs: 15_000
    })]);
    const value = adminObject(queue);
    return {
      reports: adminList(value.reports, item),
      appeals: adminList(value.appeals, item),
      audit: adminList(adminObject(audit).events, value => {
        const row = adminObject(value);
        for (const key of ['action', 'reason', 'createdAt']) adminString(row[key]);
        return row as ModerationAudit;
      })
    };
  },
  async update(path: string, body: unknown, signal: AbortSignal, method = 'POST') {
    adminUpdated(await api<unknown>(path, {
      method,
      body,
      signal,
      timeoutMs: 30_000
    }));
  },
  async inspect(id: string, signal: AbortSignal): Promise<Inspection> {
    const payload = adminObject(await api<unknown>('/api/forum/moderation/reports/' + adminId(id) + '/inspect', {
      method: 'POST',
      signal,
      timeoutMs: 20_000
    }));
    const content = adminObject(payload.content);
    adminString(content.body);
    if (content.title !== undefined) adminString(content.title);
    if (content.imageDataUrl !== undefined && (typeof content.imageDataUrl !== 'string' || content.imageDataUrl.length > 1_400_000 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(content.imageDataUrl))) invalidAdminResponse();
    if (payload.readFor !== 'moderation-only' || payload.mustNotRedistribute !== true) invalidAdminResponse();
    return content as Inspection;
  }
};
