'use strict';
/** Identity and layer audit only: consumes computed placements, never places a new star. */
const registry=require('./star-identity-registry.json');
const decisions=require('./star-resolution-v11122.json');
const GROUPS=Object.freeze([
 ['main','Chính tinh','stars'],['auxiliary','Phụ tinh cơ bản','auxiliaryStars'],
 ['year_branch','Theo chi năm sinh','yearStars'],['supplementary','Tháng / ngày / năm','additionalStars'],
 ['advanced','Không–Kiếp / Hỏa–Linh','advancedStars'],['traditional','Phụ tinh truyền thống','traditionalStars'],
 ['natal_extensions','Quốc Ấn / Kiếp Sát / Phá Toái','natalExtensionStars'],['benefic','Đức / Giải','beneficStars'],
 ['positional','La–Võng / Thương–Sứ','positionalStars'],['missing_stars','Trù / Hà / Không / Đẩu Quân','missingStars'],
 ['derived','Tài / Thọ / Đường Phù','derivedStars'],['thai_tue','Vòng Thái Tuế','thaiTue'],
 ['bac_si','Vòng Bác Sĩ','bacSi'],['trang_sinh','Vòng Tràng Sinh','trangSinh'],
].map(([id,label,field])=>Object.freeze({id,label,field})));
const byId=new Map(registry.records.map(row=>[row.id,row]));
const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').trim().toLowerCase();
function bucket(row){return row.layer==='cycle'?'cycle':row.layer==='natal'?(row.group==='main'?'main':'support'):row.layer==='annual'?'annual':'special';}
function catalogRows(){return registry.records.map(row=>({
 id:row.id,name:row.name,layer:row.layer,type:row.type,group:row.group,
 groupLabel:GROUPS.find(g=>g.id===row.group)?.label||({'annual-overlays':'Lưu tinh năm xem','obstruction-markers':'Án ngữ cặp cung','tu-hoa':'Nhãn Tứ Hóa','annual-locator':'Điểm Lưu Thái Tuế'}[row.group]),
 bucket:bucket(row),originId:row.originId,originName:row.originId?byId.get(row.originId)?.name||null:null,
 placementModule:row.placementModule,editorialSources:[...row.editorialSources],expertReviewed:row.expertReviewed,
 lookupTerms:decisions.records.filter(d=>d.relatedId===row.id&&d.state==='terminology-mapped').map(d=>d.name),
 placements:[],positionState:'catalog-only',
 }));}
