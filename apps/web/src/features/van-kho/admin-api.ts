import { api } from '@/lib/api';
import { uploadPrivateFile } from '@/lib/upload-private-file';
import { adminId, adminInteger, adminList, adminObject, adminString, invalidAdminResponse } from '@/features/admin/response-contract';
export type DocumentItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  revision: number;
  author: string | null;
};
export type Author = {
  id: string;
  name: string;
  bio: string;
};
export type Revision = {
  version: number;
  title: string;
  editorId: string;
  createdAt: string;
};
export type Media = {
  id: string;
  alt: string;
  rights: string;
  reviewedAt: string | null;
  uploadedBy: string;
};
export type DocumentForm = {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  subject: string;
  tags: string;
  authorId: string;
};
export const emptyDocument: DocumentForm = {
  slug: '',
  title: '',
  body: '',
  excerpt: '',
  subject: 'nhap-mon',
  tags: '',
  authorId: ''
};
export const documentSubjects = ['nhap-mon', 'tu-vi', 'bat-tu', 'mai-hoa', 'luc-hao', 'ky-mon', 'kinh-dich', 'phong-thuy', 'lich-phap', 'chiem-tinh', 'tarot', 'than-so-hoc', 'truong-phai', 'doi-chieu', 'thuc-hanh', 'khac'];
type Action = 'submit' | 'approve' | 'publish' | 'hide';
function documentItem(raw: unknown): DocumentItem {
  const row = adminObject(raw);
  adminId(row.id);
  adminInteger(row.revision, 1);
  for (const key of ['slug', 'title']) adminString(row[key]);
  if (!['draft', 'pending', 'approved', 'published', 'scheduled', 'hidden'].includes(String(row.status)) || row.author !== null && typeof row.author !== 'string') invalidAdminResponse();
  return row as DocumentItem;
}
function author(raw: unknown): Author {
  const row = adminObject(raw);
  adminId(row.id);
  adminString(row.name);
  adminString(row.bio);
  return row as Author;
}
export const vanKhoAdminApi = {
  async catalog(signal: AbortSignal) {
    const [documents, authors] = await Promise.all([api<unknown>('/api/van-kho/admin/documents', {
      signal,
      timeoutMs: 15_000
    }), api<unknown>('/api/van-kho/authors', {
      signal,
      timeoutMs: 15_000
    })]);
    return {
      items: adminList(adminObject(documents).documents, documentItem),
      authors: adminList(adminObject(authors).authors, author)
    };
  },
  async extras(id: string, signal: AbortSignal) {
    const [revisions, images] = await Promise.all([api<unknown>('/api/van-kho/admin/documents/' + adminId(id) + '/revisions', {
      signal,
      timeoutMs: 15_000
    }), api<unknown>('/api/van-kho/admin/documents/' + id + '/images', {
      signal,
      timeoutMs: 15_000
    })]);
    return {
      history: adminList(adminObject(revisions).revisions, value => {
        const row = adminObject(value);
        adminInteger(row.version, 1);
        adminString(row.title);
        adminId(row.editorId);
        adminString(row.createdAt);
        return row as Revision;
      }),
      media: adminList(adminObject(images).images, value => {
        const row = adminObject(value);
        adminId(row.id);
        adminString(row.alt);
        adminString(row.rights);
        adminId(row.uploadedBy);
        if (row.reviewedAt !== null) adminString(row.reviewedAt);
        return row as Media;
      })
    };
  },
  async preview(id: string, signal: AbortSignal) {
    const row = adminObject(adminObject(await api<unknown>('/api/van-kho/admin/documents/' + adminId(id) + '/preview', {
      signal,
      timeoutMs: 15_000
    })).document);
    if (adminId(row.id) !== id) invalidAdminResponse();
    const revision = adminInteger(row.revision, 1);
    const form: DocumentForm = {
      slug: adminString(row.slug),
      title: adminString(row.title),
      body: adminString(row.body),
      excerpt: adminString(row.excerpt),
      subject: adminString(row.subject),
      tags: adminList(row.tags, adminString).join(','),
      authorId: row.author_id === null ? '' : adminId(row.author_id)
    };
    return {
      form,
      revision
    };
  },
  async save(id: string | null, revision: number | null, form: DocumentForm, signal: AbortSignal) {
    const body = {
      ...form,
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      authorId: form.authorId || null,
      ...(id ? {
        expectedRevision: revision
      } : {})
    };
    // api() owns JSON serialization. Passing JSON.stringify(body) here breaks the server contract.
    const row = adminObject(await api<unknown>('/api/van-kho/admin/documents' + (id ? '/' + adminId(id) : ''), {
      method: id ? 'PATCH' : 'POST',
      body,
      signal,
      timeoutMs: 30_000
    }));
    const saved = {
      id: adminId(row.id),
      revision: adminInteger(row.revision, 1)
    };
    if (row.status !== 'draft' || id && saved.id !== id || saved.revision !== (id ? (revision ?? 0) + 1 : 1)) invalidAdminResponse();
    return saved;
  },
  async transition(id: string, action: Action, schedule: string, signal: AbortSignal) {
    if (schedule && action === 'publish' && !Number.isFinite(Date.parse(schedule))) throw Error('Lịch hẹn không hợp lệ');
    const body = action === 'publish' && schedule ? {
      scheduledAt: new Date(schedule).toISOString()
    } : {};
    const row = adminObject(await api<unknown>('/api/van-kho/admin/documents/' + adminId(id) + '/' + action, {
      method: 'POST',
      body,
      signal,
      timeoutMs: 30_000
    }));
    const expected = action === 'submit' ? 'pending' : action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : schedule ? 'scheduled' : 'published';
    if (row.id !== id || row.status !== expected) invalidAdminResponse();
  },
  async restore(id: string, version: number, signal: AbortSignal) {
    const row = adminObject(await api<unknown>('/api/van-kho/admin/documents/' + adminId(id) + '/restore/' + version, {
      method: 'POST',
      body: {},
      signal,
      timeoutMs: 30_000
    }));
    if (row.id !== id || row.status !== 'draft' || row.restoredFrom !== version) invalidAdminResponse();
    adminInteger(row.revision, 1);
  },
  async revision(id: string, version: number, signal: AbortSignal) {
    const row = adminObject(adminObject(await api<unknown>('/api/van-kho/admin/documents/' + adminId(id) + '/revisions/' + version, {
      signal,
      timeoutMs: 15_000
    })).revision);
    if (row.version !== version) invalidAdminResponse();
    return adminString(row.body);
  },
  async saveAuthor(id: string | null, name: string, bio: string, signal: AbortSignal) {
    const row = adminObject(await api<unknown>('/api/van-kho/admin/authors' + (id ? '/' + adminId(id) : ''), {
      method: id ? 'PATCH' : 'POST',
      body: {
        name,
        bio
      },
      signal,
      timeoutMs: 30_000
    }));
    const result = adminId(row.id);
    if (id && result !== id) invalidAdminResponse();
    return result;
  },
  async upload(id: string, file: File, alt: string, rights: string, signal: AbortSignal) {
    const format = file.type === 'image/jpeg' ? 'jpeg' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : null;
    if (!format || file.size > 5 * 1024 * 1024 || file.size < 32) throw Error('Chỉ hỗ trợ PNG, JPG, WebP tối đa 5 MiB.');
    if (!alt.trim() || !rights.trim()) throw Error('Cần mô tả ảnh và nguồn/giấy phép sử dụng');
    const row = adminObject(await uploadPrivateFile('/api/van-kho/admin/documents/' + adminId(id) + '/images/' + format, file, {
      'X-Image-Alt': encodeURIComponent(alt),
      'X-Image-Rights': encodeURIComponent(rights),
      'X-Image-File-Bytes': String(file.size)
    }, signal));
    const assetId = adminId(row.id),
      markdown = adminString(row.markdown);
    if (row.uploaded !== true || row.reviewed !== false || !markdown.endsWith('](vk-image:' + assetId + ')')) invalidAdminResponse();
    return markdown;
  },
  async verify(id: string, asset: string, signal: AbortSignal) {
    const row = adminObject(await api<unknown>('/api/van-kho/admin/documents/' + adminId(id) + '/images/' + adminId(asset) + '/verify', {
      method: 'POST',
      body: {},
      signal,
      timeoutMs: 30_000
    }));
    if (row.verified !== true) invalidAdminResponse();
  }
};
