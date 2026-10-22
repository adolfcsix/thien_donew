/** Transactional email adapter: never send OTP to stdout, logs or browser. */
import { ServiceUnavailableException } from '@nestjs/common';

export async function sendVerificationCode(email: string, code: string, purpose: 'login' | 'password' | 'email' = 'login'): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const sender = process.env.AUTH_EMAIL_FROM;
  if (!key || !sender) throw new ServiceUnavailableException('Máy chủ chưa cấu hình email xác minh');
  let response: globalThis.Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sender, to: [email], subject: purpose === 'login' ? 'Mã xác minh đăng nhập Thiên Đồ' : purpose === 'email' ? 'Xác minh email tài khoản Thiên Đồ' : 'Mã đặt lại mật khẩu Thiên Đồ',
        text: `Mã xác minh Thiên Đồ: ${code}\nMã có hiệu lực trong 5 phút. Nếu không yêu cầu, hãy bỏ qua email này. Không chia sẻ mã với bất kỳ ai.` }),
    });
  } catch { throw new ServiceUnavailableException('Chưa gửi được mã xác minh, thử lại sau'); }
  if (!response.ok) throw new ServiceUnavailableException('Dịch vụ gửi email chưa sẵn sàng');
}
