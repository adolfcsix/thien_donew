'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import glossary from '@/features/academy/glossary.json';
import {normalizeSearchText} from '@/lib/navigation';
import './library.css';

const groups = ['Tất cả', 'Lịch pháp', 'Tử Vi', 'Bát Tự', 'Kinh Dịch', 'Nghiên cứu', 'Thần số học', 'Chiêm tinh'];

export default function Library() {
  const [query,setQuery] = useState('');
  const [group,setGroup] = useState('Tất cả');
  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    return glossary.filter(item =>
      (group === 'Tất cả' || item.group === group) &&
      (!q || normalizeSearchText(`${item.term} ${item.meaning} ${item.caution}`).includes(q)));
  }, [query,group]);
  return <>
    <header className="page-heading library-head"><div className="eyebrow">THƯ PHÒNG TRI THỨC · TỪ VỰNG CÓ NGỮ CẢNH</div>
      <h1 className="serif">Từ điển huyền học</h1>
      <p>Tra nhanh thuật ngữ, đối chiếu phạm vi và những cách hiểu dễ gây nhầm lẫn. Các thuật ngữ được trình bày theo hệ quy tắc truyền thống, không phải khẳng định khoa học về tương lai.</p>
      <div className="library-count">{glossary.length} thuật ngữ <span aria-hidden="true">·</span> {new Set(glossary.map(item => item.group)).size} nhóm tra cứu <span aria-hidden="true">·</span> Có liên kết đến bài học hoặc công cụ</div>
    </header>
    <section className="library-toolbar" aria-label="Bộ lọc từ điển">
      <label htmlFor="glossary-search">Tìm thuật ngữ hoặc nội dung</label>
      <input id="glossary-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ví dụ: tam hop, tu hoa, nhat chu…" autoComplete="off" />
      <div role="group" aria-label="Nhóm thuật ngữ" className="library-filters">{groups.map(item =>
        <button type="button" key={item} aria-pressed={item===group} onClick={() => setGroup(item)} className={item===group?'selected':''}>{item}</button>
      )}</div>
      <p className="library-results" role="status">Hiển thị <strong>{filtered.length}</strong> / {glossary.length} thuật ngữ</p>
    </section>
    {filtered.length > 0 ? <section className="library-grid" aria-label="Danh sách thuật ngữ">
      {filtered.map(item => <article className="library-item" key={item.term}>
        <div className="library-item-top"><span className="eyebrow">{item.group}</span><span aria-hidden="true">✧</span></div>
        <h2 className="serif">{item.term}</h2><p>{item.meaning}</p>
        <div className="library-note"><strong>Lưu ý:</strong> {item.caution}</div>
        <Link href={item.route}>Đọc và đối chiếu ↗</Link>
      </article>)}
    </section> : <div className="library-empty" role="status">Chưa tìm thấy mục phù hợp. <button onClick={() => {setQuery('');setGroup('Tất cả');}}>Xóa bộ lọc</button></div>}
    <div className="library-more"><Link href="/academy" className="btn secondary">Học theo lộ trình ↗</Link><Link href="/star-atlas" className="btn gold">Tra 14 chính tinh ↗</Link><Link href="/research" className="btn secondary">Danh mục sao & huyền học ↗</Link></div>
  </>;
}
