/* THIÊN ĐỒ V9.4 — CSV exporter for public calendar lookup, no private data. */
(function(root){'use strict';
const HEADERS=['Ngày dương','Mục đích','Nhóm theo Trực','Thập Nhị Trực','Thần trực nhật','Hoàng/Hắc đạo','Nhị Thập Bát Tú','Bất đồng giữa hệ','Gần chuyển tiết','Mã quy tắc'];
function cell(value){
 let s=String(value??'');
 // Protect spreadsheet apps from CSV formula injection, including leading whitespace/controls.
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function toCsv(days){
 if(!Array.isArray(days)||days.length>186)throw new RangeError('Cần danh sách không quá 186 ngày');
 const rows=[HEADERS];
 for(const d of days){if(!d||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))throw new TypeError('Bản ghi ngày không hợp lệ');
  rows.push([d.date,d.purposeLabel,d.gradeLabel,d.sourceTruc,d.daySpirit,d.daySpiritLabel,d.moonMansion,
   d.mixed?'Có':'Không',d.nearBoundary?'Có':'Không',d.ruleSet]);}
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
const api=Object.freeze({HEADERS,cell,toCsv});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ThienDoGoodDaysExport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
