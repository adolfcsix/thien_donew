"""Chromium smoke tests for the independent HTML preview, NOT a Next.js browser test.
Requires playwright + chromium locally. Run: python tests/atlas-browser-smoke.py
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PREVIEW=ROOT/'previews/atlas-professional-preview.html'
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    verified=[]
    for width,height in [(1440,900),(1024,850),(768,900),(390,844),(320,700)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(PREVIEW.read_text(encoding='utf-8'),wait_until='load')
        assert page.locator('.atlas-house').count()==12,(width,'palace count')
        assert page.locator('.atlas-center-data>div').count()==8,(width,'center data')
        assert page.locator('#relations .atlas-relation-link').count()==3,(width,'branch relations')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+3'),(width,'overflow')
        if width==1440:
            palace=page.locator('#selected-title').inner_text()
            page.locator('#relations .atlas-relation-link').first.click()
            assert page.locator('#selected-title').inner_text()!=palace
            page.locator('#query').fill('tu vi')
            assert '1/12' in page.locator('#search-count').inner_text()
            page.locator('#clear').click()
            page.locator('#year').select_option('2027')
            assert '2027' in page.locator('.atlas-center-data').inner_text()
            page.locator('#theme').click()
            assert page.locator('#app').evaluate('el=>el.classList.contains("light")')
        if width==390:
            page.locator('#board-btn').click()
            assert page.locator('#board').is_visible()
            page.locator('#list-btn').click()
            assert page.locator('#list .chart-palace-list-item').count()==12
        assert not errors,(width,errors)
        verified.append(width)
        page.close()
    browser.close()
print('Atlas standalone HTML Chromium checks passed:',verified)
