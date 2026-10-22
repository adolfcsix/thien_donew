'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AstrologyResult } from '@thiendo/shared-types';
import dynamic from 'next/dynamic';
import Engine from '@thiendo/astrology-engine';
import {natalNames,renderStarAppendixHtml} from '@thiendo/chart-export/src/star-inventory.cjs';

const ChartBoard = dynamic(() => import('./chart-board').then(module => module.ChartBoard), {
  loading: () => <p role="status" className="status-message">Đang dựng địa bàn 12 cung…</p>,
});
const WholeChartWalkthroughPanel = dynamic(() => import('./whole-chart-walkthrough').then(module => module.WholeChartWalkthroughPanel), {
  loading: () => <p role="status">Đang mở bài đọc toàn lá số…</p>,
});
const StarSystemMatrix = dynamic(() => import('./star-system-matrix').then(module => module.StarSystemMatrix), {
  loading: () => <p role="status">Đang mở ma trận sao…</p>,
});

type Props = {
  result: AstrologyResult | null;
  label: string;
  saving: boolean;
  message: string;
  onSave: () => void;
  onExport: () => void;
  onExportImage: (year: number) => Promise<void>;
};

export function ChartResult({result, label, saving, message, onSave, onExport, onExportImage}:Props) {
  const [chosenAnnualYear, setAnnualYear] = useState(() => result ? Engine.suggestedAnnualYear(result) : Engine.currentVietnamLunarYear());
  // Use the same valid lunar year for the board, PNG, SVG-related panels and print document.
  const annualYear = result ? Math.min(2100, Math.max(1900, result.lunar.year, chosenAnnualYear)) : chosenAnnualYear;
  const [imageBusy, setImageBusy] = useState(false);
  const [imageMessage, setImageMessage] = useState('');
  const [showWholeChart, setShowWholeChart] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);
  const matrixAnnual = useMemo(()=>result && (showWholeChart || showMatrix)?Engine.annualOverview(result,annualYear):undefined,[result,annualYear,showWholeChart,showMatrix]);

  /** Printable document is isolated from the site UI and study notes. */
  async function printChart() {
    if (!result || printBusy) return;
    const page = window.open('', '_blank', 'width=1000,height=1100');
    if (!page) {
      setImageMessage('Trình duyệt đã chặn cửa sổ in. Hãy cho phép mở tab mới và thử lại.');
      return;
    }
    page.opener = null;
    page.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Thiên Đồ · Chuẩn bị bản in</title></head><body><p role="status">Đang chuẩn bị lá số để in…</p></body></html>');
    setPrintBusy(true);
    try {
    const { renderCompleteChartSvg: renderChartSvg } = await import('@thiendo/chart-export');
    if (page.closed) return;
    const annual=Engine.annualOverview(result, annualYear);
    const svg = renderChartSvg(result, label, annual);
    const appendix=renderStarAppendixHtml(result,annual);
    page.opener = null;
    page.document.open();
    page.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>THIÊN ĐỒ · Lá số Tử Vi</title><style>
      body {margin:0;background:#ece8de;color:#233a2c;font-family:Arial,sans-serif}
      .print-tools {display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 24px;background:#193b2c;color:#f8f3e6}
      .print-tools button {padding:12px 18px;border:1px solid #c5a16a;background:#f9f4e7;color:#224333;font-weight:bold;cursor:pointer}
      .print-page {max-width:900px;margin:20px auto;box-shadow:0 16px 45px #263d3340;background:#f6f0e1}
      .print-page svg {display:block;width:100%;height:auto}
      .star-appendix{padding:28px;font-size:15px;line-height:1.6;background:white}.star-appendix article{break-inside:avoid;border-bottom:1px solid #aaa;padding:16px 0}.star-appendix dl{display:grid;grid-template-columns:180px 1fr;gap:6px}.star-appendix dd{margin:0}.star-appendix dt{font-weight:bold}
      @page {size:A3 portrait;margin:12mm}
      @media print {.print-tools{display:none!important}.print-page{margin:0;max-width:100%;box-shadow:none}body{background:white}}
    </style></head><body><div class="print-tools"><span>THIÊN ĐỒ · Mệnh bàn và phụ lục toàn bộ sao theo cung</span><button type="button" onclick="window.print()">In / Lưu dưới dạng PDF</button></div><div class="print-page">${svg}${appendix}</div></body></html>`);
    page.document.close();
    page.focus();
    } catch (error) {
      page.close();
      setImageMessage(error instanceof Error ? error.message : 'Không thể chuẩn bị bản in. Vui lòng thử lại.');
    } finally {
      setPrintBusy(false);
    }
  }

  async function exportPng() {
    if (!result || imageBusy) return;
    setImageBusy(true);
    setImageMessage('');
    try {
      await onExportImage(annualYear);
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : 'Không thể xuất ảnh PNG trên trình duyệt này.');
    } finally {
      setImageBusy(false);
    }
  }

  return <section id="tuvi-chart-result" className="result-panel">
    {result ? <>
      <div className="result-title">
        <div><span className="eyebrow">BƯỚC 02 / ĐỊA BÀN</span><h2 className="serif">Lá số của {label}</h2></div>
        <div className="result-actions">
          <button type="button" className="btn secondary small" aria-pressed={showWholeChart} aria-expanded={showWholeChart} aria-controls="thiendo-whole-chart" onClick={()=>setShowWholeChart(value=>!value)}>{showWholeChart?'Ẩn bài đọc 12 cung':'Đọc toàn lá số · 12 cung'}</button>
          <button type="button" className="btn secondary small" onClick={onExport}>↓ JSON</button>
          <button type="button" className="btn secondary small" disabled={imageBusy} onClick={()=>void exportPng()} title="Ảnh toàn khung: toàn bộ sao đã tính và lớp lưu niên">{imageBusy?'Đang tạo ảnh…':'↓ PNG'}</button>
          <button type="button" className="btn secondary small" onClick={printChart} disabled={printBusy} aria-busy={printBusy} title="Mệnh bàn và phụ lục sao đầy đủ; chọn Lưu dưới dạng PDF trong hộp thoại in">{printBusy ? 'Đang chuẩn bị bản in…' : '▤ In / PDF'}</button>
          <button type="button" className="btn gold small" disabled={saving} onClick={onSave}>{saving?'Đang lưu…':'♡ Lưu lá số'}</button>
        </div>
      </div>
      <details className="chart-method-details"><summary>Kiểm kê sao của lá số: {result.houses.reduce((n,h)=>n+h.stars.length,0)} chính tinh · {result.houses.reduce((n,h)=>n+natalNames(h).length-h.stars.length,0)} phụ tinh / vòng sao</summary><p>Danh mục đang dùng gồm 104 tên sao gốc và vòng sao. Đây là phạm vi của quy tắc hiện tại, không phải danh mục thống nhất của mọi trường phái. Bảng nghiên cứu đối chiếu còn 11 tên chưa an tự động và 4 dị danh cần xác minh; xem <Link href="/research/star-audit">hồ sơ thẩm định sao và dị danh</Link>. Tứ Hóa và Tuần/Triệt tách riêng; sao lưu phụ thuộc năm xem. Mở “Chi tiết cung” để xem mọi lớp sao. PNG/SVG là toàn khung đầy đủ; In/PDF kèm phụ lục đối chiếu.</p><p>Thái Phụ/Phong Cáo hiện dùng cách đếm gồm cung Văn Khúc; có nguồn khởi theo giờ lệch một cung. Tuần/Triệt là cặp án ngữ trong quy tắc này. <Link href="/research/star-audit">So phương pháp trước khi đối chiếu lá số ↗</Link></p></details>
      <ChartBoard result={result} label={label} annualYear={annualYear} onAnnualYearChange={setAnnualYear} />
      <details className="chart-method-details" onToggle={event=>setShowMatrix(event.currentTarget.open)}><summary>Ma trận chính / phụ / lưu tinh theo lá số</summary>{showMatrix&&<StarSystemMatrix chart={result} annual={matrixAnnual}/>}</details>
      <div id="thiendo-whole-chart">{showWholeChart&&<WholeChartWalkthroughPanel chart={result} annualYear={matrixAnnual?.year}/>}</div>
      <details className="chart-method-details">
        <summary>Phương pháp và phạm vi luận giải</summary>
        <p>Lá số dùng quy tắc an sao Tử Vi Tam Hợp đang được triển khai trong Thiên Đồ. Các nội dung luận giải là cách diễn giải theo truyền thống, không phải kết quả dự báo đã được xác thực bằng khoa học; các lớp vận hạn và trường phái có thể có phạm vi áp dụng khác nhau.</p>
      </details>
      {result.warnings?.length > 0 && <details className="warning-details">
        <summary>Những lưu ý về quy tắc ({result.warnings.length})</summary>
        {result.warnings.map((warning,i)=><p key={i}>{warning}</p>)}
      </details>}
    </> : <div className="empty-board">
      <div className="empty-mandala" aria-hidden="true">☯</div>
      <span className="eyebrow">KHÔNG GIAN CỦA NHỮNG DÒNG SAO</span>
      <h2 className="serif">Một lá số, nhiều lớp thông tin.</h2>
      <p>Nhập ngày giờ sinh và bấm “Tính lá số” để khám phá địa bàn 12 cung, 14 chính tinh, các phụ tinh và vòng sao.</p>
      <div className="empty-steps"><span>01 Nhập thông tin</span><span>02 Lập địa bàn</span><span>03 Khám phá cung</span></div>
    </div>}
    {imageMessage && <p className="status-message" role="alert">{imageMessage}</p>}
    {message && <p className="status-message" role="status">{message}</p>}
  </section>;
}
