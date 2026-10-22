/** Minimal runtime contracts for public paginated pages.
 * Reject malformed HTTP 200 responses before an item can break React rendering.
 * These checks are deliberately about fields USED by the UI, not a second DTO layer.
 */
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const optionalText = (value: unknown): value is string | null => value === null || text(value);
const named = (value: Record<string, unknown>): boolean => text(value.id) && !!value.id && text(value.slug) && !!value.slug && text(value.title);

export type PublicBook = {
  id: string; slug: string; title: string; author: string; subject: string;
  accessLevel: 'free' | 'member' | 'pro'; synopsis: string; featured: boolean;
  format: string | null; hasCover: boolean;
};
export type PublicDocument = {
  id: string; slug: string; title: string; excerpt: string; subject: string;
  author: string | null; tags: string[]; publishedAt: string | null; updatedAt: string;
};
export type PublicThread = {
  id: string; title: string; body: string; category: string; authorId: string;
  author: string; visibility: string; pinned: boolean; locked: boolean;
  commentsCount: number; updatedAt: string; hasImage?: boolean;
};
export function isPublicBook(value: unknown): value is PublicBook {
  if (!record(value) || !named(value)) return false;
  return text(value.author) && text(value.subject) && text(value.synopsis) &&
    ['free','member','pro'].includes(String(value.accessLevel)) &&
    typeof value.featured === 'boolean' && typeof value.hasCover === 'boolean' && optionalText(value.format);
}
export function isPublicDocument(value: unknown): value is PublicDocument {
  if (!record(value) || !named(value)) return false;
  return text(value.excerpt) && text(value.subject) && optionalText(value.author) &&
    Array.isArray(value.tags) && value.tags.every(text) && optionalText(value.publishedAt) && text(value.updatedAt);
}
export function isPublicThread(value: unknown): value is PublicThread {
  if (!record(value)) return false;
  return text(value.id) && !!value.id && text(value.title) && text(value.body) &&
    text(value.category) && text(value.authorId) && text(value.author) &&
    text(value.visibility) && typeof value.pinned === 'boolean' &&
    typeof value.locked === 'boolean' && Number.isSafeInteger(value.commentsCount) &&
    (value.commentsCount as number) >= 0 && text(value.updatedAt);
}

/** A malformed page must fail as one request, preserving the last valid page. */
export function parsePublicCatalogPage<T>(
  payload: Record<string, unknown>,
  listKey: string,
  offset: number,
  validateItem?: (value: unknown) => value is T,
): { items: T[]; nextOffset: number | null } {
  const items = payload[listKey];
  const nextOffset = payload.nextOffset;
  if (!Array.isArray(items) || (validateItem && !items.every(validateItem)) ||
      (nextOffset !== null && (!Number.isSafeInteger(nextOffset) || (nextOffset as number) <= offset || !items.length))) {
    throw new Error('Danh mục trả về dữ liệu không hợp lệ. Vui lòng thử tải lại.');
  }
  return { items: items as T[], nextOffset: nextOffset as number | null };
}
