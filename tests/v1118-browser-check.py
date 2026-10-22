#!/usr/bin/env python3
"""Standalone Chromium smoke for V11.18 preview (not a Next.js production build)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
url=(root/'previews/v1118-derived-stars.html').resolve().as_uri()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(320,800),(390,844),(768,1100),(1024,850),(1440,1050),(1600,1020)]:
  ctx=b.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
  page=ctx.new_page()
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('about:blank');page.set_content((root/'previews/v1118-derived-stars.html').read_text());page.wait_for_selector('.house')
  assert page.locator('.house').count()==12
  assert page.locator('[data-star="Thiên Tài"]').count()>=0
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'), f'horizontal overflow at {width}'
  assert not errors,(width,errors)
  if width==1440:
   page.locator('#search').fill('Thiên Tài')
   assert page.locator('.house.related').count()>=1
   page.locator('#search').fill('')
   page.locator('#case').select_option('1')
   page.locator('#year').select_option('2027')
   page.locator('.house').first.click()
   assert page.locator('#panel-title').inner_text().startswith('Cung')
   page.locator('#case').select_option('0')
   page.locator('.house').first.hover()
   assert page.locator('#links line').count()==3
   page.screenshot(path=str(Path('/mnt/data/THIEN_DO_V11_18_DESKTOP.png')),full_page=True)
  if width==390:
   page.screenshot(path=str(Path('/mnt/data/THIEN_DO_V11_18_MOBILE.png')),full_page=True)
  print('PASS',width,'12 palaces, no overflow, no JS errors')
  ctx.close()
 b.close()
