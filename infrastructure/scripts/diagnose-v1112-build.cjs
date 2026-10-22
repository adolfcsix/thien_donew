'use strict';
/** Safe, offline build-readiness report. Never installs packages or touches DB. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const check=(name,condition,reason)=>({name,status:condition?'PASS':'BLOCKED',detail:condition?'Đã có':reason});
const exists=x=>fs.existsSync(path.join(root,x));
const report={release:'V11.12',kind:'offline-environment-preflight',buildVerified:false,postgresE2EVerified:false,
  checks:[check('npm lockfile',exists('package-lock.json'),'Chưa có package-lock.json; tạo trong môi trường có truy cập npm và commit'),
    check('installed workspace dependencies',exists('node_modules/@nestjs/common')&&exists('node_modules/next'),'Chưa cài NestJS/Next.js dependencies; không thể build ứng dụng'),
    check('E2E configuration',exists('.env.e2e'),'Chưa cấu hình PostgreSQL thử nghiệm riêng (tuyệt đối không dùng DB thật)')],
  nextSteps:['npm install --package-lock-only (trong môi trường được phép truy cập npm)','npm ci','npm run typecheck','npm run build','Cấu hình DB thử nghiệm riêng rồi chạy npm run check:release:full']};
report.status=report.checks.every(x=>x.status==='PASS')?'PREREQUISITES_PRESENT_NOT_YET_VERIFIED':'BLOCKED';
if(require.main===module)console.log(JSON.stringify(report,null,2));
module.exports={report};
