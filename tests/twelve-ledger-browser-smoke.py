"""Offline HTML preview smoke; NOT Next.js application E2E.
Run: node infrastructure/scripts/make-twelve-ledger-preview.cjs
     python tests/twelve-ledger-browser-smoke.py
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT.joinpath('previews/twelve-ledger-preview.html').read_text(encoding='utf-8')
async def main():
    report=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for width in (1440,1080,768,390,320):
            page=await browser.new_page(viewport={'width':width,'height':960},accept_downloads=True)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.set_content(HTML,wait_until='load')
            assert await page.locator('.ledger-palace').count()==12
            assert 'Mệnh' in await page.locator('#comparison-title').inner_text()
            if width in (1440,390):
                await page.screenshot(path=str(ROOT/f'previews/twelve-ledger-{width}.png'),full_page=True)
            await page.locator('.ledger-palace').first.click()
            assert await page.locator('.ledger-palace.active').count()==1
            assert await page.locator('#comparison-title').inner_text() != ''
            await page.locator('#search').fill('khong co sao nao')
            assert await page.locator('.ledger-palace').count()==0
            await page.locator('#search').fill('menh')
            assert await page.locator('.ledger-palace').count()==1
            await page.locator('#search').fill('')
            await page.locator('#natal').click()
            assert 'active' in (await page.locator('#natal').get_attribute('class') or '')
            await page.locator('#layer').select_option('main')
            await page.locator('#relation').select_option('manual')
            await page.locator('#manual').select_option('6')
            assert await page.locator('.ledger-detail').count()==2
            assert await page.locator('.ledger-difference>div').count()==3
            async with page.expect_download() as download_info:
                await page.locator('#export').click()
            download=await download_info.value
            assert download.suggested_filename=='thien-do-demo-12-cung.csv'
            await page.locator('#open').click()
            assert await page.locator('#open').get_attribute('aria-expanded')=='false'
            await page.locator('#open').click()
            assert await page.locator('#open').get_attribute('aria-expanded')=='true'
            dims=await page.evaluate('({screen:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})')
            assert dims['content']<=dims['screen']+2,(width,dims)
            assert not errors,(width,errors)
            report.append({'width':width,'passed':True,'no_horizontal_overflow':True,'interactive_selection':True,'comparison':True,'search':True,'scope':True,'csv_download':True,'collapsible':True})
            await page.close()
        await browser.close()
    ROOT.joinpath('docs/TWELVE_PALACE_LEDGER_BROWSER_EVIDENCE_2026_10_10.json').write_text(json.dumps({'scope':'Offline illustrative preview only. Not full Next.js/NestJS browser E2E.', 'results':report},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Offline preview Chromium: PASS',len(report),'/',len(report),'viewports')
if __name__=='__main__':
    asyncio.run(main())
