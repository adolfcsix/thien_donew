"""Standalone HTML visual interaction smoke checks; not a Next.js runtime E2E."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / 'previews/star-study-guide-preview.html'
with sync_playwright() as pl:
    browser=pl.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    checked=[]
    for width,height in [(1440,900),(1024,800),(768,900),(390,844),(320,700)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(PREVIEW.read_text(encoding='utf8'),wait_until='load')
        assert page.locator('#star option').count()==14,width
        assert page.locator('#palace option').count()==12,width
        assert page.locator('#branch option').count()==13,width
        assert page.locator('.star-study-grid article').count()==4,width
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+3'),(width,'horizontal overflow')
        page.locator('[data-star="Vũ Khúc"]').click()
        assert 'Vũ Khúc tại cung Tài Bạch' in page.locator('#study-heading').inner_text()
        assert 'Thân' in page.locator('#summary').inner_text()
        page.locator('#palace').select_option('Quan Lộc')
        assert 'Quan Lộc' in page.locator('#study-heading').inner_text()
        page.locator('#branch').select_option('all')
        assert 'Chưa chọn' in page.locator('#summary').inner_text()
        assert not errors,(width,errors)
        if width in (1440,390):
            page.locator('[data-star="Tử Vi"]').click()
            page.screenshot(path=str(ROOT / f'previews/star-study-{width}.png'),full_page=True)
        checked.append(width)
        page.close()
    # URL percent-encoding is exhaustively covered by Node regression tests.
    browser.close()
print('Independent preview browser smoke PASS:',checked)
