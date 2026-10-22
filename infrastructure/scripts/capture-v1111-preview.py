from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/'previews/v1111-menh-than-adjacent.html').read_text('utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':850},device_scale_factor=1)
    page.set_content(HTML,wait_until='load')
    page.locator('#samplePicker button').nth(1).click()
    page.locator('#palaceNav button').filter(has_text='Tử Tức').click()
    page.locator('#adjacentPanel').scroll_into_view_if_needed()
    page.screenshot(path='/mnt/data/THIEN_DO_V11_11_GIAP_CUNG_DESKTOP.png')
    page.locator('#menhThanPanel').scroll_into_view_if_needed()
    page.screenshot(path='/mnt/data/THIEN_DO_V11_11_MENH_THAN_DESKTOP.png')
    page.close()
    browser.close()
