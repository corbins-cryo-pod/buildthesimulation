"""Run at repo root; optional PM100D_CHROME and PM100D_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,shlex
base=os.getenv('PM100D_BASE','http://127.0.0.1:44936');url=base+'/simulations/equipment/11-05/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('PM100D_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44936'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/pm100d-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',*shlex.split(os.getenv('PM100D_CHROME_ARGS',''))])
  if os.getenv('PM100D_CHROME'):opt['executable_path']=os.environ['PM100D_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#pm100d-model[data-ready=true]',timeout=14000)
  status=q.locator('#status')
  assert '100 µW' in status.inner_text()
  q.locator('[data-view=rear]').click()
  q.locator('#unit').select_option('dBm');assert '−10 dBm' in status.inner_text()
  q.locator('#value').select_option('reference');assert '0 dBm' in status.inner_text()
  q.locator('#value').select_option('zero');assert 'Zero has no finite dBm value' in status.inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['fixed']['revision']=='1' and j['reading']['value'] is None
  q.locator('#unit').select_option('W');assert ' = 0 W.' in status.inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, camera, valid conversion, zero boundary, JSON and mobile')
finally:
 if proc:proc.terminate();proc.wait()
