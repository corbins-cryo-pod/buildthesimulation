"""Local or production browser flow; install Playwright + system Chromium."""
import json, os, pathlib, re
from playwright.sync_api import sync_playwright, expect
base=os.environ.get('BTS_SITE','http://127.0.0.1:4096').rstrip('/')
scope=os.environ.get('BTS_TEST_SCOPE')=='1'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
 for viewport in ({'width':1280,'height':900},{'width':390,'height':844}):
  page=browser.new_page(viewport=viewport,accept_downloads=True)
  issues=[]
  page.on('pageerror',lambda error:issues.append(str(error)))
  page.goto(base+'/simulations/equipment/09-06/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name=re.compile('Open simulator',re.I)).first.click()
  expect(page.locator('#gen-3d-status')).to_have_attribute('data-loaded','true',timeout=60000)
  page.locator('#gen-capture').click()
  expect(page.locator('#gen-result')).to_contain_text('1.0000 Vpp')
  expect(page.locator('#gen-result')).to_contain_text('2.500 mW')
  with page.expect_download() as d:
   page.locator('#gen-json').click()
  record=json.loads(pathlib.Path(d.value.path()).read_text())
  assert record['schema']=='bts.analog-waveform.v1' and record['channels'][0]['unit']=='V'
  assert len(record['channels'][0]['samples'])==8192
  page.locator('#gen-load').select_option('high')
  page.locator('#gen-capture').click()
  expect(page.locator('#gen-result')).to_contain_text('2.0000 Vpp')
  expect(page.locator('#gen-actual')).to_contain_text('mismatch')
  page.locator('#gen-reference').select_option('high')
  expect(page.locator('#gen-amp')).to_have_value('2')
  page.locator('#gen-capture').click()
  expect(page.locator('#gen-result')).to_contain_text('2.0000 Vpp')
  with page.expect_download() as d:
   page.locator('#gen-csv').click()
  assert pathlib.Path(d.value.path()).read_text().startswith('time_s,CH1_V\n0,0\n')
  # Exercise error handling and reset example.
  page.locator('#gen-output0').click()
  page.locator('#gen-capture').click()
  expect(page.locator('#gen-status')).to_have_attribute('data-error','true')
  page.locator('#gen-example').click()
  page.get_by_role('button',name='Rear ports').click()
  page.get_by_role('button',name='Output close-up').click()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
  assert not issues, issues
  print(f"{viewport['width']} px viewport: GLB, panel targets, 50Ω/open, dual exports, error and camera controls verified.")
  if viewport['width']>1000 and os.environ.get('BTS_SCREENSHOT'):
   page.screenshot(path=os.environ['BTS_SCREENSHOT'],full_page=True)
 if scope:
  page=browser.new_page()
  page.goto(base+'/simulations/equipment/09-04/simulator/?from=09-06',wait_until='domcontentloaded',timeout=60000)
  print('Scope entry status',page.url)
 browser.close()
