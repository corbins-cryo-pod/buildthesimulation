"""Run in repository root; optional SLICESCOPE_CHROME and SLICESCOPE_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,struct
base=os.getenv('SLICESCOPE_BASE','http://127.0.0.1:44883');url=base+'/simulations/equipment/10-05/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('SLICESCOPE_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44883'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/slicescope-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('SLICESCOPE_CHROME'):opt['executable_path']=os.environ['SLICESCOPE_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#scope-model[data-ready=true]',timeout=14000)
  q.locator('#pick').click();assert 'ETCH-A captured' in q.locator('#status').inner_text()
  q.locator('#high').click();q.locator('#pick').click();assert 'ETCH-B captured' in q.locator('#status').inner_text()
  with q.expect_download() as d:q.locator('#out-json').click()
  o=json.loads(Path(d.value.path()).read_text());assert o['target']['zUm']==80 and o['target']['pixel']==[49,26]
  with q.expect_download() as d:q.locator('#out-png').click()
  png=Path(d.value.path()).read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',png[16:24])==(81,61)
  q.locator('#focus').evaluate("(el)=>{el.value=40;el.dispatchEvent(new Event('input',{bubbles:true}))}");q.locator('#pick').click();assert 'No in-focus' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, two planes and mid-plane, JSON and PNG exports, mobile')
finally:
 if proc:proc.terminate();proc.wait()
