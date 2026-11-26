"""Browser acceptance: python browser-smoke.py http://localhost:4411 (or verified origin).
Uses Playwright with installed Chromium, synthetic electronic test fixture only."""
import json, math, os, sys
from playwright.sync_api import sync_playwright
origin=sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://localhost:4411'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for width,height in [(1220,850),(390,844)]:
  pg=b.new_page(viewport={'width':width,'height':height},accept_downloads=True)
  errors=[];pg.on("pageerror",lambda e:errors.append(str(e)))
  pg.goto(origin+'/simulations/equipment/10-01/',wait_until="domcontentloaded",timeout=90000)
  pg.get_by_role("link",name="Open simulator").click()
  pg.wait_for_selector('#mc-view[data-ready="true"]',timeout=100000)
  assert pg.locator('#mc-view canvas').count()==1
  for name in ['Controls','Electronic load','Rear ports','Reset view']:pg.get_by_role('button',name=name,exact=True).click()
  pg.click('#mc-run');assert '16.5 ms' in pg.inner_text('#mc-result') and '13,001' in pg.inner_text('#mc-result')
  with pg.expect_download() as dl:pg.click('#mc-wave')
  w=json.loads(dl.value.path().read_text());assert w['dtS']==1e-5 and w['revision']==1 and len(w['channels'][0]['samples'])==13001 and w['channels'][0]['unit']=='V'
  pg.select_option('#mc-mode','VC');assert pg.is_disabled('#mc-wave');pg.click('#mc-run');assert '19.6078 pA' in pg.inner_text('#mc-result')
  with pg.expect_download() as dl:pg.click('#mc-all')
  r=json.loads(dl.value.path().read_text());assert abs(r['columns']['currentA'][500]*1e12-1000)<1e-6
  pg.click('#mc-load');pg.click('#mc-run');assert 'Connect the PATCH' in pg.inner_text('#mc-status') and pg.is_disabled('#mc-all')
  pg.click('#mc-example');pg.fill('#mc-cmPf','66');pg.click('#mc-run');assert '33 ms' in pg.inner_text('#mc-result')
  pg.click('#mc-power');pg.click('#mc-run');assert 'Power the amplifier' in pg.inner_text('#mc-status')
  pg.click('#mc-example');pg.click('#mc-run');assert pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
  assert not errors,errors
  print(str(width)+'px:',pg.inner_text('#mc-model'),pg.inner_text('#mc-result'),dl.value.suggested_filename)
  if len(sys.argv)>2:pg.locator('.mcc .bench').screenshot(path=sys.argv[2]+'-'+str(width)+'.png')
  pg.close()
 b.close()
