"""Run at repo root; optional NANO_CHROME and NANO_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('NANO_BASE','http://127.0.0.1:44924');url=base+'/simulations/equipment/04-05/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('NANO_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44924'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/nano-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('NANO_CHROME'):opt['executable_path']=os.environ['NANO_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#nano-model[data-ready=true]',timeout=14000)
  assert 'X +55 mm, Y +25 mm' in q.locator('#status').inner_text()
  q.locator('#rotate').click();assert 'X −75 mm, Y +155 mm' in q.locator('#status').inner_text()
  q.locator('#frame').select_option('wide');assert 'X +75 mm, Y +155 mm' in q.locator('#status').inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['comparison']['contained'] and j['comparison']['signedSideMarginsMm']==[75,155]
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, rotate and chart change, JSON export, mobile')
finally:
 if proc:proc.terminate();proc.wait()
