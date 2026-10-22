'use client';

import { useEffect, useRef, useState } from 'react';
import { accountApi } from '@/lib/api';
import { accountError } from '@/lib/account-error';

type GoogleSdk = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        nonce: string;
        callback: (value: { credential?: string }) => void;
        auto_select: boolean;
      }) => void;
      renderButton: (container: HTMLElement, settings: Record<string, unknown>) => void;
    };
  };
};
type GoogleWindow = Window & { google?: GoogleSdk };
type Availability = 'checking' | 'enabled' | 'disabled' | 'error';
let loadingSdk: Promise<void> | undefined;
const NONCE_REFRESH_MS = 4 * 60 * 1000;

function loadGoogleSdk(): Promise<void> {
  if ((window as GoogleWindow).google) return Promise.resolve();
  if (loadingSdk) return loadingSdk;
  loadingSdk = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => {
      cleanup(); script.remove();
      reject(new Error('Kết nối Google quá thời gian chờ. Vui lòng thử lại.'));
    }, 15_000);
    const cleanup = () => {
      window.clearTimeout(timer);
      script.onload = null; script.onerror = null;
    };
    script.onload = () => { cleanup(); resolve(); };
    script.onerror = () => { cleanup(); script.remove(); reject(new Error('Không thể kết nối Google Sign-In.')); };
    document.head.appendChild(script);
  }).catch(error => { loadingSdk = undefined; throw error; });
  return loadingSdk;
}

export function GoogleAuthButton({ onCredential, disabled = false }: {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  const disabledRef = useRef(disabled);
  const inFlight = useRef(false);
  handler.current = onCredential;
  disabledRef.current = disabled;
  const [available, setAvailable] = useState<Availability>('checking');
  const [message, setMessage] = useState('');
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let refreshed = false;
    let nonceIssuedAt = 0;
    let renewalTimer: number | null = null;
    const renew = () => {
      if (cancelled || refreshed) return;
      refreshed = true;
      setEpoch(current => current + 1);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && nonceIssuedAt && Date.now() - nonceIssuedAt >= NONCE_REFRESH_MS) renew();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    async function init() {
      setAvailable('checking');
      setMessage('');
      try {
        const config = await accountApi.googleConfig();
        if (cancelled) return;
        if (!config.enabled || !config.clientId) { setAvailable('disabled'); return; }
        const { nonce } = await accountApi.googleNonce();
        nonceIssuedAt = Date.now();
        await loadGoogleSdk();
        if (cancelled || !mount.current) return;
        const sdk = (window as GoogleWindow).google;
        if (!sdk) throw new Error('Google Sign-In chưa tải được.');
        sdk.accounts.id.initialize({
          client_id: config.clientId, nonce, auto_select: false,
          callback: answer => {
            if (!answer.credential || cancelled || disabledRef.current || inFlight.current) return;
            inFlight.current = true;
            void handler.current(answer.credential)
              .catch(reason => {
                if (!cancelled) {
                  setAvailable('error');
                  setMessage(accountError(reason));
                }
              })
              .finally(() => {
                // Preserve the error state until the user explicitly retries.
                // Starting a new nonce here would immediately erase the message.
                inFlight.current = false;
              });
          },
        });
        // The SDK draws the official Google control; CSS only styles our surrounding panel.
        const container = mount.current;
        container.replaceChildren();
        sdk.accounts.id.renderButton(container, {
          type: 'standard', theme: 'outline', size: 'large',
          text: 'continue_with', shape: 'pill',
          width: Math.min(320, Math.max(200, Math.floor(container.getBoundingClientRect().width))),
        });
        setAvailable('enabled');
        renewalTimer = window.setTimeout(renew, Math.max(1000, NONCE_REFRESH_MS - (Date.now() - nonceIssuedAt)));
      } catch (reason) {
        if (!cancelled) {
          setAvailable('error');
          setMessage(accountError(reason));
        }
      }
    }
    void init();
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisibilityChange); if (renewalTimer !== null) window.clearTimeout(renewalTimer); };
  }, [epoch]);

  return <div className="google-auth-area" aria-live="polite">
    <div ref={mount} className={`google-auth-mount${disabled || available !== 'enabled' ? ' google-auth-disabled' : ''}`}
      inert={disabled || available !== 'enabled'} aria-busy={available === 'checking'}
      aria-label="Đăng nhập hoặc liên kết bằng Google" />
    {available === 'checking' && <p className="muted tiny">Đang kết nối Google…</p>}
    {available === 'disabled' && <p className="muted tiny">Google Sign-In chưa được quản trị viên kích hoạt.</p>}
    {available === 'error' && <div className="account-google-error"><p className="error" role="alert">{message}</p>
      <button type="button" className="link-button" disabled={disabled} onClick={() => setEpoch(current => current + 1)}>Thử kết nối lại</button></div>}
    {available === 'enabled' && <p className="muted tiny">Bạn sẽ nhận mã xác minh qua Gmail sau khi chọn tài khoản.</p>}
  </div>;
}
