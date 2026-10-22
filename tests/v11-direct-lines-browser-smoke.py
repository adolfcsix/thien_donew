"""Chromium fixture test for native straight connection behavior. Does not claim Next.js E2E."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/v11-straight-relations-preview.html').read_text(encoding='utf-8')

async def inspect():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in (1600,1440,1080,768,390,320):
   page=await browser.new_page(viewport={'width':width,'height':920})
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   await page.set_content(HTML,wait_until='domcontentloaded')
   await page.wait_for_timeout(80)
   svg=page.locator('.chart-relation-lines')
   assert await svg.get_attribute('data-visible')=='false',f'not idle at {width}'
   await page.locator('#sample-board [data-branch="3"]').hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-lines[data-visible=true] .chart-relation-stroke").length===3')
   await page.wait_for_timeout(265)
   paths=await page.locator('.chart-relation-stroke').evaluate_all('(nodes)=>nodes.map(node=>node.getAttribute("d"))')
   assert len(paths)==3 and all(path.count(' L ')==1 and ' Q ' not in path and ' C ' not in path for path in paths),paths
   await page.locator('#sample-board [data-branch="6"]').hover()
   await page.wait_for_timeout(42)
   intermediate=await page.locator('.chart-relation-stroke').first.get_attribute('d')
   await page.wait_for_timeout(285)
   final=await page.locator('.chart-relation-stroke').first.get_attribute('d')
   assert intermediate!=final,('no morph',width)
   assert final.count(' L ')==1,('not straight',final)
   await page.locator('[data-preview-scope="tam-hop"]').click()
   await page.locator('#sample-board [data-branch="6"]').hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-stroke").length===2')
   await page.locator('[data-preview-scope="tu-chinh"]').click()
   await page.locator('#sample-board [data-branch="6"]').hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-stroke").length===3')
   if width==1440:
    await page.locator('.chart-room-layout').screenshot(path=str(ROOT/'previews/v11-straight-hover-desktop.png'))
   await page.locator('#preview-toggle-lines').click()
   await page.wait_for_function('!document.querySelector(".chart-relation-lines") || document.querySelector(".chart-relation-lines").dataset.visible==="false"')
   assert not errors,(width,errors)
   assert not await page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),f'overflow {width}'
   print(f'Desktop hover/motion/straight/scope {width}px: PASS')
   await page.close()
  mobile=await browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  await mobile.set_content(HTML,wait_until='domcontentloaded')
  await mobile.locator('#sample-board [data-branch="3"]').tap()
  await mobile.wait_for_function('document.querySelectorAll(".chart-relation-lines[data-visible=true] .chart-relation-stroke").length===3')
  paths=await mobile.locator('.chart-relation-stroke').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("d"))')
  assert all(' L ' in path and ' Q ' not in path for path in paths),paths
  await mobile.locator('.chart-room-layout').screenshot(path=str(ROOT/'previews/v11-straight-mobile-tap.png'))
  await mobile.locator('.preview-head').tap(force=True)
  await mobile.wait_for_function('document.querySelector(".chart-relation-lines").dataset.visible==="false"')
  print('Mobile tap/dismiss 390px: PASS')
  await mobile.close()
  await browser.close()

if __name__=='__main__':
 asyncio.run(inspect())
