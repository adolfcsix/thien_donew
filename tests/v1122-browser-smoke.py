from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PAGE=(ROOT/'previews/v1122-subannual-reference.html').read_text(encoding='utf-8')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,390,768,1024,1440,1600]:
  page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(PAGE,wait_until='load')
  assert page.locator('#research').is_hidden(),(width,'visible without optin')
  assert page.locator('#lmonth').inner_text()==''
  page.locator('#researchToggle').check()
  assert page.locator('#research').is_visible()
  assert page.locator('#lmonth').inner_text()
  old=page.locator('#lmonth').inner_text()
  page.locator('#month').select_option('6-1') if page.locator('#month option[value="6-1"]').count() else None
  page.locator('#day').select_option('15')
  page.locator('#hour').select_option('23')
  assert page.locator('#lhour').inner_text()
  page.locator('[data-year="2026"]').click()
  assert page.locator('#lmonth').inner_text()
  page.locator('#researchToggle').uncheck()
  assert page.locator('#research').is_hidden()
  if width==1440: page.locator('#researchToggle').check();page.screenshot(path=str(ROOT/'previews/v1122-subannual-desktop.png'),full_page=True)
  if width==390: page.locator('#researchToggle').check();page.screenshot(path=str(ROOT/'previews/v1122-subannual-mobile.png'),full_page=True)
  docwidth=page.evaluate('document.documentElement.scrollWidth')
  assert docwidth<=width+1,(width,docwidth)
  assert not errors,(width,errors)
  print(f'PASS Chromium width {width}, no overflow, toggle, changed date/year')
  page.close()
 browser.close()
