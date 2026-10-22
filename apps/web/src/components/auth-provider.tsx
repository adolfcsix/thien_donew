'use client';

import {
  Fragment, createContext, useCallback, useContext, useEffect, useRef, useState,
  type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from 'react';
import { accountApi,api } from '@/lib/api';
import {LOGOUT_REVISION_KEY,logoutRevision,publishLogout,concealSession,replaceWithOpening} from '@/lib/session-exit';
import {useRouter,usePathname} from 'next/navigation';
import {loginDestination} from '@/lib/login-destination';
import {usePendingOperation} from '@/lib/use-pending-operation';
import { accountError } from '@/lib/account-error';
import type { AuthUser } from '@thiendo/shared-types';
import dynamic from 'next/dynamic';

// Profile/avatar/security UI is only needed after opening a signed-in account.
const AccountSettings = dynamic(() => import('./account-settings').then(module => module.AccountSettings), {
  loading: () => <p role="status">Đang tải cài đặt tài khoản…</p>,
});
import { GoogleAuthButton } from './google-auth-button';
import { PasswordField, PasswordStrength, VerificationCode } from './account-form-controls';
import './account-settings.css';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  avatarRevision: number;
  open: (screen?: AuthEntryScreen) => void;
  close: () => void;
  reload: () => Promise<void>;
};

type AuthEntryScreen = 'login' | 'register' | 'recover';

type GoogleChallenge = {
  challengeId: string;
  email: string;
  purpose: 'login' | 'delete';
  expiresInSeconds: number;
};

