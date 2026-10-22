"""Optional browser regression for retained *standalone HTML* previews, not Next.js.
Usage: python tests/deep-browser-smoke.py (requires Python Playwright + Chromium).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os
ROOT=Path(__file__).resolve().parents[1]
PAGES={
    'Bát Tự': ('tools/offline/bazi.html', '#master', '#calculate'),
    'Lịch vạn niên': ('tools/offline/calendar.html', '#month-title', '#next'),
    'Xem ngày tốt': ('tools/offline/good-days.html', '#days', '#next'),
}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    checks=[]
    for width,height in [(1440,900),(768,1024),(390,844),(320,760)]:
        for name,(filename,marker,action) in PAGES.items():
            page=browser.new_page(viewport={'width':width,'height':height})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.set_content((ROOT/filename).read_text(encoding='utf-8'),wait_until='load')
            assert page.locator(marker).count()==1, (name,marker)
            if name=='Bát Tự':
                assert page.locator('#master').inner_text()!='—'
                original=page.locator('#day-stem').inner_text()
                page.locator('#hour').fill('23')
                page.locator('#calculate').click()
                page.locator('#boundary').select_option('late-zi')
                page.locator('#calculate').click()
                assert page.locator('#day-stem').inner_text()!=original
                page.locator('#sex').select_option('female')
                page.locator('#calculate').click()
                assert page.locator('#luck-cycles').locator('.bz-luck-item').count()==8
            elif name=='Lịch vạn niên':
                assert page.locator('#dates').locator('*').count()>28
                before=page.locator('#month-title').inner_text()
                page.locator('#next').click()
                assert page.locator('#month-title').inner_text()!=before
                page.locator('#ly').fill('2026')
                page.locator('#lm').select_option('1')
                page.locator('#ld').fill('1')
                page.locator('#convert').click()
                assert '17/2/2026' in page.locator('#result').inner_text()
            else:
                page.locator('#months').select_option('3')
                page.locator('#purpose').select_option('cuoi-hoi')
                assert page.locator('#days').locator('*').count()>20
                page.locator('#next').click()
                page.locator('#filter').select_option('all')
            assert not errors, (name,width,errors)
            overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
            assert not overflow,(name,width,'horizontal overflow')
            checks.append(f'{name}: {width}px PASS')
            page.close()
    browser.close()
for check in checks:print(check)
print(f'ALL {len(checks)} preview/browser cases PASS (offline HTML only)')
