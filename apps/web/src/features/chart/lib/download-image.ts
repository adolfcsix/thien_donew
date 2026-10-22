import { renderCompleteChartSvg as renderChartSvg, completeChartModel } from '@thiendo/chart-export';
import Engine from '@thiendo/astrology-engine';
import type { AstrologyResult } from '@thiendo/shared-types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Vẽ ảnh từ SVG thuần không có ảnh/link ngoài. Chỉ chạy khi người dùng nhấn nút. */
export async function downloadChartPng(chart: AstrologyResult, label: string, lunarYear: number): Promise<void> {
  const annual = Engine.annualOverview(chart, lunarYear);
  const svg = renderChartSvg(chart, label, annual);
  const source = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    const model = completeChartModel(chart, annual);
    canvas.width = model.width * 2;
    canvas.height = model.height * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xuất PNG bằng Canvas');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Không tạo được tệp ảnh PNG');
    downloadBlob(blob, `thien-do-la-so-${lunarYear}.png`);
  } finally {
    URL.revokeObjectURL(source);
  }
}
