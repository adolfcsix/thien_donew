"""Offline representative visual smoke; not a Next.js full-stack integration test."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
BASE=Path(__file__).resolve().parents[1]
HTML=(BASE/'previews/v11-heritage-chart-preview.html').read_text(encoding='utf8')
async def smoke():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in (1440,1080,768,390,320):
   page=await browser.new_page(viewport={'width':width,'height':1400 if width==1440 else 900},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content(HTML,wait_until='domcontentloaded')
   assert await page.locator('.chart-room-layout').get_attribute('data-board-skin')=='heritage'
   assert await page.locator('#sample-board [data-branch]').count()==12
   assert await page.locator('.chart-relation-lines').count()==0
   tile=page.locator('#sample-board [data-branch]').first
   await tile.hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-path path").length===3')
   assert await page.locator('.visual-focus').count()==1
   path=await page.locator('.chart-relation-path path').first.get_attribute('d')
   assert ' Q ' in path,path
   if width==1440:
    await page.evaluate('window.scrollTo(0,0)')
    await page.screenshot(path='/mnt/data/THIEN_DO_V11_HERITAGE_HOVER.png',full_page=True)
   await page.mouse.move(0,0)
   await page.wait_for_function('document.querySelectorAll(".chart-relation-lines").length===0')
   if width in (1440,390):
    await page.evaluate('window.scrollTo(0,0)')
    await page.screenshot(path=f'/mnt/data/THIEN_DO_V11_HERITAGE_{width}.png',full_page=width==1440)
   await page.locator('[data-preview-skin="jade"]').click()
   assert await page.locator('.chart-room-layout').get_attribute('data-board-skin')=='jade'
   await page.locator('[data-preview-skin="heritage"]').click()
   assert not await page.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth'),width
   assert not errors,errors
   print(f'V11 desktop {width}px PASS')
   await page.close()
  touch_context=await browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  page=await touch_context.new_page()
  await page.set_content(HTML,wait_until='domcontentloaded')
  await page.locator('#sample-board [data-branch]').first.tap()
  await page.wait_for_function('document.querySelectorAll(".chart-relation-path path").length===3')
  await page.locator('.preview-head').tap(force=True)
  await page.wait_for_function('document.querySelectorAll(".chart-relation-lines").length===0')
  print('V11 touch 390px PASS')
  await touch_context.close()
  await browser.close()
asyncio.run(smoke())
