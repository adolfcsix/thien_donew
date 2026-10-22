"""Optional browser smoke for retained V9.8 Bát Tự preview. Not a Next.js smoke test.
Run python tests/browser-v99.py with Playwright and Chromium installed.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'tools/offline/bazi.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,900),(768,1024),(390,844),(320,780)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(html,wait_until='load')
        page.wait_for_timeout(150)
        assert page.locator('#master').inner_text()!='—'
        assert page.locator('#hour-hidden').inner_text()!=''
        initial=page.locator('#day-stem').inner_text()
        page.locator('#hour').fill('23')
        page.locator('#calculate').click()
        page.locator('#boundary').select_option('late-zi')
        page.locator('#calculate').click()
        assert page.locator('#day-stem').inner_text()!='—'
        assert page.locator('#day-stem').inner_text()!=initial
        page.locator('#sex').select_option('female')
        page.locator('#calculate').click()
        assert not errors,errors
        overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
        assert not overflow, f'Unexpected horizontal overflow at {width}px'
        print(f'{width}px: PASS: day boundary change, sex change, hidden stems, no overflow, JS errors={len(errors)}')
        page.close()
    browser.close()
