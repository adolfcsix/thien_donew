"""Desktop/mobile smoke test for the generated standalone preview, NOT production Next.js."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v1119-new-star-library.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for w,h in [(320,760),(390,844),(720,900),(1024,900),(1440,1000),(1600,1000)]:
        page=browser.new_page(viewport={'width':w,'height':h})
        errors=[]
        page.on('pageerror',lambda exc: errors.append(str(exc)))
        page.set_content(html,wait_until='domcontentloaded')
        page.wait_for_selector('.house')
        assert page.locator('.house').count()==12,(w,page.locator('.house').count())
        page.locator('#search').fill('Thiên Không')
        assert page.locator('.house.related').count()>=1,w
        page.locator('#search').fill('')
        page.locator('.house').first.click()
        assert page.locator('#panel-title').inner_text().startswith('Cung '),w
        page.locator('#case').select_option('1')
        page.locator('#year').select_option('2027')
        assert '2027' in page.locator('#year-note').inner_text(),w
        page.locator('#toggle').click()
        assert page.locator('#toggle').get_attribute('aria-pressed')=='false',w
        overflow=page.evaluate('document.documentElement.scrollWidth > window.innerWidth+2')
        assert not overflow,w
        assert not errors,(w,errors)
        if w==1440:
          page.locator('#toggle').click()
          page.locator('#case').select_option('0')
          page.screenshot(path=str(root/'previews/v1119-desktop-1440.png'),full_page=True)
          lines=page.locator('#links line').count()
          assert lines==3,(w,lines)
        if w==390:
          page.locator('#toggle').click()
          page.locator('#case').select_option('0')
          page.screenshot(path=str(root/'previews/v1119-mobile-390.png'),full_page=True)
        print('PASS browser',w,'x',h)
        page.close()
    browser.close()
