"""Visual fixture verification; does not replace Next/Nest end-to-end tests."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT/'previews/v11-phase3-fit-preview.html').read_text(encoding='utf8')

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for width in (1600,1440,1280,1100,970,768,390,320):
            page=await browser.new_page(viewport={'width':width,'height':960},device_scale_factor=1)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.set_content(HTML,wait_until='domcontentloaded')
            await page.wait_for_timeout(150)
            assert await page.locator('#sample-board [data-branch]').count()==12,width
            values=await page.evaluate('''() => {
              const doc=document.documentElement,b=document.querySelector('.preview-board'),g=document.querySelector('#sample-board');
              return {docW:doc.scrollWidth,docClient:doc.clientWidth,boardWidth:b.clientWidth,boardScroll:b.scrollWidth,gridWidth:g.getBoundingClientRect().width};
            }''')
            assert values['docW'] <= values['docClient']+1,(width,values)
            assert values['boardScroll'] <= values['boardWidth']+2,(width,values)
            assert values['gridWidth'] <= values['boardWidth']+2,(width,values)
            if width>970:
                toggle=page.locator('#preview-toggle-nav')
                assert await page.locator('.site').get_attribute('data-chart-sidebar')=='collapsed'
                await toggle.click()
                assert await page.locator('.site').get_attribute('data-chart-sidebar')=='expanded'
                await page.wait_for_timeout(250)
                values=await page.evaluate('''() => ({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth, board:document.querySelector('.preview-board').clientWidth,scroll:document.querySelector('.preview-board').scrollWidth})''')
                assert values['page']<=values['viewport']+1,(width,values)
                assert values['scroll']<=values['board']+2,(width,values)
                await toggle.click()
                assert await page.locator('.site').get_attribute('data-chart-sidebar')=='collapsed'
            await page.locator('#preview-toggle-dock').click()
            assert await page.locator('#sample-dock').is_visible(),width
            values=await page.evaluate('''() => ({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth, board:document.querySelector('.preview-board').clientWidth,scroll:document.querySelector('.preview-board').scrollWidth})''')
            assert values['page']<=values['viewport']+1,(width,values)
            assert values['scroll']<=values['board']+2,(width,values)
            await page.locator('#preview-toggle-dock').click()
            if width in (1440,390):
                await page.screenshot(path=str(ROOT/f'previews/v11-phase3-fit-{width}.png'),full_page=False)
            assert not errors,(width,errors)
            print(f'{width}px: PASS width={values["board"]}')
            await page.close()
        await browser.close()

asyncio.run(main())