// Cross-tab notifications carry events only, never identity, passwords or OTPs.
const AUTH_CHANNEL = 'thiendo.auth-session.v1';
type AuthEvent = { type: 'signed-in' | 'signed-out' };
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router=useRouter();
  const pathname=usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [visible, setVisible] = useState(false);
  const close=useCallback(()=>setVisible(false),[]);
  const [entryIntent, setEntryIntent] = useState<{ screen: AuthEntryScreen; revision: number }>({ screen: 'login', revision: 0 });
  const open = useCallback((screen: AuthEntryScreen = 'login') => {
    setEntryIntent(current => ({ screen, revision: current.revision + 1 }));
    setVisible(true);
  }, []);
  const [exiting,setExiting]=useState(false);
  const ending=useRef(false),knownUser=useRef<string|null>(null),mountedRevision=useRef<string|null>(null);
  const returnToOpening=useCallback(()=>{if(ending.current)return;ending.current=true;setExiting(true);setVisible(false);replaceWithOpening();},[]);
  const generation = useRef(0);
  const lastSessionCheck = useRef(0);
  const sessionChannel = useRef<BroadcastChannel | null>(null);

  const reload = useCallback(async () => {
    const id = ++generation.current;
    lastSessionCheck.current = Date.now();
    setLoading(true);
    try {
      const result = await accountApi.me();
      if (generation.current === id) { setUser(result.user); setAvatarRevision(current => current + 1); }
    } catch {
      // Keep a known session visible during a transient API outage.
      // Explicit /me {user:null} and successful logout still clear it.
    } finally {
      if (generation.current === id) setLoading(false);
    }
  }, []);

  // Sessions can also be revoked by password reset, another device, or an
  // administrator. Browser-only BroadcastChannel events cannot cover those cases.
  // Silently re-check on tab return/network recovery, without flashing loading.
  // A successful /me {user:null} is authoritative; network failures are not.
  const quietlyRevalidateSession = useCallback(async () => {
    const id = ++generation.current;
    try {
      const result = await accountApi.me();
      if (generation.current === id) {
        setUser(result.user);
        setAvatarRevision(current => current + 1);
      }
    } catch {
      // A transient network outage must not masquerade as an expired session.
    } finally {
      // A focus/online check can supersede the initial full reload while its
      // spinner is still visible. The winning request must settle loading too;
      // otherwise the app can remain stuck on its loading UI indefinitely.
      if (generation.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkWhenActive = (event?: Event) => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      // Focus and visibilitychange commonly fire together. Avoid duplicate
      // requests and repeated loading for active users; no interval polling.
      if (event?.type !== 'online' && now - lastSessionCheck.current < 30_000) return;
      lastSessionCheck.current = now;
      void quietlyRevalidateSession();
    };
    window.addEventListener('focus', checkWhenActive);
    window.addEventListener('online', checkWhenActive);
    document.addEventListener('visibilitychange', checkWhenActive);
    return () => {
      window.removeEventListener('focus', checkWhenActive);
      window.removeEventListener('online', checkWhenActive);
      document.removeEventListener('visibilitychange', checkWhenActive);
    };
  }, [quietlyRevalidateSession]);

  // A confirmed server-side logout revokes local UI state without asking /me again.
  const dropLocalIdentity = useCallback(() => {
    generation.current++;
    setUser(null);
    lastSessionCheck.current = Date.now();
    setLoading(false);
    setAvatarRevision(current => current + 1);
  }, []);
  const clearUser = useCallback(() => {
    dropLocalIdentity();
    publishLogout();
    sessionChannel.current?.postMessage({ type: 'signed-out' } satisfies AuthEvent);
    returnToOpening();
  }, [dropLocalIdentity,returnToOpening]);

  // A POST may have committed the login even if the subsequent /me is offline.
  // Trust only the successful authenticated POST response; rehydrate richer profile
  // fields when available. A successful /me remains authoritative thereafter.
  const completeLogin = useCallback(async (result: { user: AuthUser }) => {
    const id = ++generation.current;
    lastSessionCheck.current = Date.now();
    setUser(current => current?.id === result.user.id ? { ...current, ...result.user } : result.user);
    setLoading(false);
    setAvatarRevision(current => current + 1);
    sessionChannel.current?.postMessage({ type: 'signed-in' } satisfies AuthEvent);
    // Reconcile the richer profile asynchronously: the authenticated POST has
    // already established identity, so a slow or offline /me must never hold
    // the navigation hostage. A later logout/login invalidates this generation.
    void accountApi.me().then(profile => {
      if (generation.current === id) setUser(profile.user);
    }).catch(() => {
      // A transient GET outage must not masquerade as a failed login.
    });
    // The signed-in POST is already confirmed. A temporary billing/access
    // outage must not turn a successful login into a misleading login error.
    // Unknown admin privileges fail closed: use the member chart as the safe
    // destination, never assume admin access from a client-side role value.
    let destination = '/chart';
    try { destination = await loginDestination(pathname, window.location.search); }
    catch { /* Safe member destination; the server protects /admin separately. */ }
    if(generation.current!==id)return;
    router.replace(destination);
  }, [router,pathname]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    sessionChannel.current = channel;
    channel.onmessage = (message: MessageEvent<AuthEvent>) => {
      if (message.data?.type === 'signed-out') {
        dropLocalIdentity();
        setVisible(false);
        returnToOpening();
      } else if (message.data?.type === 'signed-in') {
        void reload();
      }
    };
    return () => {
      channel.close();
      if (sessionChannel.current === channel) sessionChannel.current = null;
    };
  }, [dropLocalIdentity, reload,returnToOpening]);

  useEffect(()=>{
    const previous=knownUser.current;knownUser.current=user?.id||null;
    if(previous&&!user&&!loading)returnToOpening();
  },[user,loading,returnToOpening]);

  useEffect(()=>{
    mountedRevision.current=logoutRevision();
    const storage=(event:StorageEvent)=>{if(event.key===LOGOUT_REVISION_KEY&&event.newValue&&event.newValue!==event.oldValue){dropLocalIdentity();setVisible(false);returnToOpening();}};
    const hide=()=>{if(knownUser.current||ending.current)concealSession();};
    const restore=(event:PageTransitionEvent)=>{if(!event.persisted)return;concealSession();if(logoutRevision()!==mountedRevision.current){dropLocalIdentity();returnToOpening();}else window.location.reload();};
    window.addEventListener('storage',storage);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',restore);
    return()=>{window.removeEventListener('storage',storage);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',restore);};
  },[dropLocalIdentity,returnToOpening]);

  // A successful PATCH/upload is authoritative even if a follow-up GET fails.
  // Apply only fields confirmed by the server; other tabs re-read /me.
  const applyLocalProfile = useCallback((patch: Partial<AuthUser>, accountId: AuthUser['id']) => {
    // Any GET begun before a successful profile mutation is stale. Without
    // advancing the generation, a slow /me can revert the saved name/avatar.
    // Bind the mutation to its original account; late responses may not patch
    // a different identity after logout/relogin. Refuse retired account IDs
    // before invalidating the live account's in-flight /me verification.
    if (knownUser.current !== accountId) return;
    ++generation.current;
    lastSessionCheck.current = Date.now();
    setLoading(false);
    setUser(current => current?.id === accountId ? { ...current, ...patch } : current);
    setAvatarRevision(current => current + 1);
    sessionChannel.current?.postMessage({ type: 'signed-in' } satisfies AuthEvent);
  }, []);

  const refreshProfile = useCallback(async () => {
    const id = ++generation.current;
    lastSessionCheck.current = Date.now();
    const result = await accountApi.me();
    if (generation.current === id) {
      setUser(current => current?.id === result.user?.id ? result.user : null);
      setAvatarRevision(current => current + 1);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  return <AuthContext.Provider value={{ user, loading, avatarRevision, open, close, reload }}>
    {exiting?<main className="session-ending" role="status"><p>Đang trở về trang mở đầu…</p><a href="/">Về trang mở đầu</a></main>:<Fragment key={user?.id||'guest'}>{children}</Fragment>}
    {!exiting && visible && <AuthDialog key={entryIntent.revision} entryScreen={entryIntent.screen} user={user} avatarRevision={avatarRevision} close={() => setVisible(false)} refreshProfile={refreshProfile} clearUser={clearUser} completeLogin={completeLogin} applyLocalProfile={applyLocalProfile} />}
  </AuthContext.Provider>;
}

function useDialogFocus(close: () => void, pending: boolean) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const lastOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const focusable = dialog.current?.querySelector<HTMLElement>('input:not([disabled])') || dialog.current?.querySelector<HTMLElement>('button:not([disabled]),[tabindex="0"]');
      focusable?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = lastOverflow;
      previous?.focus();
    };
  }, []);

  // A submit button can become disabled and move keyboard focus to <body>.
  // Keep Escape usable even when its event no longer bubbles through the dialog.
  useEffect(() => {
    const escapeOutside = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        if (!pending) close();
      }
    };
    document.addEventListener('keydown', escapeOutside);
    return () => document.removeEventListener('keydown', escapeOutside);
  }, [close, pending]);

  function handleKey(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') { event.preventDefault(); if (!pending) close(); return; }
    if (event.key !== 'Tab') return;
    const elements = [...(dialog.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex="0"]',
    ) || [])].filter(element => element.getClientRects().length > 0);
    if (!elements.length) { event.preventDefault(); dialog.current?.focus(); return; }
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return { dialog, handleKey };
}

