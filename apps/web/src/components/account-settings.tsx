'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { AuthUser } from '@thiendo/shared-types';
import { accountApi } from '@/lib/api';
import { GoogleAuthButton } from './google-auth-button';
import { PasswordField, PasswordStrength } from './account-form-controls';
import { AvatarEditor, validateAvatarFile } from './avatar-editor';
import {AccountStanding} from '@/features/admin-console/account-standing';
import { AccountSecurityExtras } from './account-security-extras';

type Section = 'profile' | 'security' | 'connections';

export function AccountSettings({ user, avatarRevision, reload, onProfileApplied, onGoogleCredential, onBusyChange }: {
  user: AuthUser;
  avatarRevision: number;
  reload: () => Promise<void>;
  onProfileApplied: (patch: Partial<AuthUser>, accountId: AuthUser['id']) => void;
  onGoogleCredential: (credential: string) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [section, setSection] = useState<Section>('profile');
  const [name, setName] = useState(user.displayName || '');
  const lastSavedName = useRef(user.displayName || '');
  // Sync account updates from other tabs, but never overwrite unsaved typing.
  useEffect(() => {
    const serverName = user.displayName || '';
    setName(current => current === lastSavedName.current ? serverName : current);
    lastSavedName.current = serverName;
  }, [user.displayName]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [securityWorking, setSecurityWorking] = useState(false);
  const workingRef = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      controller.abort();
      // External logout/account replacement can unmount a busy editor. Retire
      // its lock so the next account does not inherit a permanently busy dialog.
      if (workingRef.current) { workingRef.current = false; onBusyChange?.(false); }
    };
  }, []);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  // Use the same cache-busting revision as the top navigation. A locally
  // generated key can revert to zero each time the modal is reopened.
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => { setAvatarFailed(false); }, [user.id, user.hasAvatar, avatarRevision]);

  async function perform<T>(action: () => Promise<T>, success: string, patch?: (receipt: T) => Partial<AuthUser>) {
    // A state update is asynchronous; the ref also prevents two rapid clicks
    // from submitting duplicate profile mutations before React rerenders.
    const owner = lifetime.current;
    if (workingRef.current) return false;
    if (!owner || owner.signal.aborted) return false;
    workingRef.current = true;
    setWorking(true);
    onBusyChange?.(true);
    setError('');
    setNotice('');
    try {
      const receipt = await action();
      // Closing the dialog or changing accounts retires this editor. A committed
      // old response must never patch/reload the new account's provider.
      if (owner.signal.aborted) return false;
      // The server returns the canonical display name after whitespace
      // normalization. Never optimistically cache the unnormalized input.
      if (patch) onProfileApplied(patch(receipt), user.id);
      // The mutation already committed; a failed follow-up GET must not
      // falsely report that the save failed or encourage duplicate uploads.
      try {
        await reload();
        if (owner.signal.aborted) return false;
        setNotice(success);
      } catch {
        if (owner.signal.aborted) return false;
        setNotice(`${success} Dữ liệu đã lưu, nhưng không thể đồng bộ lại từ máy chủ. Vui lòng kiểm tra kết nối.`);
      }
      return true;
    } catch (reason) {
      if (!owner.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.');
      return false;
    } finally {
      if (!owner.signal.aborted) {
        workingRef.current = false;
        setWorking(false);
        onBusyChange?.(false);
      }
    }
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    try {
      validateAvatarFile(file);
      setAvatarFile(file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ảnh không hợp lệ.');
    }
  }

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === (user.displayName || '').trim()) return;
    void perform(() => accountApi.updateProfile(name.trim()), 'Đã cập nhật tên hiển thị.', receipt => {
      // The API collapses repeated whitespace. Keep the form, dirty-check
      // baseline and navigation identity on the same confirmed canonical value.
      // Otherwise the input can remain dirty and offer another redundant save.
      setName(receipt.displayName);
      lastSavedName.current = receipt.displayName;
      return { displayName: receipt.displayName };
    });
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setError('Hai lần nhập mật khẩu mới chưa khớp.'); return; }
    if (oldPassword === newPassword) { setError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
    void perform(async () => {
      await accountApi.changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 'Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị thu hồi.');
  }

  return <div className="account-settings">
    <header className="account-identity">
      <div className="account-profile-avatar" aria-label="Ảnh đại diện">
        {user.hasAvatar && !avatarFailed ? <img src={`/api/auth/avatar?v=${avatarRevision}`} alt="Ảnh đại diện của bạn" onError={() => setAvatarFailed(true)} />
          : <span aria-hidden="true">{(user.displayName || user.email).charAt(0).toUpperCase()}</span>}
      </div>
      <div className="account-identity-copy">
        <p className="account-identity-kicker">TÀI KHOẢN THIÊN ĐỒ</p>
        <strong>{user.displayName || 'Người dùng Thiên Đồ'}</strong>
        <p className="muted account-email">{user.email}</p>
        <p className="account-control-hint">Username: <strong>{user.username || 'Tài khoản cũ · tiếp tục đăng nhập bằng email'}</strong></p>
        <span className="account-identity-pill">{user.hasGoogle ? 'Đã liên kết Google' : 'Tài khoản email'}</span>
      </div>
    </header>

    <div className="account-tabs" role="tablist" aria-label="Cài đặt tài khoản">
      {([
        ['profile', 'Cá nhân'], ['security', 'Bảo mật'], ['connections', 'Liên kết'],
      ] as const).map(([id, label]) => <button key={id} type="button" role="tab" id={`account-tab-${id}`}
        aria-controls="account-settings-panel" aria-selected={section === id} tabIndex={section === id ? 0 : -1}
        className={section === id ? 'is-active' : ''} disabled={working || securityWorking} onClick={() => { setSection(id); setError(''); setNotice(''); }}
        onKeyDown={event => {
          if (working || securityWorking || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
          event.preventDefault();
          const tabs: Section[] = ['profile', 'security', 'connections'];
          const next = tabs[(tabs.indexOf(section) + (event.key === 'ArrowRight' ? 1 : 2)) % tabs.length];
          setSection(next);
          document.getElementById(`account-tab-${next}`)?.focus();
        }}>{label}</button>)}
    </div>

    <div id="account-settings-panel" role="tabpanel" aria-labelledby={`account-tab-${section}`} className="account-panel" key={section}>
      {section === 'profile' && <>
        <AccountStanding key={user.id} />
        <section className="account-section" aria-labelledby="avatar-heading">
          <h3 id="avatar-heading">Ảnh đại diện</h3>
          <p className="account-section-description">Ảnh cá nhân chỉ hiển thị với tài khoản của bạn.</p>
          {avatarFile ? <AvatarEditor file={avatarFile} disabled={working} onCancel={() => setAvatarFile(null)}
            onSave={async image => {
              const success = await perform(async () => { await accountApi.uploadAvatar(image); }, 'Đã cập nhật ảnh đại diện.', () => ({ hasAvatar: true }));
              if (!success) throw new Error('Lưu ảnh chưa thành công. Vui lòng thử lại.');
              setAvatarFile(null);
            }} /> : <div className="account-avatar-actions">
              <button type="button" className="btn secondary account-file-label" disabled={working}
                onClick={() => avatarInputRef.current?.click()}>Chọn ảnh mới</button>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                aria-label="Tải ảnh đại diện mới" onChange={chooseAvatar} disabled={working} />
              {user.hasAvatar && <button type="button" className="link-button" disabled={working}
                onClick={() => void perform(async () => { await accountApi.removeAvatar(); }, 'Đã xóa ảnh đại diện.', () => ({ hasAvatar: false }))}>Xóa ảnh</button>}
            </div>}
          {!avatarFile && <p className="account-control-hint">JPG, PNG hoặc WebP, tối đa 10 MB; ảnh lưu sẽ được tối ưu còn 256 × 256 px.</p>}
        </section>
        <form className="account-section" onSubmit={saveName}>
          <h3>Thông tin cá nhân</h3>
          <label className="account-control-label" htmlFor="account-display-name">Tên hiển thị</label>
          <input id="account-display-name" value={name} onChange={event => setName(event.target.value)}
            maxLength={60} minLength={2} required autoComplete="nickname" placeholder="Tên muốn hiển thị" disabled={working} />
          <div className="account-form-footer"><span className="account-control-hint">{name.length}/60 ký tự</span>
            <button className="btn gold" type="submit" disabled={working || name.trim().length < 2 || name.trim() === (user.displayName || '').trim()}>
              {working ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
        </form>
      </>}

      {section === 'security' && <><section className="account-section account-section-first">
        <h3>Đổi mật khẩu</h3>
        {user.hasPassword ? <form onSubmit={changePassword} className="account-form-stack">
          <p className="account-section-description">Đổi mật khẩu sẽ thu hồi các phiên đăng nhập khác để bảo vệ tài khoản.</p>
          <PasswordField label="Mật khẩu hiện tại" autoComplete="current-password" value={oldPassword}
            onChange={event => setOldPassword(event.target.value)} required disabled={working} maxLength={256} />
          <PasswordField label="Mật khẩu mới" autoComplete="new-password" value={newPassword}
            onChange={event => setNewPassword(event.target.value)} required minLength={10} maxLength={256} disabled={working} />
          <PasswordStrength password={newPassword} />
          <PasswordField label="Nhập lại mật khẩu mới" autoComplete="new-password" value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)} required minLength={10} maxLength={256} disabled={working} />
          {confirmPassword && newPassword !== confirmPassword && <p className="account-inline-warning">Mật khẩu chưa khớp.</p>}
          <button className="btn gold full" type="submit" disabled={working || !oldPassword || newPassword.length < 10 || newPassword !== confirmPassword}>
            {working ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</button>
        </form> : <div className="account-info-note">Tài khoản hiện đăng nhập bằng Google và mã xác minh Gmail. Bạn chưa có mật khẩu Thiên Đồ riêng.</div>}
      </section><AccountSecurityExtras onBusyChange={busy => { setSecurityWorking(busy); onBusyChange?.(busy); }} /></>}

      {section === 'connections' && <section className="account-section account-section-first">
        <h3>Tài khoản được liên kết</h3>
        <div className="account-connection-row"><span className="account-connection-symbol">G</span><div><strong>Google</strong>
          <p className="muted tiny">{user.hasGoogle ? 'Đã liên kết và có thể dùng để đăng nhập.' : 'Đăng nhập dễ dàng, không cần ghi nhớ mật khẩu khác.'}</p></div>
          <span className={`account-connection-status ${user.hasGoogle ? 'connected' : ''}`}>{user.hasGoogle ? 'Đã liên kết' : 'Chưa liên kết'}</span></div>
        {!user.hasGoogle && <><p className="account-section-description">Hãy chọn đúng email đang sử dụng. Bạn sẽ xác nhận thêm bằng mã gửi tới Gmail.</p>
          <GoogleAuthButton onCredential={onGoogleCredential} disabled={working} /></>}
        <div className="account-info-note">Thiên Đồ không tự động gộp hai tài khoản chỉ vì trùng địa chỉ email.</div>
      </section>}
    </div>
    {notice && <p role="status" aria-live="polite" className="account-success">{notice}</p>}
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
