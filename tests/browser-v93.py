from playwright.sync_api import sync_playwright
from pathlib import Path
base=Path(__file__).resolve().parents[1]
url=(base/'tools/offline/good-days.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1440,900),(768,1024),(390,844),(320,750)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
  page.set_content((base/'tools/offline/good-days.html').read_text(encoding='utf-8'),wait_until='load');page.wait_for_timeout(250)
  print('VIEW',width,'title',page.title(),'count',page.locator('.day').count(),'xscroll',page.evaluate('document.documentElement.scrollWidth>innerWidth'),'errors',errors)
  assert not errors
  assert page.locator('.day').count()==31
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.locator('#purpose').select_option('cuoi-hoi');assert page.locator('#purpose-label').inner_text()=='CƯỚI HỎI'
  page.locator('#next').click();assert '11 / 2026' in page.locator('#month').inner_text();assert page.locator('.day').count()==30
  page.locator('.day').nth(7).click(); assert '08 / 11 / 2026' in page.locator('#full-date').inner_text()
  page.locator('#prev').click();assert '10 / 2026' in page.locator('#month').inner_text()
  if width==1440: page.screenshot(path=str(base/'previews/v93-good-days-desktop.png'),full_page=True)
  if width==390: page.screenshot(path=str(base/'previews/v93-good-days-mobile.png'),full_page=True)
  page.close()
 browser.close()
