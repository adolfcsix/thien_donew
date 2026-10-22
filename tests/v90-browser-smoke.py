"""Optional Chromium smoke test for V9.0 standalone calendar preview.
Run: python tests/v90-browser-smoke.py. Needs playwright Python and a Chromium executable.
"""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent

async def run():
    async with async_playwright() as playwright:
        binary = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')
        browser = await playwright.chromium.launch(executable_path=binary, headless=True, args=['--no-sandbox'])
        for width, height in ((1440, 900), (768, 900), (390, 844), (320, 700)):
            page = await browser.new_page(viewport={'width': width, 'height': height})
            errors = []
            page.on('pageerror', lambda err: errors.append(str(err)))
            await page.set_content((ROOT / 'tools/offline/calendar.html').read_text(encoding='utf-8'))
            count = await page.locator('.calendar-date').count()
            assert count >= 28, f'{width}: day count incorrect {count}'
            scroll_width = await page.evaluate('document.documentElement.scrollWidth')
            assert scroll_width <= width, f'{width}: horizontal overflow {scroll_width}'
            await page.locator('#next').click()
            assert len(await page.locator('#month-title').inner_text()) > 5
            await page.locator('#ld').fill('1')
            await page.locator('#lm').select_option('1')
            await page.locator('#ly').fill('2026')
            await page.locator('#convert').click()
            assert '17/2/2026' in await page.locator('#result').inner_text()
            assert not errors, errors
            print(f'{width}x{height}: PASS, days={count}, overflow={scroll_width-width}px')
            await page.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