function filterRows(rows,query='',category='all'){
 if(!Array.isArray(rows)||!['all','main','support','cycle','annual','special'].includes(category))throw TypeError('Bộ lọc ma trận không hợp lệ.');
 const q=normalize(query);
 return rows.filter(row=>(category==='all'||row.bucket===category)&&(!q||normalize([row.name,row.groupLabel,row.layer,row.originName,row.id,...row.lookupTerms].join(' ')).includes(q)));
}
function counts(rows=catalogRows()){
 const count=key=>rows.filter(row=>row.bucket===key).length;
 return {main:count('main'),support:count('support'),cycles:count('cycle'),natalAndCycle:count('main')+count('support')+count('cycle'),annual:count('annual'),special:count('special'),identities:rows.length};
}
function auditCatalog(){
 const rows=catalogRows(),errors=[],ids=new Set(rows.map(r=>r.id)),c=counts(rows);
 if(ids.size!==rows.length)errors.push('Trùng ID trong ma trận.');
 if(c.main!==14||c.support!==54||c.cycles!==36||c.natalAndCycle!==104||c.annual!==12||c.special!==11)errors.push('Lệch phạm vi 104 sao + các lớp riêng.');
 for(const row of rows){if(!row.groupLabel)errors.push('Thiếu nhóm: '+row.id);if(row.originId&&!byId.has(row.originId))errors.push('Mất sao gốc: '+row.id);if(row.bucket==='annual'&&(!row.originId||!['natal','cycle'].includes(byId.get(row.originId)?.layer)))errors.push('Lưu tinh thiếu gốc: '+row.id);}
 if(decisions.records.length!==15||decisions.records.filter(r=>r.category==='missing').length!==11||decisions.records.filter(r=>r.category==='alias').length!==4)errors.push('Thiếu hồ sơ phân xử.');
 const sourceIds=new Set(decisions.sources.map(s=>s.id));
 for(const d of decisions.records){if(d.sourceIds.some(id=>!sourceIds.has(id)))errors.push('Nguồn không tồn tại: '+d.name);if(d.automaticPlacement!==false||d.automaticAlias!==false||!d.decision||!d.remaining||!d.sourceIds.length)errors.push('Hồ sơ vượt phạm vi/thiếu căn cứ: '+d.name);if(d.relatedId&&!byId.has(d.relatedId))errors.push('Liên kết tên mất định danh: '+d.name);}
 return {errors,counts:c};
}
function buildChartMatrix(chart,annual=null){
 const branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
 if(!chart||!Array.isArray(chart.houses)||chart.houses.length!==12||new Set(chart.houses.map(h=>h.branchIndex)).size!==12||chart.houses.some(h=>!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||h.branch!==branches[h.branchIndex]))throw TypeError('Ma trận cần đủ 12 địa chi không trùng.');
 const rows=catalogRows(),map=new Map(rows.map(r=>[r.id,r]));
 const append=(row,branch,star=null)=>{
  const h=chart.houses.find(h=>h.branchIndex===branch);
  if(!h)throw Error('Vị trí sao ngoài 12 cung.');
  row.placements.push({branchIndex:branch,branch:h.branch,palace:h.palace,...(star?{star}:{})});row.positionState='computed';
 };
 for(const g of GROUPS){
  const groupRows=rows.filter(row=>row.group===g.id),names=new Map(groupRows.map(row=>[row.name,row]));
  for(const h of chart.houses){
   const values=g.id==='thai_tue'||g.id==='bac_si'||g.id==='trang_sinh'?h.cycleStars?.[g.field]:h[g.field];
   if(!Array.isArray(values))throw Error('Thiếu lớp sao '+g.label);
   for(const name of values){const row=names.get(name);if(!row)throw Error('Tên ngoài danh mục '+g.label+': '+name);append(row,h.branchIndex);}
  }
  if(groupRows.some(row=>row.placements.length!==1))throw Error('Thiếu/trùng tên trong lớp '+g.label);
 }
 if(!Array.isArray(chart.obstructionMarkers)||chart.obstructionMarkers.length!==2)throw Error('Án ngữ cần đúng hai dấu cặp cung.');
 for(const row of rows.filter(r=>r.layer==='obstruction')){
  const markers=chart.obstructionMarkers?.filter(m=>m.name===row.name)||[];
  if(markers.length!==1||!Array.isArray(markers[0].branches)||markers[0].branches.length!==2||new Set(markers[0].branches).size!==2)throw Error('Án ngữ phải là một cặp cung: '+row.name);
  markers[0].branches.forEach(b=>append(row,b));
 }
 const transformations=(layer,items)=>{
  const expected=rows.filter(row=>row.layer===layer);
  if(!Array.isArray(items)||items.length!==expected.length)throw Error('Thiếu lớp Tứ Hóa: '+layer);
  for(const row of expected){const matches=items.filter(t=>t.name===row.name);if(matches.length!==1)throw Error('Tứ Hóa thiếu/trùng: '+row.name);const t=matches[0];const origin=rows.find(r=>r.name===t.star&&r.layer==='natal');if(!origin||origin.placements[0]?.branchIndex!==t.branch)throw Error('Tứ Hóa không khớp sao chủ: '+row.name);append(row,t.branch,t.star);}
 };
 transformations('natal-transformation',chart.transformations);
 if(annual!==null){
  if(!Number.isInteger(annual.year)||annual.year<Math.max(1900,chart.lunar.year)||annual.year>2100||!Array.isArray(annual.luuStars?.items)||annual.luuStars.items.length!==12)throw Error('Lưu tinh cần năm xem và đủ 12 tên.');
  for(const row of rows.filter(r=>r.layer==='annual')){const matches=annual.luuStars.items.filter(s=>s.name===row.name);if(matches.length!==1)throw Error('Lưu tinh thiếu/trùng: '+row.name);append(row,matches[0].branch);}
  transformations('annual-transformation',annual.luuTuHoa?.items);
  append(map.get('annual-locator:annual-locator:luu-thai-tue'),annual.luuThaiTueBranchIndex);
 }
 return {schemaVersion:1,format:'thien-do.star-layer-matrix',release:registry.release,counts:counts(rows),annualYear:annual?.year??null,rows,
  notice:'104 tên gốc/vòng sao; 12 lưu tinh, án ngữ, Tứ Hóa và điểm Lưu Thái Tuế tách riêng. Đây là kiểm kê dữ liệu tính toán, chưa xác nhận mọi trường phái.'};
}
function getResolutions(query='',category='all'){
 if(!['all','missing','alias'].includes(category))throw Error('Loại hồ sơ không hợp lệ.');const q=normalize(query);
 return structuredClone(decisions.records.filter(r=>(category==='all'||r.category===category)&&(!q||normalize([r.name,r.candidate,r.hanzi,r.decision].join(' ')).includes(q))));
}
module.exports={GROUPS,catalogRows,filterRows,counts,auditCatalog,buildChartMatrix,getResolutions};
