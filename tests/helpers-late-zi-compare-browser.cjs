'use strict';
const assert=require('node:assert/strict');
/**
 * Runs in the real isolated browser -> Next -> Nest -> PGlite acceptance
 * context. Never persists a hypothetical birthday or natal chart.
 */
module.exports=async function verifyLateZiCompare({context,origin,record,pageErrors}){
 for(const width of [390,1440]){
  const page=await context.newPage();
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.setDefaultTimeout(30000);
  try{
   await page.setViewportSize({width,height:width===390?780:900});
   await page.goto(origin+'/chart',{waitUntil:'networkidle'});
   let drawer=page.locator('.chart-input-drawer');
   await drawer.waitFor();
   if(!(await drawer.evaluate(el=>el.open)))await drawer.locator('summary').click();
   await drawer.getByLabel('Tên lá số',{exact:true}).fill('Kiểm thử giờ Tý');
   await drawer.getByLabel('Ngày sinh',{exact:true}).fill('2024-02-09');
   await drawer.getByLabel('Giờ sinh',{exact:true}).selectOption('23');
   await drawer.getByLabel('Phút sinh',{exact:true}).selectOption('0');
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
   await page.getByText('09/02/2024',{exact:true}).waitFor();
   await page.getByText('10/02/2024',{exact:true}).waitFor();
   assert.equal(await page.locator('#thiendo-late-zi-compare [data-research-only=true]').count(),1);
   assert.equal(await page.locator('#thiendo-late-zi-compare button').filter({hasText:'Lưu lá số'}).count(),0);
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
   await page.getByRole('button',{name:'Ẩn so sánh giờ Tý',exact:true}).click();
   assert.equal(await page.getByRole('heading',{name:'Hai cách chọn ngày, hai địa bàn'}).count(),0);
   drawer=page.locator('.chart-input-drawer');
   if(!(await drawer.evaluate(el=>el.open)))await drawer.locator('summary').click();
   assert.equal(await drawer.getByLabel('Ngày sinh',{exact:true}).inputValue(),'2024-02-09');
   assert.equal(await drawer.getByLabel('Giờ sinh',{exact:true}).inputValue(),'23');
   await drawer.getByLabel('Giờ sinh',{exact:true}).selectOption('22');
   await drawer.getByRole('button',{name:/Tính lá số/}).click();
   await page.locator('#tuvi-chart-result .result-actions').waitFor();
   assert.equal(await page.getByRole('button',{name:'So sánh quy ước giờ Tý'}).count(),0);
   record({case:'mobile/desktop late-Zi comparison is accessible, read-only and branch-synchronized',width,verdict:'PASS'});
  }finally{await page.close();}
 }
};
