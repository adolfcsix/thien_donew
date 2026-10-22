'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  hint?: string;
};

/** Every password field is labelled and can reveal its content without losing focus. */
export function PasswordField({ label, hint, id, ...inputProps }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [revealed, setRevealed] = useState(false);

  return <div className="account-control">
    <label htmlFor={inputId} className="account-control-label">{label}</label>
    <div className="account-input-wrap">
      <input id={inputId} type={revealed ? 'text' : 'password'} {...inputProps} />
      <button type="button" className="account-reveal" aria-label={revealed ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        aria-pressed={revealed} disabled={inputProps.disabled} onClick={() => setRevealed(v => !v)}>
        {revealed ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
    {hint && <p className="account-control-hint">{hint}</p>}
  </div>;
}

/** Preserve a single input for native OTP autofill, paste, and assistive technologies. */
export function VerificationCode({ value, onChange, disabled = false }: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return <div className="account-control">
    <label className="account-control-label" htmlFor={id}>Mã xác minh 6 chữ số</label>
    <input id={id} className="account-otp-input" type="text" inputMode="numeric" autoComplete="one-time-code"
      pattern="[0-9]{6}" maxLength={6} required disabled={disabled} placeholder="••••••"
      value={value} onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} />
    <p className="account-control-hint">Bạn có thể dán cả 6 chữ số trong một lần.</p>
  </div>;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const flags = [password.length >= 10, /[A-ZÀ-Ỹ]/.test(password), /[a-zà-ỹ]/.test(password), /\d|[^\p{L}\p{N}]/u.test(password)];
  const score = flags.filter(Boolean).length;
  return <div className="account-password-strength" aria-label={`Độ mạnh mật khẩu: ${score <= 1 ? 'yếu' : score <= 2 ? 'trung bình' : 'khá'}`}>
    <div aria-hidden="true" className="account-strength-track">{[0, 1, 2, 3].map(i => <span key={i} data-filled={i < score} data-score={score} />)}</div>
    <span>{password.length < 10 ? 'Cần ít nhất 10 ký tự' : 'Nên dùng mật khẩu dài, khó đoán và duy nhất.'}</span>
  </div>;
}
