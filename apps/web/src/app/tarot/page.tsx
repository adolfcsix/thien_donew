'use client';
import {DisciplineNavigation} from '@/features/western/discipline-navigation';
import {MysticScene} from '@/features/western/mystic-scene';
import {useEffect,useMemo,useRef,useState,type FormEvent,type ChangeEvent} from 'react';
import Link from 'next/link';
import {CARDS,reading,validateSpreadSnapshot,createReadingExport,parseReadingExport,TAROT_ARCHIVE,type TarotCard,type TarotSnapshot,type TarotReading,type TarotLayout} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import {SaveStudy} from '@/features/study-room/save-study';
import {studyApi} from '@/lib/api';
import {useAuth} from '@/components/auth-provider';
import {normalizeSearchText} from '@/lib/navigation';
import {downloadBlobFile} from '@/lib/download-blob';
import styles from './tarot.module.css';
import {TarotCardDossier,TarotDepthReadingPanel} from '@/features/tarot/tarot-depth';
import {tarotDepthSearchText} from '@thiendo/interpretation/src/tarot-depth.cjs';
import {newAdvancedSpread,getSpreadRegistry,describeTarotMethod} from '@thiendo/astrology-engine/src/tarot-spreads.cjs';
import {TarotLayoutEditor,TarotSpreadMap} from '@/features/tarot/spread-layout';
import {TarotCloth} from '@/features/tarot/tarot-cloth';
import {TarotHistoryPanel} from '@/features/tarot/tarot-history';
import {tarotArtworkSrc, tarotArtworkThumbnailSrc, recoverTarotThumbnail, tarotDeckIsLocal, TAROT_DECKS, recoverTarotArtwork, type TarotDeckId} from '@/features/tarot/tarot-artwork';

const filters=[['all','Tất cả'],['major','Ẩn chính'],['wands','Gậy'],['cups','Cốc'],['swords','Kiếm'],['pentacles','Tiền']] as const;
function TarotFace({card,reversed=false,deck}:{card:TarotCard;reversed?:boolean;deck:TarotDeckId}){
 return <figure className={styles.artFigure} aria-label={`${card.nameVi}${reversed?' — lá ngược':''}`}>
  <div className={`${styles.cardFace} ${reversed?styles.reversed:''}`}>
   <img key={`${deck}:${card.id}`} className={styles.cardArtwork} src={tarotArtworkSrc(card.id,deck)} onError={event=>recoverTarotArtwork(event,card.id,deck)} alt={`Minh họa ${card.nameVi} (${card.name})`} width={600} height={1000} loading="lazy" decoding="async"/>
  </div>
  <figcaption className={styles.artCaption}>{card.nameVi}{reversed?' · Lá ngược':''}</figcaption>
 </figure>;
}

