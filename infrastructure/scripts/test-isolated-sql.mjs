/** Real service/SQL regression in separately installed PGlite; never native DB/provider certification. */
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runTestFiles} from './lib/test-file-runner.mjs';
if(!process.env.THIENDO_SQL_TEST_MODULE)throw Error('Set THIENDO_SQL_TEST_MODULE to an isolated PGlite installation; no implicit production database');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const files=['v1116419-sql','v1116421-dashboard-sql','a31-forum-sql','a34-upgrade','a36-upgrade','a44-insight-sql','a49-message-order','a51-admin-member-sql','a52-showcase-sql','a64-merged-security-sql','chat-recovery-sql','deep-ai-session-sql'].map(x=>'tests/'+x+'.test.mjs');
const report=await runTestFiles(files,{cwd:root,reportDir:resolve(process.env.THIENDO_SQL_REPORT_DIR||resolve(root,'docs/reports/isolated-sql')),concurrency:1,timeoutMs:90000,runTimeoutMs:600000});
console.log(JSON.stringify({verdict:report.verdict,tests:report.tests,pass:report.passed,files:report.results.length,scope:'PGlite SQL/service only'}));if(report.verdict!=='PASS')process.exitCode=1;
