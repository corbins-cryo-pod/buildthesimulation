"""Run at repo root; optional MINIMITE_CHROME and MINIMITE_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('MINIMITE_BASE','http://127.0.0.1:44879');url=base+'/simulations/equipment/03-09/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('MINIMITE_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44879'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/minimite-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('MINIMITE_CHROME'):opt['executable_path']=os.environ['MINIMITE_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#instrument[data-ready=true]',timeout=14000)
  q.locator('#check').click();assert '1.566 mm' in q.locator('#status').inner_text()
  q.locator('#carrier').select_option('large');q.locator('#check').click();assert 'Blocked' in q.locator('#status').inner_text()
  with q.expect_download() as d:q.locator('#export').click()
  o=json.loads(Path(d.value.path()).read_text());assert o['result']['outcome']=='blocked' and o['inspectionRevision']==2
  q.locator('#carrier').select_option('touch');q.locator('#check').click();assert 'Touches boundary' in q.locator('#status').inner_text()
  q.locator('#cutaway').click();assert 'Show exterior' in q.locator('#cutaway').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, positive/negative/touch, cutaway, export and mobile')
finally:
 if proc:proc.terminate();proc.wait()
