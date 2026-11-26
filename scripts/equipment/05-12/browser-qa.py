"""Run in checkout root. XRD_CHROME, XRD_BASE, XRD_SHOTS optionally set."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,time,subprocess,urllib.request
base=os.getenv('XRD_BASE','http://127.0.0.1:4321');url=base+'/simulations/equipment/05-12/simulator/';proc=None
try:
 if '127.0.0.1' in base:
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4321'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/xrd-05-12-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(65):
   try:
    with urllib.request.urlopen(url,timeout=2) as r:assert r.status==200
    break
   except Exception:time.sleep(.4)
 with sync_playwright() as p:
  opts=dict(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  if os.getenv('XRD_CHROME'):opts['executable_path']=os.environ['XRD_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  browser=p.chromium.launch(**opts);ctx=browser.new_context(viewport={'width':1450,'height':950},accept_downloads=True,ignore_https_errors=True);page=ctx.new_page()
  faults=[];page.on('pageerror',lambda e:faults.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=45000);page.wait_for_selector('#xr-model[data-ready=true]',timeout=45000)
  page.locator('#scan').click();assert '4501 points' in page.locator('#status').inner_text()
  page.locator('#ideal').click();assert page.locator('#peaks td').nth(3).inner_text()=='60.0000'
  page.locator('[name=instrumentFwhmDeg]').fill('.3');page.locator('[name=sampleFwhmDeg]').fill('.4');page.locator('#scan').click()
  with page.expect_download() as d:page.locator('#export-json').click()
  result=json.loads(Path(d.value.path()).read_text());a=result['peaks'][0];assert abs(a['centerDeg']-60)<.0025 and abs(a['fwhmDeg']-.5)<.0025
  with page.expect_download() as d:page.locator('#export-csv').click()
  assert 'two_theta_deg,intensity_au' in Path(d.value.path()).read_text()
  page.locator('#door').click();page.locator('#scan').click();assert 'Close the virtual cabinet' in page.locator('#status').inner_text()
  page.locator('#specimen').click();page.locator('#door').click();page.locator('#scan').click();assert 'Seat a virtual specimen' in page.locator('#status').inner_text()
  page.locator('#clear').click();page.locator('#scan').click()
  if os.getenv('XRD_SHOTS'):
   for v in ['outside','inside','rear']:
    page.locator('button[data-view='+v+']').click();page.wait_for_timeout(160);page.locator('#xr-model').screenshot(path='public/equipment/05-12/'+v+'.png')
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not faults;print('PASS GLB, 4501-point silicon, 60° line + broaden to 0.5°, virtual interlocks, JSON/CSV and 390px',a)
finally:
 if proc:proc.terminate();proc.wait()
