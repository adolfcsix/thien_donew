'use client';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';
import {ModeIntroduction, useViewMode} from '@/components/view-mode';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {normalizeSearchText} from '@/lib/navigation';
import {TRIGRAMS,HEXAGRAMS,hexagramByNumber,hexagramFromLines,castThreeCoins,type Hexagram} from '@/features/iching/hexagrams.cjs';
import styles from './iching.module.css';

const INTRO = [7,8,7,8,7,8];
const VALUES = [6,7,8,9] as const;
const STATUS: Record<number,string> = {6:'Lão âm · động',7:'Thiếu dương · tĩnh',8:'Thiếu âm · tĩnh',9:'Lão dương · động'};

function Figure({bits,changing=[]}:{bits:string;changing?:number[]}) {
  return <div className={styles.figure} role="img" aria-label={'Sáu hào từ dưới lên: '+bits.split('').map(bit=>bit==='1'?'dương':'âm').join(', ')}>
    {[...bits].reverse().map((bit,i) => <div key={i} className={styles.figureRow}>
      <span className={styles.figureIndex}>{6-i}</span>
      <span className={bit==='1'?styles.yang:styles.yin}>{bit==='1'?<span/>:<><span/><span/></>}</span>
      <span className={styles.moving}>{changing.includes(6-i)?'↻':''}</span>
    </div>)}
  </div>;
}

function TrigramDetail({trigram}:{trigram:typeof TRIGRAMS[number]}) {
  return <span className={styles.trigram}>{trigram.symbol} <b>{trigram.name}</b> <small>{trigram.image} · {trigram.element}</small></span>;
}
function HexCard({hexagram,subhead,changing=[]}:{hexagram:Hexagram;subhead:string;changing?:number[]}) {
  return <section className={styles.hexCard} aria-label={subhead}>
    <div className={styles.hexCardTop}><span className="eyebrow">{subhead}</span><span className={styles.hexNo}>QUẺ {String(hexagram.number).padStart(2,'0')}</span></div>
    <div className={styles.hexHead}><Figure bits={hexagram.bits} changing={changing}/><div><h3 className="serif">{hexagram.name}</h3><p>{hexagram.theme}</p><div className={styles.trigrams}><TrigramDetail trigram={hexagram.upper}/><TrigramDetail trigram={hexagram.lower}/></div></div></div>
    <div className={styles.question}><b>Câu hỏi tự chiêm nghiệm</b><p>{hexagram.inquiry}</p></div>
  </section>;
}

