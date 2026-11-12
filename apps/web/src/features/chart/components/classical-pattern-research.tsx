'use client';

import {useEffect, useMemo, useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {auditClassicalPatternCandidates} from '@thiendo/interpretation/src/classical-pattern-research.cjs';
import {summarizeClassicalEvidence,filterClassicalEvidence} from '@thiendo/interpretation/src/classical-evidence-workbench.cjs';
import type {ClassicalEvidenceFilter} from '@thiendo/interpretation/src/classical-evidence-workbench.cjs';
import {summarizeClassicalCatalog,filterClassicalCatalog} from '@thiendo/interpretation/src/classical-pattern-catalog.cjs';
import {summarizeClassicalResearchReadiness} from '@thiendo/interpretation/src/classical-research-readiness.cjs';
import {buildClassicalVoidGapLedger} from '@thiendo/interpretation/src/classical-void-gap-ledger.cjs';
import {auditClassicalPeriodGeometry} from '@thiendo/interpretation/src/classical-period-geometry.cjs';
import {auditClassicalDingZaPeriods} from '@thiendo/interpretation/src/classical-dingza-period-research.cjs';
import {auditClassicalDingZaSourceBridge} from '@thiendo/interpretation/src/classical-dingza-source-bridge.cjs';
import {auditClassicalVoidPairGeometry} from '@thiendo/interpretation/src/classical-source-void-geometry.cjs';
import {auditClassicalVoidSemanticGates} from '@thiendo/interpretation/src/classical-void-semantic-gates.cjs';
import {SOURCE_FUXUN_PAIRS,CAUTION as FUXUN_CAUTION} from '@thiendo/interpretation/src/classical-source-fuxun-formula.cjs';
import {SOURCE_VOID_STEM_ROWS,SOURCE_STEM_MATRIX_NOTE,SOURCE_SCHOOL_DATA_URL,auditSourceDoubleJiekongCodeConcordance} from '@thiendo/interpretation/src/classical-source-void-vocabulary.cjs';
import type {ClassicalCatalogFilterStatus} from '@thiendo/interpretation/src/classical-pattern-catalog.cjs';
import styles from './conditional-pattern-evidence.module.css';

const stateText={
  'structural-match':'Khớp điều kiện vị trí',
  'not-met':'Chưa khớp điều kiện',
  'needs-review':'Cần thẩm định thêm'
} as const;
const checkText={met:'Đã quan sát', 'not-met':'Chưa đáp ứng',unknown:'Chưa thể xác minh'} as const;
const methodText={derivable:'Nguồn: có thể kiểm tra',disputed:'Nguồn: còn tranh luận',unreachable:'Nguồn: chưa thể suy ra'} as const;

/**
 * Research-only extension of the existing conditional evidence workbench.
 * Shown only for Menh in expert view; does not add a redundant navigation tab.
 */
export function ClassicalPatternResearch({chart}:{chart:AstrologyResult}){
  const data=useMemo(()=>auditClassicalPatternCandidates(chart),[chart]);
  const bridge=useMemo(()=>auditClassicalDingZaSourceBridge(chart),[chart]);
  const voidGeometry=useMemo(()=>auditClassicalVoidPairGeometry(chart),[chart]);
  const voidGates=useMemo(()=>auditClassicalVoidSemanticGates(chart),[chart]);
  const voidGateById=useMemo(()=>new Map<string,(typeof voidGates.items)[number]>(voidGates.items.map(item=>[item.id,item] as const)),[voidGates]);
  const bridgeById=useMemo(()=>new Map<string,(typeof bridge.items)[number]>(bridge.items.map(x=>[x.id,x] as const)),[bridge]);
  // Natal position checks and newly mapped decade checks stay independent.
  const catalog=useMemo(()=>summarizeClassicalCatalog([
    ...data.records.map(record=>record.id),...bridge.mappedIds
  ]),[data,bridge]);
  const readiness=useMemo(()=>summarizeClassicalResearchReadiness(catalog),[catalog]);
  const pendingById=useMemo(()=>new Map<string,(typeof data.pendingEvidence)[number]>(data.pendingEvidence.map(entry=>[entry.id,entry] as const)),[data]);
  const periodGeometry=useMemo(()=>auditClassicalPeriodGeometry(chart),[chart]);
  const dingZa=useMemo(()=>auditClassicalDingZaPeriods(chart),[chart]);
  const dingZaById=useMemo(()=>new Map<string,(typeof dingZa.items)[number]>(dingZa.items.map(item=>[item.id,item] as const)),[dingZa]);
  const voidGapLedger=useMemo(()=>buildClassicalVoidGapLedger({catalog,readiness,natal:data,period:dingZa,voidGates}),[catalog,readiness,data,dingZa,voidGates]);
  const [filter,setFilter]=useState<ClassicalEvidenceFilter>('relevant');
  const [catalogQuery,setCatalogQuery]=useState('');
  const [catalogStatus,setCatalogStatus]=useState<ClassicalCatalogFilterStatus>('all');
  const [jumpToId,setJumpToId]=useState<string|null>(null);
  const localizedTitles=useMemo(()=>Object.fromEntries([
    ...data.records.map(r=>[r.id,r.title]),...dingZa.items.filter(x=>bridge.mappedIds.includes(x.id as 'dinh-tap-01'|'dinh-tap-02'|'dinh-tap-08')).map(x=>[x.id,x.title])
  ]),[data,dingZa,bridge]);
  // Index criteria labels, not live placement details or birth information.
  const evidenceTerms=useMemo(()=>Object.fromEntries(data.records.map(record=>[
    record.id,[record.interpretation,...record.checks.map(condition=>condition.label)].join(' ')
  ])),[data]);
  const catalogView=useMemo(()=>filterClassicalCatalog(catalog,{query:catalogQuery,status:catalogStatus,localizedTitles,evidenceTerms}),[catalog,catalogQuery,catalogStatus,localizedTitles,evidenceTerms]);
  const evidence=useMemo(()=>summarizeClassicalEvidence(data.records),[data]);
  const visible=useMemo(()=>filterClassicalEvidence(data.records,filter),[data,filter]);
  // A catalog item might be hidden by the “Liên quan” filter. Reveal it
  // before attempting to open/scroll; use the current rendered DOM only.
  useEffect(()=>{
    if(!jumpToId)return;
    const target=document.getElementById('tuvi-classical-'+jumpToId);
    if(target instanceof HTMLDetailsElement){
      target.open=true;
      const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
    }
    setJumpToId(null);
  },[jumpToId,filter]);
  return <article className={'palace-reading-editorial '+styles.panel} aria-label="Đối chiếu cách cục cổ điển có nguồn">
    <div className={styles.head}>
      <div>
        <h4>Đối chiếu cách cục cổ điển</h4>
        <p className="palace-reading-scope">Đã ánh xạ điều kiện {catalog.assessed}/{data.referenceTotal} mục ({data.records.length} nguyên cục + {bridge.mappedIds.length} đại hạn nghiên cứu) · {data.matched} khớp cấu trúc nguyên cục · {data.needsReview} cần thẩm định.</p>
      </div>
      <div className={styles.filters} role="group" aria-label="Lọc theo kết quả điều kiện nghiên cứu">
        <button type="button" aria-pressed={filter==='relevant'} onClick={()=>setFilter('relevant')}>Liên quan · {evidence.counts.relevant}</button>
        <button type="button" aria-pressed={filter==='matched'} onClick={()=>setFilter('matched')}>Khớp cấu trúc · {evidence.counts.matched}</button>
        <button type="button" aria-pressed={filter==='review'} onClick={()=>setFilter('review')}>Cần thẩm định · {evidence.counts.review}</button>
        <button type="button" aria-pressed={filter==='not-met'} onClick={()=>setFilter('not-met')}>Chưa khớp · {evidence.counts.notMet}</button>
        <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Tất cả · {evidence.counts.all}</button>
      </div>
    </div>
    <p>Tham khảo cách đối chiếu từ các nhóm Định phú, Định quý và Định bần. Bản này chỉ so sánh sao bản mệnh, không tự xác nhận thành cách hay đưa ra dự báo.</p>
    <section className={styles.obstruction} aria-label="Chứng cứ Tuần và Triệt nguyên cục">
      <p><strong>Tuần / Triệt (bản mệnh)</strong> · {data.obstructionAudit.verified
        ? (data.obstructionAudit.atMenh.length
          ? 'Đã xác minh dấu án ngữ tại Mệnh: '+data.obstructionAudit.atMenh.join(', ')
          : 'Đã kiểm tra; không có dấu Tuần/Triệt tại Mệnh')
        : 'Chưa đủ dữ liệu để kiểm chứng'}</p>
      <small>{data.obstructionAudit.reason} Đây là lớp chứng cứ theo Tam Hợp; không được dùng để tự kết luận mọi loại Không Vong hoặc mở khóa cách cục chưa thẩm định.</small>
    </section>
    <section className={styles.obstruction} aria-label="Chứng cứ Hỏa Tinh nguyên cục">
      <p><strong>Hỏa Tinh (bản mệnh)</strong> · {data.fireAudit.verified
        ? 'Đã xác minh vị trí tại chi số '+data.fireAudit.branchIndex
        : 'Chưa đủ chứng cứ vị trí'}</p>
      <small>{data.fireAudit.reason} Độ sáng Hỏa Tinh chưa được xác minh; mục Tham Hỏa tương phùng không thể kết luận chỉ từ vị trí.</small>
      <details className={styles.comparison}>
        <summary>Đối chiếu độ sáng giữa các trường phái (chỉ tham khảo)</summary>
        <p>{data.brightnessComparison.reason}</p>
        {data.brightnessComparison.available&&<ul className={styles.checks}>
          {([['Tham Lang',data.brightnessComparison.tham],['Hỏa Tinh',data.brightnessComparison.fire],['Linh Tinh',data.brightnessComparison.bell]] as const).map(([name,entry])=>
            <li key={name}><strong>{name}:</strong> {entry?entry.branchName+' · '+entry.label:'Chưa xác minh vị trí'} <small>(Bảng QS; không thay cho hồ sơ Thiên Đồ)</small></li>
          )}
        </ul>}
        <div className={styles.schoolDifference}>
          <p><strong>Linh Tinh · {data.brightnessComparison.linhReconciliation.differenceCount}/{data.brightnessComparison.linhReconciliation.totalBranches} cung khác nhau</strong> giữa bảng QS và bảng mặc định của nguồn.</p>
          {data.brightnessComparison.chartLinhComparison&&<p className={styles.chartDifference}>
            Trên lá số này, Linh Tinh ở <strong>{data.brightnessComparison.chartLinhComparison.branchName}</strong>:
            QS <strong>{data.brightnessComparison.chartLinhComparison.qsLabel}</strong> ·
            bảng mặc định <strong>{data.brightnessComparison.chartLinhComparison.defaultLabel}</strong>.
            {data.brightnessComparison.chartLinhComparison.differs?' Hai bảng khác nhau tại cung này.':' Hai bảng trùng nhau tại cung này.'}
          </p>}
          <div className={styles.schoolTableWrap}>
            <table className={styles.schoolTable}>
              <caption>Các địa chi có độ sáng Linh Tinh khác nhau giữa hai bảng</caption>
              <thead><tr><th scope="col">Địa chi</th><th scope="col">QS</th><th scope="col">Mặc định</th></tr></thead>
              <tbody>{data.brightnessComparison.linhReconciliation.differences.map(row=><tr key={row.branchIndex}>
                <th scope="row">{row.branchName}</th><td>{row.qsLabel}</td><td>{row.defaultLabel}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <details className={styles.schoolFull}>
            <summary>Xem đủ 12 cung</summary>
            <div className={styles.schoolTableWrap}>
              <table className={styles.schoolTable}>
                <caption>Đầy đủ 12 cung, tính cả các cung trùng nhau</caption>
                <thead><tr><th scope="col">Địa chi</th><th scope="col">QS</th><th scope="col">Mặc định</th></tr></thead>
                <tbody>{data.brightnessComparison.linhReconciliation.rows.map(row=><tr key={row.branchIndex} data-different={row.differs}>
                  <th scope="row">{row.branchName}</th><td>{row.qsLabel}</td><td>{row.defaultLabel}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
          <small>{data.brightnessComparison.linhReconciliation.note}</small>
        </div>
        <p><strong>Khác biệt nguồn chưa giải quyết:</strong> {data.brightnessComparison.discrepancy.detail}</p>
        <small><a href={data.brightnessComparison.sourceUrl} target="_blank" rel="noopener noreferrer">Bảng QS nguồn</a> · <a href={data.brightnessComparison.discrepancy.alternateUrl} target="_blank" rel="noopener noreferrer">Cấu hình độ sáng đối chiếu</a>. Không dùng bảng này để tự xác nhận Miếu/Vượng, cấp quyền Pro hoặc phán đoán vận mệnh.</small>
      </details>
    </section>
    <p className={styles.evidenceFilterCount} role="status" aria-live="polite">Hiển thị {visible.length}/{data.assessed} mục nghiên cứu theo bộ lọc. “Khớp cấu trúc” chỉ có nghĩa đã quan sát đủ điều kiện đang triển khai, không phải kết luận cách cục.</p>
    {visible.length===0&&<p>Không có mục nghiên cứu nào trong nhóm lọc này. Chọn “Tất cả” để xem đầy đủ các điều kiện đã đối chiếu.</p>}
    {visible.map(record=><details key={record.id} id={'tuvi-classical-'+record.id} className={'palace-reading-symbol '+styles.record}>
      <summary><strong>{record.title}</strong><span>{record.group} · {stateText[record.status]}</span></summary>
      <p>{record.interpretation}</p>
      <p className={styles.evidenceCounts}>
        <strong>{evidence.byId[record.id].met}/{evidence.byId[record.id].total}</strong> điều kiện đã quan sát
        {evidence.byId[record.id].unknown>0&&<> · <strong>{evidence.byId[record.id].unknown}</strong> chưa thể xác minh</>}
        {evidence.byId[record.id].notMet>0&&<> · <strong>{evidence.byId[record.id].notMet}</strong> chưa đáp ứng</>}
      </p>
      <ul className={styles.checks}>{record.checks.map((condition,i)=><li key={record.id+'-'+i} data-met={condition.state==='met'}>
        <strong>{checkText[condition.state]}:</strong> {condition.label}. <span>{condition.detail}</span>
      </li>)}</ul>
      <p><strong>Tư liệu:</strong> {record.reference}. <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">Xem quy tắc đối chiếu</a>.</p>
      {record.status==='needs-review'&&<p className="palace-reading-review">{record.extra}</p>}
      <small>{record.caution}</small>
    </details>)}
    <details className={styles.catalog} aria-label="Danh mục nghiên cứu 49 cách cục cổ điển">
      <summary>Danh mục nghiên cứu 49 cách cục · {catalog.assessed} mục có điều kiện đối chiếu</summary>
      <p>{catalog.notice} Trạng thái “có thể kiểm tra” do nguồn phân loại không có nghĩa Thiên Đồ đã triển khai hoặc xác nhận thành cách.</p>
      <p>{catalog.distribution.derivable} mục nguồn đánh giá có thể kiểm tra · {catalog.distribution.disputed} còn tranh luận · {catalog.distribution.unreachable} chưa thể suy ra từ quy tắc nguồn.</p>
      <p className={styles.readinessSummary}>Còn <strong>{readiness.counts.total}</strong> mục chưa ánh xạ: <strong>{readiness.counts.pending}</strong> có thể nghiên cứu tiếp ({readiness.counts.natalPending} nguyên cục, {readiness.counts.periodPending} vận hạn), <strong>{readiness.counts.disputed}</strong> còn tranh luận và <strong>{readiness.counts.unreachable}</strong> chưa có phương pháp suy ra từ nguồn. Kết quả chưa được thẩm định độc lập.</p>
      <details className={styles.voidGapAudit} aria-label="Kiểm toán điều kiện Không Vong chưa ánh xạ">
        <summary>Ba điều kiện Không Vong còn thiếu chứng cứ nguồn · {voidGapLedger.summary.semanticVerified}/{voidGapLedger.summary.pending} đã xác minh ngữ nghĩa</summary>
        <p>{voidGapLedger.notice} Số điều kiện đang ánh xạ giữ nguyên <strong>{voidGapLedger.summary.mappedConditionResearch}/{voidGapLedger.summary.referenceTotal}</strong>.</p>
        <ul className={styles.voidGapCards}>{voidGapLedger.items.map(entry=><li key={entry.id}>
          <strong>{entry.id} · {entry.title}</strong>
          <span>Chưa xác minh tiêu chí Không Vong theo trường phái nguồn</span>
          <p><strong>Cần hoàn thiện:</strong> {entry.blocker}</p>
          <small>Kiểm tra nội bộ: {entry.localChecks.met} đã quan sát · {entry.localChecks.notMet} chưa đáp ứng · {entry.localChecks.unknown} thiếu chứng cứ.
            {' '}Proxy Tuần/Triệt: {entry.proxyChecks.met} đã quan sát · {entry.proxyChecks.notMet} chưa đáp ứng · {entry.proxyChecks.unknown} chưa xác định.
            {entry.scope==='period-research'&&<> Đã khảo sát {entry.checkedPeriods}/12 kỳ đại hạn, chưa được phép kết luận.</>}
          </small>
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Quy tắc tham khảo</a>
        </li>)}</ul>
        <small>R43 không đưa ba mục này vào danh sách đã ánh xạ; các trạng thái quan sát nội bộ không đồng nghĩa với chứng nhận học thuật hoặc luận đoán đời người.</small>
      </details>
      <details className={styles.schoolFull}>
        <summary>Bảng mã Không Vong theo 10 thiên can · nghiên cứu nguồn</summary>
        <p>Bảng sao chép mã nguồn theo ba biến thể trường phái. Các con số là mã vị trí 1–12 của nguồn. Cặp chi ở cột cuối chỉ được đối chiếu với <strong>công thức Đôi (double) ghi trong nguồn</strong>, chưa xác minh vị trí sao trên lá số Thiên Đồ hoặc phép an của iztro.</p>
        <div className={styles.schoolTableWrap}>
          <table className={styles.schoolTable}>
            <caption>Bảng tham khảo thiên can; không phải kết quả an sao của lá số</caption>
            <thead><tr><th scope="col">Can</th><th scope="col">Xun</th><th scope="col">Đơn</th><th scope="col">Đôi</th><th scope="col">Chiêm nghiệm</th><th scope="col">Cặp chi theo công thức nguồn</th></tr></thead>
            <tbody>{SOURCE_VOID_STEM_ROWS.map(row=><tr key={row.stem}>
              <th scope="row">{row.stem}</th><td>{row.xunSourceCode}</td>
              <td>{row.single.join('–')}</td><td>{row.double.join('–')}</td><td>{row.zhanyan.join('–')}</td><td>{auditSourceDoubleJiekongCodeConcordance(row.stem)?.formulaBranches.join(' / ') ?? 'Chưa đối chiếu'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p role="note"><strong>Quy tắc ghép 旬空 / 副旬 theo nguồn:</strong> {SOURCE_FUXUN_PAIRS.map(pair=>pair.branches.join('–')).join(' · ')}. {FUXUN_CAUTION}</p>
        <p role="note"><strong>Đối chiếu hình học trên lá số đang xem:</strong>{' '}
          {voidGeometry.status==='matched'
            ? 'Hai cặp chi trùng nhau về hình học.'
            : voidGeometry.status==='mismatched'
              ? 'Hai cặp chi khác nhau.'
              : 'Chưa thể đối chiếu do dữ liệu không đủ hoặc không nhất quán.'}
          {' '}{voidGeometry.reason}
        </p>
        {voidGeometry.status!=='unknown'&&<small>Thiên Đồ Triệt: {voidGeometry.chartTrietBranches.join(' / ')} · Nguồn 截空/副截: {voidGeometry.sourceDoubleBranches.join(' / ')}.</small>}
        <small>{voidGeometry.limitation}</small>
        <small>{SOURCE_STEM_MATRIX_NOTE} <a href={SOURCE_SCHOOL_DATA_URL} target="_blank" rel="noopener noreferrer">Xem bảng nguồn</a>.</small>
      </details>
      <div className={styles.catalogControls} role="search" aria-label="Tìm kiếm cách cục trong danh mục">
        <label>Tìm theo tên gốc, tên Việt, tên sao, điều kiện hoặc mã cách cục
          <input type="search" maxLength={100} value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder="Ví dụ: Thất Sát, Hỏa Tinh, Không Vong"/>
        </label>
        <label>Trạng thái nghiên cứu
          <select value={catalogStatus} onChange={event=>setCatalogStatus(event.target.value as ClassicalCatalogFilterStatus)}>
            <option value="all">Tất cả 49 mục</option>
            <option value="assessed">Đã ánh xạ điều kiện</option>
            <option value="pending">Có thể kiểm tra · chưa ánh xạ</option>
            <option value="disputed">Nguồn còn tranh luận</option>
            <option value="unreachable">Nguồn chưa thể suy ra</option>
          </select>
        </label>
      </div>
      <p className={styles.catalogCount} role="status" aria-live="polite">Hiển thị {catalogView.matches}/{catalog.referenceTotal} mục theo bộ lọc đang chọn.</p>
      {catalogView.matches===0&&<p role="status">Không tìm thấy cách cục phù hợp. Hãy thử tên gốc, tên tiếng Việt đã đối chiếu hoặc chọn trạng thái khác.</p>}
      <div className={styles.catalogGrid}>
        {catalogView.groups.map(group=><section key={group.key} className={styles.catalogGroup}>
          <h5>{group.name} · {group.assessed}/{group.total} đã ánh xạ</h5>
          {group.key==='dinh-tap'&&<div className={styles.periodGeometry} role="note">
            <p><strong>Dữ liệu đại hạn:</strong> {periodGeometry.verifiedGeometry
              ? 'Đã kiểm tra cấu trúc 12 cung và 12 khoảng đại hạn theo bộ an hạn đang dùng.'
              : 'Cần kiểm tra lại dữ liệu an đại hạn của lá số.'}</p>
            <small>{periodGeometry.reason} Kết quả này chỉ kiểm tra tính nhất quán dữ liệu nội bộ, không xác nhận các cách cục Định tạp hoặc dự báo vận hạn.</small>
          </div>}
          <ol>{group.entries.map(entry=><li key={entry.id}>
            <span className={styles.catalogName}><strong>{entry.assessed?localizedTitles[entry.id]||entry.title:entry.title}</strong> {entry.assessed&&localizedTitles[entry.id]!==entry.title&&<small lang="zh">({entry.title})</small>} <small>({entry.id})</small></span>
            <span className={styles.catalogState}>{entry.assessed?(entry.scope==='period-research'?'Đã ánh xạ điều kiện hạn · chưa kết luận':'Thiên Đồ đã ánh xạ điều kiện'):methodText[entry.sourceStatus]}</span>
            {entry.assessed&&entry.scope==='natal-research'&&<button type="button" onClick={()=>{setFilter('all');setJumpToId(entry.id);}} aria-label={'Mở điều kiện đối chiếu của '+(localizedTitles[entry.id]||entry.title)}>Điều kiện</button>}
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={'Đọc quy tắc nguồn '+entry.title}>Nguồn</a>
            {!entry.assessed&&entry.sourceStatus==='derivable'&&<small className={styles.catalogBlocker}>Cần kiểm chứng: {readiness.byId[entry.id].blocker}</small>}
            {dingZaById.has(entry.id)&&<details className={styles.periodEvidence}>
              <summary>{entry.assessed?'Đã ánh xạ điều kiện đại hạn · chưa kết luận':'Đối chiếu đại hạn từng kỳ · chưa ánh xạ'}</summary>
              <p>Đã kiểm tra {dingZa.verifiedGeometry?dingZa.checkedPeriods:0}/12 khoảng đại hạn theo cấu trúc Thiên Đồ. Không dùng làm kết luận Định tạp.</p>
              {!dingZa.verifiedGeometry&&<small>{dingZa.reason}</small>}
              {!entry.assessed&&voidGateById.has(entry.id)&&<>
                <p>Đối chiếu riêng Lộc Tồn, Thiên Mã với dấu Tuần/Triệt tại nguyên cục (chỉ là proxy hình học, không phải điều kiện nguồn được xác nhận):</p>
                <ul className={styles.checks}>{voidGateById.get(entry.id)?.checks.map((condition,i)=><li key={entry.id+'-void-'+i} data-met={condition.state==='met'}>
                  <strong>{checkText[condition.state]}:</strong> {condition.label}. <span>{condition.detail}</span>
                </li>)}</ul>
                <small>{voidGates.limitation}</small>
              </>}
              {dingZa.verifiedGeometry&&<ol className={styles.periodRanges}>
                {dingZaById.get(entry.id)?.periods.map(period=><li key={entry.id+'-'+period.index}>
                  <details>
                    <summary>{period.fromAge}–{period.toAge} tuổi mụ · {period.branchName} ({period.palace})</summary>
                    <ul className={styles.checks}>{[...period.checks,...(bridgeById.get(entry.id)?.periods.find(p=>p.index===period.index)?.checks||[])].map((condition,i)=><li key={entry.id+'-'+period.index+'-'+i} data-met={condition.state==='met'}>
                      <strong>{checkText[condition.state]}:</strong> {condition.label}. <span>{condition.detail}</span>
                    </li>)}</ul>
                  </details>
                </li>)}
              </ol>}
              <small>Chỉ đối chiếu dữ kiện tại từng đại hạn. Độ sáng và cát/sát giữa các trường phái chưa được xác nhận tương đương; không có quy tắc Không Vong sáu sao đầy đủ.</small>
            </details>}
            {!entry.assessed&&pendingById.has(entry.id)&&<details className={styles.pendingEvidence}>
              <summary>Đã đối chiếu một phần · chưa ánh xạ</summary>
              <ul className={styles.checks}>{[...(pendingById.get(entry.id)?.checks||[]),...(voidGateById.get(entry.id)?.checks||[])].map((condition,i)=>
                <li key={entry.id+'-pending-'+i} data-met={condition.state==='met'}>
                  <strong>{checkText[condition.state]}:</strong> {condition.label}. <span>{condition.detail}</span>
                </li>)}</ul>
              <small>Trong nguồn, hai tên cũ 截路/空亡 được chuẩn hóa thành 截空/副截; R27 đã đối chiếu hình học trên 65 lá số giả lập (iztro@2.6.1), nhưng chưa thẩm định sự tương đương ý nghĩa sao và biến thể phái. Chỉ số proxy Tuần/Triệt không thay cho Không Vong nguồn. Tuần/Triệt không được coi là tương đương. Chưa kết luận cách cục.</small>
            </details>}
          </li>)}</ol>
        </section>)}
      </div>
    </details>
    <small>{data.notice} Ba mục đại hạn đã ánh xạ chỉ có bộ điều kiện tham khảo QS trên tọa độ Thiên Đồ, chưa được chuyên gia xác nhận. Bộ này chưa được chuyên gia độc lập thẩm định. Các mục Định bần chỉ mô tả tổ hợp sao theo tài liệu, không đưa ra kết luận tài chính hay vận mệnh. Định tạp thuộc nghiên cứu vận hạn và chưa gộp vào bản mệnh.</small>
  </article>;
}
