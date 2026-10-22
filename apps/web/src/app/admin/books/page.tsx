'use client';

import {useMemo,useState} from 'react';
import {BookSubjectSelect} from '@/features/books/book-subject-select';
import Link from 'next/link';
import { useAdminSession } from '@/features/membership/admin-session';
import { AdminFeedback } from '@/features/admin/admin-feedback';
import { useBookEditor } from '@/features/books/use-book-editor';
import { bookFieldLabels, bookFieldLimits, type Book } from '@/features/books/admin-api';
import styles from '../../books/books.module.css';

/** Layout and labels only. Network/contracts/editor transitions live in features/books. */
export default function AdminBooks() {
  const {capabilities} = useAdminSession();
  const canWrite = capabilities.includes('library.write');
  const editor = useBookEditor(canWrite);
  const {
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
  } = editor;
  const books = catalog.data || [];
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const visible=useMemo(()=>books.filter(b=>(filter==='all'||filter==='pending'?filter==='all'||b.submissionStatus==='pending':b.status===filter)&&(!query.trim()||[b.title,b.author,b.slug].join(' ').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))),[books,filter,query]);
  const pendingCount=books.filter(b=>b.submissionStatus==='pending').length;
  return <main className={styles.root}>
    <header className={styles.hero}>
      <span className={styles.eyebrow}>ADMIN · TÀNG THƯ CÁC</span>
      <h1 className="serif">Quản trị sách</h1>
      <p>Đăng nhập quản trị và xác minh MFA tại <Link className={styles.link} href="/admin">Bàn điều hành</Link> trước khi sử dụng. Backend kiểm tra lại quyền trên từng yêu cầu.</p>
    </header>
    {!canWrite && <p role="status">Bạn được xem phân hệ này. Quyền chỉnh sửa do chủ hệ thống phân công.</p>}
    <AdminFeedback errorClass={styles.error} noticeClass={styles.notice} loading={catalog.loading} loadError={catalog.error} error={task.error} notice={task.notice} pending={task.pending} onRetry={() => void catalog.reload()} />
    <div className={styles.actions}>
      <button className={styles.button} disabled={locked || !canWrite} onClick={() => choose()}>+ Sách mới</button>
      <button className={styles.button} disabled={catalog.loading || task.pending} onClick={() => void catalog.reload()}>Làm mới</button>
    </div>
    <section className={styles.toolbar} aria-label="Lọc sách quản trị"><label className={styles.label}>Tìm tên, tác giả, đường dẫn<input type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)}/></label><label className={styles.label}>Hàng sách<select aria-label="Hàng sách" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả sách đã tải</option><option value="pending">Chuyên gia chờ duyệt ({pendingCount})</option><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="hidden">Đã ẩn</option></select></label><p role="status">{visible.length}/{books.length} sách đã tải · tối đa 200 đầu sách gần nhất, ưu tiên chờ duyệt.</p></section>
    <div className={styles.table}>
      <table>
        <thead>
          <tr>
            <th>Tên sách</th>
            <th>Trạng thái</th>
            <th>Tệp</th>
            <th>Chỉnh sửa</th>
          </tr>
        </thead>
        <tbody>
          {!catalog.loading&&!catalog.error&&!visible.length&&<tr><td colSpan={4}>Không có sách khớp bộ lọc.</td></tr>}
          {!catalog.loading && !catalog.error && visible.map(b => <tr key={b.id}>
            <td>
              {b.title}
              <small> · {b.author}</small>
            </td>
            <td>{{draft:'Bản nháp',published:'Đã xuất bản',hidden:'Đã ẩn'}[b.status]} · {{free:'Miễn phí',member:'Thành viên',pro:'Pro'}[b.accessLevel]}{b.submittedBy&&<small> · Chuyên gia gửi: {b.submissionStatus==='pending'?'Chờ duyệt':b.submissionStatus==='reviewed'?'Đã duyệt':'Bản nháp'}</small>}</td>
            <td>
              {b.format || 'Chưa tải'}
            </td>
            <td>
              <button className={styles.button} disabled={locked} onClick={() => choose(b)}>Chọn</button>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <form onSubmit={e => {
      e.preventDefault();
      void save();
    }}>
      <fieldset className={styles.form} disabled={locked || !canWrite} style={{
        border: 0,
        margin: 0,
        minWidth: 0
      }}>
        <h2 className={styles.wide}>
          {form.id ? 'Chỉnh sửa' : 'Tạo sách bản nháp'}
        </h2>
        {(['title', 'slug', 'author', 'publisher', 'licenseName', 'licenseProof'] as const).map(key => <label key={key} className={styles.label}>
          {bookFieldLabels[key]}
          <input value={form[key]} required={['title', 'slug', 'author', 'subject'].includes(key)} maxLength={bookFieldLimits[key]} onChange={e => setForm(x => ({
            ...x,
            [key]: e.target.value
          }))} />
        </label>)}
        <label className={styles.label}>Bộ môn<BookSubjectSelect value={form.subject} onChange={subject=>setForm(x=>({...x,subject}))}/></label>
        <label className={styles.label}>Năm xuất bản<input type="number" min={1450} max={2150} value={form.publishedYear ?? ''} onChange={e => setForm(x => ({
            ...x,
            publishedYear: e.target.value ? Number(e.target.value) : null
          }))} /></label>
        <label className={styles.label}>Quyền đọc<select value={form.accessLevel} onChange={e => setForm(x => ({
            ...x,
            accessLevel: e.target.value as Book['accessLevel']
          }))}>
            <option value="free">Miễn phí</option>
            <option value="member">Đăng nhập</option>
            <option value="pro">Pro</option>
          </select></label>
        <label className={styles.label}>Trạng thái<select value={form.status} onChange={e => setForm(x => ({
            ...x,
            status: e.target.value as Book['status']
          }))}>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="hidden">Ẩn</option>
          </select></label>
        <label className={styles.label}>Nổi bật<input type="checkbox" checked={form.featured} onChange={e => setForm(x => ({
            ...x,
            featured: e.target.checked
          }))} /></label>
        <label className={styles.label + ' ' + styles.wide}>Giới thiệu<textarea maxLength={4000} value={form.synopsis} onChange={e => setForm(x => ({
            ...x,
            synopsis: e.target.value
          }))} /></label>
        <label className={styles.label + ' ' + styles.wide}>Tags (phân tách bằng dấu phẩy)<input value={tagText} onChange={e => setTagText(e.target.value)} /></label>
        <button className={styles.button} disabled={locked || !canWrite}>
          {task.pending ? 'Đang lưu…' : 'Lưu thông tin sách'}
        </button>
      </fieldset>
    </form>
    <section className={styles.notice}>
      <h2>Tải tệp riêng tư</h2>
      <p className={styles.summary}>Chỉ tải tệp sau khi đã tạo sách. Giới hạn 24 MiB. Đưa về bản nháp trước khi thay tệp của sách đã xuất bản. Không tự xuất bản nội dung chưa xác minh bản quyền.</p>
      <form onSubmit={e => {
        e.preventDefault();
        void upload();
      }}>
        <fieldset className={styles.toolbar} disabled={locked || !canWrite} style={{
          border: 0,
          margin: 0,
          minWidth: 0
        }}>
          <label className={styles.label}>Loại tệp<select value={kind} onChange={e => setKind(e.target.value as 'book' | 'cover')}>
              <option value="book">PDF / EPUB</option>
              <option value="cover">Ảnh bìa</option>
            </select></label>
          <label className={styles.label}>Chọn tệp<input key={fileVersion} type="file" accept={kind === 'book' ? '.pdf,.epub' : '.jpeg,.jpg,.png,.webp'} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
          <button className={styles.button} disabled={!form.id || !file || locked}>Tải lên</button>
        </fieldset>
      </form>
    </section>
  </main>;
}
