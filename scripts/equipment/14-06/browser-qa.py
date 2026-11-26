"""Run from checkout root with DMA_CHROME=<Chromium path> and optional DMA_BASE."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,subprocess,time,urllib.request,json
base=os.getenv('DMA_BASE','http://127.0.0.1:4326');url=base+'/simulations/equipment/14-06/simulator/';proc=None
try:
 if '127.0.0.1' in base:
  proc=subprocess.Popen(['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4326'],env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/q800-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(60):
   try:
    with urllib.request.urlopen(url,timeout=2) as r:assert r.status==200
    break
   except Exception:time.sleep(.4)
 with sync_playwright() as p:
  opts={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}
  if os.getenv('DMA_CHROME'):opts['executable_path']=os.environ['DMA_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  b=p.chromium.launch(**opts);ctx=b.new_context(viewport={'width':1310,'height':940},accept_downloads=True,ignore_https_errors=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded');page.wait_for_selector('#q-model[data-ready=true]',timeout=20000)
  page.locator('#example').click();assert page.locator('[data-v=storage]').inner_text()=='30.000 MPa';assert page.locator('[data-v=loss]').inner_text()=='20.000 MPa'
  with page.expect_download() as d:page.locator('#json').click()
  a=json.loads(Path(d.value.path()).read_text());assert abs(a['fit']['phaseDeg']-33.6900675)<.0001 and len(a['record']['trace'])==512
  with page.expect_download() as d:page.locator('#csv').click()
  assert 'time_s,axial_strain_1,axial_stress_Pa' in Path(d.value.path()).read_text()
  page.locator('#furnace').click();page.locator('#run').click();assert 'Lower the virtual furnace' in page.locator('#status').inner_text()
  page.locator('#example').click();page.locator('#mode-plot').click()
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(140);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  assert not errors;print('PASS GLB, 30/20 MPa example, furnace interlock, actual JSON/CSV export and 390px mobile.',a['fit'])
finally:
 if proc:proc.terminate();proc.wait()
