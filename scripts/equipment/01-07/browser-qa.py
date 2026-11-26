"""From repo root, DRAFT_CHROME=<Chromium path>; optional DRAFT_BASE."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('DRAFT_BASE','http://127.0.0.1:4337');url=base+'/simulations/equipment/01-07/simulator/';proc=None
try:
 if '127.0.0.1' in base:
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4337'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/draft-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r:assert r.status==200
    break
   except Exception:time.sleep(.4)
 with sync_playwright() as p:
  opts=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('DRAFT_CHROME'):opts['executable_path']=os.environ['DRAFT_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opts);ctx=b.new_context(viewport={'width':1380,'height':910},accept_downloads=True,ignore_https_errors=True);q=ctx.new_page();err=[];q.on('pageerror',lambda e:err.append(str(e)))
  q.goto(url,wait_until='domcontentloaded');q.wait_for_selector('#bench[data-ready=true]',timeout=20000)
  q.locator('#example').click();assert 'remains 10 mm' in q.locator('#status').inner_text()
  assert q.locator('#drawing [data-from=A][data-to=B]').count()==1
  with q.expect_download() as d:q.locator('#export-json').click()
  a=json.loads(Path(d.value.path()).read_text());assert a['annotations'][0]['lengthMm']==10 and a['view']=={'zoom':4,'rotationDeg':30}
  with q.expect_download() as d:q.locator('#export-svg').click()
  s=Path(d.value.path()).read_text();assert 'width="420mm" height="297mm"' in s and 'data-from="A" data-to="B"' in s
  q.locator('#tilt').click();assert '15°' in q.locator('#tilt').inner_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(150);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not err;print('PASS GLB, 10 mm/zoom×4/+30° anchors, 1:1 SVG and JSON export, tilt and mobile')
finally:
 if proc:proc.terminate();proc.wait()
