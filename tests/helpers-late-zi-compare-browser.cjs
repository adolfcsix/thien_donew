'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
/**
 * Runs in the real isolated browser -> Next -> Nest -> PGlite acceptance
 * context. Never persists a hypothetical birthday or natal chart.
 */
module.exports=async function verifyLateZiCompare({context,origin,record,pageErrors,out}){
 for(const width of [390,1440]){
  const page=await context.newPage();
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.setDefaultTimeout(30000);
  try{
   await page.setViewportSize({width,height:width===390?780:900});
   await page.goto(origin+'/chart',{waitUntil:'networkidle'});
   let drawer=page.locator('.chart-input-drawer');
   await drawer.waitFor();
   if(!(await drawer.evaluate(el=>el.open)))await drawer.locator(':scope > summary').click();
   await drawer.getByLabel('Tên lá số',{exact:true}).fill('Kiểm thử giờ Tý');
   await drawer.getByLabel('Ngày sinh',{exact:true}).fill('2024-02-09');
   const hours=drawer.getByRole('combobox',{name:'Giờ sinh',exact:true});
   const minutes=drawer.getByRole('combobox',{name:'Phút sinh',exact:true});
   assert.equal(await hours.count(),1,'birth hour select must appear exactly once');
   assert.equal(await minutes.count(),1,'birth minute select must appear exactly once');
   await hours.selectOption('23');
   await minutes.selectOption('0');
   await drawer.getByRole('button',{name:/Tính lá số/}).click();
   const open=page.getByRole('button',{name:'So sánh quy ước giờ Tý',exact:true});
   await open.waitFor();
   assert.equal(await open.getAttribute('aria-expanded'),'false');
   await open.click();
   await page.getByRole('heading',{name:'Hai cách chọn ngày, hai địa bàn'}).waitFor();
   const a=page.getByRole('group',{name:'Các địa chi của Giữ ngày sinh đã nhập',exact:true});
   const b=page.getByRole('group',{name:'Các địa chi của Tính sang ngày sau',exact:true});
   assert.equal(await a.getByRole('button').count(),12);
   assert.equal(await b.getByRole('button').count(),12);
   const gridLayout=await a.evaluate(el=>{
    const center=el.querySelector('[aria-hidden="true"]');
    const branch5=el.querySelector('[data-branch="5"]');
    const branch0=el.querySelector('[data-branch="0"]');
    return {
     columns:getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
     centerVisible:center!==null&&getComputedStyle(center).display!=='none',
     tySiteRow:branch0?getComputedStyle(branch0).gridRowStart:null,
     tySiteCol:branch0?getComputedStyle(branch0).gridColumnStart:null,
     tySiteTop:branch5?getComputedStyle(branch5).gridRowStart:null,
     tySiteLeft:branch5?getComputedStyle(branch5).gridColumnStart:null
    };
   });
   assert.equal(gridLayout.columns,width===390?2:4,'readable mobile columns / desktop palace ring');
   assert.equal(gridLayout.centerVisible,width===1440,'center of ring hidden on compact phones');
   if(width===1440)assert.deepEqual(
    [gridLayout.tySiteRow,gridLayout.tySiteCol,gridLayout.tySiteTop,gridLayout.tySiteLeft],
    ['4','3','1','1'],'correct ring coordinates for Tý and Tỵ');
   await page.getByRole('region',{name:'Giữ ngày sinh đã nhập'}).getByText('09/02/2024',{exact:true}).first().waitFor({state:'visible'});
   await page.getByRole('region',{name:'Tính sang ngày sau'}).getByText('10/02/2024',{exact:true}).first().waitFor({state:'visible'});
   assert.equal(await page.locator('#thiendo-late-zi-compare [data-research-only=true]').count(),1);
   if(out){
    // GitHub uploads the repository reports directory; runner temp paths may
    // be inaccessible from the isolated Playwright container during upload.
    const evidenceDir=path.resolve('docs/reports/isolated-sql/r38-visual-evidence');
    fs.mkdirSync(evidenceDir,{recursive:true});
    const screenshot=path.join(evidenceDir,'r38-zi-compare-'+width+'px.png');
    await page.locator('#thiendo-late-zi-compare').screenshot({
     path:screenshot,animations:'disabled'
    });
    assert.ok(fs.statSync(screenshot).size>0,'R38 screenshot must have image bytes');
   }
   assert.equal(await page.locator('#thiendo-late-zi-compare button').filter({hasText:'Lưu lá số'}).count(),0);
   const starAudit=page.getByTestId('r40-star-transitions');
   assert.equal(await starAudit.count(),1);
   assert.equal(await starAudit.getAttribute('open'),null,'star trail begins collapsed');
   await starAudit.locator(':scope > summary').click();
   assert.equal(await starAudit.locator('li').count(),14,'all fourteen major stars move for this controlled example');
   for(const row of await starAudit.locator('li').all()){
    assert.equal(await row.locator('strong').count(),1,'each star is named exactly once');
    assert.equal(await row.locator('b').count(),2,'each movement has an A and B destination');
   }
   const starAuditFits=await starAudit.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return r.left>=-1&&r.right<=window.innerWidth+1&&el.scrollWidth<=r.width+2;
   });
   assert.equal(starAuditFits,true,'R40 movement trail must not overflow '+width+'px');

   if(out){
    const evidenceDir=path.resolve('docs/reports/isolated-sql/r40-visual-evidence');
    fs.mkdirSync(evidenceDir,{recursive:true});
    const screenshot=path.join(evidenceDir,'r40-star-transitions-'+width+'px.png');
    await starAudit.screenshot({path:screenshot,animations:'disabled'});
    assert.ok(fs.statSync(screenshot).size>0,'R40 star trail image must exist');
   }
   // R41: select a star and verify exactly one source/destination marker.
   const chosen=starAudit.locator('li').first().locator('button');
   await chosen.click();
   assert.equal(await chosen.getAttribute('aria-pressed'),'true');
   assert.equal(await a.locator('[data-star-endpoint="source"]').count(),1);
   assert.equal(await b.locator('[data-star-endpoint="destination"]').count(),1);
   assert.equal(await a.locator('button[aria-pressed="true"]').count(),0,'source selection yields to selected star');
   assert.equal(await b.locator('button[aria-pressed="true"]').count(),0,'hypothetical selection yields to selected star');
   await page.getByRole('status').filter({hasText:'Đang định vị'}).waitFor({state:'visible'});
   if(out){
    const evidenceDir=path.resolve('docs/reports/isolated-sql/r41-visual-evidence');
    fs.mkdirSync(evidenceDir,{recursive:true});
    const screenshot=path.join(evidenceDir,'r41-zi-focus-'+width+'px.png');
    await page.locator('#thiendo-late-zi-compare').screenshot({path:screenshot,animations:'disabled'});
    assert.ok(fs.statSync(screenshot).size>0,'R41 highlighted endpoint image must exist');
   }
   await chosen.click();
   assert.equal(await a.locator('[data-star-endpoint]').count(),0);
   assert.equal(await b.locator('[data-star-endpoint]').count(),0);
   await starAudit.locator(':scope > summary').click();

   const details=page.getByRole('region',{name:'Chi tiết địa chi đang chọn'});
   await details.waitFor();
   const first=a.getByRole('button').nth(2);
   await first.click();
   assert.equal(await first.getAttribute('aria-pressed'),'true');
   assert.equal(await b.getByRole('button').nth(2).getAttribute('aria-pressed'),'true');
   await page.getByLabel('Chỉ xem địa chi thay đổi').check();
   const filtered=await a.getByRole('button').count();
   assert.ok(filtered>0&&filtered<=12);
   assert.equal(await b.getByRole('button').count(),filtered);
   const viewportSafe=await page.locator('#thiendo-late-zi-compare').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return r.width<=window.innerWidth+1&&r.right<=window.innerWidth+1&&el.scrollWidth<=r.width+2;
   });
   assert.equal(viewportSafe,true,'late-Zi panel must not overflow '+width);
   const hint=page.locator('#late-zi-table-hint');
   assert.equal(await hint.isVisible(),width===390,'mobile table must advertise horizontal scrolling');
   const table=page.getByRole('region',{name:'Bảng so sánh chỉ số tổng quan'});
   assert.equal(await table.getAttribute('aria-describedby'),'late-zi-table-hint');
   // A new birth-minute calculation still uses hour Tý, but the research
   // panel must be closed rather than inheriting the prior chart's state.
   drawer=page.locator('.chart-input-drawer');
   if(!(await drawer.evaluate(el=>el.open)))await drawer.locator(':scope > summary').click();
   await drawer.getByRole('combobox',{name:'Phút sinh',exact:true}).selectOption('59');
   await drawer.getByRole('button',{name:/Tính lá số/}).click();
   const freshButton=page.getByRole('button',{name:'So sánh quy ước giờ Tý',exact:true});
   await freshButton.waitFor({state:'visible'});
   assert.equal(await freshButton.getAttribute('aria-expanded'),'false',
    'new chart must not inherit earlier late-Zi view visibility');
   assert.equal(await page.getByRole('heading',{name:'Hai cách chọn ngày, hai địa bàn'}).count(),0);
   await freshButton.click();
   await page.getByRole('heading',{name:'Hai cách chọn ngày, hai địa bàn'}).waitFor();
   await page.getByRole('button',{name:'Ẩn so sánh giờ Tý',exact:true}).click();
   assert.equal(await page.getByRole('heading',{name:'Hai cách chọn ngày, hai địa bàn'}).count(),0);
   drawer=page.locator('.chart-input-drawer');
   if(!(await drawer.evaluate(el=>el.open)))await drawer.locator(':scope > summary').click();
   assert.equal(await drawer.getByLabel('Ngày sinh',{exact:true}).inputValue(),'2024-02-09');
   assert.equal(await drawer.getByRole('combobox',{name:'Giờ sinh',exact:true}).inputValue(),'23');
   await drawer.getByRole('combobox',{name:'Giờ sinh',exact:true}).selectOption('22');
   await drawer.getByRole('button',{name:/Tính lá số/}).click();
   await page.locator('#tuvi-chart-result .result-actions').waitFor();
   assert.equal(await page.getByRole('button',{name:'So sánh quy ước giờ Tý'}).count(),0);
   record({case:'mobile/desktop late-Zi comparison is accessible, read-only and branch-synchronized',width,verdict:'PASS'});
  }finally{await page.close();}
 }
};
