'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {DisciplineMethodGuide} from '@/features/discipline-canvas/discipline-method-guide';
import {EasternScene} from '@/features/discipline-canvas/eastern-scene';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {SaveStudy} from '@/features/study-room/save-study';
import {readStudyInput} from '@/features/study-room/study-links.cjs';
import {TIME_METHODS, sliceTime, compareEntries} from '@thiendo/astrology-engine/src/tieban-source.cjs';
import {BRANCHES, buildLedger, exportLedger, importLedger} from '@thiendo/astrology-engine/src/tieban-critical-ledger-v11146.cjs';
import type {TiebanSource, TiebanWitness} from '@thiendo/astrology-engine/src/tieban-critical-ledger-v11146.cjs';
import styles from '../huyen-hoc/workbench.module.css';

const blankSource: TiebanSource = {id:'',title:'',edition:'',sourceUrl:'',rights:'',lineageId:'',scanStatus:'catalogue-only'};
const blankWitness: TiebanWitness = {sourceId:'',articleNumber:'',page:'',part:1,transcription:'',reviewStatus:'transcribed'};

export default function ThietBanPage() {
  const [hour,setHour]=useState(23);
  const [minute,setMinute]=useState(15);
  const [methodId,setMethodId]=useState('eight-parts');
  const [sourceId,setSourceId]=useState('research-time-slice-v1');
  const [corpusId,setCorpusId]=useState('');
  const [edition,setEdition]=useState('');
  const [sourceUrl,setSourceUrl]=useState('');
  const [page,setPage]=useState('');
  const [articleNumber,setArticleNumber]=useState('');
  const [transcription,setTranscription]=useState('');
  const [license,setLicense]=useState('');
  const [verification,setVerification]=useState('unchecked');
  const [entries,setEntries]=useState<ReturnType<typeof compareEntries>['entries']>([]);
  const [sourceDraft,setSourceDraft]=useState<TiebanSource>(blankSource);
  const [witnessDraft,setWitnessDraft]=useState<TiebanWitness>(blankWitness);
  const [sources,setSources]=useState<TiebanSource[]>([]);
  const [witnesses,setWitnesses]=useState<TiebanWitness[]>([]);
  const [importText,setImportText]=useState('');
  const [message,setMessage]=useState('');
  const [ledgerMessage,setLedgerMessage]=useState('');

  useEffect(()=>{
    const saved=readStudyInput('thiet-ban',window.location.search);
    if(saved){setHour(saved.hour);setMinute(saved.minute);setMethodId(saved.methodId);setSourceId(saved.sourceId);}
  },[]);
  const snapshot=useMemo(()=>({hour,minute,methodId,sourceId}),[hour,minute,methodId,sourceId]);
  const outcome=useMemo(()=>{try{return {result:sliceTime(snapshot),error:''};}catch(e){return {result:null,error:(e as Error).message};}},[snapshot]);
  const comparison=useMemo(()=>compareEntries(entries),[entries]);
  const branchIndex=outcome.result?.branchIndex??0;
  const ledger=useMemo(()=>{
    try{return {result:buildLedger({methodId,branchIndex,sources,witnesses}),error:''};}
    catch(e){return {result:null,error:(e as Error).message};}
  },[methodId,branchIndex,sources,witnesses]);
  const exported=useMemo(()=>{
    if(!ledger.result)return '';
    return exportLedger({methodId,branchIndex,sources,witnesses});
  },[ledger.result,methodId,branchIndex,sources,witnesses]);

  function changeClock(nextHour:number,nextMinute:number){
    const prior=Math.floor(((hour*60+minute+60+1440)%1440)/120);
    const next=Math.floor(((nextHour*60+nextMinute+60+1440)%1440)/120);
    if(prior!==next&&witnesses.length){setWitnesses([]);setLedgerMessage('Đã đổi địa chi giờ, các liên kết điều văn cũ được làm trống để không gán nhầm sang giờ khác.');}
    setHour(nextHour);setMinute(nextMinute);
  }
  function addEntry(){
    try{
      const record=compareEntries([...entries,{corpusId,edition,sourceUrl,page,articleNumber,transcription,license,verification}]);
      setEntries([...record.entries]);setMessage('Đã thêm bản chép vào đối chiếu cục bộ; chưa lưu vào tài khoản.');
    }catch(e){setMessage((e as Error).message);}
  }
  function addSource(){
    try{
      buildLedger({methodId,branchIndex,sources:[...sources,sourceDraft],witnesses});
      setSources(prev=>[...prev,{...sourceDraft}]);setSourceDraft({...blankSource});setLedgerMessage('Đã thêm tư liệu vào sổ khảo chứng cục bộ.');
    }catch(e){setLedgerMessage((e as Error).message);}
  }
  function addWitness(){
    try{
      buildLedger({methodId,branchIndex,sources,witnesses:[...witnesses,witnessDraft]});
      setWitnesses(prev=>[...prev,{...witnessDraft}]);setWitnessDraft({...blankWitness});setLedgerMessage('Đã liên kết chứng bản với một phần giờ, chưa phải phép định điều.');
    }catch(e){setLedgerMessage((e as Error).message);}
  }
  function restoreResearch(){
    try{
      const loaded=importLedger(importText);
      setMethodId(loaded.methodId);
      // Keep selected branch consistent with imported evidence without changing original birth-minute input silently.
      const branchStart=(loaded.branchIndex*120-60+1440)%1440;
      setHour(Math.floor(branchStart/60));setMinute(branchStart%60);
      setSources(loaded.sources);setWitnesses(loaded.witnesses);
      setLedgerMessage('Đã nhập sổ khảo chứng. Giờ đã chuyển đến đầu chi giờ ghi trong tệp; hãy kiểm tra lại giờ riêng của hồ sơ.');
    }catch(e){setLedgerMessage((e as Error).message);}
  }
  function downloadResearch(){
    if(!exported)return;
    downloadBlobFile(new Blob([exported],{type:'application/json;charset=utf-8'}),'thien-do-thiet-ban-v11146-research.json');
  }

  return <div className={`${styles.page} ${styles.mai}`} style={{minWidth:0,gridTemplateColumns:'minmax(0,1fr)'}}>
    <header className={styles.hero}><EasternScene variant="thiet-ban"/>
      <span className={styles.kicker}>THIẾT BẢN THẦN SỐ · 鐵板神數</span>
      <h1>Thiết Bản · Khảo khắc và đối chứng truyền bản</h1>
      <p>Đối chiếu nguồn, phiên bản điều văn, quan hệ giữa chứng bản và phần giờ. Không giả lập kho 12.000 điều, không tự suy số điều từ Can Chi, không xác định “giờ sinh thật” từ khớp điều văn.</p>
      <Link className={styles.back} href="/huyen-hoc">← Trung tâm Khám phá</Link>
    </header><DisciplineMethodGuide variant="thiet-ban"/>

    <div className={styles.columns}>
      <section className={styles.panel}>
        <span className={styles.kicker}>01 / PHÉP CHIA GIỜ</span><h2>Quy ước khảo khắc</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>Giờ địa phương (0–23)<input type="number" min={0} max={23} value={hour} onChange={e=>changeClock(Number(e.target.value),minute)}/></label>
          <label className={styles.field}>Phút (0–59)<input type="number" min={0} max={59} value={minute} onChange={e=>changeClock(hour,Number(e.target.value))}/></label>
          <label className={styles.field}>Quy ước phân phần<select value={methodId} onChange={e=>{setMethodId(e.target.value);setWitnesses([]);setWitnessDraft({...blankWitness});setLedgerMessage('Đã đổi quy ước: các liên kết phần giờ cũ được làm trống để tránh trộn phương pháp.');}}>{Object.values(TIME_METHODS).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
          <label className={styles.field}>Mã tài liệu quy tắc<input value={sourceId} onChange={e=>setSourceId(e.target.value)} maxLength={150}/></label>
        </div>
        <p className={styles.note}>Quy ước số học: 8 phần × 15 phút hoặc 12 phần × 10 phút trong mỗi địa chi giờ. Không coi hai quy ước là cùng một phép định điều.</p>
      </section>
      <section className={styles.panel} aria-live="polite">
        <span className={styles.kicker}>02 / KẾT QUẢ PHÂN ĐOẠN</span><h2>Giờ và phần giờ</h2>
        {outcome.result?<>
          <div className={styles.facts}>
            <div className={styles.fact}><span>Địa chi giờ</span><strong>{outcome.result.branch}</strong></div>
            <div className={styles.fact}><span>Phần thứ</span><strong>{outcome.result.part}/{outcome.result.partCount}</strong></div>
            <div className={styles.fact}><span>Khoảng thời gian</span><strong>{outcome.result.startLocal}</strong><small>Đến {outcome.result.endLocal}</small></div>
          </div><p>{outcome.result.limitation}</p>
        </>:<p className={styles.error} role="alert">{outcome.error}</p>}
        <SaveStudy draft={outcome.result?{discipline:'thiet-ban',title:`Thiết Bản · ${outcome.result.branch} thời, phần ${outcome.result.part}`,summary:`${outcome.result.methodId}; quy ước ${sourceId}`,notes:'',tags:[],snapshot}:null}/>
      </section>
    </div>

    <section className={styles.panel}>
      <span className={styles.kicker}>03 / ĐIỀU VĂN · KHẢO DỊ</span><h2>Đối chiếu văn bản theo mã điều</h2>
      <p>Phần cũ được giữ nguyên. Chỉ nhập trích lục có quyền sử dụng và thông tin trang/bản in. Số điều tương tự ở hai bản không mặc nhiên là cùng quy tắc.</p>
      <div className={styles.formGrid}>
        <label className={styles.field}>Mã thư khố<input value={corpusId} onChange={e=>setCorpusId(e.target.value)}/></label>
        <label className={styles.field}>Ấn bản<input value={edition} onChange={e=>setEdition(e.target.value)}/></label>
        <label className={styles.field}>URL nguồn<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label>
        <label className={styles.field}>Trang<input value={page} onChange={e=>setPage(e.target.value)}/></label>
        <label className={styles.field}>Số điều<input value={articleNumber} onChange={e=>setArticleNumber(e.target.value)}/></label>
        <label className={styles.field}>Mức đối chứng<select value={verification} onChange={e=>setVerification(e.target.value)}><option value="unchecked">Chưa kiểm</option><option value="source-scan-checked">Đã kiểm ảnh nguồn</option><option value="two-witnesses">Hai chứng bản (khai báo)</option></select></label>
        <label className={styles.field}>Quyền sử dụng<input value={license} onChange={e=>setLicense(e.target.value)}/></label>
        <label className={styles.field}>Trích lục<textarea rows={3} maxLength={3000} value={transcription} onChange={e=>setTranscription(e.target.value)}/></label>
      </div>
      <div className={styles.actions}><button className={styles.button} type="button" onClick={addEntry}>Thêm chứng bản</button><button className={styles.button} type="button" onClick={()=>{setEntries([]);setMessage('Đã xóa các bản chép tạm.');}}>Xóa đối chiếu tạm</button></div>
      {message&&<p role="status">{message}</p>}
      {comparison.variants.length>0&&<div className={styles.ledger}><table><thead><tr><th>Mã kho / điều</th><th>Ấn bản</th><th>Số dị văn</th></tr></thead><tbody>{comparison.variants.map(v=><tr key={v.key}><td>{v.key}</td><td>{v.editions.join(' · ')}</td><td>{v.textVariants}{v.requiresCollation?' · Cần khảo dị':''}</td></tr>)}</tbody></table></div>}
    </section>

    <section className={styles.panel}>
      <span className={styles.kicker}>04 / THƯ MỤC CHỨNG BẢN</span><h2>Đăng ký chứng bản có xuất xứ</h2>
      <p>Mã dòng truyền bản giúp tránh đếm hai bản sao cùng nguồn thành hai tài liệu độc lập. Mức “kiểm ảnh” do người nghiên cứu khai báo; ứng dụng không tự xác minh quyền sử dụng hay tính xác thực của ảnh.</p>
      <div className={styles.formGrid}>
        <label className={styles.field}>Mã nguồn<input value={sourceDraft.id} onChange={e=>setSourceDraft({...sourceDraft,id:e.target.value})} placeholder="edition-a"/></label>
        <label className={styles.field}>Mã dòng truyền bản<input value={sourceDraft.lineageId} onChange={e=>setSourceDraft({...sourceDraft,lineageId:e.target.value})} placeholder="lineage-a"/></label>
        <label className={styles.field}>Tên sách/tư liệu<input value={sourceDraft.title} onChange={e=>setSourceDraft({...sourceDraft,title:e.target.value})}/></label>
        <label className={styles.field}>Ấn bản/năm<input value={sourceDraft.edition} onChange={e=>setSourceDraft({...sourceDraft,edition:e.target.value})}/></label>
        <label className={styles.field}>Địa chỉ nguồn<input value={sourceDraft.sourceUrl} onChange={e=>setSourceDraft({...sourceDraft,sourceUrl:e.target.value})} placeholder="https://..."/></label>
        <label className={styles.field}>Quyền trích lục<input value={sourceDraft.rights} onChange={e=>setSourceDraft({...sourceDraft,rights:e.target.value})} placeholder="Giấy phép/giới hạn sử dụng"/></label>
        <label className={styles.field}>Trạng thái tài liệu<select value={sourceDraft.scanStatus} onChange={e=>setSourceDraft({...sourceDraft,scanStatus:e.target.value as TiebanSource['scanStatus']})}><option value="catalogue-only">Chỉ có thư mục</option><option value="unreviewed">Chưa đối chiếu</option><option value="scan-inspected">Người nhập đã đối chiếu ảnh</option></select></label>
      </div>
      <div className={styles.actions}><button type="button" className={styles.button} onClick={addSource}>Thêm tư liệu</button></div>
      {sources.length>0&&<div className={styles.ledger}><table><thead><tr><th>Mã</th><th>Tư liệu</th><th>Dòng truyền bản</th><th>Trạng thái</th></tr></thead><tbody>{sources.map(s=><tr key={s.id}><td>{s.id}</td><td>{s.title} · {s.edition}</td><td>{s.lineageId}</td><td>{s.scanStatus}</td></tr>)}</tbody></table></div>}
    </section>

    <section className={styles.panel}>
      <span className={styles.kicker}>05 / LIÊN KẾT SỐ ĐIỀU – PHẦN GIỜ</span><h2>Lập sổ đối chứng có thể truy vết</h2>
      <p>Liên kết là giả thuyết nghiên cứu chép từ trang có xuất xứ, <b>không phải phép tự suy ra số điều</b>. Chọn nguồn trong thư mục đã thêm, và chỉ đánh dấu “kiểm ảnh” nếu thực sự đã kiểm.</p>
      <div className={styles.formGrid}>
        <label className={styles.field}>Nguồn đã khai báo<select value={witnessDraft.sourceId} onChange={e=>setWitnessDraft({...witnessDraft,sourceId:e.target.value})}><option value="">— Chọn nguồn —</option>{sources.map(s=><option key={s.id} value={s.id}>{s.id} · {s.edition}</option>)}</select></label>
        <label className={styles.field}>Phần giờ trong chi {outcome.result?.branch||''}<select value={witnessDraft.part} onChange={e=>setWitnessDraft({...witnessDraft,part:Number(e.target.value)})}>{Array.from({length:TIME_METHODS[methodId].divisions},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
        <label className={styles.field}>Số điều ghi trong nguồn<input value={witnessDraft.articleNumber} onChange={e=>setWitnessDraft({...witnessDraft,articleNumber:e.target.value})}/></label>
        <label className={styles.field}>Trang/bản khắc<input value={witnessDraft.page} onChange={e=>setWitnessDraft({...witnessDraft,page:e.target.value})}/></label>
        <label className={styles.field}>Tình trạng trích lục<select value={witnessDraft.reviewStatus} onChange={e=>setWitnessDraft({...witnessDraft,reviewStatus:e.target.value as TiebanWitness['reviewStatus']})}><option value="transcribed">Đã nhập bản chép</option><option value="scan-checked">Đã so ảnh nguồn</option></select></label>
        <label className={styles.field}>Trích lục được phép dùng<textarea rows={3} maxLength={2000} value={witnessDraft.transcription} onChange={e=>setWitnessDraft({...witnessDraft,transcription:e.target.value})}/></label>
      </div>
      <div className={styles.actions}><button type="button" className={styles.button} onClick={addWitness}>Liên kết chứng bản</button><button type="button" className={styles.button} onClick={()=>{setWitnesses([]);setLedgerMessage('Đã xóa các liên kết số điều – phần giờ.');}}>Xóa liên kết</button></div>
      {ledgerMessage&&<p role="status">{ledgerMessage}</p>}
      {ledger.error&&<p role="alert" className={styles.error}>{ledger.error}</p>}
      {ledger.result&&<>
        <h3>Bảng {BRANCHES[ledger.result.branchIndex]} thời · {ledger.result.rows.length} phần</h3>
        <div className={styles.ledger}><table><thead><tr><th>Phần</th><th>Giờ</th><th>Số điều đã trích</th><th>Dòng nguồn</th><th>Kết quả khảo dị</th></tr></thead><tbody>{ledger.result.rows.map(r=><tr key={r.part}><td><strong>{r.part}</strong>{outcome.result?.part===r.part?' · đang chọn':''}</td><td>{r.range}</td><td>{r.articleNumbers.join(', ')||'Chưa có'}</td><td>{r.lineageCount}</td><td>{r.status==='NO_EVIDENCE'?'Chưa có chứng bản':r.status==='COLLATION_REQUIRED'?'Có mâu thuẫn cần đối chiếu':r.status==='MULTIPLE_LINEAGES_CONSISTENT'?'Nhiều dòng nguồn nhất quán (không xác nhận phép định điều)':'Đã liên kết nguồn, chưa đủ đối chứng'}</td></tr>)}</tbody></table></div>
      </>}
    </section>

    <section className={styles.panel}>
      <span className={styles.kicker}>06 / MANG DỮ LIỆU NGHIÊN CỨU</span><h2>Xuất / nhập sổ khảo chứng JSON</h2>
      <p>Thông tin chứng bản chỉ giữ trong tab hiện tại. Xuất JSON để lưu ở thiết bị; không tự tải lên tài khoản. Dữ liệu nghiên cứu độc lập với nút “Lưu Thư phòng” ở trên và không chứa thông tin sáu thân hay kết luận riêng tư.</p>
      <div className={styles.actions}><button type="button" className={styles.button} onClick={downloadResearch} disabled={!exported}>Tải JSON nghiên cứu</button><button type="button" className={styles.button} onClick={()=>{setSources([]);setWitnesses([]);setLedgerMessage('Đã xóa toàn bộ sổ khảo chứng cục bộ.');}}>Làm trống sổ</button></div>
      <label className={styles.field}>Dán JSON nghiên cứu đã xuất vào đây<textarea rows={4} maxLength={1024*1024} value={importText} onChange={e=>setImportText(e.target.value)} placeholder='{"format":"thien-do.tieban-critical-ledger", ...}'/></label>
      <div className={styles.actions}><button type="button" className={styles.button} onClick={restoreResearch}>Nhập và kiểm tra JSON</button></div>
    </section>
    <footer className={styles.disclaimer}>Phép phân phần, thư mục nguồn và bảng chứng bản chỉ phục vụ khảo cứu Thiết Bản. Chưa có thuật toán định điều hoàn chỉnh được chứng nhận, không có kho điều văn có quyền sử dụng, và không có kiểm chứng độ đúng của dự báo. Các kết quả được khai báo và đối chiếu bởi người dùng, không phải chứng nhận của Thiên Đồ.</footer>
  </div>;
}