function AuthDialog({ entryScreen, user, avatarRevision, close, refreshProfile, clearUser, completeLogin, applyLocalProfile }: {
  entryScreen: AuthEntryScreen;
  user: AuthUser | null;
  avatarRevision: number;
  close: () => void;
  refreshProfile: () => Promise<void>;
  clearUser: () => void;
  completeLogin: (result: {user: AuthUser}) => Promise<void>;
  applyLocalProfile: (patch: Partial<AuthUser>, accountId: AuthUser['id']) => void;
}) {
  const [register, setRegister] = useState(entryScreen === 'register');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [remember, setRemember] = useState(false);
  const [password, setPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const {pending,begin,finish}=usePendingOperation();
  const [profileWorking, setProfileWorking] = useState(false);
  const [challenge, setChallenge] = useState<GoogleChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [code, setCode] = useState('');
  const [recoverStep, setRecoverStep] = useState<'email' | 'code' | null>(entryScreen === 'recover' ? 'email' : null);
  const [resetId, setResetId] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [resetIssuedAt, setResetIssuedAt] = useState<number | null>(null);
  const [resetRemaining, setResetRemaining] = useState(0);
  const { dialog, handleKey } = useDialogFocus(close, pending || profileWorking);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const input = dialog.current?.querySelector<HTMLInputElement>('.account-screen input:not([disabled])');
      input?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [challenge, recoverStep, register, user?.id]);

  useEffect(() => {
    if (!challenge) return;
    const deadline = Date.now() + challenge.expiresInSeconds * 1000;
    setRemaining(challenge.expiresInSeconds);
    const interval = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(interval);
  }, [challenge]);

  // Password recovery has its own five-minute clock and a minimum resend delay.
  // A new request receives a new challenge ID; the old OTP is never reused.
  useEffect(() => {
    if (recoverStep !== 'code' || resetIssuedAt === null) return;
    const tick = () => setResetRemaining(Math.max(0, Math.ceil((resetIssuedAt + 5 * 60_000 - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [recoverStep, resetIssuedAt]);
  const resetResendWait = resetIssuedAt === null ? 65 : Math.max(0, Math.ceil((resetIssuedAt + 65_000 - Date.now()) / 1000));

  const showError = (reason: unknown) => setError(accountError(reason));
  const screenTitle = challenge ? 'Xác minh Gmail' : !user && recoverStep ? 'Khôi phục mật khẩu' : user ? 'Hồ sơ & Bảo mật' : register ? 'Tạo tài khoản' : 'Chào mừng trở lại';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (register && password !== registerConfirm) { setError('Hai lần nhập mật khẩu chưa khớp.'); return; }
    const operation=begin();if(!operation)return;setError('');
    try {
      const result = register ? await accountApi.register(email.trim(), password, username.trim()) : await accountApi.login(email.trim(), password, remember);
      if (operation.signal.aborted) return;
      await completeLogin(result);
      if (!operation.signal.aborted) close();
    } catch (reason) { if (!operation.signal.aborted) showError(reason); } finally { finish(operation); }
  }

  async function onGoogleCredential(credential: string, purpose: 'login' | 'delete' = 'login') {
    if (pending || profileWorking) return;
    const operation=begin();if(!operation)return;setError('');
    try {
      const next = await accountApi.googleStart(credential, purpose);
      if (operation.signal.aborted) return;
      setChallenge(next); setCode('');
    } catch (reason) { if (!operation.signal.aborted) showError(reason); } finally { finish(operation); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || pending || code.length !== 6 || !remaining) return;
    const operation=begin();if(!operation)return;setError('');
    try {
      const result = await accountApi.googleVerify(challenge.challengeId, code);
      if (operation.signal.aborted) return;
      setChallenge(null); setCode('');
      if ('deleted' in result) clearUser();
      else await completeLogin(result);
      if (!operation.signal.aborted) close();
    } catch (reason) { if (!operation.signal.aborted) showError(reason); } finally { finish(operation); }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const operation=begin();if(!operation)return;setError(''); setResetDone(false);
    try {
      const started = await accountApi.requestPasswordReset(email.trim());
      if (operation.signal.aborted) return;
      setResetId(started.challengeId); setRecoverStep('code'); setCode('');
      setResetIssuedAt(Date.now());
    } catch (reason) { showError(reason); } finally { finish(operation); }
  }

  async function resendReset() {
    if (pending || resetResendWait > 0 || recoverStep !== 'code') return;
    const operation=begin();if(!operation)return;setError('');
    try {
      const started = await accountApi.requestPasswordReset(email.trim());
      if (operation.signal.aborted) return;
      setResetId(started.challengeId);
      setResetIssuedAt(Date.now());
      setCode('');
    } catch (reason) { showError(reason); } finally { finish(operation); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !resetId || code.length !== 6 || resetRemaining <= 0 || resetPasswordValue.length < 10) return;
    const operation=begin();if(!operation)return;setError('');
    try {
      await accountApi.confirmPasswordReset(resetId, code, resetPasswordValue);
      if (operation.signal.aborted) return;
      setRecoverStep(null); setCode(''); setPassword(''); setResetPasswordValue(''); setResetDone(true);
      setResetIssuedAt(null);
    } catch (reason) { showError(reason); } finally { finish(operation); }
  }

  async function logout(all = false) {
    if (pending || profileWorking) return;
    const operation=begin();if(!operation)return;setError('');
    try {
      if (all) await accountApi.logoutAll(); else await accountApi.logout();
      if (operation.signal.aborted) return;
      clearUser(); close();
    } catch (reason) {
      if (operation.signal.aborted) return;
      // The POST may have committed even if its response was lost. Never repeat a mutation.
      try{const session=await api<{user:AuthUser|null}>('/api/auth/me',{timeoutMs:5000});if(!operation.signal.aborted && !session.user){clearUser();close();return;}}catch{/* Keep the error actionable until the server can confirm logout. */}
      if (!operation.signal.aborted) showError(reason);
    } finally { finish(operation); }
  }

  async function deleteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deletePassword || pending || profileWorking) return;
    const operation=begin();if(!operation)return;setError('');
    try {
      await accountApi.remove(deletePassword);
      if (operation.signal.aborted) return;
      setDeletePassword(''); clearUser(); close();
    } catch (reason) { if (!operation.signal.aborted) showError(reason); } finally { finish(operation); }
  }

  return <div className="modal-backdrop account-backdrop" role="presentation"
    onMouseDown={event => { if (!pending && !profileWorking && event.target === event.currentTarget) close(); }}>
    <section className={`modal account-modal thien-mon-branded ${user ? 'account-modal-signed-in' : ''}`} role="dialog" aria-modal="true"
      aria-labelledby="account-dialog-title" aria-describedby="account-dialog-description" ref={dialog} tabIndex={-1} onKeyDown={handleKey}>
      <button type="button" className="icon-button close account-close" disabled={pending || profileWorking} onClick={close} aria-label="Đóng cửa sổ tài khoản">×</button>
      <div className="account-dialog-art thien-mon-auth-art" aria-hidden="true">
        <div className="thien-mon-art-scene thien-mon-art-scene--dark" />
        <div className="thien-mon-art-scene thien-mon-art-scene--light" />
        <div className="account-art-caption">
          <span>THIÊN ĐỒ · THIÊN MÔN</span>
          <strong>Cửa trời mở lối tri thức.</strong>
          <p>Chiêm nghiệm thiên tượng, lưu giữ lá số và tiếp nối hành trình nghiên cứu của riêng bạn.</p>
        </div>
      </div>
      <div className="account-dialog-content">
        <header className="account-dialog-header">
          <span className="account-kicker">THIÊN ĐỒ <i aria-hidden="true" /> TÀI KHOẢN</span>
          <h2 id="account-dialog-title" className="serif">{screenTitle}</h2>
          <p id="account-dialog-description" className="account-dialog-description">
            {challenge ? 'Thêm một bước xác nhận để bảo vệ tài khoản.'
              : !user && recoverStep ? 'Lấy lại quyền truy cập bằng mã xác minh email.'
              : user ? 'Quản lý thông tin và bảo vệ dữ liệu cá nhân.'
              : register ? 'Bắt đầu lưu giữ hành trình nghiên cứu của bạn.'
              : 'Đăng nhập để tiếp tục nơi bạn đã dừng lại.'}
          </p>
        </header>

        <div className="account-screen" key={challenge ? 'challenge' : recoverStep || (user ? 'profile' : register ? 'register' : 'login')}>
          {challenge ? <>
            <div className="account-info-note">Nhập mã 6 chữ số gửi tới <strong>{challenge.email}</strong>. Mã chỉ dùng một lần.</div>
            <form onSubmit={verify} className="account-form-stack">
              <VerificationCode value={code} onChange={setCode} disabled={pending || remaining <= 0} />
              <div className="account-code-clock" role="status">
                {remaining > 0 ? <>Mã hết hạn sau <strong>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</strong></> : 'Mã đã hết hạn. Hãy xác minh Google lại để lấy mã mới.'}
              </div>
              <button className="btn gold full account-primary" type="submit" disabled={pending || code.length !== 6 || remaining <= 0}>
                {pending ? 'Đang xác minh…' : challenge.purpose === 'delete' ? 'Xác minh và xóa tài khoản' : 'Xác minh và tiếp tục'}
              </button>
            </form>
            <button className="link-button" type="button" disabled={pending} onClick={() => { setChallenge(null); setCode(''); setError(''); }}>
              Quay lại chọn Google</button>
          </> : !user && recoverStep ? <>
            {recoverStep === 'email' ? <form onSubmit={requestReset} className="account-form-stack">
              <p className="account-section-description">Nhập email đã đăng ký. Nếu có tài khoản dùng mật khẩu, bạn sẽ nhận được mã khôi phục.</p>
              <label className="account-control-label" htmlFor="recovery-email">Email đăng ký</label>
              <input id="recovery-email" type="email" required maxLength={150} autoComplete="email" value={email}
                onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" disabled={pending} />
              <button className="btn gold full account-primary" type="submit" disabled={pending}>{pending ? 'Đang gửi…' : 'Tiếp tục'}</button>
            </form> : <form onSubmit={resetPassword} className="account-form-stack">
              <p className="account-section-description">Nếu tài khoản đủ điều kiện, mã 6 số đã được gửi tới email. Hãy kiểm tra cả Spam.</p>
              <VerificationCode value={code} onChange={setCode} disabled={pending || resetRemaining <= 0} />
              <p className="account-code-clock" role="status">{resetRemaining > 0
                ? <>Mã có hiệu lực trong <strong>{Math.floor(resetRemaining / 60)}:{String(resetRemaining % 60).padStart(2, '0')}</strong></>
                : 'Mã đã hết hạn. Bạn có thể yêu cầu mã khác.'}</p>
              <PasswordField label="Mật khẩu mới" autoComplete="new-password" minLength={10} maxLength={256}
                required value={resetPasswordValue} onChange={event => setResetPasswordValue(event.target.value)} disabled={pending} />
              <PasswordStrength password={resetPasswordValue} />
              <button className="btn gold full account-primary" type="submit" disabled={pending || code.length !== 6 || resetRemaining <= 0 || resetPasswordValue.length < 10}>
                {pending ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}</button>
              <div className="account-recovery-actions">
                <button type="button" className="link-button" disabled={pending || resetResendWait > 0}
                  onClick={() => void resendReset()}>{resetResendWait > 0 ? `Gửi lại mã sau ${resetResendWait}s` : 'Gửi mã mới'}</button>
                <button type="button" className="link-button" disabled={pending}
                  onClick={() => { setRecoverStep('email'); setResetId(''); setResetIssuedAt(null); setCode(''); setError(''); }}>Đổi email</button>
              </div>
            </form>}
            <button type="button" className="link-button" disabled={pending}
              onClick={() => { setRecoverStep(null); setError(''); setCode(''); }}>Quay lại đăng nhập</button>
          </> : user ? <>
            <AccountSettings key={user.id} user={user} avatarRevision={avatarRevision} reload={refreshProfile} onProfileApplied={applyLocalProfile} onGoogleCredential={onGoogleCredential} onBusyChange={setProfileWorking} />
            <div className="account-session-actions">
              <div className="account-button-row"><button className="btn secondary" type="button" disabled={pending || profileWorking} onClick={() => void logout(false)}>Đăng xuất</button>
                <button type="button" className="link-button" disabled={pending || profileWorking} onClick={() => void logout(true)}>Đăng xuất mọi thiết bị</button></div>
              <div className="account-danger-zone">
                <button type="button" className="text-danger" disabled={pending || profileWorking}
                  aria-expanded={confirmDelete} onClick={() => { setConfirmDelete(current => !current); setDeletePassword(''); setError(''); }}>
                  {confirmDelete ? 'Hủy yêu cầu xóa' : 'Xóa tài khoản và dữ liệu'}</button>
                {confirmDelete && (user.hasPassword ? <form onSubmit={deleteUser} className="account-form-stack account-delete-form">
                  <p className="account-inline-warning">Thao tác không thể khôi phục. Nhập mật khẩu để xác nhận xóa vĩnh viễn.</p>
                  <PasswordField label="Mật khẩu xác nhận" value={deletePassword} autoComplete="current-password" required maxLength={256}
                    onChange={event => setDeletePassword(event.target.value)} disabled={pending || profileWorking} />
                  <button type="submit" className="btn secondary full" disabled={pending || profileWorking || !deletePassword}>Xác nhận xóa tài khoản</button>
                </form> : <div className="account-form-stack account-delete-form">
                  <p className="account-inline-warning">Vui lòng xác minh lại Google và mã Gmail để xóa vĩnh viễn tài khoản.</p>
                  <GoogleAuthButton disabled={pending || profileWorking} onCredential={credential => onGoogleCredential(credential, 'delete')} />
                </div>)}
              </div>
            </div>
          </> : <>
            {resetDone && <p className="account-success" role="status">Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</p>}
            <form onSubmit={submit} className="account-form-stack">
              {register && <><label className="account-control-label" htmlFor="account-username">Username riêng</label>
              <input id="account-username" value={username} onChange={event => setUsername(event.target.value)} required minLength={4} maxLength={32} pattern="[a-zA-Z][a-zA-Z0-9_]{3,31}" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby="username-rule" disabled={pending}/>
              <small id="username-rule">4–32 ký tự a-z, 0-9, dấu _; bắt đầu bằng chữ. Không phân biệt hoa thường.</small></>}
              <label className="account-control-label" htmlFor="account-email">{register ? 'Email' : 'Username hoặc email'}</label>
              <input id="account-email" value={email} type={register ? 'email' : 'text'} required maxLength={150} autoComplete={register ? 'email' : 'username'} autoCapitalize="none" spellCheck={false}
                onChange={event => setEmail(event.target.value)} placeholder={register ? "ban@example.com" : "Username hoặc email"} disabled={pending} />
              <PasswordField label="Mật khẩu" value={password} minLength={register ? 10 : 1} required maxLength={256}
                autoComplete={register ? 'new-password' : 'current-password'} onChange={event => setPassword(event.target.value)} disabled={pending} />
              {register && <>
                <PasswordStrength password={password} />
                <PasswordField label="Nhập lại mật khẩu" value={registerConfirm} minLength={10} required maxLength={256}
                  autoComplete="new-password" onChange={event => setRegisterConfirm(event.target.value)} aria-invalid={Boolean(registerConfirm && password !== registerConfirm)} disabled={pending} />
                {registerConfirm && password !== registerConfirm && <p className="account-inline-warning">Mật khẩu chưa khớp.</p>}
              </>}
              {!register && <label className="account-remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} disabled={pending}/> Ghi nhớ phiên 7 ngày trên thiết bị này</label>}
              {!register && <button type="button" className="link-button account-forgot" disabled={pending}
                onClick={() => { setRecoverStep('email'); setError(''); }}>Quên mật khẩu?</button>}
              <button type="submit" className="btn gold full account-primary" disabled={pending || (register && (password.length < 10 || password !== registerConfirm))}>
                {pending ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'} <span aria-hidden="true">→</span>
              </button>
            </form>
            <div className="account-separator"><span>hoặc tiếp tục với</span></div>
            <GoogleAuthButton disabled={pending} onCredential={onGoogleCredential} />
            <p className="account-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
              <button type="button" className="link-button" disabled={pending}
                onClick={() => { setRegister(current => !current); setRegisterConfirm(''); setError(''); setResetDone(false); }}>
                {register ? 'Đăng nhập' : 'Đăng ký miễn phí'}</button></p>
          </>}
        </div>
        {pending && <p className="account-pending" role="status"><span aria-hidden="true" className="account-spinner" /> Đang xử lý yêu cầu…</p>}
        {error && <p className="error account-error" role="alert">{error}</p>}
        {error && user && <button type="button" className="btn secondary" disabled={pending} onClick={async()=>{
          const operation=begin();if(!operation)return;setError('');try{await completeLogin({user});close();}catch(reason){showError(reason);}finally{finish(operation);}
        }}>Tiếp tục vào không gian tài khoản</button>}
      </div>
    </section>
  </div>;
}
