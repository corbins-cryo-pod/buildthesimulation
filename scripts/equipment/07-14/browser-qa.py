"""Run at repo root; optional TSX_CHROME and TSX_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,shlex
base=os.getenv('TSX_BASE','http://127.0.0.1:44934');url=base+'/simulations/equipment/07-14/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('TSX_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44934'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/tsx-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',*shlex.split(os.getenv('TSX_CHROME_ARGS',''))])
  if os.getenv('TSX_CHROME'):opt['executable_path']=os.environ['TSX_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#tsx-model[data-ready=true]',timeout=14000)
  status=q.locator('#status')
  assert '1600 mm² (same)' in status.inner_text() and '200 mm (+40 mm)' in status.inner_text()
  q.locator('[data-view=rear]').click()
  q.locator('#rotate').click();assert status.inner_text().startswith('20 × 80 mm') and '200 mm (+40 mm)' in status.inner_text()
  q.locator('#shape').select_option('rectangle');assert '1500 mm² (−100 mm²)' in status.inner_text() and '160 mm (same)' in status.inner_text()
  q.locator('#shape').select_option('square');assert status.inner_text().count('(same)')==2
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['reference']['revision']=='1' and j['comparison']['differenceAreaMm2']==0
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, camera, invariants under rotation, comparison, JSON and mobile')
finally:
 if proc:proc.terminate();proc.wait()
