'use strict';
const {natalNames,supportingNames}=require('./star-inventory.cjs');
const {colorFor}=require('./star-display.cjs');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(value,max=20){const words=String(value).split(' '),lines=[];let line='';for(const word of words){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
function completeChartModel(chart,annual,options={}){
 const cells=[0,1,2,3,4,7,8,11,12,13,14,15];
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12||new Set(chart.houses.map(h=>h.cell)).size!==12||new Set(chart.houses.map(h=>h.branchIndex)).size!==12||chart.houses.some(h=>!cells.includes(h.cell)||!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11))throw TypeError('Cần 12 cung và 12 địa chi hợp lệ trên vòng ngoài.');
 const houses=chart.houses.map(h=>{
  const support=options.showAuxiliary===false?[]:supportingNames(h).filter(n=>options.showCycles!==false||!Object.values(h.cycleStars||{}).flat().includes(n));
  const middle=Math.ceil(support.length/2),columns=[support.slice(0,middle),support.slice(middle)];
  const rows=columns.map(names=>names.map(name=>({name,lines:wrap(name)})));
  const main=h.stars.map(name=>({name,display:name+(options.showStrength===false?'':(()=>{const s=h.mainStarStrengths?.find(s=>s.name===name);return s?' ['+(s.status==='D'?'Đ':s.status)+']':'';})())}));
  const natal=(h.tuHoa||[]).map(t=>({name:t.name+' · '+t.star,layer:'natal-transformation'}));
  const yearly=annual&&options.showAnnual!==false?[...(annual.luuStars?.items||[]).filter(s=>s.branch===h.branchIndex).map(s=>({name:s.name,layer:'annual'})),...(annual.luuTuHoa?.items||[]).filter(s=>s.branch===h.branchIndex).map(s=>({name:s.name+' · '+s.star,layer:'annual-transformation'}))]:[];
  const extras=[...natal,...yearly].map(v=>({...v,lines:wrap(v.name,43)}));
  const lineCount=Math.max(...rows.map(c=>c.reduce((n,s)=>n+s.lines.length,0)),0)+Math.max(main.length,1)*2+extras.reduce((n,s)=>n+s.lines.length,0)+6;
  return {house:h,rows,main,extras,lineCount};
 });
 const rowHeight=Math.max(330,...houses.map(h=>h.lineCount*20+28));
 return {width:1440,height:4*rowHeight+168,rowHeight,houses,natalCount:chart.houses.reduce((n,h)=>n+natalNames(h).length,0)};
}
function renderCompleteChartSvg(chart,label='',annual,options={}){
 const m=completeChartModel(chart,annual,options),W=m.width,H=m.height,cellW=352,top=92,left=16;
 const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="Lá số tổng thể 12 cung" data-complete-chart="true" data-natal-count="${m.natalCount}">`,
 `<rect width="${W}" height="${H}" fill="#f6f0e1"/><style>text{font-family:Arial,Segoe UI,sans-serif}g[data-branch]{cursor:pointer}g[data-branch]:focus{outline:none}g[data-branch]:focus .palace-border{stroke:#865a19;stroke-width:5}.annual-label{fill:#69429a}.palace-border{stroke:#b5a68d;stroke-width:1}</style>`,
 `<text x="720" y="36" text-anchor="middle" fill="#76501f" font-size="26" font-weight="700">THIÊN ĐỒ · TỬ VI ĐẨU SỐ</text>`,
 `<text x="720" y="65" text-anchor="middle" fill="#314d42" font-size="18">${esc([...String(label)].slice(0,70).join(''))} · ${m.natalCount} sao gốc / vòng sao · ${annual?esc('Năm xem '+annual.year):'Bản mệnh'}</text>`];
 const text=(x,y,value,size=15,color='#314d42',attrs='')=>out.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${attrs}>${esc(value)}</text>`);
 const item=(x,y,name,lines,layer)=>{out.push(`<text x="${x}" y="${y}" font-size="14" fill="${colorFor(name,{annual:layer.startsWith('annual')})}" data-star-name="${esc(name)}" data-layer="${layer}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i?20:0}">${esc(l)}${i<lines.length-1?' ':''}</tspan>`).join('')}</text>`);return y+lines.length*20;};
 for(const entry of m.houses){const h=entry.house,x=left+(h.cell%4)*cellW,y=top+Math.floor(h.cell/4)*m.rowHeight;
 out.push(`<g role="button" tabindex="0" data-branch="${h.branchIndex}" aria-label="Cung ${esc(h.palace)}, ${esc(h.branch)}; mở chi tiết"><rect class="palace-border" x="${x}" y="${y}" width="${cellW}" height="${m.rowHeight}" rx="5" fill="${h.isThan?'#f1ead8':'#fffaf0'}"/><rect x="${x+1}" y="${y+1}" width="4" height="${m.rowHeight-2}" fill="#5b8a74"/>`);
 text(x+12,y+24,h.stem+' '+h.branch,13);text(x+cellW/2,y+26,h.palace+(h.isThan?' · THÂN':''),17,'#76501f','text-anchor="middle" font-weight="700"');
 let py=y+53;for(const s of entry.main){text(x+12,py,s.display,17,colorFor(s.name),`font-weight="700" data-star-name="${esc(s.name)}" data-layer="natal"`);py+=28;}if(!entry.main.length){text(x+12,py,'Vô chính diệu',14,'#727669');py+=28;}
 const ends=entry.rows.map((names,c)=>{let p=py+8;for(const s of names)p=item(x+12+c*170,p,s.name,s.lines,'natal');return p;});let p=Math.max(...ends)+10;
 for(const s of entry.extras)p=item(x+12,p,s.name,s.lines,s.layer);
 if(h.obstructionMarkers?.length)text(x+12,p+4,h.obstructionMarkers.join(' · ')+' án ngữ',14,'#864127','font-weight="700" data-marker="true"');
 out.push(`<line x1="${x+8}" y1="${y+m.rowHeight-48}" x2="${x+cellW-8}" y2="${y+m.rowHeight-48}" stroke="#d3c8b7"/>`);
 text(x+12,y+m.rowHeight-26,'Đại hạn '+(h.daiHan?.fromAge??'—')+'–'+(h.daiHan?.toAge??'—'),14,'#76501f');
 const flags=annual&&options.showAnnual!==false?[annual.activeDaiHan?.branchIndex===h.branchIndex?'ĐH đang xét':'',annual.tieuHan?.branchIndex===h.branchIndex?'Tiểu hạn':'',annual.luuThaiTueBranchIndex===h.branchIndex?'Lưu Thái Tuế':''].filter(Boolean):[];
 text(x+cellW-12,y+m.rowHeight-8,flags.join(' · '),12,'#69429a','text-anchor="end"');out.push('</g>');}
 const cx=left+cellW,cy=top+m.rowHeight;
 out.push(`<g aria-label="Thông tin trung tâm"><rect x="${cx}" y="${cy}" width="${cellW*2}" height="${m.rowHeight*2}" fill="#eee5d2" stroke="#ae9871"/>`);
 text(720,cy+66,'THIÊN ĐỒ',38,'#76501f','text-anchor="middle" font-weight="700"');text(720,cy+100,'BẢN ĐỒ THẬP NHỊ CUNG',16,'#577561','text-anchor="middle"');
 const info=[['Dương lịch',`${chart.solar.day}/${chart.solar.month}/${chart.solar.year}`],['Âm lịch',`${chart.lunar.day}/${chart.lunar.month}/${chart.lunar.year}${chart.lunar.leap?' nhuận':''}`],['Giờ sinh',`${String(chart.hour).padStart(2,'0')}:${String(chart.minute).padStart(2,'0')} · ${chart.hourBranch}`],['Giới tính',chart.gender],['Năm sinh',chart.yearCanChi],['Mệnh',chart.menh],['Thân',chart.than+' · '+chart.thanPalace],['Cục',chart.cuc.name],...(annual?[['Năm xem',annual.year+' · '+annual.canChi],['Tuổi mụ',annual.ageMu],['Tiểu hạn',annual.tieuHan.palace+' · '+annual.tieuHan.branch]]:[])];
 info.forEach(([name,value],i)=>{text(cx+36,cy+152+i*31,name,16);text(cx+210,cy+152+i*31,value,18,'#314d42','font-weight="700"');});
 text(720,cy+m.rowHeight*2-75,'Lưu tinh và Lưu Tứ Hóa ghi riêng bằng tên đầy đủ.',15,'#69429a','text-anchor="middle"');text(720,cy+m.rowHeight*2-46,'Tuần / Triệt là án ngữ, không cộng vào sao gốc.',15,'#76501f','text-anchor="middle"');out.push('</g>');
 text(720,H-46,'M: Miếu · V: Vượng · Đ: Đắc · B: Bình · H: Hãm — bảng tham khảo 14 chính tinh',15,'#314d42','text-anchor="middle"');text(720,H-20,'Sao gốc / vòng sao, Tứ Hóa, án ngữ và lưu niên là các lớp riêng · '+chart.ruleSet,12,'#577561','text-anchor="middle"');out.push('</svg>');return out.join('');
}
module.exports={completeChartModel,renderCompleteChartSvg};
