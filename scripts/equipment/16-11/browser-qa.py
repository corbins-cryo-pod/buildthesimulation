"""Run from repo root; optional HANDLING_CHROME and HANDLING_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('HANDLING_BASE','http://127.0.0.1:4352');url=base+'/simulations/equipment/16-11/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4352'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/handling-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('HANDLING_CHROME'):opt['executable_path']=os.environ['HANDLING_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errs=[];q.on('pageerror',lambda e:errs.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#handling-model[data-ready=true]',timeout=14000)
  q.locator('#place-fit').click();assert 'A02' in q.locator('[data-wafer=W100-01]').inner_text()
  q.locator('#place-small').click();assert '25 mm wider' in q.locator('#status').inner_text() and 'revision 1' in q.locator('#ledger').inner_text()
  with q.expect_download() as d:q.locator('#export').click()
  a=json.loads(Path(d.value.path()).read_text());assert a['lastAttempt']['code']=='size-mismatch' and a['wafers'][0]['siteId']=='cassette-100-A02' and a['wafers'][0]['orientationDeg']==30
  q.locator('#empty-source').click();assert 'source is empty' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errs;print('PASS GLB, compatible slot, block undersized/empty source, JSON custody export, mobile')
finally:
 if proc:proc.terminate();proc.wait()
