'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import crosswalk from '@thiendo/knowledge/src/reference-star-crosswalk.json';
import disciplines from '@thiendo/knowledge/src/research-disciplines.json';
import familyResearch from '@thiendo/knowledge/src/star-family-research.json';
import expandedResearch from '@thiendo/knowledge/src/expanded-star-research.json';
import verification from '@thiendo/knowledge/src/reference-verification-docket.json';
import TuongTienReference from './tuong-tien-reference';
import MethodComparisonReference from './method-comparison-reference';
import {normalizeSearchText} from '@/lib/navigation';
import './research.css';
import './verification.css';

const statuses = {
  all: 'Tất cả',
  'engine-name': 'Đã có tên trong engine',
  'possible-alias': 'Cần đối chiếu dị danh',
  'not-in-engine': 'Chưa có trong engine',
} as const;
type Status = keyof typeof statuses;
const families = ['Tất cả', ...new Set(crosswalk.records.map(item => item.family))];
const researchByName = new Map(expandedResearch.records.map(item => [item.name, item]));
const aliasByName = new Map(expandedResearch.aliases.map(item => [item.name, item]));
const verificationByName = new Map(verification.records.map(item => [item.name, item]));
const oldReferenceNames = new Set(crosswalk.records.map(item => item.name));
const extraNames = expandedResearch.records.filter(item => !oldReferenceNames.has(item.name));

function ResearchVerification({name}: {name: string}) {
  const item = verificationByName.get(name);
  if (!item) return null;
  return <details className="research-verification">
    <summary>Phép kiểm chứng và phản chứng</summary>
    <p><b>Phạm vi đối chiếu:</b> {item.referenceScope}</p>
    <p><b>Điều cần xác định:</b> {item.researchQuestion}</p>
    <p><b>Phép thử xác nhận:</b> {item.positiveComparison}</p>
    <p><b>Phép thử phản chứng:</b> {item.negativeComparison}</p>
    <p><b>Trước khi công nhận:</b> {item.reviewChecklist.join(' · ')}</p>
    
  </details>;
}

function ResearchDetails({name}: {name: string}) {
  const dossier = researchByName.get(name);
  const alias = aliasByName.get(name);
  if (!dossier && !alias) return null;
  return <details className="research-dossier">
    <summary>{dossier ? 'Mở hồ sơ nghiên cứu chuyên sâu' : 'Đối chiếu dị danh'}</summary>
    {dossier ? <>
      <p><b>Phạm vi:</b> {dossier.placementInputsToVerify}</p>
      <p><b>Góc tiếp cận:</b> {dossier.readingContext}</p>
      <p><b>Bài kiểm chứng:</b> {dossier.verificationExercise}</p>
      <p><b>Điều không nên suy luận:</b> {dossier.commonMisreading}</p>
      
    </> : <>
      <p><b>Tên đang so sánh:</b> {alias!.candidate}</p>
      <p><b>Vấn đề:</b> {alias!.issue}</p>
      <p><b>Cần làm:</b> {alias!.resolution}</p>
      
    </>}
  </details>;
}

