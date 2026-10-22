'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import Engine from '@thiendo/astrology-engine';
import {normalizeSearchText} from '@/lib/navigation';
import studyGuide from '@thiendo/knowledge/src/star-study-guide.json';
import './star-atlas.css';
import {ExpandedStarLibrary} from '@/features/star-atlas/expanded-star-library';

/** Descriptions are an original study aid, not deterministic interpretations. */
const notes: Record<string, {theme:string;scope:string;question:string}> = {
  'Tử Vi': {theme:'Chủ quản · trật tự',scope:'Hình tượng chủ tinh về năng lực tập hợp, tổ chức và lãnh đạo.',question:'Sao đồng cung và tam phương có hỗ trợ khả năng điều phối không?'},
  'Thiên Cơ': {theme:'Biến hóa · tư duy',scope:'Biểu tượng suy tính, điều chỉnh và ứng biến theo hoàn cảnh.',question:'Các sao hội chiếu làm cách ứng biến linh hoạt hay phân tán?'},
  'Thái Dương': {theme:'Quang minh · biểu đạt',scope:'Hình tượng mặt trời, khả năng tỏa sáng và trách nhiệm với bên ngoài.',question:'Vị trí chi và hoàn cảnh hội chiếu thay đổi sắc thái ra sao?'},
  'Vũ Khúc': {theme:'Kỷ luật · tài khí',scope:'Thường liên hệ thực hành, nguồn lực và tính quyết đoán.',question:'Nên đọc cùng cung Tài Bạch và các sao phụ nào?'},
  'Thiên Đồng': {theme:'Hòa hợp · thích nghi',scope:'Liên hệ cảm nhận, sự mềm dẻo và khuynh hướng điều hòa.',question:'Sự linh hoạt có được các sao khác tạo cấu trúc hay không?'},
  'Liêm Trinh': {theme:'Quy củ · ranh giới',scope:'Biểu tượng quy tắc, chuẩn mực và sự đối diện với giới hạn.',question:'Tứ Hóa và sát tinh có làm cách vận dụng quy tắc khác đi?'},
  'Thiên Phủ': {theme:'Kho tàng · tích lũy',scope:'Hình tượng gìn giữ, ổn định, quản trị tài nguyên.',question:'Khi đọc cần phân biệt tích lũy với sự trì trệ thế nào?'},
  'Thái Âm': {theme:'Nội tâm · tích tụ',scope:'Hình tượng mặt trăng, chiều sâu nội tại và sự tiếp nhận.',question:'Chi cung cùng phụ tinh cho thấy sắc thái chủ động hay thận trọng?'},
  'Tham Lang': {theme:'Ham học · giao tế',scope:'Gắn với giao tiếp, trải nghiệm, sở thích và sức hút theo lối diễn giải truyền thống.',question:'Sao hội làm xu hướng khám phá ổn định hay biến động?'},
  'Cự Môn': {theme:'Ngôn luận · phản biện',scope:'Biểu tượng lời nói, việc phân tích và tranh luận.',question:'Những sao nào giúp lời nói trở nên xây dựng?'},
  'Thiên Tướng': {theme:'Phò tá · bảo hộ',scope:'Gắn với phối hợp, nguyên tắc và vai trò trợ giúp.',question:'Sao chiếu và cung liên quan tạo bối cảnh hỗ trợ ra sao?'},
  'Thiên Lương': {theme:'Bảo trợ · chuẩn mực',scope:'Liên hệ đạo lý, cân nhắc và sự che chở.',question:'Có sự khác biệt giữa các trường phái về vị trí miếu–hãm không?'},
  'Thất Sát': {theme:'Quyết đoán · thay đổi',scope:'Biểu tượng ý chí trong tình huống đòi hỏi hành động.',question:'Điều gì giúp sức quyết đoán được dùng đúng chỗ?'},
  'Phá Quân': {theme:'Cải tổ · khai phá',scope:'Liên hệ việc thay cũ đổi mới và chấp nhận sự biến chuyển.',question:'Các yếu tố nào giúp sự thay đổi có nền tảng?'},
};
const explanations:Record<string,string>={M:'Miếu',V:'Vượng',D:'Đắc',B:'Bình',H:'Hãm'};
const branches=Engine.BRANCHES;
const matrix=Engine.mainStarStrengthMatrix();
type Level = 'all'|'M'|'V'|'D'|'B'|'H';
type StudyStar = {motif:string;study:string;caution:string;crossCheck:string};
type StudyPalace = {scope:string;question:string;crossCheck:string;caution:string};
const studyStars: Record<string, StudyStar> = studyGuide.stars;
const studyPalaces: Record<string, StudyPalace> = studyGuide.palaces;
const palaceNames = Object.keys(studyPalaces);


