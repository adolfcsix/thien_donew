const {test}=require('node:test'),assert=require('node:assert/strict');
const {browserLaunchOptions:options}=require('./helpers-browser-launch.cjs');
test('browser QA default keeps standard context isolation',()=>{assert.equal(options({}).headless,true);assert.equal(options({}).args.includes('--single-process'),false);});
test('explicit Chromium executable and software rendering flags remain supported',()=>{const o=options({THIENDO_CHROMIUM_PATH:'/qa/chromium',THIENDO_CHROMIUM_ARGS_JSON:'["--no-sandbox","--use-angle=swiftshader"]'});assert.equal(o.executablePath,'/qa/chromium');assert.ok(o.args.includes('--use-angle=swiftshader'));});
test('single-process and disabled web-security cannot masquerade as multi-account acceptance',()=>{for(const flag of ['--single-process','--single-process=true','--disable-web-security','--allow-running-insecure-content'])assert.throws(()=>options({THIENDO_CHROMIUM_ARGS_JSON:JSON.stringify([flag])}),/Unsafe Chromium QA mode/);});
test('malformed or unbounded argument lists fail before browser launch',()=>{for(const value of ['{}','[1]','null',JSON.stringify(Array(65).fill('--flag'))])assert.throws(()=>options({THIENDO_CHROMIUM_ARGS_JSON:value}));});
