"""Run at repo root; optional OCTO_CHROME and OCTO_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,shlex
base=os.getenv('OCTO_BASE','http://127.0.0.1:44932');url=base+'/simulations/equipment/07-08/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('OCTO_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44932'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/octo-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',*shlex.split(os.getenv('OCTO_CHROME_ARGS',''))])
  if os.getenv('OCTO_CHROME'):opt['executable_path']=os.environ['OCTO_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#octo-model[data-ready=true]',timeout=14000)
  status=q.locator('#status')
  assert '1629.17 mm²' in status.inner_text() and '90.03%' in status.inner_text()
  q.locator('[data-view=front]').click()
  q.locator('#overlay').click();assert '1629.17 mm²' in status.inner_text() and q.locator('#overlay').get_attribute('aria-pressed')=='false'
  q.locator('#shape').select_option('square');assert '1152.00 mm²' in status.inner_text()
  q.locator('#shape').select_option('disk');assert '100.00%' in status.inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['card']['revision']=='1' and j['comparison']['uncoveredMm2']==0
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, 3D camera, static shape selection, overlay, JSON and mobile')
finally:
 if proc:proc.terminate();proc.wait()