/** The reference is not an exhaustive canonical standard. Never infer placements from the crosswalk. */
export default function ResearchCatalogue() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [family, setFamily] = useState('Tất cả');
  const [view, setView] = useState<'stars'|'disciplines'>('stars');
  const filtered = useMemo(() => crosswalk.records.filter(item =>
    (status === 'all' || item.status === status) &&
    (family === 'Tất cả' || item.family === family) &&
    (!normalizeSearchText(search) || normalizeSearchText(`${item.name} ${item.family} ${item.engineNames.join(' ')}`).includes(normalizeSearchText(search)))
  ), [search, status, family]);
  const filteredExtra = useMemo(() => extraNames.filter(item =>
    (status === 'all' || status === 'not-in-engine') &&
    (family === 'Tất cả' || family === 'Thần sát Tam Hợp mở rộng') &&
    (!normalizeSearchText(search) || normalizeSearchText(`${item.name} Tướng Tiền thần sát`).includes(normalizeSearchText(search)))
  ), [search, status, family]);

  return <>
    <header className="page-heading research-heading">
      <div className="eyebrow">THIÊN ĐỒ · TƯ LIỆU NGHIÊN CỨU</div>
      <h1 className="serif">Bách khoa sao và huyền học</h1><p><Link href="/research/development">Phạm vi và lộ trình chuyên môn Đông–Tây ↗</Link> · <Link href="/research/star-audit">15 hồ sơ thẩm định sao và dị danh ↗</Link> · <Link href="/research/star-system">Ma trận 104 sao và các lớp riêng ↗</Link> · <Link href="/research/luu-nien-van-tinh">Thẩm định nguồn Lưu Niên Văn Tinh ↗</Link></p>
      <p>Tra cứu những tên sao đã có quy tắc trong dự án, nhận diện dị danh và ghi rõ các khoảng trống còn nghiên cứu. Khám phá các ngành huyền học qua phương pháp, bài tập và giới hạn của từng truyền thống.</p>
      <div className="research-tally"><span><b>14</b> chính tinh</span><span><b>104</b> tên sao gốc và vòng sao nội bộ</span><span><b>{crosswalk.counts.referenceNames}</b> tên trong một danh mục đối chiếu</span><span><b>{extraNames.length}</b> tên mở rộng ngoài danh mục đó</span><span><b>{disciplines.records.length}</b> chuyên đề nhập môn</span></div>
    </header>
    <div className="research-tabs" role="group" aria-label="Chọn thư mục nghiên cứu">
      <button type="button" aria-pressed={view==='stars'} className={view==='stars'?'active':''} onClick={()=>setView('stars')}>Kiểm kê các sao</button>
      <button type="button" aria-pressed={view==='disciplines'} className={view==='disciplines'?'active':''} onClick={()=>setView('disciplines')}>Các môn huyền học</button>
    </div>
    {view === 'stars' ? <>
      <div className="research-context" role="note">Danh mục dùng để tra cứu và đối chiếu dị danh; những sao chưa có quy tắc xác minh sẽ không an tự động lên lá số.</div>
      <MethodComparisonReference />
      <TuongTienReference />
      <div className="research-filters">
        <label>Tìm tên sao hoặc tên trong engine<input type="search" placeholder="Thái Phụ, Tử Vi, Tướng Tinh…" value={search} onChange={e=>setSearch(e.target.value)} /></label>
        <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value as Status)}>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Nhóm sao<select value={family} onChange={e=>setFamily(e.target.value)}>{families.map(name=><option value={name} key={name}>{name}</option>)}</select></label>
      </div>
      <details className="research-method"><summary>Hướng dẫn đọc theo 11 nhóm sao</summary>
        <div className="research-method-list">{familyResearch.records.filter(item=>family==='Tất cả'||family===item.family).map(item=><article key={item.family}><h3>{item.family} · {item.subject}</h3><p><b>Phương pháp:</b> {item.howToRead}</p><p><b>Thường nhầm:</b> {item.commonMistake}</p><p><b>Thực hành:</b> {item.exercise}</p></article>)}</div>
      </details>
      <p role="status" className="research-result-count">Hiển thị <strong>{filtered.length + filteredExtra.length}</strong> / {crosswalk.records.length + extraNames.length} mục.</p>
      <section aria-label="Danh sách sao đối chiếu" className="research-star-grid">
        {filtered.map(item=><article className="research-star" key={item.name}>
          <div className="research-card-head"><span>{item.family}</span><span className={`research-status status-${item.status}`}>{statuses[item.status as Status]}</span></div>
          <h2 className="serif">{item.name}</h2>
          {item.engineNames.length > 0 && <p className="research-match">Tên engine: <b>{item.engineNames.join(', ')}</b></p>}
          <p>{item.note}</p>
          <ResearchDetails name={item.name} />
          <ResearchVerification name={item.name} />
          {item.status==='engine-name' && <Link href={`/star-atlas?star=${encodeURIComponent(item.name)}${item.family!=='14 chính tinh'?'#sao-phu-tinh':''}`}>{item.family==='14 chính tinh'?'Tra bảng chính tinh ↗':'Đọc hồ sơ sao ↗'}</Link>}
        </article>)}
        {filteredExtra.map(item => <article className="research-star" key={item.id}>
          <div className="research-card-head"><span>Thần sát Tam Hợp mở rộng</span><span className="research-status status-not-in-engine">Chưa có trong engine</span></div>
          <h2 className="serif">{item.name}</h2>
          <p>Chưa có quy tắc an sao được xác minh.</p>
          <ResearchDetails name={item.name} />
        </article>)}
        {!filtered.length && !filteredExtra.length && <p className="research-empty">Chưa có mục phù hợp. Bạn có thể thay đổi bộ lọc hoặc tên sao.</p>}
      </section>
      
    </> : <>
      
      <section className="research-domain-grid" aria-label="Chuyên đề các môn huyền học">
        {disciplines.records.map((item,index)=><article className="research-domain" key={item.id}>
          <div className="research-domain-index">{String(index+1).padStart(2,'0')} <span>{item.route?'Có công cụ nền':'Chỉ có tri thức'}</span></div>
          <h2 className="serif">{item.name}</h2>
          <p className="research-subtitle">{item.focus}</p>
          <dl><dt>Phương pháp học</dt><dd>{item.studyWorkflow}</dd><dt>Thực hành</dt><dd>{item.practiceExercise}</dd><dt>Giới hạn</dt><dd>{item.boundary}</dd></dl>
          <details className="research-dossier"><summary>Đọc sâu và đối chiếu theo môn</summary>
            <p><b>Phương pháp đọc:</b> {item.advancedStudy.readingMethod}</p>
            <p><b>Phép kiểm chứng:</b> {item.advancedStudy.verificationExercise}</p>
            <p><b>Phần đang nghiên cứu:</b> {item.advancedStudy.remainingGap}</p>
          </details>
          {item.route ? <Link href={item.route}>Mở công cụ hiện có ↗</Link> : <span className="research-not-ready">Chưa triển khai bộ máy tính toán</span>}
        </article>)}
      </section>
    </>}
    <div className="research-next"><Link href="/research/examples" className="btn gold">12 ví dụ thực hành ↗</Link><Link href="/research/schools" className="btn secondary">Kiểm chứng trường phái ↗</Link><Link href="/library" className="btn secondary">Từ điển thuật ngữ</Link><Link href="/star-atlas" className="btn gold">Bảng 14 chính tinh ↗</Link></div>
  </>;
}
