import {runTestFiles} from '../../infrastructure/scripts/lib/test-file-runner.mjs';
const files=['v1116419-sql','v1116421-dashboard-sql','a31-forum-sql','a34-upgrade','a36-upgrade','a44-insight-sql','a49-message-order','a51-admin-member-sql','a52-showcase-sql','a64-merged-security-sql','chat-recovery-sql'].map(x=>'tests/'+x+'.test.mjs');
const report=await runTestFiles(files,{cwd:process.cwd(),reportDir:process.cwd()+'/verification/deep-audit/sql-baseline',concurrency:1,timeoutMs:90000,runTimeoutMs:600000});
console.log(JSON.stringify({verdict:report.verdict,tests:report.tests,pass:report.passed,files:report.results.length}));if(report.verdict!=='PASS')process.exitCode=1;
