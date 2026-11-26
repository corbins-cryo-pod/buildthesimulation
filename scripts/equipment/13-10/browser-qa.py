"""Run at repo root; optional ACE600_CHROME and ACE600_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('ACE600_BASE','http://127.0.0.1:44922');url=base+'/simulations/equipment/13-10/simulator/';proc=None
try:
 if base.startswith('http://127.0.0.1') and not os.getenv('ACE600_NO_SERVER'):
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','44922'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/ace600-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opt=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('ACE600_CHROME'):opt['executable_path']=os.environ['ACE600_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opt['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opt);q=b.new_page(viewport={'width':1300,'height':900},ignore_https_errors=True,accept_downloads=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  q.goto(url,wait_until='domcontentloaded',timeout=16000);q.wait_for_selector('#ace-model[data-ready=true]',timeout=14000)
  q.locator('#measure').click();assert 'Height difference: 36 nm' in q.locator('#status').inner_text()
  q.locator('#surround').click();q.locator('#measure').click();assert 'Height difference: 0 nm' in q.locator('#status').inner_text()
  q.locator('#raised').click();q.locator('#measure').click()
  with q.expect_download() as d:q.locator('#json').click()
  j=json.loads(Path(d.value.path()).read_text());assert j['measurement']['stepNm']==36 and j['coupon']['revision']=='1' and len(j['profile']['points'])==40
  q.locator('#row').evaluate("(el)=>{el.value=2;el.dispatchEvent(new Event('input',{bubbles:true}))}")
  q.locator('#measure').click();assert 'Height difference: 0 nm' in q.locator('#status').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, raised/surrounding/blank, JSON export and mobile')
finally:
 if proc:proc.terminate();proc.wait()
