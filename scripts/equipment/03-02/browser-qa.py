"""Run at repo root; optional AUTO306_CHROME and AUTO306_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('AUTO306_BASE','http://127.0.0.1:44871');url=base+'/simulations/equipment/03-02/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('AUTO306_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44871'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/auto306-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('AUTO306_CHROME'):opt['executable_path']=os.environ['AUTO306_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#instrument-model[data-ready=true]',timeout=14000)
  q.locator('#run').click();assert '0 nm' in q.locator('#status').inner_text();assert q.locator('#maps td').count()==18
  q.locator('#cutaway').click();assert 'Show glass' in q.locator('#cutaway').inner_text()
  q.locator('#focus-r').click();assert 'muted' in q.locator('[data-coupon=L]').get_attribute('class')
  with q.expect_download() as d:q.locator('#export').click()
  i=json.loads(Path(d.value.path()).read_text());assert i['comparison']['maxMirrorDeltaNm']==0 and i['coupons']['R']['matrixNm'][1]==[86,82,77]
  q.locator('#blank').click();assert '0 nm increment' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, mirror maps and blank, cutaway/focus, JSON export and mobile')
finally:
 if proc:proc.terminate();proc.wait()
