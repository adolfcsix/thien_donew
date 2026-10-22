"""Browser-level source-backed preview audit; not a Next.js end-to-end test."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/v11-silk-thread-preview.html').read_text(encoding='utf-8')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  desktop=await browser.new_page(viewport={'width':1440,'height':920})
  await desktop.set_content(HTML,wait_until='domcontentloaded')
  chart=desktop.locator('.chart-room-layout')
  await chart.screenshot(path=str(ROOT/'previews/v11-silk-idle-1440.png'))
  await desktop.locator('#sample-board [data-branch="3"]').hover()
  await desktop.wait_for_function('document.querySelector(".chart-relation-lines").dataset.visible === "true"')
  await desktop.wait_for_timeout(300)
  report=await desktop.evaluate('''() => {
   const board=document.getElementById('sample-board');
   const core=board.querySelector('.preview-center-meta');
   const c=core.getBoundingClientRect(), b=board.getBoundingClientRect();
   const coreRect={left:c.left-b.left,top:c.top-b.top,right:c.right-b.left,bottom:c.bottom-b.top};
   const paths=[...board.querySelectorAll('.chart-relation-stroke')];
   let collisions=0;
   for(const path of paths){const length=path.getTotalLength(); for(let i=0;i<=100;i++){
     const t=path.getPointAtLength(length*i/100);
     if(t.x>coreRect.left && t.x<coreRect.right && t.y>coreRect.top && t.y<coreRect.bottom) collisions++;
   }}
   return {paths:paths.length, collisions, coreRect};
  }''')
  assert report['paths']==3,report
  assert report['collisions']==0,report
  await chart.screenshot(path=str(ROOT/'previews/v11-silk-hover-1440.png'))
  print('desktop silk guide avoids visible birth-data core:',report)
  await desktop.close()
  mobile=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  await mobile.set_content(HTML,wait_until='domcontentloaded')
  await mobile.locator('#sample-board [data-branch="3"]').tap()
  await mobile.wait_for_function('document.querySelectorAll(".chart-relation-lines[data-visible=true] .chart-relation-stroke").length===3')
  await mobile.locator('.chart-room-layout').screenshot(path=str(ROOT/'previews/v11-silk-mobile-390.png'))
  await mobile.close()
  await browser.close()
asyncio.run(main())
