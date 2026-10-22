const fs=require('node:fs'),path=require('node:path');
module.exports=async({browser,origin,member,out,record})=>{
 const samples=[];
 for(const width of [390,1440])for(const route of ['/tarot','/western-astrology','/chart']){
 const c=await browser.newContext({viewport:{width,height:900},storageState:await member.context.storageState()}),p=await c.newPage();await p.goto(origin+route,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 const cdp=await c.newCDPSession(p);await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc',transferMode:'ReturnAsStream'});
 for(let i=0;i<3;i++){await p.locator('.theme-button').click();await p.waitForTimeout(1000);}
 const end=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');const{stream}=await end;let data='';for(;;){const chunk=await cdp.send('IO.read',{handle:stream});data+=chunk.data;if(chunk.eof)break;}await cdp.send('IO.close',{handle:stream});
 const events=JSON.parse(data).traceEvents,stats={};for(const e of events)if(e.ph==='X'&&['EventDispatch','UpdateLayoutTree','Layout','PrePaint','Paint','RasterTask','CompositeLayers'].includes(e.name)){const s=stats[e.name]??={count:0,totalMs:0,maxMs:0};s.count++;s.totalMs+=(e.dur||0)/1000;s.maxMs=Math.max(s.maxMs,(e.dur||0)/1000);}
 samples.push({route,width,stats});await c.close();
 }
 fs.writeFileSync(path.join(out,'theme-trace-summary.json'),JSON.stringify({scope:'Separate instrumented probe, three theme commits each; sums include overlapping worker durations and are NOT wall time; excludes raw traces, screenshots and account details.',samples},null,2));record({case:'six isolated theme trace summaries of style/layout/paint/raster; not budget acceptance',verdict:'PASS'});
};
