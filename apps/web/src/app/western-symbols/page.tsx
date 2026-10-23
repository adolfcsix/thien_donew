'use client';
import {StudyTabs} from '@/components/study-tabs/study-tabs';
import {DisciplineNavigation} from '@/features/western/discipline-navigation';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {CARDS} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import {SEFIROT,PATHS,DECKS,SYMBOL_LAYERS,compareCard,getCorrespondence,type HermeticPath} from '@thiendo/astrology-engine/src/western-symbols.cjs';
import styles from './western-symbols.module.css';

type System='golden-dawn'|'crowley-thoth'|'jewish-source-only';
const systemNames:Record<System,string>={'golden-dawn':'Hermetic · Golden Dawn','crowley-thoth':'Hermetic · Crowley (Thoth)','jewish-source-only':'Kabbalah Do Thái · chỉ khảo cứu'};
export default function WesternSymbolsPage(){
 const [system,setSystem]=useState<System>('golden-dawn');
 const [node,setNode]=useState('all');
 const [letterSearch,setLetterSearch]=useState('');
 const [cardId,setCardId]=useState('major-08');
 const [deckTab,setDeckTab]=useState('rws-1909');
 const [activeSymbol,setActiveSymbol]=useState('hebrew');
 const filtered=useMemo(()=>PATHS.filter(p=>(system==='jewish-source-only'||node==='all'||p.from===Number(node)||p.to===Number(node))&&(`${p.letterName} ${p.letter} ${p.gematria} ${system==='jewish-source-only'?p.id-10:p.id} ${system==='jewish-source-only'?'':CARDS[Number(p.rwsCardId.slice(6))]?.name}`.toLowerCase().includes(letterSearch.trim().toLowerCase()))),[letterSearch,node,system]);
 const card=compareCard(cardId);
 const match=cardId.startsWith('major-')?getCorrespondence(cardId,system):null;
 const chosenLayer=SYMBOL_LAYERS.find(s=>s.id===activeSymbol)||SYMBOL_LAYERS[0];
 const activeDeck=DECKS.find(d=>d.id===deckTab)||DECKS[0];
 return <div className={`${styles.root} western-world-page`}><DisciplineNavigation current="/western-symbols"/>
  <header className={styles.hero}><span className={styles.eyebrow}>THIÊN ĐỒ / WESTERN SYMBOLIC ATLAS</span><h1>Cây biểu tượng phương Tây</h1><p>Học lịch sử và quan hệ đối chiếu của những truyền thống khác nhau, không biến Kabbalah Do Thái, Hermetic Qabalah và Tarot thành một giáo pháp duy nhất.</p><div className={styles.counters}><span><b>10</b> Sephirot</span><span><b>22</b> chữ / tuyến Hermetic</span><span><b>3</b> truyền thống Tarot</span><span><b>7</b> lớp biểu tượng</span></div></header>
  <section className={styles.panel}><div className={styles.sectionHead}><span>01 / KABBALAH & HERMETIC QABALAH</span><h2>Mười Sephirot và hệ chữ Hebrew</h2></div>
   <p>Danh sách Sephirot là lớp tra cứu khái niệm; phép nối các lá Major Arcana vào 22 đường thuộc cách diễn giải Hermetic Golden Dawn cuối thế kỷ XIX. Không xem bảng Tarot là một bộ phận của Kabbalah Do Thái cổ truyền.</p>
   <div className={styles.sefirot}>{SEFIROT.map(node=><article key={node.id}><small>{String(node.id).padStart(2,'0')}</small><strong lang="he" dir="rtl">{node.hebrew}</strong><b>{node.name}</b><span>{node.gloss}</span></article>)}</div>
   <div className={styles.toolbar}><label>Trường phái nghiên cứu<select value={system} onChange={e=>setSystem(e.target.value as System)}>{Object.entries(systemNames).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label><label>Tra chữ/đường<input type="search" value={letterSearch} onChange={e=>setLetterSearch(e.target.value)} placeholder="Aleph, 11, א…" maxLength={45}/></label></div>
   {system==='jewish-source-only'?<p className={styles.notice}>Ở chế độ này chỉ tra Sephirot, chữ Hebrew và số chữ. Quan hệ Tarot được tắt vì không thuộc dữ liệu chung của Kabbalah Do Thái cổ điển.</p>:<p className={styles.notice}>{system==='crowley-thoth'?'Biến thể Thoth cần xem riêng Heh/Tzaddi tại thẻ IV và XVII. Các đầu nối trên bàn Kircher không được coi là bất biến giữa các truyền thống.':'Bảng 22 tuyến dùng sơ đồ Kircher theo Golden Dawn, là một lối xếp trong Hermetic Qabalah.'}</p>}
   {system!=='jewish-source-only'&&<label className={styles.cardSelector}>Lọc tuyến qua Sephirot<select value={node} onChange={e=>setNode(e.target.value)}><option value="all">Toàn bộ 22 tuyến Hermetic</option>{SEFIROT.map(n=><option key={n.id} value={n.id}>{n.name} · {n.gloss}</option>)}</select></label>}
   <p role="status">Đang hiển thị {filtered.length} / 22 {system==='jewish-source-only'?'chữ Hebrew':'tuyến của bảng nền Golden Dawn'}.</p>
   {system==='crowley-thoth'&&<p className={styles.notice}>Bảng dưới vẫn là bảng nền Golden Dawn để đối chiếu, không phải sơ đồ Thoth đã chuyển đổi. Khác biệt theo lá được trình bày bên dưới.</p>}
   <div className={styles.pathTable} tabIndex={0} role="region" aria-label={system==='jewish-source-only'?'Bảng 22 chữ Hebrew':'Bảng đối chiếu 22 tuyến Hermetic'}><table><thead><tr><th>{system==='jewish-source-only'?'Thứ tự chữ':'Tuyến Hermetic'}</th><th>Chữ / giá trị</th>{system!=='jewish-source-only'&&<><th>Đầu nối Kircher</th><th>Ẩn chính Golden Dawn</th></>}</tr></thead><tbody>{filtered.map((path:HermeticPath)=><tr key={path.id}><td>{system==='jewish-source-only'?path.id-10:path.id}</td><td><b lang="he" dir="rtl">{path.letter}</b> {path.letterName} · {path.gematria}</td>{system!=='jewish-source-only'&&<><td>{SEFIROT[path.from-1].name} ↔ {SEFIROT[path.to-1].name}</td><td>{CARDS[Number(path.rwsCardId.slice(6))]?.name}</td></>}</tr>)}</tbody></table>{!filtered.length&&<p>Không có kết quả tương ứng. Thử tên chữ khác hoặc bỏ bộ lọc.</p>}</div>
   <p>Giá trị chữ ở đây là bảng tra, chưa tính từ/tên hoặc các biến thể gematria. Các đầu nối Hermetic không được coi là một phần chung cho mọi truyền thống Kabbalah.</p>
  </section>
  <section className={styles.panel}><div className={styles.sectionHead}><span>02 / TAROT SO SÁNH</span><h2>Ba truyền thống, ba phương pháp</h2></div>
   <StudyTabs label="Truyền thống Tarot" items={DECKS.map(d=>({id:d.id,label:d.name}))} value={deckTab} onChange={setDeckTab}>
   <article className={styles.deckDescription}><b>{activeDeck.name}</b><small>{activeDeck.period} · {activeDeck.origin}</small><p>{activeDeck.system}</p><p>{activeDeck.artStatus}</p><span>{activeDeck.status==='reading-engine-existing'?'Engine RWS: đã hoạt động':'Chỉ atlas so sánh, chưa có engine bói/trải riêng'}</span></article></StudyTabs>
   <label className={styles.cardSelector}>Chọn vị trí lá để đối chiếu (cùng số ≠ cùng nghĩa)<select value={cardId} onChange={e=>setCardId(e.target.value)}>{CARDS.map(card=><option value={card.id} key={card.id}>{card.nameVi} — {card.id}</option>)}</select></label>
   <div className={styles.comparison}><article><small>RWS · 1909</small><h3>{card.rws.name}</h3><p>Thứ tự: {card.rws.number}</p></article><article><small>MARSEILLE · truyền bản</small><h3>{card.marseille.name}</h3><p>Thứ tự: {card.marseille.number}</p></article><article><small>THOTH · Thelema</small><h3>{card.thoth.name}</h3><p>Thứ tự: {card.thoth.number}</p></article></div>
   <p className={styles.notice}>{card.caveat} {card.comparisonOnly?'Đối chiếu phẩm vị Court chỉ là chỉ mục nghiên cứu, không phải quan hệ một–một.':''}</p>
   <div className={styles.note}><h3>Đối chiếu Hebrew theo từng lớp</h3>{match?.connected&&match.path?<p><strong>{match.path.letter} · {match.path.letterName}</strong> — tuyến {match.path.id} ({match.path.from} ↔ {match.path.to}). {match.warning}</p>:<p>{match?.reason??'Ẩn phụ không mang phép gán 22 chữ Hebrew của Major Arcana. Các bảng Sephirot–ẩn phụ cần trình bày theo một phương pháp và nguồn riêng.'}</p>}</div>
   <p>Đọc nghĩa và trải bài đầy đủ hiện chỉ dùng RWS. Chưa dùng ảnh, văn bản thuyết minh thương mại hoặc tự gán nghĩa RWS cho Marseille/Thoth. <Link href="/tarot">Mở trải Tarot RWS →</Link></p>
  </section>
  <section className={styles.panel}><div className={styles.sectionHead}><span>03 / HỆ BIỂU TƯỢNG</span><h2>Tách lớp nguồn và diễn giải</h2></div><StudyTabs label="Lớp biểu tượng" items={SYMBOL_LAYERS.map(l=>({id:l.id,label:l.label}))} value={activeSymbol} onChange={setActiveSymbol}><article className={styles.symbolDetails}><h3>{chosenLayer.label}</h3><p><b>Hệ quy chiếu:</b> {chosenLayer.tradition}</p><p><b>Ví dụ:</b> {chosenLayer.examples.join(' · ')}</p><p><b>Ranh giới:</b> {chosenLayer.boundary}</p></article></StudyTabs></section>
  <footer className={styles.footer}><b>Hồ sơ phương pháp</b><p>Dữ liệu so sánh là kiến thức lịch sử và quy ước biểu tượng; không phải kết quả thực nghiệm, khẳng định tín ngưỡng hay công cụ dự báo. Quyền sử dụng hình lá bài cần đánh giá cho từng ấn bản trước khi nhập vào Thiên Đồ.</p><p><Link href="/numerology">Thần số học nâng cao ↗</Link> · <Link href="/research/schools">Phương pháp & đối chứng ↗</Link></p></footer>
 </div>;
}
