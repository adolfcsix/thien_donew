/** Raw private-file transport. JSON API calls continue to use api(). */
export class PrivateUploadHttpError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) { super(message); }
}
export async function uploadPrivateFile(path: string, file: File, headers: Record<string, string>, signal: AbortSignal, timeoutMs = 120_000): Promise<unknown> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw RangeError('Invalid upload deadline');
  const timeout = new AbortController();
  const cancel = () => timeout.abort(signal.reason);
  if (signal.aborted) cancel();else signal.addEventListener('abort', cancel, {
    once: true
  });
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...headers
      },
      body: file,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: timeout.signal
    });
    let payload: unknown;
    try { payload = await response.json(); }
    catch (reason) {
      if (timeout.signal.aborted || response.ok) throw reason;
      // A proxy can deny an upload with HTML or an empty body. Keep the HTTP
      // failure authoritative instead of calling it a malformed success receipt.
      payload = null;
    }
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'message' in payload ? payload.message : null;
      const requestId = payload && typeof payload === 'object' && 'requestId' in payload && typeof payload.requestId === 'string' && /^[a-zA-Z0-9-]{16,64}$/.test(payload.requestId) ? payload.requestId : undefined;
      const hint = response.status === 403 ? 'Máy chủ từ chối tải tệp. Hãy kiểm tra phiên, quyền tài khoản hoặc cấu hình proxy trước khi thử lại.' : response.status === 413 ? 'Máy chủ hoặc proxy từ chối kích thước tệp. Hãy kiểm tra giới hạn tải lên.' : 'Tải tệp thất bại. Hãy kiểm tra dữ liệu đã lưu trước khi thử lại; máy chủ có thể đã nhận tệp.';
      throw new PrivateUploadHttpError(typeof detail === 'string' ? detail : `HTTP ${response.status}: ${hint}`, response.status, requestId);
    }
    return payload;
  } catch (reason) {
    if (signal.aborted) throw reason;
    if (timeout.signal.aborted) throw Error('Tải tệp quá thời gian chờ. Hãy tải lại danh sách để kiểm tra; máy chủ có thể đã nhận tệp.');
    if ((reason as Error).name === 'SyntaxError') throw Error('Biên nhận tải tệp chưa hợp lệ. Hãy tải lại danh sách để kiểm tra trước khi gửi lần nữa.');
    throw reason;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
