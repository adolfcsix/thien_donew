#!/usr/bin/env python3
"""Browser smoke tests for standalone V11.9 HTML preview; not a Next.js test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v119-interpalace-patterns.html').read_text()
viewports=(320,390,768,1024,1440)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in viewports:
        page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
        js_errors=[]
        page.on('pageerror',lambda err:js_errors.append(str(err)))
        page.set_content(html,wait_until='load')
        assert page.locator('#palaceNav button').count()==12
        assert page.locator('[data-mode="deep"]').get_attribute('aria-pressed')=='true'
        assert page.locator('#deep').is_visible()
        assert page.locator('#relationships details').count()>0, 'expected real engine placement to match at least one pattern'
        assert 'Tam hợp' in page.locator('#relationships').inner_text()
        assert 'Địa' in page.locator('#relationships').inner_text() or 'Tả' in page.locator('#relationships').inner_text()
        assert page.locator('#relationships details').first.locator('li').count()>=2
        page.locator('#palaceNav button').nth(0).click()
        assert page.locator('#palaceTitle').inner_text().startswith('Cung ')
        page.locator('[data-mode="basic"]').click()
        assert page.locator('#deep').is_hidden()
        page.locator('[data-mode="deep"]').click()
        assert page.locator('#deep').is_visible()
        overflow=page.evaluate('({doc:document.documentElement.scrollWidth,viewport:innerWidth})')
        assert overflow['doc']<=overflow['viewport']+1,(width,overflow)
        assert not js_errors,js_errors
        if width in (390,1440):
            # Back to a real matching palace for screenshots
            page.locator('#palaceNav button').nth(3).click()
            page.screenshot(path=str(root/f'previews/v119-reading-{width}.png'),full_page=True)
        print(f'PASS: {width}px — 12 cung, liên cung, Cơ bản/Chuyên sâu, no overflow/JS errors')
        page.close()
    browser.close()
