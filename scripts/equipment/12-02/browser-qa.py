"""Run at repo root; optional TI2_CHROME and TI2_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request,struct
base=os.getenv('TI2_BASE','http://127.0.0.1:44902');url=base+'/simulations/equipment/12-02/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('TI2_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44902'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/ti2-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('TI2_CHROME'):opt['executable_path']=os.environ['TI2_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#ti2-model[data-ready=true]',timeout=14000)
  q.locator('#measure').click();assert '36.50 µm pitch (50.00 px' in q.locator('#status').inner_text()
  q.locator('#mag20').click();q.locator('#measure').click();assert '36.50 µm pitch (100.00 px' in q.locator('#status').inner_text() and '146.0 µm' in q.locator('#fov').inner_text()
  with q.expect_download() as d:q.locator('#json-out').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['result']['objectiveMagnification']==20 and j['result']['measuredPitchUm']==36.5
  with q.expect_download() as d:q.locator('#image-out').click()
  png=Path(d.value.path()).read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',png[16:24])==(400,256)
  q.locator('#focus').evaluate("(el)=>{el.value=8;el.dispatchEvent(new Event('input',{bubbles:true}))}");q.locator('#measure').click();assert 'Outside the reticle' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, 10× and 20× pitch, focus guard, JSON/PNG exports and mobile')
finally:
 if proc:proc.terminate();proc.wait()
