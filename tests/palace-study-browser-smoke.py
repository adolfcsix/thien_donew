"""Chromium testing of standalone illustrative preview only, not Next/Nest E2E."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT.joinpath('previews/palace-study-workbench-preview.html').read_text(encoding='utf-8')

async def main():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for width in (1440,1080,768,390,320):
            page=await browser.new_page(viewport={'width':width,'height':900},accept_downloads=True)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.set_content(HTML,wait_until='load')
            assert await page.locator('.palace-option').count()==12,(width,'palaces missing',errors)
            assert await page.locator('.node').count()==4,(width,'relation nodes missing')
            assert await page.locator('#topic article').count()==4
            assert await page.locator('#currentTitle').inner_text()!=''
            if width in (1440,390):
                await page.screenshot(path=str(ROOT/f'previews/palace-study-{width}.png'),full_page=True)
            start=await page.locator('#currentTitle').inner_text()
            await page.locator('.palace-option').nth(3).click()
            assert await page.locator('#currentTitle').inner_text()!=start
            await page.locator('#modeFocus').click()
            assert 'active' in (await page.locator('#modeFocus').get_attribute('class') or '')
            await page.locator('#yearToggle').click()
            assert 'active' not in (await page.locator('#yearToggle').get_attribute('class') or '')
            await page.locator('[data-tab="stars"]').click()
            assert await page.locator('#stars').is_visible()
            await page.locator('[data-tab="evidence"]').click()
            assert await page.locator('#evidence').is_visible()
            await page.locator('#note').fill('Đối chiếu thêm sao đồng cung')
            await page.locator('.palace-option').nth(4).click()
            assert await page.locator('#note').input_value()==''
            await page.locator('.palace-option').nth(3).click()
            assert await page.locator('#note').input_value()=='Đối chiếu thêm sao đồng cung'
            async with page.expect_download() as info:
                await page.locator('#export').click()
            download=await info.value
            assert download.suggested_filename.startswith('thien-do-phong-doc-cung-')
            dims=await page.evaluate('({screen:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})')
            assert dims['content']<=dims['screen']+2,(width,dims)
            assert not errors,(width,errors)
            results.append({'width':width,'passed':True,'no_horizontal_overflow':True,'navigation':True,'tabs':True,'scope':True,'isolated_notes':True,'local_export':True})
            await page.close()
        await browser.close()
    path=ROOT/'docs/PALACE_STUDY_WORKBENCH_BROWSER_EVIDENCE_2026_10_10.json'
    path.write_text(json.dumps({'scope':'Illustrative offline preview only: not proof of full-stack build or PostgreSQL E2E.', 'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Palace Study preview Chromium PASS:',len(results),'/',len(results))
if __name__=='__main__':
    asyncio.run(main())