export default function StarAtlas() {
  const [term,setTerm]=useState('');
  const [branch,setBranch]=useState('all');
  const [level,setLevel]=useState<Level>('all');
  const [selected,setSelected]=useState('Tử Vi');
  const [palace,setPalace]=useState('Mệnh');
  // Read the URL only after hydration: /star-atlas?star=...&branch=...&palace=...
  // Unknown values are ignored instead of being shown as invented star/house data.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingStar = params.get('star');
    const incomingBranch = params.get('branch');
    const incomingPalace = params.get('palace');
    if (incomingStar && Object.prototype.hasOwnProperty.call(studyStars,incomingStar)) setSelected(incomingStar);
    if (incomingBranch !== null && /^(?:[0-9]|1[01])$/.test(incomingBranch)) setBranch(incomingBranch);
    if (incomingPalace && Object.prototype.hasOwnProperty.call(studyPalaces,incomingPalace)) setPalace(incomingPalace);
  }, []);
  const normalized=normalizeSearchText(term);
  const filtered=useMemo(()=>matrix.filter(row=>!normalized || normalizeSearchText(`${row.name} ${notes[row.name]?.theme ?? ''}`).includes(normalized)),[normalized]);
  const chosen=matrix.find(row=>row.name===selected) ?? matrix[0];
  const selectedNotes=notes[chosen.name];
  const studiedStar=studyStars[chosen.name];
  const studiedPalace=studyPalaces[palace];
  const selectedBranchNumber = /^(?:[0-9]|1[01])$/.test(branch) ? Number(branch) : null;
  const selectedBranchLevel = selectedBranchNumber === null ? null : Engine.lookupMainStarStrength(chosen.name,selectedBranchNumber);

  const found=filtered.reduce((sum,row)=>sum+row.levels.filter((code,index)=>(level==='all'||level===code)&&(branch==='all'||branch===String(index))).length,0);

  return <>
    <header className="page-heading star-atlas-head">
      <div className="eyebrow">THIÊN ĐỒ · TƯ LIỆU CHÍNH TINH</div>
      <h1 className="serif">Thư viện 14 chính tinh</h1>
      <p>Bảng tra mức Miếu · Vượng · Đắc · Bình · Hãm và hướng dẫn đọc sao theo 12 cung chức theo cách an sao đang được áp dụng. Dùng để nghiên cứu, không thay thế an sao và không phải kết luận tốt/xấu của cuộc đời.</p>
      <div className="star-atlas-actions"><Link href="/chart" className="btn gold">Lập lá số Tử Vi →</Link> <a href="#sao-phu-tinh" className="btn secondary">Tra sao phụ và chuyên khảo ↓</a> <Link href="/research" className="btn secondary">Kiểm kê sao mở rộng ↗</Link></div>
    </header>
    <section className="star-atlas-shell" aria-label="Công cụ bảng tra sao">
      <div className="star-atlas-header"><div><span className="eyebrow">QUYỂN II · TRA CỨU</span><h2 className="serif">Bảng chiếu 14 × 12</h2></div><small>168 ô tham khảo · 14 chính tinh</small></div>
      <div className="star-atlas-filters">
        <label>Tìm chính tinh<input type="search" placeholder="Tử Vi, Thiên Cơ…" value={term} onChange={event=>setTerm(event.target.value)}/></label>
        <label>Địa chi<select value={branch} onChange={event=>setBranch(event.target.value)}><option value="all">Tất cả 12 chi</option>{branches.map((b,index)=><option value={String(index)} key={b}>{b}</option>)}</select></label>
        <label>Trạng thái<select value={level} onChange={event=>setLevel(event.target.value as Level)}><option value="all">Tất cả</option>{Object.entries(explanations).map(([code,name])=><option value={code} key={code}>{code} · {name}</option>)}</select></label>
      </div>
      <div className="star-atlas-legend" aria-label="Chú giải 5 mức">{Object.entries(explanations).map(([code,name])=><button type="button" key={code} className={`star-level star-level-${code.toLowerCase()} ${level===code?'active':''}`} onClick={()=>setLevel(level===code?'all':code as Level)} aria-pressed={level===code}><b>{code==='D'?'Đ':code}</b><span>{name}</span></button>)}</div>
      <p className="star-atlas-count" role="status">Có {filtered.length} chính tinh, {found} ô phù hợp bộ lọc. Chọn tên sao để đọc thông tin nghiên cứu.</p>
      <div className="star-atlas-scroll" role="region" tabIndex={0} aria-label="Bảng 14 chính tinh theo 12 địa chi, kéo ngang để xem hết">
        <table className="star-atlas-matrix"><thead><tr><th scope="col">Chính tinh</th>{branches.map((name,index)=><th key={name} scope="col" className={branch!=='all'&&branch!==String(index)?'star-dim':''}>{name}</th>)}</tr></thead><tbody>
          {filtered.map(row=><tr key={row.name} className={chosen.name===row.name?'star-row-current':''}><th scope="row"><button type="button" onClick={()=>setSelected(row.name)} aria-pressed={selected===row.name}>{row.name} <span aria-hidden="true">↗</span></button></th>{row.levels.map((code,index)=>{const visible=(branch==='all'||branch===String(index))&&(level==='all'||level===code);return <td key={index} className={!visible?'star-dim':''}><span className={`star-status star-status-${code.toLowerCase()}`} title={`${row.name} tại ${branches[index]}: ${explanations[code]} (theo quy ước đang dùng)`}>{code==='D'?'Đ':code}</span></td>})}</tr>)}
        </tbody></table>
        {!filtered.length && <p className="star-atlas-none">Không tìm thấy chính tinh này trong danh sách 14 sao.</p>}
      </div>
      <p className="star-atlas-tip">Gợi ý: trên điện thoại có thể kéo ngang bảng. Ký hiệu Đ hiển thị trong bảng tương ứng mã dữ liệu <code>D</code>. Bảng không tính thêm sao mới hoặc thay đổi vị trí an sao.</p>
    </section>
    <section className="star-atlas-profile" aria-label="Hồ sơ nghiên cứu sao">
      <div className="star-profile-top"><div><span className="eyebrow">HỒ SƠ SAO / 14 CHÍNH TINH</span><h2 className="serif">{chosen.name}</h2><p>{selectedNotes.theme}</p></div><span className="star-profile-seal" aria-hidden="true">✦</span></div>
      <div className="star-profile-panels"><div><span>HÌNH TƯỢNG TRUYỀN THỐNG</span><p>{selectedNotes.scope}</p></div><div><span>CÂU HỎI KHI NGHIÊN CỨU</span><p>{selectedNotes.question}</p></div></div>
      <section className="star-study" aria-label="Hướng dẫn nghiên cứu sao theo cung">
        <div className="star-study-heading"><div><span className="eyebrow">LỚP KIẾN THỨC · DIỄN GIẢI CÓ BỐI CẢNH</span><h3 className="serif">Đọc {chosen.name} tại cung {palace}</h3><p>Đây là phép ghép <strong>hình tượng sao × chủ đề cung</strong> để học cách đặt câu hỏi, không phải lời đoán tự động.</p></div>
          <label className="star-study-select">Chọn cung chức
            <select value={palace} onChange={event=>setPalace(event.target.value)} aria-label="Chọn cung chức để nghiên cứu chính tinh">
              {palaceNames.map(name=><option value={name} key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div className="star-study-summary" aria-label="Ngữ cảnh đang tra">
          <span>Sao <strong>{chosen.name}</strong></span><span>Cung <strong>{palace}</strong></span>
          <span>Địa chi <strong>{selectedBranchNumber === null ? 'Chưa chọn' : branches[selectedBranchNumber]}</strong></span>
          <span>Miếu–Hãm <strong>{selectedBranchLevel ? `${selectedBranchLevel.label} · tham khảo` : 'Chọn một địa chi'}</strong></span>
        </div>
        <div className="star-study-grid">
          <article><span>01 · HÌNH TƯỢNG SAO</span><h4>{studiedStar.motif}</h4><p>{studiedStar.study}</p></article>
          <article><span>02 · CHỦ ĐỀ CUNG {palace.toUpperCase()}</span><h4>{studiedPalace.scope}</h4><p>{studiedPalace.question}</p></article>
          <article><span>03 · ĐỐI CHIẾU TRƯỚC KHI NHẬN ĐỊNH</span><p>{studiedStar.crossCheck}</p><p>{studiedPalace.crossCheck}</p></article>
          <article className="star-study-guard"><span>04 · ĐIỀU KHÔNG THỂ KẾT LUẬN</span><p>{studiedStar.caution}</p><p>{studiedPalace.caution}</p></article>
        </div>
        <div className="star-study-method"><strong>Quy trình đọc có trách nhiệm</strong><ol><li>Xác nhận sao và cung do engine an, không suy từ bảng tra.</li><li>Kiểm tra chính tinh đồng cung, phụ tinh, tam phương, Tứ Hóa.</li><li>Chỉ ghi các giả thuyết theo truyền thống; kiểm chứng với bối cảnh thực tế.</li><li>Nếu đổi trường phái, cần xem lại cách đánh giá sao trước khi so sánh.</li></ol></div>
        <small>Nội dung tự biên soạn cho mục đích học tập · {studyGuide.edition} · Không thay thế tư vấn chuyên môn.</small>
      </section>
      <h3>12 địa chi của {chosen.name}</h3>
      <div className="star-profile-branches">{chosen.levels.map((code,index)=><button type="button" key={branches[index]} className={`star-profile-branch star-status-${code.toLowerCase()}`} onClick={()=>{setBranch(String(index));setLevel('all')}}><span>{branches[index]}</span><b>{code==='D'?'Đ':code}</b><small>{explanations[code]}</small></button>)}</div>
      <div className="star-profile-notice"><strong>Giới hạn diễn giải.</strong> Mức độ đặt sao và ngữ nghĩa sao là hai lớp khác nhau. Khi đọc một lá số, còn phải xét các sao đồng cung, tam phương, Tứ Hóa, hạn và quy ước trường phái. Các trường phái có thể có cách đánh giá vị trí khác nhau; cần đọc cả sao đồng cung và sao hội chiếu.</div>
    </section>
    <ExpandedStarLibrary />
  </>;
}
