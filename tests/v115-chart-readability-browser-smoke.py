import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v11-5-readability-preview.html').read_text(encoding='utf-8')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [1600,1440,1100,900,768,390,320]:
   page=await browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
   errors=[]
   page.on('pageerror',lambda e: errors.append(str(e)))
   await page.set_content(html,wait_until='domcontentloaded')
   await page.wait_for_function('document.querySelectorAll("#sample-board [data-branch]").length===12')
   await page.wait_for_timeout(60)
   board=page.locator('.chart-room-layout')
   assert await board.get_attribute('data-chart-text-size')=='comfortable'
   assert await page.locator('#sample-board [data-branch]').count()==12
   main=page.locator('#sample-board .atlas-main-star-entry strong').first
   aux=page.locator('#sample-board .atlas-star-group:not(.atlas-main) .atlas-star').first
   sizes_before=await page.evaluate('''() => {
    const main=document.querySelector('#sample-board .atlas-main-star-entry strong');
    const aux=document.querySelector('#sample-board .atlas-star-group:not(.atlas-main) .atlas-star');
    return {main: main ? parseFloat(getComputedStyle(main).fontSize) : null, aux: aux ? parseFloat(getComputedStyle(aux).fontSize) : null};
   }''')
   if width >=1100:
    assert sizes_before['main']>=13.4,sizes_before
    assert sizes_before['aux']>=11.9,sizes_before
   if width==1440:
    await page.screenshot(path=str(root/'previews/v11-5-readable-default-1440.png'),full_page=False)
   await page.locator('[data-sample-text="large"]').click()
   sizes_after=await page.evaluate('''() => {
    const main=document.querySelector('#sample-board .atlas-main-star-entry strong');
    const aux=document.querySelector('#sample-board .atlas-star-group:not(.atlas-main) .atlas-star');
    return {main: main ? parseFloat(getComputedStyle(main).fontSize) : null, aux: aux ? parseFloat(getComputedStyle(aux).fontSize) : null};
   }''')
   if width>760:
    assert sizes_after['main']>sizes_before['main'],(width,sizes_before,sizes_after)
    assert sizes_after['aux']>sizes_before['aux'],(width,sizes_before,sizes_after)
   assert await board.get_attribute('data-chart-text-size')=='large'
   if width in [1440,390]:
    await page.screenshot(path=str(root/f'previews/v11-5-readable-large-{width}.png'),full_page=False)
   overflow=await page.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth + 1')
   assert not overflow,f'Page horizontal overflow at {width}px'
   assert not errors,errors
   print(f'Chromium {width}px: PASS type {sizes_before} -> {sizes_after}')
   await page.close()
  await browser.close()
asyncio.run(main())
