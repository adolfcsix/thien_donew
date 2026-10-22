from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v1121-temporal-explorer.html').read_text(encoding='utf-8')
shots=root/'previews'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for w,h in [(320,740),(390,844),(768,1024),(1024,768),(1440,900),(1600,900)]:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(html,wait_until='load')
        assert page.locator('#lunar').inner_text()=='1/1/2025', (w,'initial')
        page.locator('#month').select_option('6-1')
        assert page.locator('#solar').inner_text()=='25/07/2025', (w,'leap date')
        page.locator('#day').select_option('15')
        assert page.locator('#lunar').inner_text()=='15/6 nhuận/2025'
        page.locator('#hour').select_option('23')
        assert page.locator('#branch').inner_text()=='Giờ Tý'
        assert page.locator('#boundary').is_visible()
        page.locator('[data-year="2026"]').click()
        assert page.locator('#summary').inner_text().startswith('2026')
        assert page.locator('#month option').count()==12
        assert page.locator('#boundary').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'), (w,'horizontal overflow')
        assert not errors,(w,errors)
        if w==1440:
            page.locator('[data-year="2025"]').click();page.locator('#month').select_option('6-1')
            page.screenshot(path=str(shots/'v1121-temporal-desktop-1440.png'),full_page=True)
        if w==390:
            page.locator('[data-year="2025"]').click();page.locator('#month').select_option('6-1')
            page.screenshot(path=str(shots/'v1121-temporal-mobile-390.png'),full_page=True)
        page.close()
        print('PASS',w,h)
    browser.close()
