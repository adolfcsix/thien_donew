import type { DocumentForm } from './admin-api';

/** Compare editable fields only; a revision or object key order is not a draft change. */
export function documentFingerprint(form: DocumentForm): string {
  return JSON.stringify([form.slug, form.title, form.body, form.excerpt, form.subject, form.tags, form.authorId]);
}
