"""Real Chromium smoke for the independently generated V11.11 preview, not the Next.js app."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'previews' / 'v1111-menh-than-adjacent.html').read_text(encoding='utf-8')
OUT = ROOT / 'previews'

def check():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        for width, height in [(320, 760), (390, 844), (768, 1024), (1024, 900), (1440, 900)]:
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.set_content(HTML, wait_until='load')
            page.locator('#palaceNav button').first.wait_for()
            assert page.locator('#menhThan').inner_text().strip(), f'Missing Mệnh–Thân at {width}'
            assert page.locator('#adjacentPanel').count() == 1
            assert page.locator('#samplePicker button').count() == 4
            assert page.locator('#palaceNav button').count() == 12
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'Horizontal overflow {width}'
            assert not errors, f'JS errors {errors}'
            if width == 1440:
                page.screenshot(path=str(OUT / 'v1111-menh-than-desktop-1440.png'), full_page=True)
            if width == 390:
                page.screenshot(path=str(OUT / 'v1111-menh-than-mobile-390.png'), full_page=True)
            # navigate sample 1980 04:00, and a house with Xương–Khúc giáp
            page.locator('#samplePicker button').nth(1).click()
            btn=page.locator('#palaceNav button').filter(has_text='Tử Tức')
            btn.click()
            assert 'Xương – Khúc giáp cung' in page.locator('#adjacent').inner_text()
            assert 'Kề trước' in page.locator('#adjacent').inner_text()
            assert 'Kề sau' in page.locator('#adjacent').inner_text()
            page.locator('button[data-mode="basic"]').click()
            assert page.locator('#deep').is_hidden()
            page.locator('button[data-mode="deep"]').click()
            assert page.locator('#deep').is_visible()
            assert not errors, f'JS errors after nav {errors}'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'Overflow after nav {width}'
            print('PASS Chromium',width, 'nav/sample/mode/giap/no overflow/no JS error')
            page.close()
        browser.close()
if __name__=='__main__':check()
