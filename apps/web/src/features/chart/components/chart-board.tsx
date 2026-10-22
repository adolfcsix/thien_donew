'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Engine from '@thiendo/astrology-engine';
import type { AstrologyHouse, AstrologyResult } from '@thiendo/shared-types';
import { adjacentPalaceBranch, matchingPalaces, normalizePalaceSearch, orderedPalaces } from '../lib/chart-explorer';
import { relatedBranches } from '../lib/palace-relations';
import { palaceFocusItems, type PalaceFocusScope } from '../lib/palace-focus';
import { PalaceInsightDock } from './palace-insight-dock';
import { PalaceRelationLines } from './palace-relation-lines';
import { PalaceReaderDialog } from './palace-reader-dialog';
import { buildTwelvePalaceLedger } from '../lib/twelve-palace-ledger';
import { TwelvePalaceLedger } from './twelve-palace-ledger';
import { PalaceStudyWorkbench } from './palace-study-workbench';
import { PalaceResearchPanel } from './palace-research-panel';
import { TraceableFindingsPanel } from './traceable-findings-panel';
import { PeriodTimeline } from './period-timeline';

type BoardProps = { result: AstrologyResult; label?: string; annualYear?: number; onAnnualYearChange?: (year: number) => void };
import { ChartScene } from './chart-scene';
import { WholeChartViewport } from './whole-chart-viewport';
import { PalaceTile } from './palace-tile';
import { ChartProfileLedger } from './chart-profile-ledger';
import { BoardSummary } from './board-summary';
import { ChartBoardHeader } from './chart-board-header';
import { ChartPalaceList } from './chart-palace-list';
import { ChartDisplayControls } from './chart-display-controls';
import { ChartStrengthLegend } from './chart-strength-legend';
import { StarColorLegend } from './star-color-legend';
import { ChartRelationNavigation } from './chart-relation-navigation';
import { PalaceDetails } from './palace-details';
import { PalaceReading } from './palace-reading';
import { StarContextExplorer } from './star-context-explorer';

