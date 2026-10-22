"""Offline-only Chromium smoke test for V11.23 developer temporal-audit preview.
This does not verify the Next.js website or external calendar correctness.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'previews/v1123-temporal-audit.html').read_text(encoding='utf-8')
with sync_playwright() as p:
    system_chromium=Path('/usr/bin/chromium')
    launch_kwargs={'headless':True,'args':['--no-sandbox']}
    if system_chromium.exists():
        launch_kwargs['executable_path']=str(system_chromium)
    browser=p.chromium.launch(**launch_kwargs)
    for width,height in [(320,750),(390,844),(768,1024),(1024,768),(1440,900),(1600,900)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        # Administrator policy can block file://; injecting local HTML stays fully offline.
        page.set_content(HTML,wait_until='load')
        page.wait_for_selector('#rows tr')
        assert page.locator('#rows tr').count()==201,(width,'year rows')
        page.locator('#yearSearch').fill('2025')
        assert page.locator('#rows tr').count()==1,(width,'year filter')
        page.locator('#yearSearch').fill('')
        page.locator('#leapOnly').check()
        assert page.locator('#rows tr').count()==74,(width,'leap filter')
        page.locator('#leapOnly').uncheck()
        page.locator('#partialOnly').check()
        assert page.locator('#rows tr').count()==1,(width,'partial filter')
        page.locator('#partialOnly').uncheck()
        assert not errors,(width,errors)
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'),(width,'horizontal page overflow')
        if width in (390,1440):
            page.screenshot(path=str(ROOT/f'previews/v1123-audit-{width}.png'),full_page=True)
        print(f'PASS {width}x{height}: 201 rows, filters, no page overflow')
        page.close()
    browser.close()