export default function IChingPage(){
  const {mode: viewMode} = useViewMode();
  const [lines,setLines] = useState<number[]>(INTRO);
  const [catalogQuery,setCatalogQuery] = useState('');
  const [upper,setUpper] = useState('all');
  const [lower,setLower] = useState('all');
  const [selected,setSelected] = useState(1);
  const [method,setMethod] = useState<'manual'|'coins'>('manual');
  const reading = useMemo(()=>hexagramFromLines(lines),[lines]);
  const selectedHex = hexagramByNumber(selected)!;
  const filtered = useMemo(()=>{
    const q=normalizeSearchText(catalogQuery);
    return HEXAGRAMS.filter(h=>(upper==='all'||h.upper.id===upper)&&(lower==='all'||h.lower.id===lower)&&(!q||normalizeSearchText(`${h.number} ${h.name} ${h.theme} ${h.upper.name} ${h.lower.name}`).includes(q)));
  },[catalogQuery,upper,lower]);
  const updateLine=(index:number,value:number)=>setLines(previous=>previous.map((n,i)=>i===index?value:n));
  const loadExample=(h:Hexagram)=>{setLines(h.bits.split('').map(bit=>bit==='1'?7:8));setMethod('manual');};
  return <div className={styles.page}>
    <header className={styles.heading}><EasternScene variant="dich-hoc"/><div className="eyebrow">THIÊN ĐỒ · KINH DỊCH · BỘ CÔNG CỤ NGHIÊN CỨU</div><h1 className="serif">64 quẻ, một bản đồ của sự biến dịch.</h1><p>Tra cứu hệ 64 quẻ theo thứ tự Văn Vương, tự nhập hoặc mô phỏng gieo sáu hào, xem quẻ chủ và quẻ biến. Nội dung dành cho nghiên cứu biểu tượng và tự chiêm nghiệm, không dự đoán chắc chắn tương lai.</p><div className={styles.headerLinks}><Link href="/huyen-hoc">← Tất cả môn huyền học</Link><Link href="/research">Chuyên đề nghiên cứu ↗</Link></div></header><DisciplineMethodGuide variant="dich-hoc"/>
    <ModeIntroduction discipline="kinh-dich" summary={`Quẻ chủ ${reading.original.name}; ${reading.changing.length} hào động.`}/>
    <section className={styles.studyNote} aria-label="Quy ước đọc quẻ"><strong>Quy ước minh bạch</strong><span>Hào 1 luôn ở dưới cùng; 6 và 9 là hào động; 7 và 8 là hào tĩnh. Quẻ biến chỉ đổi hào động. Gieo ba xu là mô phỏng ngẫu nhiên, không phải kết quả của một phép tiên tri.</span></section>
    <div className={styles.workspace} id="iching-back-top">
      <section className={styles.controls}><span className="eyebrow">01 / LẬP QUẺ</span><h2 className="serif">Sáu hào từ dưới lên</h2><p>Chọn từng hào hoặc gieo ba đồng xu cho mỗi hào. Mỗi lần gieo mới tạo đủ sáu hào.</p>
        <div className={styles.coinActions}><button type="button" className={styles.primaryButton} onClick={()=>{setLines(castThreeCoins());setMethod('coins');}}>Mô phỏng gieo 3 xu × 6 hào ↗</button><button type="button" className={styles.resetButton} onClick={()=>{setLines(INTRO);setMethod('manual');}}>Đặt lại</button></div>
        <div className={styles.lineEditor} aria-label="Nhập sáu hào">
          {lines.map((value,index)=><label key={index} className={styles.lineField}><span>Hào {index+1} {index===0?'· dưới cùng':index===5?'· trên cùng':''}</span><select aria-label={`Giá trị hào ${index+1}`} value={value} onChange={e=>{updateLine(index,Number(e.target.value));setMethod('manual');}}>{VALUES.map(n=><option value={n} key={n}>{n} — {STATUS[n]}</option>)}</select></label>)}
        </div><p className={styles.smallprint}>{method==='coins'?'Dữ liệu đang hiển thị được mô phỏng bằng ba đồng xu cho từng hào.':'Dữ liệu đang hiển thị được nhập hoặc chọn thủ công.'} Thứ tự từ hào 1 lên hào 6.</p>
      </section>
      <section className={styles.results} aria-live="polite"><span className="eyebrow">02 / PHÂN TÍCH CẤU TRÚC</span><div className={styles.resultGrid}><HexCard hexagram={reading.original} subhead="Quẻ chủ" changing={reading.changing}/><HexCard hexagram={reading.transformed} subhead={reading.changing.length?'Quẻ biến':'Không có hào động'}/></div>
        <div className={styles.evidence}><strong>{reading.changing.length?`${reading.changing.length} hào động`: 'Quẻ tĩnh — không có hào động'}</strong><p>{reading.changing.length?`Các hào ${reading.changing.join(', ')} thay đổi âm/dương; những hào còn lại giữ nguyên. Quẻ biến được tính từ đúng sáu hào đã nhập.`:'Không có hào nào ở trạng thái 6 hoặc 9 nên quẻ biến giống quẻ chủ.'}</p></div>
        {viewMode === 'expert' && <details className={styles.methodDetails}><summary>Hiểu cách tính và những giới hạn của công cụ</summary><p>Ba đồng xu: mỗi xu được quy ước ngẫu nhiên là 2 hoặc 3, cộng lại thành một hào 6–9. Với xu cân bằng, xác suất lần lượt là 1/8, 3/8, 3/8, 1/8. Lặp sáu lần theo thứ tự từ dưới lên. 6 (âm già) biến thành dương; 9 (dương già) biến thành âm.</p><p>Đây là tra cứu tên quẻ, thượng/hạ quái và trạng thái hào; chưa thực hiện Lục Hào Nạp Giáp, Thế/Ứng, Lục thân, Nguyệt kiến, Nhật thần hoặc luận đoán theo văn bản hào từ. Tên và chủ đề có thể có dị bản giữa các bản dịch.</p></details>}
      </section>
    </div>
    <section className={styles.library} aria-label="Tra cứu 64 quẻ"><div className={styles.libraryHeader}><div><span className="eyebrow">03 / TỪ ĐIỂN QUẺ</span><h2 className="serif">Toàn bộ 64 quẻ Văn Vương</h2><p>Chọn một quẻ để đọc cấu trúc và chuyển sáu hào sang biểu mẫu bên trên.</p></div><div className={styles.count}>64 <span>QUẺ</span></div></div>
      <div className={styles.filters}><label>Tìm theo tên, số hoặc chủ đề<input type="search" value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)} placeholder="Thử: Thái, 11, cân bằng..."/></label><label>Thượng quái<select value={upper} onChange={e=>setUpper(e.target.value)}><option value="all">Tất cả</option>{TRIGRAMS.map(t=><option value={t.id} key={t.id}>{t.name} · {t.image}</option>)}</select></label><label>Hạ quái<select value={lower} onChange={e=>setLower(e.target.value)}><option value="all">Tất cả</option>{TRIGRAMS.map(t=><option value={t.id} key={t.id}>{t.name} · {t.image}</option>)}</select></label></div>
      <p className={styles.filterCount} role="status">Đang hiển thị {filtered.length} / 64 quẻ</p>
      <div className={styles.catalogGrid}>{filtered.map(h=><button type="button" key={h.number} className={`${styles.catalogItem} ${selected===h.number?styles.catalogSelected:''}`} aria-pressed={selected===h.number} onClick={()=>setSelected(h.number)}><span>#{String(h.number).padStart(2,'0')}</span><strong>{h.name}</strong><small>{h.upper.symbol} / {h.lower.symbol} · {h.theme}</small></button>)}</div>
      {!filtered.length&&<p className={styles.noResults}>Không có quẻ phù hợp bộ lọc. Hãy thử bỏ bớt điều kiện.</p>}
      <div className={styles.catalogDetail}><HexCard hexagram={selectedHex} subhead="Hồ sơ quẻ được chọn"/><div><h3 className="serif">Phân tích tượng quẻ</h3><p>Thượng quái <b>{selectedHex.upper.name} ({selectedHex.upper.image})</b> nằm trên hạ quái <b>{selectedHex.lower.name} ({selectedHex.lower.image})</b>. Cả hai hợp thành quẻ số <b>{selectedHex.number}</b> trong thứ tự Văn Vương.</p><p>Chủ đề gợi mở: <b>{selectedHex.theme}</b>. Hãy xem ý nghĩa như một câu hỏi chiêm nghiệm, không phải phán đoán sự kiện sẽ xảy ra.</p><button type="button" className={styles.primaryButton} onClick={()=>{loadExample(selectedHex);document.getElementById('iching-back-top')?.scrollIntoView({behavior:'smooth'});}}>Đưa quẻ này vào bàn lập quẻ ↑</button></div></div>
    </section>
    <section className={styles.bagua}><span className="eyebrow">04 / NỀN TẢNG BÁT QUÁI</span><h2 className="serif">Tám quái, hai lớp cấu thành 64 quẻ</h2><p>Mỗi quái gồm ba hào. Ghép một hạ quái và một thượng quái tạo thành 8 × 8 = 64 cấu hình.</p><div className={styles.baguaGrid}>{TRIGRAMS.map(t=><div key={t.id}><span>{t.symbol}</span><strong>{t.name} · {t.han}</strong><small>{t.image} · {t.element}</small></div>)}</div></section>
    <div className={styles.disclaimer}>Hệ Kinh Dịch được lưu giữ với nhiều truyền thống chú giải khác nhau. Công cụ này chỉ thực hiện phần cấu trúc quẻ và mô phỏng ba xu; không thể thay thế nghiên cứu kinh điển hay tư vấn chuyên môn trong các quyết định quan trọng.</div>
  </div>;
}
