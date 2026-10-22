#!/usr/bin/env python3
"""V11.10 isolated HTML preview smoke, not proof of a Next.js production build."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'previews/v1110-classical-families.html').read_text()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in [320,390,768,1024,1440]:
        page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(html,wait_until='load')
        assert page.locator('#samplePicker button').count()==4
        assert page.locator('#palaceNav button').count()==12
        assert page.locator('#classicalPanel').is_visible()
        assert page.locator('#classical details').count()>=1
        for index,title in enumerate(['Cự Nhật','Sát Phá Tham','Tử Phủ Vũ Tướng','Cơ Nguyệt Đồng Lương']):
            page.locator('#samplePicker button').nth(index).click()
            assert page.locator('#classicalPanel').is_visible()
            assert title in page.locator('#classical').inner_text()
            assert 'Các điểm cần xem lại' in page.locator('#classical').inner_text()
            assert page.locator('#palaceTitle').inner_text()=='Cung Mệnh'
        page.locator('#palaceNav button').nth(0).click()
        page.locator('[data-mode="basic"]').click()
        assert page.locator('#deep').is_hidden()
        page.locator('[data-mode="deep"]').click()
        assert page.locator('#deep').is_visible()
        page.locator('#samplePicker button').nth(2).click()
        overflow=page.evaluate('({doc:document.documentElement.scrollWidth,viewport:innerWidth})')
        assert overflow['doc']<=overflow['viewport']+1,(width,overflow)
        assert not errors,errors
        if width in (390,1440):
            page.screenshot(path=str(root/f'previews/v1110-classical-{width}.png'),full_page=True)
        print('PASS',width,'four real charts, Mệnh-only focus, mobile, basic/deep, no JS/overflow')
        page.close()
    browser.close()
