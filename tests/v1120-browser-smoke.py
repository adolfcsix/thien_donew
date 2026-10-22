#!/usr/bin/env python3
"""Tests the standalone data-backed HTML preview, NOT the real Next.js build."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v1120-period-timeline.html').read_text(encoding='utf8')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in (320,390,768,1024,1280,1600):
        page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(html,wait_until='load')
        assert page.locator('#years .period-year').count()==12
        assert page.locator('.period-overview-grid > div').count()==3
        assert '2026' in page.locator('.period-current-header').inner_text()
        assert page.locator('#details .period-house-item').count()>=1
        page.locator('button[data-year="2027"]').first.click()
        assert '2027' in page.locator('.period-current-header').inner_text()
        page.locator('#sample').select_option('1')
        assert 'Lá số B' in page.locator('#status').inner_text()
        page.locator('#activeOnly').uncheck()
        assert page.locator('#details .period-house-item').count()==12
        page.locator('#details .period-house-item').first.click()
        assert 'Đã chọn cung' in page.locator('#status').inner_text()
        page.locator('#toggle').click()
        assert page.locator('#period-timeline-content').is_hidden()
        page.locator('#toggle').click()
        assert page.locator('#period-timeline-content').is_visible()
        sizes=page.evaluate('({doc:document.documentElement.scrollWidth,view:window.innerWidth})')
        assert sizes['doc']<=sizes['view']+1,(width,sizes)
        assert not errors,(width,errors)
        if width in (390,1280):
            page.locator('#sample').select_option('0')
            page.locator('button[data-year="2026"]').first.click()
            page.screenshot(path=str(root/f'previews/v1120-period-{width}.png'),full_page=True)
        print(f'PASS {width}px: 12 years, switch, chart, collapse, no overflow, no JS errors')
        page.close()
    browser.close()
