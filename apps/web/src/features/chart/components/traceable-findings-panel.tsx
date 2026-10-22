'use client';

import { useMemo, useState } from 'react';
import type { TraceableFindingsResult, TraceableFinding } from '@thiendo/shared-types';

type Filter = 'all' | 'natal' | 'annual';
type Category = 'all' | TraceableFinding['category'];
const scopeNames: Record<Filter, string> = { all: 'Tất cả', natal: 'Năm sinh / địa bàn', annual: 'Năm xem' };
const kindLabels: Record<TraceableFinding['category'], string> = {
  'dong-cung': 'Đồng cung', 'tam-phuong': 'Tam phương', 'tu-hoa': 'Tứ Hóa năm sinh',
  'luu-nien': 'Lưu niên', 'doi-chieu': 'Hai lớp Hóa', 'kiem-tra': 'Cần kiểm tra',
};

/** Normalize search input consistently across Vietnamese accents and evidence fields. */
function searchKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
}

function findingSearchText(finding: TraceableFinding): string {
  return [finding.id, finding.title, finding.description, kindLabels[finding.category],
    ...finding.evidence.flatMap(source => [source.palace, source.branch, source.star ?? '', source.transformation ?? '']),
  ].join(' ');
}

function exportFindingText(finding: TraceableFinding): string {
  const evidence = finding.evidence.map((source, index) =>
    `  ${index + 1}. ${source.palace} · ${source.branch} · ${source.star ?? 'Không có chính tinh'}${source.transformation ? ` · ${source.transformation}` : ''}`,
  ).join('\n');
  return `[${kindLabels[finding.category]}] ${finding.title}\n${finding.description}\nCác vị trí liên quan:\n${evidence}`;
}

export function TraceableFindingsPanel({ result }: { result: TraceableFindingsResult }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const categories = useMemo(() => Array.from(new Set(result.findings.map(f => f.category))), [result]);
  const visible = useMemo(() => {
    const query = searchKey(search);
    return result.findings.filter(f =>
      (filter === 'all' || (filter === 'annual' ? f.annual : !f.annual)) &&
      (category === 'all' || f.category === category) &&
      (!query || searchKey(findingSearchText(f)).includes(query)),
    );
  }, [result, filter, category, search]);

  async function copyVisible() {
    const header = `THIÊN ĐỒ · PHIẾU ĐỐI CHIẾU · ${result.anchorPalace}\nCác ghi nhận là dữ liệu tham khảo, không phải dự báo về cá nhân.\n\n`;
    const content = header + visible.map(exportFindingText).join('\n\n---\n\n');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      setCopyStatus(`Đã sao chép ${visible.length} phiếu đối chiếu.`);
    } catch {
      setCopyStatus('Không thể sao chép tự động. Hãy mở trang bằng HTTPS và cấp quyền clipboard.');
    }
  }

  return <section className="trace-findings" aria-label="Phiếu luận cứ có truy vết dữ liệu">
    <header className="trace-findings-head">
      <div><span className="eyebrow">QUYỂN III · KIỂM CHỨNG DỮ KIỆN</span>
        <h3 className="serif">Phiếu luận cứ · {result.anchorPalace}</h3>
        <p>Mỗi phiếu mô tả <strong>điều đã có trong lá số</strong>, kèm các vị trí liên quan. Không tự tính điểm hay đoán vận mệnh.</p>
      </div>
      <div className="trace-findings-summary"><strong>{result.summary.all}</strong><span>quan sát</span></div>
    </header>
    <div className="trace-findings-filter" role="group" aria-label="Lọc phiếu luận cứ theo thời gian">
      {(['all', 'natal', 'annual'] as const).map(key => <button type="button" key={key} className={filter === key ? 'active' : ''} aria-pressed={filter===key} onClick={() => { setFilter(key); setCopyStatus(''); }}>
        {scopeNames[key]} <span>{key === 'all' ? result.summary.all : key === 'natal' ? result.summary.natal : result.summary.annual}</span>
      </button>)}
    </div>
    <div className="trace-findings-toolbar">
      <label className="trace-findings-search"><span>Tìm tên sao, cung hoặc nội dung</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setCopyStatus(''); }} placeholder="Tên sao, cung, nội dung…" /></label>
      <label className="trace-findings-category"><span>Loại quan sát</span><select value={category} onChange={event => { setCategory(event.target.value as Category); setCopyStatus(''); }}><option value="all">Tất cả loại</option>{categories.map(key => <option value={key} key={key}>{kindLabels[key]}</option>)}</select></label>
      <button className="trace-findings-copy" type="button" disabled={!visible.length} onClick={copyVisible}>Sao chép {visible.length} phiếu</button>
    </div>
    <div className="trace-findings-count" role="status" aria-live="polite">Đang hiển thị <strong>{visible.length}</strong> / {result.findings.length} phiếu luận cứ.{copyStatus && <span className="trace-findings-copy-status"> {copyStatus}</span>}</div>
    {visible.length === 0 ? <div className="trace-findings-empty"><p>Không tìm thấy quan sát phù hợp. Điều này không có nghĩa là kết quả tốt hoặc xấu.</p><button type="button" onClick={() => { setFilter('all'); setCategory('all'); setSearch(''); setCopyStatus(''); }}>Xóa bộ lọc</button></div> :
      <div className="trace-findings-list">{visible.map((finding, i) => <article className="trace-finding" key={`${result.anchorBranchIndex}-${result.annualYear ?? 'birth'}-${finding.id}-${i}`}>
        <div className="trace-finding-top"><span className="trace-finding-kind">{kindLabels[finding.category]}</span>{finding.annual && <span className="trace-year">Năm {result.annualYear}</span>}</div>
        <h4>{finding.title}</h4><p>{finding.description}</p>
        <details className="trace-finding-sources"><summary>Xem {finding.evidence.length} vị trí liên quan</summary>
          <ol>{finding.evidence.map((source, index) => <li key={`${source.path}-${source.branchIndex}-${index}`}>
            <span><strong>{source.palace}</strong> · {source.branch} ({source.branchIndex})</span>
            <span>{source.star ?? 'Không có chính tinh'}{source.transformation ? ` · ${source.transformation}` : ''}</span>
            
          </li>)}</ol>
        </details>
      </article>)}</div>}
    <p className="trace-findings-foot"><strong>Phạm vi:</strong> Những thông tin này dùng để đối chiếu, không phải lời tiên đoán. Các ghi nhận phản ánh vị trí dữ liệu đã an, chưa phải đánh giá cát/hung.</p>
  </section>;
}
