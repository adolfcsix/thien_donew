import { api } from '@/lib/api';
import { uploadPrivateFile } from '@/lib/upload-private-file';
import { adminId, adminInteger, adminList, adminObject, adminString, invalidAdminResponse } from '@/features/admin/response-contract';
export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number | null;
  synopsis: string;
  subject: string;
  tags: string[];
  accessLevel: 'free' | 'member' | 'pro';
  licenseName: string;
  licenseProof: string;
  status: 'draft' | 'published' | 'hidden';
  featured: boolean;
  format: string | null;
  submittedBy?:string|null;
  submissionStatus?:string;
};
export type BookForm = Omit<Book, 'format'>;
export const blankBook: BookForm = {
  id: '',
  slug: '',
  title: '',
  author: '',
  publisher: '',
  publishedYear: null,
  synopsis: '',
  subject: 'tu-vi',
  tags: [],
  accessLevel: 'free',
  licenseName: '',
  licenseProof: '',
  status: 'draft',
  featured: false
};
export const bookFieldLabels = {
  title: 'Tên sách',
  slug: 'Đường dẫn sách',
  author: 'Tác giả',
  publisher: 'Nhà xuất bản',
  subject: 'Mã bộ môn',
  licenseName: 'Giấy phép sử dụng',
  licenseProof: 'Bằng chứng quyền sử dụng'
};
export const bookFieldLimits = {
  title: 200,
  slug: 120,
  author: 160,
  publisher: 160,
  subject: 40,
  licenseName: 200,
  licenseProof: 1000
};
function book(value: unknown): Book {
  const row = adminObject(value);
  adminId(row.id);
  for (const key of ['slug', 'title', 'author', 'publisher', 'synopsis', 'subject', 'licenseName', 'licenseProof']) adminString(row[key]);
  adminList(row.tags, adminString);
  if (row.publishedYear !== null) adminInteger(row.publishedYear);
  if (!['free', 'member', 'pro'].includes(String(row.accessLevel)) || !['draft', 'published', 'hidden'].includes(String(row.status)) || typeof row.featured !== 'boolean' || row.format !== null && typeof row.format !== 'string') invalidAdminResponse();
  return row as Book;
}
export const bookAdminApi = {
  async catalog(signal: AbortSignal) {
    return adminList(adminObject(await api<unknown>('/api/books/admin/catalog', {
      signal,
      timeoutMs: 15_000
    })).books, book);
  },
  async save(form: BookForm, tags: string, signal: AbortSignal) {
    const body = {
      ...form,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 12)
    };
    const receipt = adminObject(await api<unknown>(form.id ? '/api/books/admin/' + form.id : '/api/books/admin', {
      method: form.id ? 'PATCH' : 'POST',
      body,
      signal,
      timeoutMs: 30_000
    }));
    const id = adminId(receipt.id);
    if (form.id && id !== form.id) invalidAdminResponse();
    return id;
  },
  async upload(id: string, kind: 'book' | 'cover', file: File, signal: AbortSignal) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const format = extension === 'jpg' ? 'jpeg' : extension;
    if (!format || !(kind === 'book' ? ['pdf', 'epub'] : ['jpeg', 'png', 'webp']).includes(format)) throw Error('Định dạng không phù hợp với loại tệp. Chỉ nhận PDF, EPUB, JPG, PNG hoặc WEBP.');
    if (!file.size || file.size > 24 * 1024 * 1024) throw Error('Giới hạn 24 MiB');
    const receipt = adminObject(await uploadPrivateFile('/api/books/admin/' + adminId(id) + '/assets/' + kind + '/' + format, file, {
      'X-Book-File-Bytes': String(file.size)
    }, signal));
    if (receipt.uploaded !== true || receipt.size !== file.size || receipt.kind !== kind || receipt.format !== format) invalidAdminResponse();
  }
};
