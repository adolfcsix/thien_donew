"""Offline Chromium checks for hover-preview, touch fallback, accents, and Vietnamese typography.
This tests a preview, not a deployed Next.js application.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/palace-lines-and-dock-preview.html').read_text(encoding='utf-8')

async def run():
 async with async_playwright() as playwright:
  browser=await playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [1440,1080,768,390,320]:
   page=await browser.new_page(viewport={'width':width,'height':920},device_scale_factor=1)
   issues=[]
   page.on('pageerror', lambda e: issues.append(str(e)))
   await page.set_content(HTML,wait_until='domcontentloaded')
   await page.wait_for_timeout(90)
   assert await page.locator('#sample-dock').is_hidden()
   assert await page.locator('.chart-relation-lines').count()==0
   palaces=page.locator('#sample-board .atlas-house[data-branch]')
   assert await palaces.count()==12
   for i in range(12):
    assert await palaces.nth(i).evaluate('(el)=>!!getComputedStyle(el).getPropertyValue("--house-accent").trim()')
   chosen=palaces.first
   branch=int(await chosen.get_attribute('data-branch'))
   selected=await page.evaluate('selected')
   assert branch != selected, 'Need different hovered and selected palaces for provenance test'
   await chosen.hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-path path").length===3')
   assert await page.locator('.visual-focus').count()==1
   assert int(await page.locator('.visual-focus').get_attribute('data-branch'))==branch
   assert await page.locator('.related-tam-hop').count()==2
   assert await page.locator('.related-doi-cung').count()==1
   geom=await page.evaluate('''()=>{let b=document.querySelector('#sample-board').getBoundingClientRect();
     let t=document.querySelector('#sample-board .visual-focus').getBoundingClientRect();
     let c=document.querySelector('.chart-relation-path circle');
     return {x:Number(c.getAttribute('cx'))+b.left,y:Number(c.getAttribute('cy'))+b.top,
             left:t.left,right:t.right,top:t.top,bottom:t.bottom};}''')
   assert geom['left']<=geom['x']<=geom['right'] and geom['top']<=geom['y']<=geom['bottom'],geom
   if width==1440:
    await page.screenshot(path=str(ROOT/'previews/v109-desktop-hover.png'),full_page=False)
   # Moving away should restore the reference's clean chart state.
   await page.mouse.move(1,1)
   await page.wait_for_function('document.querySelectorAll(".chart-relation-lines").length===0')
   assert await page.locator('.visual-focus').count()==0
   if width==1440:
    await page.screenshot(path=str(ROOT/'previews/v109-desktop-idle.png'),full_page=False)
   assert not issues,issues
   assert not await page.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth')
   await page.close()
   print('Hover+font',width,'PASS')
  context=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
  page=await context.new_page()
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  await page.set_content(HTML,wait_until='domcontentloaded')
  palaces=page.locator('#sample-board .atlas-house[data-branch]')
  assert await page.locator('.chart-relation-lines').count()==0
  await palaces.first.tap()
  await page.wait_for_function('document.querySelectorAll(".chart-relation-path path").length===3')
  await page.screenshot(path=str(ROOT/'previews/v109-mobile-tap.png'),full_page=False)
  await page.locator('.preview-head').tap(force=True)
  await page.wait_for_function('document.querySelectorAll(".chart-relation-lines").length===0')
  assert not errors,errors
  assert not await page.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth')
  print('Touch 390 PASS')
  await context.close()
  await browser.close()

asyncio.run(run())
