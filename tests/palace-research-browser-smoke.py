"""Optional visual smoke: python tests/palace-research-browser-smoke.py.

Run after node infrastructure/scripts/make-palace-research-preview.mjs.
The HTML is populated from real engine results, but is *not* a Next.js build.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'previews' / 'palace-research-preview.html').read_text(encoding='utf-8')
OUTPUT = ROOT / 'previews'


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        try:
            for width in (1440, 1024, 768, 390, 320):
                page = await browser.new_page(viewport={'width': width, 'height': 900}, device_scale_factor=1)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.set_content(HTML, wait_until='load')
                await page.wait_for_selector('.palace')
                assert await page.locator('.palace').count() == 4
                assert not errors, (width, errors)
                assert not await page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), f'horizontal overflow: {width}'
                await page.locator('#year').select_option('2027')
                assert await page.locator('#year-label').inner_text()
                await page.locator('.focus-btn').first.click()
                assert await page.locator('.palace').count() == 4
                await page.locator('#annual').uncheck()
                assert await page.get_by_text('Tứ Hóa năm xem 2027').count() == 0
                await page.locator('#annual').check()
                assert await page.get_by_text('Tứ Hóa năm xem 2027').count() == 4
                if width in (1440, 390):
                    await page.locator('#year').select_option('2026')
                    await page.screenshot(path=str(OUTPUT / f'palace-research-{width}.png'), full_page=True)
                print(f'PASS {width}px: 4 cards, zero overflow or JS errors, year/annual/selection changes')
                await page.close()
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
