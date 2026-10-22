/** Keep transport diagnostics separate from the text displayed in account forms. */
export function accountError(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : '';
  const status = reason && typeof reason === 'object' && 'status' in reason && typeof reason.status === 'number' ? reason.status : 0;
  const ref = reason && typeof reason === 'object' && 'requestId' in reason && typeof reason.requestId === 'string' && /^[a-zA-Z0-9-]{16,64}$/.test(reason.requestId) ? reason.requestId : '';
  // A support ID allows tracing the failure in backend logs without exposing SQL.
  if (status >= 500 || /^HTTP 5\d\d$/.test(message) || message === 'Lỗi máy chủ. Vui lòng thử lại sau') {
    return `Máy chủ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.${ref ? ` Mã hỗ trợ: ${ref}` : ''}`;
  }
  if (message === 'HTTP 429') return 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.';
  if (/^HTTP \d{3}$/.test(message)) return 'Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.';
  return message || 'Có lỗi xảy ra. Vui lòng thử lại.';
}
