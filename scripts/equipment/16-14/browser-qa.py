"""Run at repo root; optional BLIND_CHROME and BLIND_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('BLIND_BASE','http://127.0.0.1:44866');url=base+'/simulations/equipment/16-14/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('BLIND_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44866'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/blind-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('BLIND_CHROME'):opt['executable_path']=os.environ['BLIND_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#fixture-model[data-ready=true]',timeout=14000)
  A=q.locator('[data-station=station-A]');B=q.locator('[data-station=station-B]')
  q.locator('#both').click();assert A.get_attribute('data-ready')==B.get_attribute('data-ready')=='true'
  q.locator('#toggle-a').click();assert A.get_attribute('data-ready')=='false' and B.get_attribute('data-ready')=='true'
  q.locator('#wrong').click();assert 'Blocked' in q.locator('#status').inner_text() and 'revision 3' in q.locator('#rev').inner_text()
  q.locator('#toggle-a').click();assert A.get_attribute('data-ready')=='true' and 'blind-A-to-station-A' in A.inner_text()
  with q.expect_download() as d:q.locator('#export').click()
  a=json.loads(Path(d.value.path()).read_text());assert a['ledgerRevision']==4 and all(x['ready'] for x in a['readiness'])
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, independent blind marker, wrong-key guard, restoration, export and mobile')
finally:
 if proc:proc.terminate();proc.wait()
