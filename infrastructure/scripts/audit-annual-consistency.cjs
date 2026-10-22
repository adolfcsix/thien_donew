#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const {auditAnnualConsistency}=require('../../packages/star-audit/src/annual-consistency.cjs');
const result=auditAnnualConsistency();
const out=path.resolve(__dirname,'../../docs/validation');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'V11_25_ANNUAL_CONSISTENCY.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(out,'V11_25_ANNUAL_CONSISTENCY.md'),['# Thiên Đồ V11.25 — Kiểm toán sao lưu niên (nội bộ)','',`Trạng thái: **${result.status}**`,`Số lá số nền: **${result.cases}**`,`Số lượt năm đối chiếu: **${result.checks}**`,'','Kiểm tra tên sao trùng, tọa độ cung, quy tắc an sao có mã và tính nhất quán tên sao giữa các lá số.','',...result.limitations.map(x=>`- ${x}`),'',...result.issues.map(x=>`- LỖI: ${x}`),''].join('\n'));
console.log(JSON.stringify({status:result.status,cases:result.cases,checks:result.checks,issues:result.issues.length}));
if(result.status!=='PASS')process.exitCode=1;
