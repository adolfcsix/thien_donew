'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { disciplinePresentations } from '@/lib/discipline-presentation';
import { normalizeSearchText } from '@/lib/navigation';
import styles from './tool-directory.module.css';

const families = ['Tất cả', 'Đông phương', 'Phương Tây'] as const;
type Family = typeof families[number];

export function ToolDirectory() {
  const [family, setFamily] = useState<Family>('Tất cả');
  const [query, setQuery] = useState('');
  const tools = useMemo(() => disciplinePresentations.filter(item => {
    const western = ['western', 'tarot', 'numerology', 'western-symbols'].includes(item.id);
    const inFamily = family === 'Tất cả' || (family === 'Phương Tây' ? western : !western);
    const haystack = normalizeSearchText(`${item.label} ${item.family} ${item.caption}`);
    return inFamily && normalizeSearchText(query).split(/\s+/).every(word => haystack.includes(word));
  }), [family, query]);
  return <section id="bo-mon" className={styles.directory} aria-labelledby="directory-title">
    <div className={styles.heading}><div><span className={styles.eyebrow}>CHỌN KHÔNG GIAN CỦA BẠN</span><h2 id="directory-title">Bắt đầu từ một bộ môn.</h2></div><Link prefetch={false} href="/huyen-hoc">Lộ trình & phạm vi từng môn ↗</Link></div>
    <div className={styles.filters}><div className={styles.families} role="group" aria-label="Lọc theo truyền thống">{families.map(value => <button type="button" key={value} aria-pressed={family === value} onClick={() => setFamily(value)}>{value}</button>)}</div><label className={styles.search}><span className="visually-hidden">Tìm bộ môn</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Tìm bộ môn…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <p className={styles.count} role="status" aria-live="polite">{tools.length} bộ môn{query ? ` khớp với “${query}”` : ''}</p>
    <div className={styles.grid}>{tools.map(item => <Link prefetch={false} className={styles.tool} href={item.path} key={item.id} data-scroll-reveal data-tool={item.id}><span className={styles.motif} aria-hidden="true">{item.motif}</span><span className={styles.copy}><strong>{item.label}</strong><small>{item.caption}</small></span><span className={styles.arrow} aria-hidden="true">↗</span></Link>)}</div>
    {!tools.length && <div className={styles.empty}><p>Chưa tìm thấy bộ môn phù hợp.</p><button type="button" onClick={() => { setQuery(''); setFamily('Tất cả'); }}>Xóa bộ lọc</button></div>}
  </section>;
}
