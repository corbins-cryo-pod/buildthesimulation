"""Run at repo root; optional HYDRA_CHROME and HYDRA_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,struct
base=os.getenv('HYDRA_BASE','http://127.0.0.1:44920');url=base+'/simulations/equipment/13-03/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('HYDRA_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44920'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/hydra-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('HYDRA_CHROME'):opt['executable_path']=os.environ['HYDRA_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#hydra-model[data-ready=true]',timeout=14000)
  q.locator('#measure').click();assert '24 × 20 µm' in q.locator('#status').inner_text() and '7680 µm³' in q.locator('#status').inner_text()
  q.locator('#xz').click();q.locator('#measure').click();assert '24 × 16 µm' in q.locator('#status').inner_text()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['measurement']['cavityAreaUm2']==384 and j['measurement']['cavityVolumeUm3']==7680
  with q.expect_download() as d:q.locator('#png').click()
  png=Path(d.value.path()).read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',png[16:24])==(48,24)
  q.locator('#slice').evaluate("(el)=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}))}");q.locator('#measure').click();assert 'No cavity' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, XY/XZ and blank, JSON/PNG downloads and mobile')
finally:
 if proc:proc.terminate();proc.wait()
