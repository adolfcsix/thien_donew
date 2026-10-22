from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[1] / 'previews' / 'traceable-findings-preview.html'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium', args=['--no-sandbox'])
 for width in [1440,1024,768,390,320]:
  page=browser.new_page(viewport={'width':width,'height':930},device_scale_factor=1)
  errors=[]
  page.on('pageerror', lambda e:errors.append(str(e)))
  page.set_content(p.read_text(encoding="utf-8"),wait_until="load")
  page.wait_for_selector('.trace-finding')
  n=page.locator('.trace-finding').count()
  assert n>0,(width,n)
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,page.evaluate('document.documentElement.scrollWidth'))
  page.get_by_role('button',name='Năm xem',exact=False).click()
  year_n=page.locator('.trace-finding').count()
  if year_n==0: assert page.locator('.trace-findings-empty').count()==1
  page.locator('#branch').select_option('2')
  assert page.locator('.trace-finding').count()>0
  page.locator('#year').select_option('2030')
  assert '2030' in page.locator('.trace-year').first.inner_text()
  page.locator('#show-annual').uncheck()
  assert page.locator('.trace-findings-summary').inner_text()
  assert page.get_by_text('Năm 2030',exact=True).count()==0
  page.get_by_role('button',name='Tất cả').click()
  page.locator('.trace-finding-sources summary').first.click()
  assert page.locator('.trace-finding-sources li').count()>0
  page.locator('#branch').select_option('8')
  assert len(errors)==0,(width,errors)
  if width in [1440,390]:
   page.locator('#show-annual').check()
   page.get_by_role('button',name='Tất cả').click()
   page.screenshot(path=str(p.parent/f'trace-findings-{width}.png'),full_page=True)
  print('PASS',width,'no overflow or JS errors', 'cards',n)
  page.close()
 browser.close()