export function ChartBoard({result,label='',annualYear,onAnnualYearChange}:BoardProps) {
  // Selection uses stable branch identifiers, never mutable array positions.
  const [selectedBranch,setSelectedBranch] = useState<number>(() => result.houses.find(h => h.palace === 'Mệnh')?.branchIndex ?? result.houses[0]?.branchIndex ?? 0);
  const [showAuxiliary,setShowAuxiliary] = useState(true);
  const [showGroupLabels,setShowGroupLabels] = useState(false);
  const [showCycles,setShowCycles] = useState(true);
  const [showAnnual,setShowAnnual] = useState(true);
  const [showStrength,setShowStrength] = useState(true);
  const [showResearch,setShowResearch] = useState(true);
  // Keep the twelve-palace chart full width until the reader explicitly opens the notebook.
  const [boardSkin,setBoardSkin] = useState<'heritage' | 'jade'>('heritage');
  const [chartTextSize,setChartTextSize] = useState<'comfortable' | 'large'>('comfortable');
  const [showInsightDock,setShowInsightDock] = useState(false);
  useEffect(() => {
    if (!showInsightDock || window.innerWidth >= 1400) return;
    const frame = requestAnimationFrame(() => {
      const dock = document.getElementById('thiendo-study-dock');
      dock?.focus({preventScroll:true});
      dock?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    });
    return () => cancelAnimationFrame(frame);
  }, [showInsightDock]);
  const [readerOpen,setReaderOpen] = useState(false);
  const [showRelationLines,setShowRelationLines] = useState(true);
  const [previewBranch,setPreviewBranch] = useState<number | null>(null);
  const [canHover,setCanHover] = useState(true);
  const [focusScope,setFocusScope] = useState<PalaceFocusScope>('tu-chinh');
  const [query,setQuery] = useState('');
  const [view,setView] = useState<'board' | 'list'>('board');
  const [localAnnualYear,setLocalAnnualYear] = useState(() => Engine.suggestedAnnualYear(result));
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const chartGridRef = useRef<HTMLDivElement>(null);
  const hoverExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const firstYear = Math.max(1900,result.lunar.year);
  const year = Math.min(2100, Math.max(firstYear, annualYear ?? localAnnualYear));
  const chooseYear = onAnnualYearChange ?? setLocalAnnualYear;
  const annual = useMemo(() => Engine.annualOverview(result,year), [result,year]);
  const houses = useMemo(() => orderedPalaces(result.houses), [result]);
  const matching = useMemo(() => matchingPalaces(houses,query,annual,showAnnual), [houses,query,annual,showAnnual]);
  const isSearching = normalizePalaceSearch(query).length > 0;
  const matchingBranches = useMemo(() => new Set(matching.map(house => house.branchIndex)), [matching]);
  const selectedHouse = result.houses.find(house => house.branchIndex === selectedBranch) ?? houses[0];
  const relations = useMemo(() => relatedBranches(selectedHouse.branchIndex), [selectedHouse.branchIndex]);
  const visualRelationBranch = showRelationLines ? previewBranch : null;
  const visualRelations = useMemo(() => visualRelationBranch === null ? null : relatedBranches(visualRelationBranch), [visualRelationBranch]);
  const focusBranches = useMemo(() => visualRelationBranch === null ? new Set<number>() : new Set(palaceFocusItems(houses,visualRelationBranch,focusScope).map(item => item.house.branchIndex)), [houses,visualRelationBranch,focusScope]);
  const tamHopHouses = relations.tamHop.map(index => result.houses.find(house => house.branchIndex === index)).filter((house):house is AstrologyHouse => Boolean(house));
  const doiCungHouse = result.houses.find(house => house.branchIndex === relations.doiCung);
  const research = useMemo(() => Engine.palaceResearch(result, annual, selectedHouse.branchIndex), [result, annual, selectedHouse.branchIndex]);
  const ledgerRows = useMemo(() => buildTwelvePalaceLedger(result,annual),[result,annual]);
  const findings = useMemo(() => Engine.traceableFindings(research,{includeAnnual:showAnnual}), [research,showAnnual]);
  const detailId = 'thiendo-palace-details';

  useEffect(() => {
    const query = '(hover: hover) and (pointer: fine)';
    const media = window.matchMedia(query);
    const sync = () => setCanHover(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);
  // Touch users can dismiss a temporary relationship preview without changing the selected palace.
  useEffect(() => {
    if (canHover) return;
    const dismissOutsidePalace = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('.atlas-house')) setPreviewBranch(null);
    };
    document.addEventListener('pointerdown', dismissOutsidePalace);
    return () => document.removeEventListener('pointerdown', dismissOutsidePalace);
  }, [canHover]);
  useEffect(() => () => {
    if (hoverExitTimer.current !== null) clearTimeout(hoverExitTimer.current);
  }, []);
  // When a search has hits, the detailed reading follows the matching selection.
  // For zero matches, preserve the current palace and show an empty-result message.
  useEffect(() => {
    if (isSearching && matching.length > 0 && !matchingBranches.has(selectedBranch)) {
      setSelectedBranch(matching[0].branchIndex);
    }
  }, [isSearching, matching, matchingBranches, selectedBranch]);

  function selectHouse(branchIndex: number) {
    setSelectedBranch(branchIndex);
    if (!canHover && showRelationLines) setPreviewBranch(current => current === branchIndex ? null : branchIndex);
    if (view === 'list') detailRef.current?.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function previewHouse(branchIndex: number) {
    if (!showRelationLines || !canHover) return;
    if (hoverExitTimer.current !== null) clearTimeout(hoverExitTimer.current);
    hoverExitTimer.current = null;
    if (view === 'list') setView('board');
    setPreviewBranch(branchIndex);
  }
  function clearPreview() {
    if (!canHover) return;
    // Moving across the tiny gutters between cells must not flash the lines off.
    if (hoverExitTimer.current !== null) clearTimeout(hoverExitTimer.current);
    hoverExitTimer.current = setTimeout(() => {
      setPreviewBranch(null);
      hoverExitTimer.current = null;
    }, 65);
  }
  function moveSelection(direction: 'previous' | 'next' | 'first' | 'last', focusTile = false) {
    const navigation = isSearching && matching.length ? matching : houses;
    const nextBranch = adjacentPalaceBranch(navigation,selectedHouse.branchIndex,direction);
    if (nextBranch === null) return;
    setSelectedBranch(nextBranch);
    if (focusTile) requestAnimationFrame(() => document.getElementById(`palace-${nextBranch}`)?.focus());
  }
  function handlePalaceKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const movement = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 'next'
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 'previous'
      : event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : null;
    if (!movement) return;
    event.preventDefault();
    moveSelection(movement,true);
  }
  function changeView(next: 'board' | 'list') {
    setView(next);
    if (next === 'board') boardScrollRef.current?.scrollTo({left:0,behavior:'auto'});
  }
  return <section className="chart-experience" aria-label="Không gian lá số tương tác">
    <ChartBoardHeader result={result} annual={annual} year={year}
      showAuxiliary={showAuxiliary} showStrength={showStrength} showCycles={showCycles} showAnnual={showAnnual}
      onShowAuxiliaryChange={setShowAuxiliary} onShowStrengthChange={setShowStrength}
      onShowCyclesChange={setShowCycles} onShowAnnualChange={setShowAnnual} onYearChange={chooseYear} />
    <div className="chart-explorer" aria-label="Khám phá các cung">
      <div className="chart-explorer-top">
        <label className="chart-palace-search"><span>Tìm sao hoặc cung</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ví dụ: Tử Vi, Mệnh, Lộc Tồn…" aria-describedby="palace-search-status" /></label>
        <div className="chart-view-tabs" role="group" aria-label="Kiểu hiển thị 12 cung"><button type="button" className={view === 'board' ? 'active' : ''} aria-pressed={view === 'board'} onClick={() => changeView('board')}>▦ Địa bàn</button><button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => changeView('list')}>☷ Danh sách</button></div>
      </div>
      <div className="chart-explorer-footer"><span id="palace-search-status" role="status" aria-live="polite">{isSearching ? `Tìm thấy ${matching.length}/12 cung phù hợp` : canHover ? 'Rê chuột vào một cung để xem Tam hợp và Đối cung; nhấn để đọc chi tiết.' : 'Chạm một cung trên Địa bàn để xem liên hệ; chạm bên ngoài để ẩn.'}</span>{isSearching && <button type="button" className="chart-clear-search" onClick={() => setQuery('')}>Xóa tìm kiếm</button>}</div>
    </div>
    <ChartDisplayControls boardSkin={boardSkin} chartTextSize={chartTextSize}
      showInsightDock={showInsightDock} showRelationLines={showRelationLines}
      focusScope={focusScope} selectedPalace={selectedHouse.palace}
      onBoardSkinChange={setBoardSkin} onChartTextSizeChange={setChartTextSize}
      onOpenReader={() => setReaderOpen(true)}
      onToggleInsightDock={() => setShowInsightDock(value => !value)}
      onToggleRelationLines={() => {if (!showRelationLines && view === 'list') setView('board'); setShowRelationLines(value => {const next=!value; if(!next) setPreviewBranch(null); return next;});}}
      onFocusScopeChange={setFocusScope} />
    <button type="button" className="chart-group-label-toggle" aria-pressed={showGroupLabels} onClick={() => setShowGroupLabels(value => !value)}>{showGroupLabels ? 'Ẩn nhãn nhóm sao' : 'Hiện nhãn nhóm sao'}</button>
    <ChartScene>
    <div className="chart-room-layout" data-board-skin={boardSkin} data-star-layout={showGroupLabels ? 'grouped' : 'compact'} data-chart-text-size={chartTextSize} data-dock-open={showInsightDock}><div className="chart-room-canvas">
    {view === 'board' ? <><p className="chart-compact-reading-note">Địa bàn tự căn trong khung hiển thị. Chọn <strong>Danh sách</strong> hoặc <strong>Phóng to cung</strong> để đọc từng cung; chạm một cung để xem liên hệ.</p><div ref={boardScrollRef} className="board-scroll" role="region" tabIndex={0} aria-label="Địa bàn tử vi 12 cung, tự căn theo khung hiển thị">
      <div ref={chartGridRef} className="astrology-grid atlas-grid chart-print-board" onMouseLeave={clearPreview}>{result.houses.map(house => <PalaceTile key={house.branchIndex} house={house} selected={selectedHouse.branchIndex === house.branchIndex} visualFocus={visualRelationBranch === house.branchIndex} relation={focusBranches.has(house.branchIndex) && visualRelations?.tamHop.some(index => index === house.branchIndex) ? 'tam-hop' : focusBranches.has(house.branchIndex) && house.branchIndex === visualRelations?.doiCung ? 'doi-cung' : null} searchMatch={isSearching ? matchingBranches.has(house.branchIndex) : null} showAuxiliary={showAuxiliary} showCycles={showCycles} showAnnual={showAnnual} showStrength={showStrength} annual={annual} onSelect={() => selectHouse(house.branchIndex)} onOpenReader={() => {setSelectedBranch(house.branchIndex);setReaderOpen(true);}} onPreviewStart={() => previewHouse(house.branchIndex)} onPreviewEnd={clearPreview} onKeyDown={handlePalaceKeyDown} />)}
        <BoardSummary result={result} annual={annual} label={label}/>
        {showRelationLines && <PalaceRelationLines houses={houses} selectedBranch={visualRelationBranch} scope={focusScope} boardRef={chartGridRef}/>}
      </div>
    </div></> : <ChartPalaceList matching={matching} selectedBranch={selectedHouse.branchIndex}
      detailId={detailId} showAuxiliary={showAuxiliary} showCycles={showCycles} showAnnual={showAnnual}
      annual={annual} onSelect={selectHouse} />}
    </div><div id="thiendo-study-dock" tabIndex={-1} className="chart-dock-slot" hidden={!showInsightDock}>
      {showInsightDock && <PalaceInsightDock house={selectedHouse} houses={houses} annual={annual} showAnnual={showAnnual} scope={focusScope} year={year} firstYear={firstYear} onScopeChange={setFocusScope} onSelect={selectHouse} onYearChange={chooseYear} />}
    </div></div>
    </ChartScene>
    <ChartProfileLedger result={result} annual={annual} label={label}/>
    <StarColorLegend />
    {showStrength && <ChartStrengthLegend />}
    <details className="chart-method-details chart-vector-preview"><summary>Bản vector đầy đủ · thu phóng và xuất SVG</summary>
      <WholeChartViewport chart={result} annual={annual} label={label} showAuxiliary={showAuxiliary} showCycles={showCycles} showAnnual={showAnnual} showStrength={showStrength} onOpenPalace={branch=>{setSelectedBranch(branch);setReaderOpen(true);}} />
    </details>
    <PeriodTimeline chart={result} year={year} onYearChange={chooseYear} onSelectPalace={selectHouse} />
    <p className="atlas-strength-disclaimer">Mức M / V / Đ / B / H chỉ là <strong>bảng tham khảo theo một quy ước</strong>, không tác động phép an sao. <a href="/star-atlas">Tìm hiểu ý nghĩa 14 chính tinh →</a></p>
    <p className="annual-warning">{annual.note}</p>
    <ChartRelationNavigation selectedHouse={selectedHouse} tamHopHouses={tamHopHouses}
      doiCungHouse={doiCungHouse} onSelect={selectHouse} />
    <div className="chart-reading-content">
    <PalaceReading chart={result} branchIndex={selectedHouse.branchIndex} annual={annual} showAnnual={showAnnual}/>
    <StarContextExplorer house={selectedHouse} houses={houses} />
    <TwelvePalaceLedger chart={result} annual={annual} selectedBranch={selectedHouse.branchIndex} onSelect={selectHouse} showAnnual={showAnnual} />
    <PalaceStudyWorkbench rows={ledgerRows} selectedBranch={selectedHouse.branchIndex} showAnnual={showAnnual} year={year} onSelect={selectHouse} />
    <div className="palace-research-toggle"><button type="button" className="btn secondary small" aria-expanded={showResearch} aria-controls="palace-research-content" onClick={() => setShowResearch(value => !value)}>{showResearch ? '− Thu gọn nghiên cứu cấu trúc' : '+ Mở nghiên cứu Tam phương Tứ chính'}</button><span>Đối chiếu sao đồng cung, bốn vị trí và hai lớp Tứ Hóa; không tự sinh luận đoán.</span></div>
    <div id="palace-research-content">{showResearch && <><PalaceResearchPanel research={research} showAnnual={showAnnual} onSelect={selectHouse}/><TraceableFindingsPanel result={findings}/></>}</div>
    <div className="chart-detail-nav"><div><strong>Cung đang xem: {selectedHouse.palace}</strong><span>12 cung theo thứ tự trên địa bàn</span></div><div className="chart-step-actions"><button type="button" aria-label="Xem cung trước" onClick={() => moveSelection('previous')}>← Trước</button><select aria-label="Chọn cung để xem chi tiết" value={selectedHouse.branchIndex} onChange={event => selectHouse(Number(event.target.value))}>{houses.map(house => <option key={house.branchIndex} value={house.branchIndex}>{house.palace} · {house.branch}</option>)}</select><button type="button" aria-label="Xem cung tiếp theo" onClick={() => moveSelection('next')}>Sau →</button></div></div>
    <p className="visually-hidden" role="status" aria-live="polite">Đang xem cung {selectedHouse.palace}, {selectedHouse.stem} {selectedHouse.branch}.</p>
    <div ref={detailRef}><PalaceDetails house={selectedHouse} ruleSet={result.ruleSet} annual={annual} showAnnual={showAnnual} showStrength={showStrength} detailId={detailId}/></div>
    </div>
    {readerOpen && <PalaceReaderDialog house={selectedHouse} houses={houses} annual={annual} ruleSet={result.ruleSet} showAnnual={showAnnual} showStrength={showStrength} skin={boardSkin} onSelect={setSelectedBranch} onClose={() => setReaderOpen(false)} />}
  </section>;
}
