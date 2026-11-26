"""Run at repo root; optional KOPF_CHROME and KOPF_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,shlex
base=os.getenv('KOPF_BASE','http://127.0.0.1:44938');url=base+'/simulations/equipment/15-01/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('KOPF_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44938'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/kopf-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',*shlex.split(os.getenv('KOPF_CHROME_ARGS',''))])
  if os.getenv('KOPF_CHROME'):opt['executable_path']=os.environ['KOPF_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#kopf-model[data-ready=true]',timeout=14000)
  status=q.locator('#status')
  assert 'area 24.00 square units' in status.inner_text()
  q.locator('[data-view=side]').click()
  q.locator('#shape').select_option('wide');assert '21.33 square units' in status.inner_text()
  q.locator('#labels').click();assert q.locator('#labels').get_attribute('aria-pressed')=='false' and '21.33 square units' in status.inner_text()
  q.locator('#shape').select_option('flat');assert 'area 0.00 square units' in status.inner_text()
  q.locator('#shape').select_option('impossible');assert 'gap 1 unit' in status.inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['card']['revision']=='1' and j['illustration']['area'] is None
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, camera, known triangles, flat/impossible edge, JSON, mobile')
finally:
 if proc:proc.terminate();proc.wait()
