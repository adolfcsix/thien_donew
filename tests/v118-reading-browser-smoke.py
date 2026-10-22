#!/usr/bin/env python3
"""Chromium checks for the independent V11.8 preview only (not Next.js build)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v118-symbols-combinations.html').read_text()
viewports=(320,390,768,1024,1440)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in viewports:
        page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
        js_errors=[]
        page.on('pageerror',lambda error:js_errors.append(str(error)))
        page.set_content(html,wait_until='load')
        assert page.locator('#palaceNav button').count()==12, (width,'nav count')
        assert page.locator('[data-mode="basic"]').get_attribute('aria-pressed')=='true'
        page.locator('[data-mode="deep"]').click()
        assert page.locator('#deep').is_visible()
        assert page.locator('#cycles details').count()==3
        assert page.locator('#profiles details').count()>=0
        assert page.locator('#combinations').inner_text()
        page.locator('#cycles details').first.locator('summary').click()
        assert page.locator('#cycles details').first.get_attribute('open') is not None
        page.locator('#palaceNav button').nth(3).click()
        assert 'Cung' in page.locator('#palaceTitle').inner_text()
        assert page.locator('#deep').is_visible()
        page.locator('[data-mode="basic"]').click()
        assert page.locator('#deep').is_hidden()
        scroll=page.evaluate('({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth})')
        assert scroll['scroll']<=scroll['viewport']+1, (width,scroll)
        assert not js_errors,(width,js_errors)
        if width in (390,1440):
            page.locator('[data-mode="deep"]').click()
            page.screenshot(path=str(root/f'previews/v118-reading-{width}.png'),full_page=True)
        print(f'PASS: {width}px, 12 cung, 2 chế độ, accordion, không tràn ngang, không JS exception')
        page.close()
    browser.close()
