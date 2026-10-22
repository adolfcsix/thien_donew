"""Optional offline preview UX smoke. Requires Python Playwright and Chromium.
This validates the generated illustrative HTML, NOT the production Next.js application.
Run: node infrastructure/scripts/make-insight-dock-preview.cjs
     python tests/insight-dock-browser-smoke.py
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT.joinpath('previews/insight-dock-preview.html').read_text(encoding='utf-8')

async def main():
    evidence = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
        for width in (1440, 1080, 768, 390, 320):
            page = await browser.new_page(viewport={'width': width, 'height': 900})
            errors = []
            page.on('pageerror', lambda err: errors.append(str(err)))
            await page.set_content(HTML, wait_until='load')
            await page.wait_for_selector('.chart-insight-relation')
            assert await page.locator('.preview-board button[data-branch]').count() == 12
            if width in (1440, 390):
                await page.screenshot(path=str(ROOT / f'previews/insight-dock-{width}.png'), full_page=True)
            old = await page.locator('.chart-insight-title h3').inner_text()
            await page.locator('.preview-board button[data-branch]').first.click()
            new = await page.locator('.chart-insight-title h3').inner_text()
            assert old != new, 'selection did not update the dock'
            await page.locator('button[data-scope="single"]').click()
            assert await page.locator('button[data-scope="single"]').get_attribute('aria-pressed') == 'true'
            assert await page.locator('.preview-board .related-tam-hop').count() == 0
            await page.locator('button[data-scope="tu-chinh"]').click()
            assert await page.locator('.preview-board .related-tam-hop').count() == 2
            assert await page.locator('.preview-board .related-doi-cung').count() == 1
            await page.locator('button[data-year="2027"]').click()
            assert await page.locator('.chart-insight-year-stepper output').inner_text() == '2027'
            dims = await page.evaluate('({viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,board:document.querySelector(".preview-board").scrollWidth})')
            assert dims['page'] <= dims['viewport'] + 2, f'horizontal page overflow at {width}: {dims}'
            assert not errors, f'browser exception at {width}: {errors}'
            evidence.append({'viewport_width': width,'horizontal_page_overflow':False,'twelve_palaces':True,'select_palace':True,'switch_focus_scope':True,'annual_navigation':True,'script_errors':errors,'internal_board_scroll_width':dims['board']})
            await page.close()
        await browser.close()
    report = ROOT / 'docs/INSIGHT_DOCK_BROWSER_EVIDENCE_2026_10_10.json'
    report.write_text(json.dumps({'scope':'Offline preview only; not Next.js build or live PostgreSQL E2E','results':evidence},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Insight dock offline Chromium smoke: PASS, 5/5 viewports, 12 palaces, scope and annual navigation.')

if __name__ == '__main__':
    asyncio.run(main())
