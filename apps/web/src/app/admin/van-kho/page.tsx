'use client';

import Link from 'next/link';
import { useAdminSession } from '@/features/membership/admin-session';
import { AdminFeedback } from '@/features/admin/admin-feedback';
import { useDocumentEditor } from '@/features/van-kho/use-document-editor';
import { documentSubjects as categories } from '@/features/van-kho/admin-api';
import VanKhoMarkdown from '../../van-kho/van-kho-markdown';
import styles from '../../van-kho/van-kho.module.css';

/** UI only: payload contracts, revision handling and uploads are feature modules. */
export default function VanKhoAdmin() {
  const {capabilities} = useAdminSession();
  const canWrite = capabilities.includes('library.write');
  const {
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
  } = useDocumentEditor(canWrite);
  const items = catalog.data?.items || [],
    authors = catalog.data?.authors || [];
  return <main className={styles.page}>
    <Link href="/van-kho" className={styles.link}>← Văn Khố công khai</Link>
    <header className={styles.hero}>
      <h1>Quản lý Văn Khố</h1>
      <p>Biên soạn, phiên bản, phê duyệt độc lập, ảnh có kiểm tra quyền sử dụng và lịch xuất bản. Tác vụ quản trị yêu cầu MFA.</p>
    </header>
    {!canWrite && <p role="status">Bạn được xem phân hệ này. Quyền chỉnh sửa do chủ hệ thống phân công.</p>}
    <AdminFeedback errorClass={styles.error} loading={catalog.loading} loadError={catalog.error} error={task.error} notice={task.notice} pending={task.pending} onRetry={() => void catalog.reload()} />
    {editorStale && <p role="alert">Nội dung đã thay đổi trên máy chủ. Hãy chọn lại tài liệu để nạp phiên bản hiện tại trước khi lưu.</p>}
    {unsaved && <p role="status">Có nội dung hoặc ảnh chưa lưu. Hãy lưu bài và tải hoặc bỏ ảnh đã chọn trước khi gửi duyệt.</p>}
    <section className={styles.panel}>
      <h2>
        {editing ? 'Biên tập phiên bản ' + editingRevision : 'Tạo tài liệu mới'}
      </h2>
      <fieldset className={styles.editor} disabled={locked || editorStale || !canWrite} style={{
        border: 0,
        margin: 0,
        minWidth: 0
      }}>
        <label>Tiêu đề<input maxLength={220} value={form.title} onChange={e => setForm(f => ({
            ...f,
            title: e.target.value
          }))} /></label>
        <label>Đường dẫn (slug)<input maxLength={120} pattern="[a-z0-9-]+" value={form.slug} onChange={e => setForm(f => ({
            ...f,
            slug: e.target.value
          }))} /></label>
        <label>Tóm tắt<input maxLength={1000} value={form.excerpt} onChange={e => setForm(f => ({
            ...f,
            excerpt: e.target.value
          }))} /></label>
        <label>Bộ môn<select value={form.subject} onChange={e => setForm(f => ({
            ...f,
            subject: e.target.value
          }))}>
            {categories.map(x => <option key={x}>
              {x}
            </option>)}
          </select></label>
        <label>Thẻ (cách nhau bằng dấu phẩy)<input value={form.tags} onChange={e => setForm(f => ({
            ...f,
            tags: e.target.value
          }))} /></label>
        <label>Tác giả<select value={form.authorId} onChange={e => setForm(f => ({
            ...f,
            authorId: e.target.value
          }))}>
            <option value="">Ban biên tập</option>
            {authors.map(a => <option key={a.id} value={a.id}>
              {a.name}
            </option>)}
          </select></label>
        <label htmlFor="van-kho-editor">Nội dung Markdown</label>
        <div className={styles.editorToolbar} role="group" aria-label="Chèn định dạng">
          <button type="button" onClick={() => insert('\n## Đề mục\n')}>Tiêu đề</button>
          <button type="button" onClick={() => insert('**in đậm**')}>Đậm</button>
          <button type="button" onClick={() => insert('\n- Ý thứ nhất\n- Ý thứ hai\n')}>Danh sách</button>
          <button type="button" onClick={() => insert('\n| Khái niệm | Giải nghĩa |\n| --- | --- |\n| Dữ liệu | Đối chiếu |\n')}>Bảng</button>
          <button type="button" onClick={() => insert('\n```text\nVí dụ dữ liệu hoặc thuật toán\n```\n')}>Mã kỹ thuật</button>
          <button type="button" onClick={() => insert('[Nguồn tham khảo](https://example.org)')}>Liên kết</button>
        </div>
        <textarea id="van-kho-editor" ref={editorRef} value={form.body} maxLength={100000} rows={15} onChange={e => setForm(f => ({
          ...f,
          body: e.target.value
        }))} aria-describedby="editor-safety" />
        <p id="editor-safety" className={styles.muted}>Chỉ Markdown đã kiểm soát: không chạy HTML/script trong bài. Ảnh được tải vào kho riêng tư, không cho phép ảnh từ URL tùy ý.</p>
        <div className={styles.actions}>
          <button className={styles.button} disabled={locked || editorStale || !canWrite} onClick={() => void save()}>Lưu bản nháp</button>

          <button className={styles.button} disabled={locked || !canWrite} onClick={reset}>Tạo mới</button>
        </div>
      </fieldset>
          <button className={styles.button} disabled={locked} onClick={() => setLivePreview(!livePreview)}>
            {livePreview ? 'Ẩn xem trước' : 'Xem trước nội dung'}
          </button>
      {livePreview && <section className={styles.previewPanel} aria-label="Bản xem trước bài viết">
        <p className={styles.tag}>BẢN XEM TRƯỚC — CHƯA XUẤT BẢN</p>
        <h2>
          {form.title || 'Chưa có tiêu đề'}
        </h2>
        <VanKhoMarkdown body={form.body} slug={form.slug || 'preview'} id={editing || undefined} preview={!!editing} />
      </section>}
    </section>
    <section className={styles.panel}>
      <h2>Quản lý tác giả</h2>
      <fieldset className={styles.inlineForm} disabled={locked || !canWrite} style={{
        border: 0,
        margin: 0,
        minWidth: 0
      }}>
        <label>Tác giả có sẵn<select value={editingAuthor || ''} onChange={e => {
            const who = authors.find(a => a.id === e.target.value);
            setEditingAuthor(who?.id || null);
            setNewAuthor(who?.name || '');
            setNewBio(who?.bio || '');
          }}>
            <option value="">Tạo tác giả mới</option>
            {authors.map(a => <option value={a.id} key={a.id}>
              {a.name}
            </option>)}
          </select></label>
        <label>Tên tác giả<input value={newAuthor} maxLength={140} onChange={e => setNewAuthor(e.target.value)} /></label>
        <label>Giới thiệu ngắn<input value={newBio} maxLength={4000} onChange={e => setNewBio(e.target.value)} /></label>
        <button className={styles.button} disabled={locked || !newAuthor.trim()} onClick={() => void addAuthor()}>
          {editingAuthor ? 'Cập nhật tác giả' : 'Thêm tác giả'}
        </button>
      </fieldset>
    </section>
    {editing && <section className={styles.panel}>
      <h2>Ảnh minh họa riêng tư</h2>
      <p className={styles.small}>Chỉ hỗ trợ PNG, JPG, WebP tối đa 5 MiB. Chọn tài liệu đã lưu và khai báo quyền sử dụng. Người tải ảnh không thể tự xác minh ảnh của mình.</p>
      <fieldset className={styles.editor} disabled={locked || editorStale || !canWrite} style={{
        border: 0,
        margin: 0,
        minWidth: 0
      }}>
        <label>Chọn ảnh<input key={fileVersion} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <label>Chú thích ảnh<input maxLength={200} value={alt} onChange={e => setAlt(e.target.value)} /></label>
        <label>Nguồn, giấy phép hoặc bằng chứng được sử dụng<input maxLength={800} value={rights} onChange={e => setRights(e.target.value)} /></label>
        <button className={styles.button} disabled={locked || !file} onClick={() => void upload()}>Tải ảnh và chèn mã Markdown</button>
        {(file || alt || rights) && <button type="button" className={styles.button} disabled={locked || !canWrite} onClick={discardImage}>Bỏ ảnh chưa tải</button>}
      </fieldset>
      {media.map(m => <div key={m.id} className={styles.history}>
        <span><strong>
            {m.alt}
          </strong> · {m.reviewedAt ? 'Đã xác minh' : 'Chờ Admin độc lập kiểm tra'}<span className={styles.muted}> · {m.rights}</span></span>
        {!m.reviewedAt && <button className={styles.button} disabled={locked || !canWrite} onClick={() => void verify(m.id)}>Xác minh quyền</button>}
      </div>)}
    </section>}
    {editing && <section className={styles.panel}>
      <h2>Lịch sử phiên bản</h2>
      {history.map(h => <div key={h.version} className={styles.history}>
        <span>v{h.version} · {h.title} · {new Date(h.createdAt).toLocaleString('vi-VN')}</span>
        <div className={styles.actions}>
          <button className={styles.button} disabled={locked} onClick={() => void showRevision(h.version)}>Xem nội dung</button>
          <button className={styles.button} disabled={locked || !canWrite} onClick={() => void restore(editing, h.version)}>Khôi phục</button>
        </div>
      </div>)}
    </section>}
    <section className={styles.panel}>
      <h2>Danh sách và xét duyệt</h2>
      <p className={styles.muted}>Người sửa phiên bản mới nhất không được tự duyệt; duyệt bài hoặc ảnh cần một Admin khác.</p>
      {!catalog.loading && !catalog.error && catalog.data && !items.length && <p>Chưa có tài liệu.</p>}
      {!catalog.loading && !catalog.error && items.map(d => <article key={d.id} className={styles.tile}><strong>
          {d.title}
        </strong> · {d.status} · v{d.revision}<div className={styles.actions}>
          <button className={styles.button} disabled={locked} onClick={() => void select(d.id)}>Xem trước / Sửa</button>
          {d.status === 'draft' && <button className={styles.button} disabled={locked || !canWrite || (editing === d.id && unsaved)} onClick={() => void act(d.id, 'submit')}>Gửi duyệt</button>}
          {d.status === 'pending' && <button className={styles.button} disabled={locked || !canWrite || (editing === d.id && unsaved)} onClick={() => void act(d.id, 'approve')}>Duyệt độc lập</button>}
          {d.status === 'approved' && <>
            <label className={styles.small}>Hẹn lịch (để trống: xuất bản ngay)<input type="datetime-local" disabled={locked || !canWrite} value={schedule} onChange={e => setSchedule(e.target.value)} /></label>
            <button className={styles.button} disabled={locked || !canWrite || (editing === d.id && unsaved)} onClick={() => void act(d.id, 'publish')}>Xuất bản / Hẹn lịch</button>
          </>}
          {d.status !== 'hidden' && <button className={styles.button} disabled={locked || !canWrite} onClick={() => void act(d.id, 'hide')}>Ẩn bài</button>}
        </div></article>)}
    </section>
  </main>;
}
