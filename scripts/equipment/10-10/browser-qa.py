"""Run at repo root; optional OE3_CHROME and OE3_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('OE3_BASE','http://127.0.0.1:44895');url=base+'/simulations/equipment/10-10/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('OE3_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44895'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/oe3-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('OE3_CHROME'):opt['executable_path']=os.environ['OE3_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#acq-model[data-ready=true]',timeout=14000)
  q.locator('#run').click();assert '4 missing samples' in q.locator('#status').inner_text() and 'counter 1010' in q.locator('#status').inner_text()
  assert q.locator('#rows tr.gap').count()==4
  with q.expect_download() as d:q.locator('#csv').click()
  assert '1010,0.01,10,110,0,edge-01' in Path(d.value.path()).read_text()
  with q.expect_download() as d:q.locator('#json').click()
  o=json.loads(Path(d.value.path()).read_text());assert o['markers'][0]['counter']==1010 and o['samples'][4]['valuesMv'] is None
  q.locator('#gap').click();q.locator('#run').click();assert '0 missing samples' in q.locator('#status').inner_text()
  q.locator('#import').set_input_files('public/equipment/10-10/example-input.json')
  q.wait_for_function("document.querySelector('#gap').textContent==='Use built-in gap fixture'")
  q.locator('#run').click();assert '4 missing samples' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, original gap+marker, restore, local import, JSON/CSV exports and mobile')
finally:
 if proc:proc.terminate();proc.wait()
