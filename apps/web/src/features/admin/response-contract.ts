/** Shared primitives for admin JSON boundaries; no network or UI state here. */
export function invalidAdminResponse(): never {
  throw Error('Phản hồi quản trị chưa hợp lệ. Hãy tải lại để kiểm tra dữ liệu trước khi thao tác tiếp.');
}
export function adminObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidAdminResponse();
  return value as Record<string, unknown>;
}
export function adminString(value: unknown): string {
  if (typeof value !== 'string') invalidAdminResponse();
  return value;
}
export function adminId(value: unknown): string {
  const id = adminString(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) invalidAdminResponse();
  return id;
}
export function adminInteger(value: unknown, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) invalidAdminResponse();
  return value;
}
export function adminList<T>(value: unknown, parse: (entry: unknown) => T): T[] {
  if (!Array.isArray(value)) invalidAdminResponse();
  return value.map(parse);
}
export function adminUpdated(value: unknown): void {
  if (adminObject(value).updated !== true) invalidAdminResponse();
}
