"""From repo root: DDE_CHROME=<chromium path> playwright check; optional DDE_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('DDE_BASE','http://127.0.0.1:4328');url=base+'/simulations/equipment/08-12/simulator/';proc=None
try:
 if '127.0.0.1' in base:
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4328'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/dde-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r:assert r.status==200
    break
   except Exception:time.sleep(.4)
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}
  if os.getenv('DDE_CHROME'):opts['executable_path']=os.environ['DDE_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opts);ctx=b.new_context(viewport={'width':1390,'height':920},accept_downloads=True,ignore_https_errors=True);q=ctx.new_page();err=[];q.on('pageerror',lambda e:err.append(str(e)))
  q.goto(url,wait_until='domcontentloaded');q.wait_for_selector('#bench[data-ready=true]',timeout=20000)
  for k in ['remove','place','rotate','join']:q.locator('#'+k).click()
  assert 'Reversed polarity' in q.locator('#status').inner_text() and q.locator('#revision').inner_text()=='1'
  q.locator('#rotate').click();q.locator('#join').click();assert q.locator('#revision').inner_text()=='2'
  with q.expect_download() as d:q.locator('#download').click()
  obj=json.loads(Path(d.value.path()).read_text())
  assert {j['pin']:j['net'] for j in obj['jointStates']}=={'A':'VPLUS','K':'RETURN'} and len(obj['history'])==2
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(140);assert q.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
  assert not err;print('PASS GLB, reverse guard, correct replacement, revisioned graph JSON and mobile')
finally:
 if proc:proc.terminate();proc.wait()
