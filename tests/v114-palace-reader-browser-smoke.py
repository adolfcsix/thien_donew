"""Offline demo smoke for native reader dialog; NOT a full Next.js E2E."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/v11-palace-reader-preview.html').read_text(encoding='utf-8')

async def verify():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in (1600,1440,1080,768,390,320):
   page=await browser.new_page(viewport={'width':width,'height':920})
   errors=[]
   page.on('pageerror', lambda error: errors.append(str(error)))
   await page.set_content(HTML,wait_until='domcontentloaded')
   reader=page.locator('#sample-reader')
   assert not await reader.evaluate('(n)=>n.open'),width
   trigger=page.locator('#preview-open-reader')
   await trigger.click()
   assert await reader.evaluate('(n)=>n.open'),width
   assert await page.locator('#preview-close-reader').evaluate('(n)=>n===document.activeElement'),width
   assert await page.locator('.preview-reader-group').count()==8,width
   before=await page.locator('#preview-reader-current').inner_text()
   await page.locator('#preview-next-palace').click()
   after=await page.locator('#preview-reader-current').inner_text()
   assert before!=after,(width,before,after)
   await page.locator('#preview-reader-font').click()
   assert await reader.get_attribute('data-reader-font')=='large',width
   if width in (1440,390):
    await reader.screenshot(path=str(ROOT/f'previews/v114-reader-{width}.png'))
   assert await reader.evaluate('(n)=>n.scrollWidth<=n.clientWidth+1'),width
   await page.keyboard.press('Escape')
   assert not await reader.evaluate('(n)=>n.open'),width
   assert await trigger.evaluate('(n)=>n===document.activeElement'),width
   assert not await page.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth'),width
   assert not errors,errors
   print(f'Reader modal/zoom/next/Escape/focus {width}px: PASS')
   await page.close()
  await browser.close()

if __name__=='__main__': asyncio.run(verify())
