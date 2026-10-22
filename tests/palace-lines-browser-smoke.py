import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/palace-lines-and-dock-preview.html').read_text(encoding='utf-8')

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in (1440,1080,768,390,320):
   page=await browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
   errors=[]
   page.on('pageerror', lambda e: errors.append(str(e)))
   await page.set_content(HTML,wait_until='domcontentloaded')
   await page.wait_for_timeout(120)
   assert await page.locator('#sample-dock').is_hidden(),width
   assert await page.locator('.chart-room-layout').get_attribute('data-dock-open')=='false'
   assert await page.locator('.chart-relation-lines').count()==0
   assert await page.locator('#preview-line-scope').is_visible()
   first_locator=page.locator('#sample-board [data-branch]').first
   first=await first_locator.get_attribute('data-branch')
   await first_locator.hover()
   await page.wait_for_function('document.querySelectorAll(".chart-relation-tam-hop path").length === 2')
   assert await page.locator('.chart-relation-tam-hop path').count()==2,width
   assert await page.locator('.chart-relation-doi-cung path').count()==1,width
   await page.locator('[data-preview-scope="tam-hop"]').click()
   await page.locator(f'#sample-board [data-branch="{first}"]').click(force=True)
   await page.wait_for_function('document.querySelectorAll(".chart-relation-doi-cung path").length === 0 && document.querySelectorAll(".chart-relation-tam-hop path").length === 2')
   assert await page.locator('.chart-relation-tam-hop path').count()==2,width
   assert await page.locator('.chart-relation-doi-cung path').count()==0,width
   await page.locator('[data-preview-scope="tu-chinh"]').click()
   await page.locator(f'#sample-board [data-branch="{first}"]').click(force=True)
   await page.wait_for_function('document.querySelectorAll(".chart-relation-doi-cung path").length === 1')
   await page.locator('#preview-toggle-dock').click()
   assert await page.locator('#sample-dock').is_visible(),width
   assert await page.locator('.chart-room-layout').get_attribute('data-dock-open')=='true'
   if width == 1440:
    await page.screenshot(path=str(ROOT/'previews/palace-dock-open-1440.png'),full_page=False)
   await page.locator('#preview-toggle-dock').click()
   assert await page.locator('#sample-dock').is_hidden(),width
   # Click another palace; mobile/tap fallback keeps the connections visible for that branch.
   await page.locator(f'#sample-board [data-branch="{first}"]').click(force=True)
   await page.wait_for_function('document.querySelectorAll(".chart-relation-doi-cung path").length === 1')
   assert await page.locator('.chart-relation-doi-cung path').count()==1,width
   await page.locator('#preview-toggle-lines').click()
   assert await page.locator('.chart-relation-lines').count()==0,width
   await page.locator('#preview-toggle-lines').click()
   if width in (1440,390):
    await page.screenshot(path=str(ROOT/f'previews/palace-lines-{width}.png'),full_page=False)
   assert not errors, errors
   overflow=await page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
   assert not overflow,f'Horizontal page overflow at {width}px'
   print(f'Chromium {width}px: PASS')
   await page.close()
  await browser.close()

asyncio.run(main())
