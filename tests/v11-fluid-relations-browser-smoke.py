import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/v11-fluid-relations-preview.html').read_text(encoding='utf-8')

async def main():
 async with async_playwright() as playwright:
  browser=await playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in (1440,1080,768,390,320):
   page=await browser.new_page(viewport={'width':width,'height':900})
   errors=[]
   page.on('pageerror',lambda err: errors.append(str(err)))
   await page.set_content(HTML,wait_until='domcontentloaded')
   await page.wait_for_timeout(100)
   assert await page.locator('.chart-relation-lines[data-visible="false"]').count()==1,f'idle at {width}px'
   first=page.locator('#sample-board [data-branch="3"]')
   next_palace=page.locator('#sample-board [data-branch="6"]')
   await first.hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-lines[data-visible=true] .chart-relation-stroke").length===3')
   await page.wait_for_timeout(260)
   start_path=await page.locator('.chart-relation-stroke').first.get_attribute('d')
   await next_palace.hover()
   await page.wait_for_timeout(45)
   intermediate=await page.locator('.chart-relation-stroke').first.get_attribute('d')
   await page.wait_for_timeout(260)
   end_path=await page.locator('.chart-relation-stroke').first.get_attribute('d')
   assert len({start_path,intermediate,end_path})==3,f'no motion at {width}px'
   assert end_path.startswith('M ') and ' Q ' in end_path
   await page.locator('#preview-toggle-lines').click()
   await page.wait_for_function('document.querySelector(".chart-relation-lines").dataset.visible==="false"')
   assert await page.locator('.chart-relation-lines').count()==1,'overlay unmounted instead of fading'
   await page.locator('#preview-toggle-lines').click()
   await page.locator('#preview-toggle-dock').click()
   assert await page.locator('#sample-dock').is_visible()
   await page.locator('#preview-toggle-dock').click()
   assert await page.locator('#sample-dock').is_hidden()
   assert not errors,errors
   if width in (1440,390):
    await next_palace.hover()
    await page.wait_for_timeout(270)
    await page.screenshot(path=str(ROOT/f'previews/v11-fluid-relations-{width}.png'),full_page=False)
   print(f'Chromium desktop hover/morph/dock {width}px: PASS')
   await page.close()
  mobile=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  await mobile.set_content(HTML,wait_until='domcontentloaded')
  await mobile.locator('#sample-board [data-branch="3"]').tap()
  await mobile.wait_for_function('document.querySelectorAll(".chart-relation-lines[data-visible=true] .chart-relation-stroke").length===3')
  await mobile.locator('.preview-head').tap(force=True)
  await mobile.wait_for_function('document.querySelector(".chart-relation-lines").dataset.visible==="false"')
  print('Chromium mobile touch/dismiss 390px: PASS')
  await mobile.close()
  await browser.close()

asyncio.run(main())
