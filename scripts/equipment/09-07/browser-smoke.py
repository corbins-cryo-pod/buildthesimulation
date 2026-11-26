"""Verify actual browser load/run/export. BTS_SITE can be local or production."""
import json, os, pathlib
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('BTS_SITE','http://127.0.0.1:4097').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM',p.chromium.executable_path),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 for width in (1280,390):
  page=b.new_page(viewport={'width':width,'height':900},accept_downloads=True)
  problems=[];page.on('pageerror',lambda e:problems.append(str(e)))
  page.goto(base+'/simulations/equipment/09-07/',wait_until='domcontentloaded',timeout=120000)
  page.get_by_role('link',name='Open simulator →').first.click()
  expect(page.locator('#lcr-model')).to_have_attribute('data-loaded','true',timeout=60000)
  page.locator('#lcr-trigger').click()
  expect(page.locator('#lcr-standards')).to_contain_text('OPEN r1')
  page.locator('#lcr-mount').select_option('short')
  page.locator('#lcr-trigger').click()
  expect(page.locator('#lcr-standards')).to_contain_text('SHORT r2')
  page.locator('#lcr-mount').select_option('dut')
  page.locator('#lcr-trigger').click()
  expect(page.locator('#lcr-result')).to_contain_text('Raw CAL-C1000PF')
  page.locator('#lcr-correct').check()
  page.locator('#lcr-trigger').click()
  expect(page.locator('#lcr-result')).to_contain_text('Corrected CAL-C1000PF · Cs 1,000 pF')
  with page.expect_download() as d:
   page.locator('#lcr-json').click()
  out=json.loads(pathlib.Path(d.value.path()).read_text())
  assert out['schema']=='bts.impedance-sweep.v1' and out['correction']['openRevision']==1 and out['correction']['shortRevision']==2
  assert len(out['rows'])==4 and abs(out['rows'][3]['impedance']['seriesResistanceOhm']-27)<1e-8
  with page.expect_download() as d:
   page.locator('#lcr-csv').click()
  assert pathlib.Path(d.value.path()).read_text().startswith('frequency_Hz,raw_real_ohm')
  page.locator('#lcr-mode').select_option('parallel')
  expect(page.locator('#lcr-result')).to_contain_text('Cp')
  page.locator('#lcr-stray-r').fill('17')
  page.locator('#lcr-stray-r').press('Tab')
  page.locator('#lcr-trigger').click()
  expect(page.locator('#lcr-status')).to_have_attribute('data-error','true')
  expect(page.locator('#lcr-status')).to_contain_text('Store OPEN and SHORT')
  page.get_by_role('button',name='Rear panel').click()
  page.get_by_role('button',name='Fixture close-up').click()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  assert not problems,problems
  print(f'{width}px: GLB, OPEN/SHORT, raw/corrected, 1000 pF proof, JSON/CSV, stale standard and camera controls verified.')
  if width==1280 and os.environ.get('BTS_SCREENSHOT'):page.screenshot(path=os.environ['BTS_SCREENSHOT'],full_page=True)
  page.close()
 b.close()
