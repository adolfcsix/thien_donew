#!/usr/bin/env node
'use strict';
// V11.147: reproducible SOURCE inventory. File presence is never treated as proof of correctness.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const outputDir='docs/reports';
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const present=rel=>{
 if(typeof rel!=='string'||rel.startsWith('/')||rel.includes('..')||rel.includes('\\')||path.isAbsolute(rel))return false;
 return fs.existsSync(path.join(root,rel));
};
const packageData=read('package.json');
const matrix=read('packages/knowledge/src/development-matrix.json');
const catalogue=read('packages/knowledge/src/research-disciplines.json');
const capability=read('packages/knowledge/src/capability-registry.json');
const controls=read('packages/knowledge/src/depth-review-v11147.json');
const queue=new Map(controls.queue.map(x=>[x.id,x]));
const editorial=new Map(catalogue.records.map(x=>[x.id,x]));
const issues=[];
function issue(severity,code,detail){issues.push({severity,code,detail});}
if(packageData.version!=='11.147.0')issue('FAIL','wrong-version',packageData.version);
if(matrix.release!==packageData.version)issue('FAIL','stale-matrix-release',matrix.release);
if(catalogue.edition!==packageData.version)issue('FAIL','stale-research-edition',catalogue.edition);
for(const [name,arr] of [['matrix',matrix.records],['queue',controls.queue],['editorial',catalogue.records],['capability',capability.modules]]){
 const ids=arr.map(x=>x.id);if(new Set(ids).size!==ids.length)issue('FAIL','duplicate-'+name,'duplicate ids');
}
const expectedStatus=new Set(['partial','available','research','planned','research-only']);
const records=[];
for(const entry of matrix.records){
 const id=entry.id, review=queue.get(id);
 if(!review)issue('FAIL','missing-review-entry',id);
 if(!controls.evidenceTestFiles[id])issue('FAIL','missing-test-mapping',id);
 for(const f of ['library','calculator','analysis'])if(!expectedStatus.has(entry[f]))issue('FAIL','invalid-declared-status',id+':'+f);
 if(!entry.gap?.trim()||!entry.next?.trim())issue('FAIL','missing-limitation',id);
 const evidence=(entry.evidencePaths||[]).map(p=>({path:p,present:present(p)}));
 for(const ev of evidence)if(!ev.present)issue('FAIL','missing-evidence-path',id+':'+ev.path);
 const route=entry.route||null;
 const routeFile=route==='/'?'apps/web/src/app/page.tsx':route?'apps/web/src/app'+route+'/page.tsx':null;
 const routePresent=routeFile?present(routeFile):false;
 if(routeFile&&!routePresent)issue('FAIL','missing-declared-route',id+':'+routeFile);
 const tests=(controls.evidenceTestFiles[id]||[]).map(p=>({path:p,sourcePresent:present(p),executedThisAudit:false}));
 for(const t of tests)if(!t.sourcePresent)issue('FAIL','missing-referenced-test',id+':'+t.path);
 const editorialId=controls.editorialCrosswalk[id]||null;
 if(editorialId&&!editorial.has(editorialId))issue('FAIL','missing-editorial-crosswalk',id+':'+editorialId);
 const editorialRecord=editorial.get(editorialId);
 // No test of an individual discipline is claimed merely because a test file exists.
 records.push({id,name:entry.name,family:entry.family,priority:review?.priority||'UNASSESSED',action:review?.action||'',declared:{library:entry.library,calculator:entry.calculator,analysis:entry.analysis},route:{path:route,sourcePresent:routePresent,notApplicable:route===null},evidence:{declared:evidence.length,present:evidence.filter(e=>e.present).length,missing:evidence.filter(e=>!e.present).map(e=>e.path)},candidateTests:tests,editorial:{catalogueId:editorialId,exists:!!editorialRecord,boundary:editorialRecord?.boundary||null},limits:entry.gap,next:entry.next,verification:{structure:evidence.every(e=>e.present)&&(!route||routePresent)?'SOURCE_PRESENT':'SOURCE_MISSING',independentMethod:'NOT_INDEPENDENTLY_VERIFIED',typecheckBuild:'NOT_RUNTIME_VERIFIED',databaseE2E:'NOT_RUNTIME_VERIFIED',browserE2E:'NOT_RUNTIME_VERIFIED'}});
}
for(const id of queue.keys())if(!records.some(r=>r.id===id))issue('FAIL','orphan-queue',id);
for(const id of Object.keys(controls.evidenceTestFiles))if(!records.some(r=>r.id===id))issue('FAIL','orphan-test-mapping',id);
const summary={matrixRecords:records.length,declaredRoutes:records.filter(r=>!!r.route.path).length,availableRouteFiles:records.filter(r=>r.route.sourcePresent).length,evidencePaths:records.reduce((s,r)=>s+r.evidence.declared,0),missingEvidence:records.reduce((s,r)=>s+r.evidence.missing.length,0),recordsWithCandidateTests:records.filter(r=>r.candidateTests.length).length,testsExecutedThisAudit:0,priorities:Object.fromEntries(['P0','P1','P2','P3'].map(p=>[p,records.filter(r=>r.priority===p).length])),registryCapabilities:capability.modules.length,editorialRecords:catalogue.records.length};
const report={schemaVersion:1,version:packageData.version,baseline:'11.146.0',scope:'static-source-inventory-not-an-expert-review-or-a-runtime-test',sourceEvidenceOnly:true,summary,records,issues,verdict:issues.length?'FAIL':'SOURCE_INVENTORY_PASS',explicitlyNotVerified:['methodological agreement with original editions','all branches of astrology engines','production typecheck/build','PostgreSQL and authentication E2E','real browser responsiveness, performance, accessibility']};
const names={json:path.join(root,outputDir,'V11_147_SOURCE_DEPTH_AUDIT.json'),md:path.join(root,outputDir,'THIEN_DO_V11_147_DEPTH_AUDIT.md')};
const state=JSON.stringify(report,null,2)+'\n';
const status=records.reduce((a,r)=>(a[r.priority]=(a[r.priority]||0)+1,a),{});
const h=[
'# THIÊN ĐỒ V11.147 — Kiểm toán chiều sâu theo mã nguồn',
'',`Phiên bản: **${report.version}**, nền: **${report.baseline}**. Phạm vi: **kiểm kê tĩnh**. Không tuyên bố đã chạy browser, PostgreSQL, build hay thẩm định tính đúng huyền học.`,
'',`- Ma trận: ${summary.matrixRecords} nhóm; đường dẫn trang: ${summary.availableRouteFiles}/${summary.declaredRoutes}; bằng chứng tệp/thư mục: ${summary.evidencePaths-summary.missingEvidence}/${summary.evidencePaths}.`,
`- Bộ kiểm tra được khai báo: ${summary.recordsWithCandidateTests}/${summary.matrixRecords} nhóm có file test ứng viên; **không** tính là test đã chạy.`,
`- Số nhóm theo ưu tiên: P0=${status.P0||0}, P1=${status.P1||0}, P2=${status.P2||0}, P3=${status.P3||0}.`,
`- Danh mục chức năng khác loại: ${summary.registryCapabilities} capability; danh mục biên tập: ${summary.editorialRecords} môn. **Không cộng ba danh mục để đếm tính năng.**`,
`- Kết quả kiểm kê: **${report.verdict}**; vi phạm hợp đồng: ${issues.length}.`,
'',
'## Trạng thái theo 5 tiêu chí',
'',
'| Tiêu chí | Có thể kết luận ở V11.147? |',
'| --- | --- |',
'| Có đường dẫn và file mã nguồn | Có, từ kiểm kê tĩnh |',
'| Có file test hiện diện | Có, nhưng không tự coi test đạt |',
'| Thuật toán đúng truyền bản, bảng số và ngoại lệ | **Chưa xác minh độc lập** |',
'| Luận giải chuyên môn được biên tập/thẩm định | **Chưa xác minh độc lập** |',
'| Thư phòng, API, DB, browser và triển khai thực tế | **Chưa nghiệm thu trong kiểm toán này** |',
'',
'## Hàng đợi chuyên môn theo ưu tiên',
'',
'| Ưu tiên | Nhóm | Trạng thái source | Việc cần làm tiếp |',
'| --- | --- | --- | --- |',
...records.sort((a,b)=>a.priority.localeCompare(b.priority)||(a.id<b.id?-1:a.id>b.id?1:0)).map(r=>`| ${r.priority} | ${r.name} | ${r.declared.calculator}/${r.declared.analysis} | ${r.action.replaceAll('|','/')} |`),
'',
'## Điểm cần phân biệt',
'',
'1. Lục Nhâm V11.144 có tính 720/720 tổ hợp nội bộ và 27 ví dụ đối chứng theo báo cáo trước, nhưng vẫn lệch **1 ca phân loại** so với thống kê sách; chưa kết luận toàn bộ phép Thiệp Hại đã được xác nhận.',
'2. Hà Lạc có tính mệnh quẻ/Nguyên Đường theo một truyền bản với ngoại lệ số 5, quẻ thuần và tiết chí cần đối chứng; không gán kết quả khi thiếu tham số.',
'3. Thiết Bản V11.146 có sổ khảo chứng chứ **không** có engine tự định số điều và chưa có kho điều văn được cấp quyền.',
'4. Bát Tự snapshot riêng V11.142 vẫn cần PostgreSQL E2E, dữ liệu lịch tiết khí và múi giờ lịch sử độc lập.',
'5. Tử Vi còn 11 tên sao và 4 dị danh trong nghiên cứu; phép an và diễn nghĩa theo phái không được đẩy vào lá số chỉ vì đã hiện bảng xem thử.',
'6. Không đổi đường tính và phiên bản snapshot đã lưu khi kiểm toán; dữ liệu cũ phải được bảo toàn.',
'',
'## Nghiệm thu và khuyến nghị tiếp theo',
'',
'**P0**: `npm ci`, typecheck, build, migration Postgres test, OAuth/OTP/session, bảo mật và browser thật trước mọi công bố production.',
'**P1**: khoá tên truyền bản/nguồn đầu vào, tạo fixture đầu vào→đầu ra độc lập theo từng môn, có cả phản ví dụ và ngoại lệ, sau đó mới mở rộng công thức.',
'**P2**: kiểm accessibility và responsive ở từng môn; bản địa hoá nội dung, tìm kiếm đa bộ môn, hiệu năng và tham chiếu tới luận giải.',
'**P3**: Rune mới ở giai đoạn kế hoạch; không báo là tính năng đã triển khai.',
'',
'Kịch bản kiểm kê lặp lại: `npm run audit:depth:147` hoặc `node infrastructure/scripts/audit-depth-v11147.cjs --check`.',
'Chi tiết có cấu trúc và chỉ mục file nằm trong `docs/reference/source-depth-audit.json`.',
];
const md=h.join('\n')+'\n';
if(process.argv.includes('--check')){
 for(const [key,data] of [['json',state],['md',md]])if(!fs.existsSync(names[key])||fs.readFileSync(names[key],'utf8')!==data)issue('FAIL','audit-drift',key);
}else{
 fs.mkdirSync(path.join(root,outputDir),{recursive:true});fs.writeFileSync(names.json,state);fs.writeFileSync(names.md,md);
}
console.log(JSON.stringify({release:report.version,summary,issues,verdict:issues.length?'FAIL':report.verdict},null,2));
if(issues.length)process.exitCode=1;