export default function TarotPage(){
 const {user,loading}=useAuth();
 const [deck,setDeck]=useState<TarotDeckId>('rws-1909');
 const [spread,setSpread]=useState<'one'|'three'|'celtic-cross'|'custom'>('three');
 const [readingContext,setReadingContext]=useState<'general'|'work'|'relationship'|'resources'>('general');
 const [historyRefresh,setHistoryRefresh]=useState(0);
 const [customLayout,setCustomLayout]=useState<TarotLayout>(()=>({id:'custom-v1',version:1,name:'Bố cục tự chọn',positions:getSpreadRegistry().layouts[1].positions.map(p=>({...p,rotation:0}))}));
 const [includeReversed,setIncludeReversed]=useState(false);
 const [question,setQuestion]=useState('');
 const [result,setResult]=useState<TarotReading|null>(null);
 const [notice,setNotice]=useState('');
 const [restoring,setRestoring]=useState(false);
 const [filter,setFilter]=useState<(typeof filters)[number][0]>('all');
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState(CARDS[0].id);
 useEffect(()=>{try{const saved=window.localStorage.getItem('thiendo:tarot-deck');if(saved==='gearberry-modern')setDeck(saved);}catch{}},[]);
 const revision=useRef(0);
 const importFileRef=useRef<HTMLInputElement>(null);
 const catalog=useMemo(()=>CARDS.filter(card=>{
   const matches=filter==='all'||filter==='major'&&card.arcana==='major'||filter===card.suit;
   const q=normalizeSearchText(search);
   return matches&&(!q||normalizeSearchText(tarotDepthSearchText(card.id)).includes(q));
 }),[filter,search]);
 const activeCard=catalog.find(card=>card.id===selected)||catalog[0]||null;
 function change(){revision.current++;setResult(null);setNotice('');}
 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get('entry');
  if(!id||loading){setRestoring(false);return;}
  setResult(null);
  if(!/^[0-9a-f-]{36}$/i.test(id)){setRestoring(false);setNotice('Mã hồ sơ không hợp lệ.');return;}
  if(!user){setRestoring(false);setNotice('Hãy đăng nhập đúng tài khoản để mở trải bài đã lưu.');return;}
  const controller=new AbortController(),at=revision.current;
  setRestoring(true);
  void studyApi.get(id,controller.signal).then(data=>{
   if(controller.signal.aborted||at!==revision.current)return;
   if(data.entry.discipline!=='tarot')throw Error('Hồ sơ không thuộc bộ môn Tarot.');
   const snapshot=validateSpreadSnapshot(data.entry.snapshot);
   setSpread(snapshot.spread);setIncludeReversed(snapshot.includeReversed);setQuestion(snapshot.question);
   if(snapshot.version===2){setReadingContext(snapshot.context);if(snapshot.spread==='custom')setCustomLayout(snapshot.layout);}
   setResult(reading(snapshot));setNotice('Đã khôi phục chính xác các lá bài và chiều lá từ Thư phòng.');
  }).catch(error=>{if(!controller.signal.aborted&&at===revision.current)setNotice((error as Error).message);})
   .finally(()=>{if(!controller.signal.aborted)setRestoring(false);});
  return()=>controller.abort();
 },[user?.id,loading]);
 function draw(event:FormEvent<HTMLFormElement>){event.preventDefault();if(restoring)return;
  revision.current++;
  try{setResult(reading(newAdvancedSpread({spread,includeReversed,question,context:readingContext,...(spread==='custom'?{layout:customLayout}:{})})));setNotice('Trải bài đã được tạo. Mở từng lá để đọc theo vị trí và đối chiếu với câu hỏi.');}
  catch(error){setResult(null);setNotice((error as Error).message);}
 }
 async function importJson(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value='';if(!file||restoring)return;
  const at=++revision.current;
  setRestoring(true);setResult(null);setNotice('');
  try{
   if(file.size>TAROT_ARCHIVE.maxBytes)throw Error('Tệp Tarot vượt giới hạn 16 KB.');
   const raw=await file.text();
   if(at!==revision.current)return;
   const snapshot=parseReadingExport(raw);
   setSpread(snapshot.spread);setIncludeReversed(snapshot.includeReversed);setQuestion(snapshot.question);
   if(snapshot.version===2){setReadingContext(snapshot.context);if(snapshot.spread==='custom')setCustomLayout(snapshot.layout);}
   setResult(reading(snapshot));setNotice('Đã nhập trải bài từ JSON. Vị trí và chiều lá được giữ nguyên, không rút lại.');
  }catch(error){if(at===revision.current)setNotice((error as Error).message);}
  finally{if(at===revision.current)setRestoring(false);}
 }
 function exportJson(){if(!result)return;
  const data=createReadingExport(result);
  downloadBlobFile(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'thien-do-tarot-rws.json');
 }
 const snapshot:TarotSnapshot|null=result?validateSpreadSnapshot(result):null;
 return <div className={`${styles.root} western-world-page`}><DisciplineNavigation current="/tarot"/>
  <header className={styles.hero}>
   <div className={styles.heroCopy}><span className={styles.eyebrow}>THIÊN ĐỒ <span aria-hidden="true">✦</span> WESTERN ARTS / TAROT RWS 1909</span>
    <h1>Bản đồ của<br/><em>những biểu tượng.</em></h1>
    <p>Khám phá trọn bộ 78 lá Rider–Waite–Smith theo cách tiếp cận phản tư. Mỗi trải bài gợi một góc nhìn; không thay thế bằng chứng, quyền tự quyết hay lời khuyên chuyên môn.</p>
    <div className={styles.stats}><span><strong>78</strong> lá bài</span><span><strong>22</strong> Ẩn chính</span><span><strong>56</strong> Ẩn phụ</span></div>
   </div><div className={styles.heroScene}><MysticScene variant="tarot"/></div>
  </header>
  <section className={`${styles.panel} ${styles.deckChooser}`} aria-label="Chọn bộ minh họa Tarot">
   <div><span className={styles.eyebrow}>BỘ BÀI</span><h2>Chọn phong cách 78 lá</h2><p>Đổi bộ hình ở thư viện, lá rút và Celtic Cross; mã lá, ý nghĩa và hồ sơ vẫn theo chuẩn RWS.</p></div>
   <label className={styles.deckSelect}>Bộ hình minh họa<select value={deck} onChange={event=>{const selected=event.target.value as TarotDeckId;setDeck(selected);try{window.localStorage.setItem('thiendo:tarot-deck',selected);}catch{}}}>{TAROT_DECKS.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
   <p className={styles.deckCredit}>{deck==='gearberry-modern'?<>Hình Gearberry hiện đại (CC BY 4.0) · <a href="https://github.com/reginanka/tarot-cards" target="_blank" rel="noreferrer">tác giả và nguồn ảnh ↗</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">giấy phép ↗</a>.</>:<>RWS 1909 · Pamela Colman Smith.</>} {tarotDeckIsLocal(deck)?'Ảnh đã lưu cục bộ.':'Ảnh cần kết nối mạng; có công cụ tải đủ 78 lá để dùng offline.'}</p>
  </section>
  <section className={styles.panel} aria-labelledby="reading-title">
   <div className={styles.sectionHead}><div><span className={styles.eyebrow}>01 / NGHI THỨC KHÁM PHÁ</span><h2 id="reading-title">Trải bài của bạn</h2></div><span className={styles.methodLabel}>RWS · Đọc theo vị trí và bối cảnh</span></div>
   <form className={styles.form} onSubmit={draw}>
    <label className={styles.questionLabel}>Chủ đề muốn suy ngẫm <span>(không bắt buộc)</span>
     <textarea value={question} onChange={e=>{change();setQuestion(e.target.value);}} maxLength={240} rows={2} placeholder="Ví dụ: Tôi nên cân nhắc những góc nhìn nào trước quyết định mới?" disabled={restoring}/>
    </label>
    <div className={styles.options}><fieldset><legend>Số lá</legend>
     <label><input type="radio" name="spread" value="one" checked={spread==='one'} onChange={()=>{change();setSpread('one');}} disabled={restoring}/> Một lá</label>
     <label><input type="radio" name="spread" value="three" checked={spread==='three'} onChange={()=>{change();setSpread('three');}} disabled={restoring}/> Ba lá</label>
     <label><input type="radio" name="spread" value="celtic-cross" checked={spread==='celtic-cross'} onChange={()=>{change();setSpread('celtic-cross');}} disabled={restoring}/> Celtic Cross · 10 lá</label>
     <label><input type="radio" name="spread" value="custom" checked={spread==='custom'} onChange={()=>{change();setSpread('custom');}} disabled={restoring}/> Bố cục tự chọn</label>
    </fieldset><label className={styles.toggle}><input type="checkbox" checked={includeReversed} onChange={e=>{change();setIncludeReversed(e.target.checked);}} disabled={restoring}/> Cho phép lá ngược</label>
     <button type="submit" className={styles.primary} disabled={restoring}>{restoring?'Đang khôi phục…':'✧ Xáo và rút bài'}</button>
     <button type="button" className={styles.secondary} onClick={()=>importFileRef.current?.click()} disabled={restoring}>↑ Nhập JSON trải bài</button>
     <input ref={importFileRef} type="file" accept="application/json,.json" hidden onChange={event=>void importJson(event)} aria-label="Chọn tệp JSON trải bài Tarot" disabled={restoring}/>
    </div>
    <label>Bối cảnh để lưu<select aria-label="Bối cảnh lưu cùng trải bài" value={readingContext} onChange={e=>{change();setReadingContext(e.target.value as typeof readingContext);}} disabled={restoring}><option value="general">Tổng quát</option><option value="work">Công việc / học tập</option><option value="relationship">Quan hệ / giao tiếp</option><option value="resources">Nguồn lực / thời gian</option></select></label>
    {spread==='custom'&&<TarotLayoutEditor layout={customLayout} onChange={layout=>{change();setCustomLayout(layout);}}/>}
   </form><p className={styles.help}>Bạn có thể nhập lại tệp JSON đã xuất để khôi phục chính xác trải bài ngay cả khi chưa đăng nhập. Nhập tệp không tự động lưu vào tài khoản.</p><p className={styles.help}>Một lá: điều cần nhìn rõ. Ba lá: bối cảnh → góc nhìn bổ sung → hướng hành động. Celtic Cross dùng 10 vị trí Waite phản tư; bố cục tự chọn giữ nhãn, vai trò và tọa độ trong hồ sơ phương pháp 2. Rút không lặp trong cùng trải bài; dùng nguồn ngẫu nhiên mật mã của trình duyệt, không gắn lá bài với thông tin cá nhân. Thay đổi tham số sẽ xóa trải bài hiển thị cho đến khi rút lại.</p>
   {notice&&<p role="status" className={styles.notice}>{notice}</p>}
   {result&&<div className={styles.result} aria-live="polite"><p className={styles.help}>Đang đọc: {describeTarotMethod(result).name}{result.version===1?' · hồ sơ cũ, chưa ghim luận sâu':' · bối cảnh đã lưu'}</p><TarotSpreadMap result={result} deck={deck}/><TarotCloth><div className={styles.readingGrid}>
    {result.positions.map(position=><article className={styles.readingCard} key={position.card.id}>
      <span className={styles.positionLabel}>{String(position.index+1).padStart(2,'0')} / {position.label}</span>
      <TarotFace card={position.card} reversed={position.orientation==='reversed'} deck={deck}/>
      <div className={styles.readingCopy}><h3>{position.card.nameVi}</h3><p className={styles.orientation}>{position.orientation==='reversed'?'Lá ngược':'Lá xuôi'} · {position.card.name}</p><p>{position.meaning}.</p><h4>Câu hỏi tự đối chiếu</h4><p>{position.reflection}</p></div>
     </article>)}
    </div></TarotCloth>{snapshot&&<TarotDepthReadingPanel snapshot={snapshot} onContextChange={context=>{if(snapshot.version===2){setReadingContext(context);setResult(reading({...snapshot,context}));}}}/>}<div className={styles.saveArea}><button className={styles.secondary} type="button" onClick={exportJson}>↓ Xuất JSON trải bài</button>
       <SaveStudy onSaved={()=>setHistoryRefresh(n=>n+1)} draft={snapshot?{discipline:'tarot',title:`Tarot RWS · ${describeTarotMethod(result).name}`,summary:result.positions.map(p=>p.card.nameVi+(p.orientation==='reversed'?' (ngược)':'')).join(' · ').slice(0,240),notes:'',tags:['Tarot','RWS'],snapshot:{...snapshot}}:null}/>
      </div><p className={styles.help}>Bản lưu giữ mã lá và chiều lá, không rút ngẫu nhiên lại khi mở. Câu hỏi có thể là thông tin riêng tư: chỉ lưu vào tài khoản khi bạn chủ động chọn.</p>
   </div>}
  </section>
  <TarotHistoryPanel current={snapshot} refresh={historyRefresh}/>
  <section className={styles.panel} aria-labelledby="library-title">
   <div className={styles.sectionHead}><div><span className={styles.eyebrow}>02 / ATLAS TAROT</span><h2 id="library-title">Thư viện 78 lá</h2></div><span className={styles.methodLabel}>78 ảnh {deck==='gearberry-modern'?'Gearberry WebP':'RWS 1909'} · {tarotDeckIsLocal(deck)?'đã lưu trong website':'nguồn ảnh công khai'}</span></div>
   <div className={styles.libraryControls}><div className={styles.filters} aria-label="Lọc theo nhóm lá">{filters.map(([id,title])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)} className={filter===id?styles.activeFilter:undefined}>{title}</button>)}</div><label className={styles.search}>Tìm lá bài<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên Việt, tiếng Anh, ý nghĩa…"/></label></div>
   <p className={styles.help} role="status">Đang hiển thị {catalog.length} / 78 lá.</p>
   <div className={styles.catalogLayout}><div className={styles.catalog} aria-label="Danh mục Tarot">{catalog.map(card=><button key={card.id} type="button" onClick={()=>setSelected(card.id)} aria-pressed={activeCard?.id===card.id} className={`${styles.catalogCard} ${activeCard?.id===card.id?styles.isSelected:''}`}><img className={styles.catalogThumb} key={`${deck}:${card.id}`} src={tarotArtworkThumbnailSrc(card.id,deck)} onError={event=>recoverTarotThumbnail(event,card.id,deck)} alt="" loading="lazy" decoding="async" width={66} height={110}/><strong>{card.nameVi}</strong><small>{card.name}</small></button>)}</div>
    {activeCard?<aside className={styles.detail}><span className={styles.eyebrow}>TRA CỨU LÁ BÀI</span><TarotFace card={activeCard} deck={deck}/><h3>{activeCard.nameVi}</h3><p className={styles.orientation}>{activeCard.name} · {activeCard.arcana==='major'?'Ẩn chính':`Ẩn phụ · ${activeCard.element}`}</p><h4>Nghĩa xuôi</h4><p>{activeCard.upright}.</p><h4>Góc nhìn lá ngược</h4><p>{activeCard.reversed}.</p><h4>Câu hỏi tự nghiên cứu</h4><p>{activeCard.reflection}</p><TarotCardDossier id={activeCard.id}/></aside>:<p className={styles.emptyCatalog} role="status">Không tìm thấy lá bài phù hợp. Thử từ khóa khác hoặc chọn “Tất cả”.</p>}
   </div>
  </section>
  <section className={styles.sources}><span className={styles.eyebrow}>03 / PHƯƠNG PHÁP</span><h2>Một truyền thống, một hệ quy chiếu rõ ràng</h2><p>Thiên Đồ dùng hệ tên và thứ tự Rider–Waite–Smith (1909): Strength VIII, Justice XI, bốn bộ Gậy/Cốc/Kiếm/Tiền; mỗi bộ 14 lá. Ý nghĩa hai chiều và câu hỏi phản tư được biên soạn mới bằng tiếng Việt, không phải bản dịch nguyên văn tài liệu lịch sử. Lá ngược là một tùy chọn diễn giải, không mặc định là điềm xấu.</p><p>Hình minh họa có thể là bản RWS 1909 của Pamela Colman Smith hoặc bộ Gearberry hiện đại (CC BY 4.0). Bộ hình chỉ thay đổi hình minh họa, không thay dữ liệu bài, thứ tự ý nghĩa hay cách rút. Nội dung Tarot dành cho tìm hiểu văn hóa và thực hành suy ngẫm, không chứng minh khả năng dự báo tương lai. Ảnh bài: <a href="https://github.com/sixseeds/tarot-api" target="_blank" rel="noreferrer">nguồn ảnh RWS 1909 ↗</a>.</p><p><Link href="/study">Thư phòng chung ↗</Link> · <Link href="/research/development">Lộ trình nghiên cứu ↗</Link></p></section>
 </div>;
}
