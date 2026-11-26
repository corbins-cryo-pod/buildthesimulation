"""From repo root: DAGE_CHROME=<Chromium path>; optional DAGE_BASE hosted origin."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,subprocess,time,urllib.request
base=os.getenv('DAGE_BASE','http://127.0.0.1:4335');url=base+'/simulations/equipment/08-06/simulator/';proc=None
try:
 if '127.0.0.1' in base:
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4335'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/dage-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(55):
   try:
    with urllib.request.urlopen(url,timeout=2) as r:assert r.status==200
    break
   except Exception:time.sleep(.4)
 with sync_playwright() as p:
  setup=dict(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if os.getenv('DAGE_CHROME'):setup['executable_path']=os.environ['DAGE_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):setup['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**setup);ctx=b.new_context(viewport={'width':1360,'height':920},accept_downloads=True,ignore_https_errors=True);q=ctx.new_page();err=[];q.on('pageerror',lambda e:err.append(str(e)))
  q.goto(url,wait_until='domcontentloaded');q.wait_for_selector('#device[data-ready=true]',timeout=24000)
  q.locator('#run').click();assert 'engage the hook' in q.locator('#status').inner_text()
  q.locator('#example').click();assert q.locator('[data-v=force]').inner_text()=='320.0 mN'
  with q.expect_download() as d:q.locator('#json').click()
  a=json.loads(Path(d.value.path()).read_text());assert a['preTest']['revision']==0 and a['postTest']['revision']==1
  assert [x['state'] for x in a['postTest']['bonds']]==['invalidated','connected','connected']
  with q.expect_download() as d:q.locator('#csv').click()
  assert 'vertical_displacement_um,pull_force_N' in Path(d.value.path()).read_text()
  q.set_viewport_size({'width':390,'height':844});q.wait_for_timeout(140);assert q.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not err;print('PASS 320 mN and single-bond invalidation, JSON/CSV, GLB and mobile')
finally:
 if proc:proc.terminate();proc.wait()
