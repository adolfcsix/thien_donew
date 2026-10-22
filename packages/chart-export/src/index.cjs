/* Ảnh lá số SVG độc lập, không nhúng tài nguyên bên ngoài; có escape XML.
   Dữ liệu đều là văn bản, tuyệt đối không sinh markup từ chuỗi nhập trực tiếp. */
'use strict';
const {colorFor}=require('./star-display.cjs');
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const fit = (s,n=50) => [...String(s ?? '')].slice(0,n).join('');
/** Print-safe rows: text is XML-escaped; overflow is counted, never silently dropped. */
function compactLabel(value, maxChars=20) {
  const chars=[...String(value ?? '')];
  if (chars.length<=maxChars) return chars.join('');
  return chars.slice(0,maxChars-1).join('')+'…';
}
function renderStarBlock(parts, {label, items, x, y, maxRows, color='#4b6252', colorOf, fontSize=12, maxChars=20}) {
  parts.push(`<text x="${x}" y="${y}" font-size="10" fill="#7d755e" font-weight="700" font-family="Noto Sans,Segoe UI,Arial,sans-serif">${esc(label)}</text>`);
  const normalized=(Array.isArray(items)?items:[]).map(x=>String(x));
  const actual=normalized.length;
  const show=Math.min(actual,actual>maxRows?maxRows-1:maxRows);
  for (let i=0;i<show;i++) {
    parts.push(`<text x="${x}" y="${y+18+i*16}" font-size="${fontSize}" fill="${colorOf ? colorOf(normalized[i],i) : color}" font-family="Noto Sans,Segoe UI,Arial,sans-serif">${esc(compactLabel(normalized[i],maxChars))}</text>`);
  }
  if (actual>maxRows) {
    parts.push(`<text x="${x}" y="${y+18+(maxRows-1)*16}" font-size="10.5" font-weight="700" fill="#a06f39" font-family="Noto Sans,Segoe UI,Arial,sans-serif">${esc(`+${actual-show} mục · xem JSON`)}</text>`);
  } else if (!actual) {
    parts.push(`<text x="${x}" y="${y+18}" font-size="11" fill="#8c9388" font-family="Noto Sans,Segoe UI,Arial,sans-serif">—</text>`);
  }
}
function renderChartSvg(chart, label, annual) {
  if (!chart || !Array.isArray(chart.houses) || chart.houses.length!==12 ||
      !chart.houses.every(h=>Number.isInteger(h.cell) && h.cell>=0 && h.cell<16) ||
      new Set(chart.houses.map(h=>h.cell)).size!==12)
    throw new TypeError('Dữ liệu lá số cần 12 ô cung khác nhau');
  const W=1280, margin=44, sz=290, gap=7, y0=180;
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="1530" viewBox="0 0 ${W} 1530" role="img" aria-label="Lá số Tử Vi">`,
   `<rect width="1280" height="1530" fill="#f6f0e1"/>`,
   `<rect x="20" y="20" width="1240" height="1490" fill="none" stroke="#906b3d" stroke-width="2"/>`,
   `<text x="640" y="78" font-size="34" fill="#906b3d" font-family="Noto Serif,Georgia,serif" text-anchor="middle">THIÊN ĐỒ · TỬ VI ĐẨU SỐ</text>`,
   `<text x="640" y="120" font-size="22" fill="#2c4435" font-family="Noto Sans,Segoe UI,Arial,sans-serif" text-anchor="middle">${esc(fit(label,70))}</text>`,
   `<text x="640" y="148" font-size="16" fill="#586e5b" font-family="Noto Sans,Segoe UI,Arial,sans-serif" text-anchor="middle">${esc(chart.yearCanChi)} · ${esc(chart.cuc?.name)} · Bản tóm lược in</text>`];
  // Retain full machine-readable descriptions for screen readers and archival
  // consumers: the fixed-size printed cells are intentionally a visual summary.
  const accessibility = chart.houses.map(h => [
    `Cung ${h.palace} ${h.stem} ${h.branch}`,
    `Chính tinh: ${(h.stars||[]).join(', ') || 'Vô chính diệu'}`,
    `Sao bổ sung: ${(h.additionalStars||[]).join(', ')}`,
    `Sao truyền thống: ${(h.traditionalStars||[]).join(', ')}`,
    `Sao mở rộng: ${(h.natalExtensionStars||[]).join(', ')}`,
    `Sao Đức & Giải: ${(h.beneficStars||[]).join(', ')}`,
    `La–Võng, Thương–Sứ: ${(h.positionalStars||[]).join(', ')}`,
    `Tài–Thọ–Đường Phù: ${(h.derivedStars||[]).join(', ')}`,
    `Thiên Trù–Lưu Hà–Thiên Không–Đẩu Quân: ${(h.missingStars||[]).join(', ')}`, 
    `Sát tinh mở rộng: ${(h.advancedStars||[]).join(', ')}`,
    `Tuần/Triệt án ngữ: ${(h.obstructionMarkers||[]).join(', ')}`,
    `Sao năm: ${(h.yearStars||[]).join(', ')}`,
    `Phụ tinh: ${(h.auxiliaryStars||[]).join(', ')}`,
    `Tứ Hóa: ${(h.tuHoa||[]).map(t=>`${t.name} ${t.star}`).join(', ')}`,
  ].join('. '));
  if (annual) accessibility.push(
    `Năm xem ${annual.year} ${annual.canChi}`,
    `Tiểu hạn đang xét: ${annual.tieuHan?.palace || ''}`,
    `Tiểu hạn: ${annual.tieuHan?.branch || ''}`,
    `Lưu Tứ Hóa: ${(annual.luuTuHoa?.items||[]).map(t=>`${t.name} ${t.star} ${t.palace}`).join(', ')}`,
    `Lưu tinh: ${(annual.luuStars?.items||[]).map(t=>`${t.name} ${t.palace}`).join(', ')}`,
  );
  parts.push(`<desc>${esc(accessibility.join(' | '))}</desc>`);
  const x0=(W-(4*sz+3*gap))/2;
  // Light parchment palette is print-friendly and echoes the heritage chart skin.
  const accent=['#4b8e73','#678caa','#957d4e','#548f97','#709250','#9479a4',
    '#b07c59','#4c987e','#7a8bab','#98814f','#628ea6','#74905a'];
  for(const h of chart.houses){
    const col=h.cell%4,row=Math.floor(h.cell/4),x=x0+col*(sz+gap),y=y0+row*(sz+gap);
    const highlight=annual && (annual.luuThaiTueBranchIndex===h.branchIndex || annual.activeDaiHan?.branchIndex===h.branchIndex || annual.tieuHan?.branchIndex===h.branchIndex);
    const header = `${h.stem} ${h.branch}`;
    const palace = `${h.palace}${h.isThan?' · Thân':''}`;
    parts.push(`<rect x="${x}" y="${y}" width="${sz}" height="${sz}" fill="${highlight?'#edf0df':'#fffcf4'}" stroke="${highlight?'#906b3d':'#9da999'}" stroke-width="${highlight?3:1}"/>`,
     `<rect x="${x+1}" y="${y+1}" width="4" height="${sz-2}" fill="${accent[h.branchIndex]||'#4b8e73'}"/>`,
     `<text x="${x+14}" y="${y+27}" font-size="18" fill="#906b3d" font-weight="700" font-family="Noto Sans,Segoe UI,Arial,sans-serif">${esc(header)}</text>`,
     `<text x="${x+14}" y="${y+50}" font-size="19" fill="${accent[h.branchIndex]||'#2c4435'}" font-weight="700" font-family="Noto Sans,Segoe UI,Arial,sans-serif">${esc(palace)}</text>`);
    const main=(h.stars?.length?h.stars:['Vô chính diệu']).map(name=>{
      const status=h.mainStarStrengths?.find(s=>s.name===name);
      return status?`${name} [${status.status==='D'?'Đ':status.status}]`:name;
    });
    // Two reading columns with a reserved bottom strip. A highly populated palace
    // reports omitted *counts*, rather than truncating entire categories silently.
    renderStarBlock(parts,{label:'CHÍNH TINH',items:main,x:x+14,y:y+72,maxRows:3,colorOf:name=>name==='Vô chính diệu'?'#596c61':'#9c3746',fontSize:13,maxChars:20});
    renderStarBlock(parts,{label:'PHỤ TINH',items:h.auxiliaryStars,x:x+14,y:y+144,maxRows:6,colorOf:name=>colorFor(name),maxChars:20});
    renderStarBlock(parts,{label:'SAO CHI NĂM',items:h.yearStars,x:x+150,y:y+72,maxRows:3,colorOf:name=>colorFor(name),maxChars:18});
    renderStarBlock(parts,{label:'SAO BỔ SUNG / MỞ RỘNG',items:[...(h.additionalStars||[]),...(h.traditionalStars||[]),...(h.natalExtensionStars||[]),...(h.beneficStars||[]),...(h.positionalStars||[]),...(h.derivedStars||[]),...(h.missingStars||[]),...(h.advancedStars||[])],x:x+150,y:y+140,maxRows:3,colorOf:name=>colorFor(name),maxChars:18});
    const yearTuHoa=annual?.luuTuHoa?.items?.filter(t=>t.branch===h.branchIndex).map(t=>`${t.name} · ${t.star}`)??[];
    const four=[...(h.tuHoa||[]).map(t=>`${t.name} · ${t.star}`),...yearTuHoa];
    renderStarBlock(parts,{label:'TỨ HÓA (SINH / LƯU)',items:four,x:x+150,y:y+210,maxRows:2,colorOf:(name,index)=>colorFor(name,{annual:index>=(h.tuHoa||[]).length}),fontSize:11,maxChars:19});
    const flags=[
      ...(annual?.luuThaiTueBranchIndex===h.branchIndex?['Lưu Thái Tuế']:[]),
      ...(annual?.activeDaiHan?.branchIndex===h.branchIndex?['Đại hạn']:[]),
      ...(annual?.tieuHan?.branchIndex===h.branchIndex?['Tiểu hạn']:[])
    ];
    if (h.obstructionMarkers?.length) parts.push(`<text x="${x+sz-13}" y="${y+27}" font-size="11" font-weight="700" fill="#96593e" text-anchor="end" font-family="Noto Sans,Segoe UI,Arial,sans-serif">${esc('Án ngữ: '+h.obstructionMarkers.join(' · '))}</text>`);
    parts.push(`<line x1="${x+10}" y1="${y+257}" x2="${x+sz-10}" y2="${y+257}" stroke="#d3d1bf" stroke-width="1"/>`,
      `<text x="${x+14}" y="${y+277}" font-size="12" font-weight="700" fill="#765b33" font-family="Noto Sans,Segoe UI,Arial,sans-serif">ĐH ${esc(h.daiHan?.fromAge ?? '—')}–${esc(h.daiHan?.toAge ?? '—')} ${esc(flags.length?' · '+flags.join(', '):'')}</text>`);

  }
  const midX=x0+sz+gap,midY=y0+sz+gap,midW=2*sz+gap,midH=2*sz+gap;
  parts.push(`<rect x="${midX}" y="${midY}" width="${midW}" height="${midH}" fill="#f2ead7" stroke="#906b3d" stroke-width="1.5"/>`,
    `<text x="640" y="${midY+140}" font-family="DejaVu Sans,sans-serif" font-size="66" text-anchor="middle" fill="#906b3d">☯</text>`,
    `<text x="640" y="${midY+205}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="28" text-anchor="middle" fill="#2c4435">Mệnh ${esc(chart.menh)} · Thân ${esc(chart.than)}</text>`,
    `<text x="640" y="${midY+245}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="20" text-anchor="middle" fill="#906b3d">${esc(chart.cuc?.name)}</text>`,
    `<text x="640" y="${midY+293}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="17" text-anchor="middle" fill="#57715c">Dương lịch ${esc(`${chart.solar?.day}/${chart.solar?.month}/${chart.solar?.year}`)}</text>`,
    `<text x="640" y="${midY+321}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="17" text-anchor="middle" fill="#57715c">Âm lịch ${esc(`${chart.lunar?.day}/${chart.lunar?.month}/${chart.lunar?.year}`)}</text>`);
  if(annual){
    parts.push(`<text x="640" y="${midY+368}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="20" text-anchor="middle" fill="#906b3d">Xem năm âm lịch ${annual.year} · ${esc(annual.canChi)}</text>`,
      `<text x="640" y="${midY+399}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="17" text-anchor="middle" fill="#57715c">Tuổi mụ ${annual.ageMu} · Chi năm ${esc(annual.luuThaiTueBranch)}</text>`,
      ...(annual.tieuHan ? [`<text x="640" y="${midY+429}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="16" text-anchor="middle" fill="#57715c">Tiểu hạn: ${esc(annual.tieuHan.branch)} · ${esc(annual.tieuHan.palace)} (${esc(annual.tieuHan.direction)})</text>`] : []),
      ...(annual.luuTuHoa?.items ? [ `<text x="640" y="${midY+470}" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="15" text-anchor="middle" fill="#906b3d">Lưu Tứ Hóa ${esc(annual.canChi)} · ${esc(annual.luuTuHoa.ruleSet)}</text>` ] : []));
  }
  parts.push(`<text x="640" y="1398" font-size="13" fill="#53606b" font-family="Noto Sans,Segoe UI,Arial,sans-serif" text-anchor="middle">Màu phân biệt nhóm sao, không phải đánh giá tốt/xấu · Bản in tóm lược; xem JSON để biết đủ các lớp</text>`);
  parts.push(`<text x="640" y="1420" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="17" text-anchor="middle" fill="#2c4435">Bộ quy tắc: ${esc(chart.ruleSet)}</text>`,
    `<text x="640" y="1454" font-family="Noto Sans,Segoe UI,Arial,sans-serif" font-size="16" text-anchor="middle" fill="#687464">Tài liệu tham khảo truyền thống · Không phải dự đoán khoa học</text>`, '</svg>');
  return parts.join('');
}
module.exports = {renderChartSvg,...require('./complete-chart.cjs')};
