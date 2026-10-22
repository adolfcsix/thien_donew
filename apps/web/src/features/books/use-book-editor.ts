'use client';

import { useState } from 'react';
import {useUnsavedChanges} from '@/lib/use-unsaved-changes';
import {bookFingerprint} from './book-editor-state';
import { useAdminResource } from '@/features/admin/use-admin-resource';
import { useAdminTask } from '@/features/admin/use-admin-task';
import { blankBook, bookAdminApi, type Book, type BookForm } from './admin-api';
export function useBookEditor(canWrite: boolean = false) {
  const catalog = useAdminResource(bookAdminApi.catalog);
  const task = useAdminTask();
  const [form, setForm] = useState<BookForm>({
    ...blankBook
  });
  const [tagText, setTagText] = useState('');
  const [kind, setKind] = useState<'book' | 'cover'>('book');
  const [file, setFile] = useState<File | null>(null);
  const [fileVersion, setFileVersion] = useState(0);
  const [savedFingerprint,setSavedFingerprint]=useState(()=>bookFingerprint(blankBook,''));
  const dirty=bookFingerprint(form,tagText)!==savedFingerprint;
  useUnsavedChanges(dirty||!!file);
  const locked = task.pending || catalog.loading || !!catalog.error;
  function choose(book?: Book) {
    if (task.isPending()) return;
    if((dirty||file)&&!window.confirm('Bỏ thay đổi chưa lưu và tệp chưa tải lên để mở hồ sơ sách khác?'))return;
    setSavedFingerprint(bookFingerprint(book?{...book}:{...blankBook},book?.tags.join(', ')||''));
    setForm(book ? {
      ...book
    } : {
      ...blankBook
    });
    setTagText(book?.tags.join(', ') || '');
    setFile(null);
    setFileVersion(value => value + 1);
    task.setError('');
    task.setNotice('');
  }
  async function save() {
    if (!canWrite) return;
    if (catalog.loading || catalog.error) return;
    await task.run(async signal => {
      const id = await bookAdminApi.save(form, tagText, signal);
      if (signal.aborted) return;
      setSavedFingerprint(bookFingerprint(form,tagText));
      // Keep the committed identity even when catalog read-back fails.
      setForm(current => ({
        ...current,
        id
      }));
      const refreshed = await catalog.reload();
      return 'Đã lưu bản ghi và ghi audit log.' + (refreshed ? '' : ' Chưa tải lại được danh sách; biểu mẫu vẫn giữ ID sách vừa lưu.');
    });
  }
  async function upload() {
    if (!canWrite) return;
    if (!form.id || !file || catalog.loading || catalog.error) return;
    await task.run(async signal => {
      await bookAdminApi.upload(form.id, kind, file, signal);
      if (signal.aborted) return;
      setFile(null);
      setFileVersion(value => value + 1);
      const refreshed = await catalog.reload();
      return 'Tệp đã lưu trong kho riêng tư. Cần kiểm tra quyền sử dụng trước khi xuất bản.' + (refreshed ? '' : ' Chưa tải lại được danh sách; hãy kiểm tra trước khi gửi lại tệp.');
    });
  }
  return {
    catalog,
    task,
    form,
    setForm,
    tagText,
    setTagText,
    kind,
    setKind,
    file,
    setFile,
    fileVersion,
    locked,
    choose,
    save,
    upload
  };
}
