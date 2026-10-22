/** Compatibility entry point: every file runs in a fresh process with its own deadline.
 * Never skip, force-exit, accept a missing summary, or confuse timeout with success. */
import {readdirSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runTestFiles} from './lib/test-file-runner.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const files=['tests','tests/compat/tests'].flatMap(folder=>readdirSync(resolve(root,folder)).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>folder+'/'+f));
const reportDir=resolve(process.env.THIENDO_TEST_REPORT_DIR||resolve(root,'docs/reports'),`test-files-v${version.replaceAll('.','_')}`);
const exclusiveFiles=files.filter(file=>/\b(?:spawn|spawnSync|execFile|execFileSync|runTestFiles)\b/.test(readFileSync(resolve(root,file),'utf8')));
const report=await runTestFiles(files,{cwd:root,reportDir,exclusiveFiles});
console.log(`Evidence: ${reportDir}/results.json`);
console.log(`${report.verdict} all ${report.passed}/${report.tests} Node.js regression tests across ${files.length} distinct files`);
if(report.verdict!=='PASS')process.exitCode=1;
