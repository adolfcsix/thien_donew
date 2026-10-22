#!/usr/bin/env node
'use strict';
/** Developer-only audit; emits no user-facing page. */
const fs=require('node:fs');
const path=require('node:path');
const {auditTemporalIntegrity}=require('../../packages/interpretation/src/temporal-integrity-audit.cjs');
const root=path.resolve(__dirname,'../..');
const save=process.argv.includes('--write');
const report=auditTemporalIntegrity();
const prefix='V11_23_TEMPORAL_INTEGRITY';
const dir=path.join(root,'docs','validation');
const escapeCsv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const cols=['year','months','leapMonths','days','partialMonths','firstSolarDate','lastSolarDate'];
const csv='\uFEFF'+[cols.map(escapeCsv).join(','),...report.yearRecords.map(r=>cols.map(c=>escapeCsv(r[c])).join(','))].join('\r\n')+'\r\n';
const s=report.stats;
const md=[
 '# THIÊN ĐỒ V11.23 — Kiểm toán tính nhất quán lịch và cung hạn (nội bộ)','',
 '**Đây KHÔNG phải chứng nhận độ chính xác Tử Vi, thiên văn độc lập, hay sẵn sàng triển khai.**','',
 `- Kết quả: **${report.status}**; lỗi phát hiện: **${report.issues.length}**.`,
 `- ${s.years} năm lịch âm, ${s.lunarMonths} tháng, ${s.leapMonths} tháng nhuận, ${s.roundTripDates} phép đổi âm–dương hai chiều.`,
 `- ${s.solarContinuityChecks} phép đối chiếu ngày liên tiếp, ${s.hourBranches} mốc giờ địa chi.`,
 `- ${s.researchCases} trường hợp cung hạn tháng/ngày/giờ trên 22 lá số baseline (chưa thẩm định chuyên gia).`,
 `- ${s.partialMonths} tháng không đủ 29 ngày do giới hạn hỗ trợ 2100 hoặc lỗi; xem bảng để biết nguyên nhân.`,
 '', '## Phạm vi giới hạn', ...report.limitations.map(x=>`- ${x}`), '',
 '## Lỗi phát hiện', ...(report.issues.length ? report.issues.map(x=>`- ${x.year??'—'} / ${x.category}: ${x.detail}`) : ['- Không có lỗi bất biến trong phạm vi kiểm thử.']),
 '', '## Bảng theo năm','', '| Năm | Tháng | Nhuận | Ngày hợp lệ trong phạm vi | Tháng thiếu |','|---|---:|---:|---:|---:|',
 ...report.yearRecords.map(x=>`| ${x.year} | ${x.months} | ${x.leapMonths} | ${x.days} | ${x.partialMonths} |`),'',
 'Bảng này chỉ dành cho kiểm tra mã nguồn. Không đưa mã quy tắc hoặc tài liệu kỹ thuật lên giao diện lá số.'
 ].join('\n');
if(save){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,`${prefix}.json`),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(dir,`${prefix}.csv`),csv);fs.writeFileSync(path.join(dir,`${prefix}.md`),md);}
console.log(`${report.status}: ${s.years} năm / ${s.lunarMonths} tháng / ${s.roundTripDates} ngày / ${s.researchCases} ca nghiên cứu / ${report.issues.length} lỗi`);
if(report.issues.length) {for(const x of report.issues.slice(0,20))console.log(`${x.year} ${x.category}: ${x.detail}`);process.exitCode=1;}
