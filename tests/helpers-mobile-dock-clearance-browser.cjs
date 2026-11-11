'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
/**
 * R42: distinguish long screenshot compositing from actual tap-target occlusion.
 * No CSS changes, no backend writes and no cross-route navigation in this test.
 */
module.exports=async function verifyMobileDockClearance({context,origin,record,out,pageErrors}){
 for(const width of [320,390,680,1440]){
  const page=await context.newPage();
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.setDefaultTimeout(30000);
  try{
   await page.setViewportSize({width,height:844});
   await page.goto(origin+'/chart',{waitUntil:'networkidle'});
   const nav=page.getByRole('navigation',{name:'Điều hướng điện thoại'});
   const mobile=width<=680;
   assert.equal(await nav.isVisible(),mobile,'navigation breakpoint at '+width);
   const lastLink=page.locator('.thiendo-legal-footer a[href="/ho-tro"]');
   await lastLink.waitFor({state:'attached'});
   if(mobile){
    await lastLink.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{
     document.documentElement.style.scrollBehavior='auto';
     window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});
    });
    await page.waitForFunction(()=>window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-3);
    const state=await page.evaluate(()=>{
     const nav=document.querySelector('.bottom-nav');
     const link=document.querySelector('.thiendo-legal-footer a[href="/ho-tro"]');
     const footer=document.querySelector('.thiendo-legal-footer');
     if(!(nav instanceof HTMLElement)||!(link instanceof HTMLElement)||!(footer instanceof HTMLElement))
      return {valid:false,reason:'missing bottom navigation or footer link'};
     const nr=nav.getBoundingClientRect(), lr=link.getBoundingClientRect();
     const x=lr.left+lr.width/2,y=lr.top+lr.height/2;
     const hit=document.elementFromPoint(x,y);
     return {
      valid:true,navTop:nr.top,linkBottom:lr.bottom,linkTop:lr.top,
      viewportWidth:innerWidth,viewportHeight:innerHeight,
      hitLink:Boolean(hit&&(hit===link||link.contains(hit))),
      fitsWidth:document.documentElement.scrollWidth<=innerWidth+1,
      footerPaddingBottom:getComputedStyle(footer).paddingBottom
     };
    });
    assert.equal(state.valid,true,'footer and dock must exist');
    assert.equal(state.fitsWidth,true,'no horizontal overflow at '+width);
    assert.ok(state.linkTop>=-1,'last footer link must stay in viewport');
    assert.ok(state.linkBottom<=state.navTop-6,
     'last footer link must clear fixed navigation by 6px: '+JSON.stringify(state));
    assert.equal(state.hitLink,true,'last footer link must be unobstructed for a tap');
    if(out&&width===390){
     const evidenceDir=path.resolve('docs/reports/isolated-sql/r42-mobile-dock-evidence');
     fs.mkdirSync(evidenceDir,{recursive:true});
     const screenshot=path.join(evidenceDir,'r42-mobile-dock-clearance-390px.png');
     await page.screenshot({path:screenshot,animations:'disabled'});
     assert.ok(fs.statSync(screenshot).size>0,'dock viewport evidence exists');
    }
   }
   record({case:'footer contact link remains tappable above fixed mobile navigation',width,verdict:'PASS'});
  }finally{await page.close();}
 }
};
