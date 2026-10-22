'use client';

import { useRef, useState } from 'react';
import { useAdminResource } from '@/features/admin/use-admin-resource';
import { useAdminTask } from '@/features/admin/use-admin-task';
import { emptyDocument, vanKhoAdminApi, type Revision, type Media } from './admin-api';
import { documentFingerprint } from './document-editor-state';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
export function useDocumentEditor(canWrite: boolean = false) {
  const catalog = useAdminResource(vanKhoAdminApi.catalog);
  const task = useAdminTask();
  const [form, setForm] = useState({
    ...emptyDocument
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [editingRevision, setEditingRevision] = useState<number | null>(null);
  const [editorStale, setEditorStale] = useState(false);
  const [history, setHistory] = useState<Revision[]>([]),
    [media, setMedia] = useState<Media[]>([]);
  const [livePreview, setLivePreview] = useState(false),
    [schedule, setSchedule] = useState('');
  const [newAuthor, setNewAuthor] = useState(''),
    [newBio, setNewBio] = useState(''),
    [editingAuthor, setEditingAuthor] = useState<string | null>(null);
  const [alt, setAlt] = useState(''),
    [rights, setRights] = useState(''),
    [file, setFile] = useState<File | null>(null);
  const [fileVersion, setFileVersion] = useState(0);
  const [savedFingerprint, setSavedFingerprint] = useState(() => documentFingerprint(emptyDocument));
  const unsaved = canWrite && (documentFingerprint(form) !== savedFingerprint || !!file || !!alt || !!rights);
  useUnsavedChanges(unsaved);
  function confirmDiscard() {
    return !unsaved || window.confirm('Nội dung hoặc ảnh chưa lưu sẽ bị bỏ. Bạn có muốn tiếp tục?');
  }
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const locked = task.pending || catalog.loading || !!catalog.error;
  async function loadExtras(id: string, signal: AbortSignal) {
    const result = await vanKhoAdminApi.extras(id, signal);
    if (!signal.aborted) {
      setHistory(result.history);
      setMedia(result.media);
    }
  }
  // Pure loading helper, deliberately not task.run(): restore/select share one outer lock.
  async function loadDocument(id: string, signal: AbortSignal) {
    const [document, extras] = await Promise.all([vanKhoAdminApi.preview(id, signal), vanKhoAdminApi.extras(id, signal)]);
    if (signal.aborted) return;
    setEditing(id);
    setEditingRevision(document.revision);
    setForm(document.form);
    setSavedFingerprint(documentFingerprint(document.form));
    setHistory(extras.history);
    setMedia(extras.media);
    setLivePreview(true);
    setEditorStale(false);
    setFile(null);
    setFileVersion(value => value + 1);
    setAlt('');
    setRights('');
  }
  function reset() {
    if (task.isPending()) return;
    if (!confirmDiscard()) return;
    setEditing(null);
    setEditingRevision(null);
    setEditorStale(false);
    setForm({
      ...emptyDocument
    });
    setSavedFingerprint(documentFingerprint(emptyDocument));
    setHistory([]);
    setMedia([]);
    setLivePreview(false);
    setFile(null);
    setFileVersion(value => value + 1);
    setAlt('');
    setRights('');
    setSchedule('');
    task.setError('');
    task.setNotice('');
  }
  async function select(id: string) {
    await task.run(async signal => {
      if (!confirmDiscard()) return;
      await loadDocument(id, signal);
      return 'Đang xem bản nháp có kiểm soát quyền, chưa xuất bản.';
    });
  }
  async function save() {
    if (!canWrite) return;
    if (catalog.loading || catalog.error || editorStale) return;
    await task.run(async signal => {
      const saved = await vanKhoAdminApi.save(editing, editingRevision, form, signal);
      if (signal.aborted) return;
      setEditing(saved.id);
      setEditingRevision(saved.revision);
      // A validated write acknowledgement remains committed even if ancillary reads fail.
      setSavedFingerprint(documentFingerprint(form));
      task.setNotice('Đã lưu bản nháp phiên bản ' + saved.revision + '.');
      await loadExtras(saved.id, signal);
      const refreshed = await catalog.reload();
      return 'Đã lưu bản nháp phiên bản ' + saved.revision + '. Cần duyệt lại trước khi công bố.' + (refreshed ? '' : ' Danh sách chưa đồng bộ; biểu mẫu đã giữ ID và phiên bản vừa lưu.');
    });
  }
  async function act(id: string, action: 'submit' | 'approve' | 'publish' | 'hide') {
    if (!canWrite) return;
    if (catalog.loading || catalog.error) return;
    if (id === editing && unsaved && action !== 'hide') {
      task.setError('Hãy lưu nội dung và tải hoặc bỏ ảnh chưa tải trước khi gửi duyệt hay xuất bản.');
      return;
    }
    await task.run(async signal => {
      await vanKhoAdminApi.transition(id, action, schedule, signal);
      if (signal.aborted) return;
      const refreshed = await catalog.reload();
      return (action === 'publish' && schedule ? 'Đã hẹn lịch xuất bản' : 'Đã cập nhật trạng thái bài viết') + (refreshed ? '' : '; danh sách chưa đồng bộ, hãy tải lại để kiểm tra.');
    });
  }
  async function restore(id: string, version: number) {
    if (!canWrite) return;
    await task.run(async signal => {
      if (!window.confirm(`Khôi phục phiên bản ${version} dưới dạng bản nháp mới? Lịch sử được giữ nguyên.${unsaved ? ' Nội dung và ảnh chưa lưu sẽ bị bỏ khi nạp bản khôi phục.' : ''}`)) return;
      await vanKhoAdminApi.restore(id, version, signal);
      if (signal.aborted) return;
      setEditorStale(true);
      task.setNotice('Đã khôi phục trên máy chủ. Cần nạp lại nội dung trước khi chỉnh sửa tiếp.');
      await loadDocument(id, signal);
      const refreshed = await catalog.reload();
      return 'Đã khôi phục thành một bản nháp mới; phải phê duyệt lại.' + (refreshed ? '' : ' Danh sách chưa đồng bộ.');
    });
  }
  async function showRevision(version: number) {
    if (!editing || editorStale) return;
    await task.run(async signal => {
      if (unsaved && !window.confirm('Thay nội dung hiện tại bằng phiên bản lịch sử? Các trường khác và ảnh đã chọn được giữ nguyên.')) return;
      const body = await vanKhoAdminApi.revision(editing, version, signal);
      if (!signal.aborted) {
        setLivePreview(true);
        setForm(current => ({
          ...current,
          body
        }));
      }
      return 'Đang xem nội dung lịch sử; lưu sẽ tạo một phiên bản mới.';
    });
  }
  async function addAuthor() {
    if (!canWrite) return;
    await task.run(async signal => {
      const id = await vanKhoAdminApi.saveAuthor(editingAuthor, newAuthor, newBio, signal);
      if (signal.aborted) return;
      setEditingAuthor(id);
      const refreshed = await catalog.reload();
      if (refreshed) {
        setNewAuthor('');
        setNewBio('');
        setEditingAuthor(null);
      }
      return 'Đã lưu hồ sơ tác giả.' + (refreshed ? '' : ' Danh sách chưa đồng bộ; biểu mẫu đã giữ ID tác giả vừa lưu.');
    });
  }
  async function upload() {
    if (!canWrite) return;
    if (!editing || !file || editorStale) return;
    await task.run(async signal => {
      const markdown = await vanKhoAdminApi.upload(editing, file, alt, rights, signal);
      if (signal.aborted) return;
      setForm(current => ({
        ...current,
        body: current.body + '\n\n' + markdown
      }));
      setFile(null);
      setFileVersion(value => value + 1);
      setAlt('');
      setRights('');
      task.setNotice('Ảnh đã lưu riêng tư. Hãy lưu bài để chèn ảnh; cần Admin khác xác minh quyền sử dụng.');
      await loadExtras(editing, signal);
      return 'Ảnh đã lưu riêng tư. Lưu bài để chèn ảnh; Admin khác phải xác minh quyền sử dụng trước khi xuất bản.';
    });
  }
  async function verify(asset: string) {
    if (!canWrite) return;
    if (!editing) return;
    await task.run(async signal => {
      await vanKhoAdminApi.verify(editing, asset, signal);
      await loadExtras(editing, signal);
      return 'Đã ghi nhận xác minh độc lập cho ảnh.';
    });
  }
  function insert(text: string) {
    if (!canWrite || locked || editorStale) return;
    const element = editorRef.current,
      from = element?.selectionStart ?? form.body.length,
      to = element?.selectionEnd ?? form.body.length;
    setForm(current => ({
      ...current,
      body: current.body.slice(0, from) + text + current.body.slice(to)
    }));
    element?.focus();
  }
  function discardImage() {
    if (!canWrite || task.isPending()) return;
    setFile(null);
    setFileVersion(value => value + 1);
    setAlt('');
    setRights('');
  }
  return {
    catalog,
    task,
    locked,
    editorStale,
    unsaved,
    discardImage,
    form,
    setForm,
    editing,
    editingRevision,
    history,
    media,
    livePreview,
    setLivePreview,
    schedule,
    setSchedule,
    newAuthor,
    setNewAuthor,
    newBio,
    setNewBio,
    editingAuthor,
    setEditingAuthor,
    alt,
    setAlt,
    rights,
    setRights,
    file,
    setFile,
    fileVersion,
    editorRef,
    reset,
    select,
    save,
    act,
    restore,
    showRevision,
    addAuthor,
    upload,
    verify,
    insert
  };
}
