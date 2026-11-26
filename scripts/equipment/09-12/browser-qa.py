"""Playwright Chromium checks. Run from repo root; optional CELL_BASE hosted URL,
CELL_CHROME executable path, CELL_STATIC=1 for dist or CELL_SHOTS=1 for book views."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,time,urllib.request,subprocess
base=os.getenv('CELL_BASE','http://127.0.0.1:4319')
url=base+'/simulations/equipment/09-12/simulator/'
proc=None
try:
 if '127.0.0.1' in base:
  cmd=(['python','-m','http.server','4319','--bind','127.0.0.1','--directory','dist'] if os.getenv('CELL_STATIC') else
       ['node','node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4319'])
  proc=subprocess.Popen(cmd,env={**os.environ,'ASTRO_TELEMETRY_DISABLED':'1'},stdout=open('/tmp/cell-09-12-qa-astro.log','w'),stderr=subprocess.STDOUT)
  for _ in range(70):
   try:
    with urllib.request.urlopen(url,timeout=2) as r: assert r.status==200
    break
   except Exception: time.sleep(.4)
 with sync_playwright() as p:
  opts=dict(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
  if os.getenv('CELL_CHROME'):opts['executable_path']=os.environ['CELL_CHROME']
  if '127.0.0.1' not in base and os.getenv('HTTPS_PROXY'):opts['proxy']={'server':os.environ['HTTPS_PROXY']}
  browser=p.chromium.launch(**opts);ctx=browser.new_context(viewport={'width':1370,'height':920},ignore_https_errors=True,accept_downloads=True)
  page=ctx.new_page();err=[];page.on('pageerror',lambda e:err.append(str(e)))
  res=page.goto(url,wait_until='domcontentloaded',timeout=45000);assert res.status==200
  page.wait_for_selector('#fixture[data-ready=true]',timeout=35000)
  page.locator('#acquire').click();assert page.locator('[data-meter=sol]').inner_text()=='100 Ω';assert page.locator('[data-meter=cur]').inner_text()=='100 µA'
  with page.expect_download() as ev:page.locator('#json').click()
  z=json.loads(Path(ev.value.path()).read_text());assert z['cellCircuit']['solutionOhm']==100 and z['terminals']['reference']['id']=='BTS-CELL-RE'
  with page.expect_download() as ev:page.locator('#csv').click()
  csv=Path(ev.value.path()).read_text();assert 'frequency_Hz,Z_real_ohm,Z_imag_ohm' in csv and csv.count('\n')==57
  page.locator('#double').click();page.locator('#acquire').click();assert page.locator('[data-meter=sol]').inner_text()=='50 Ω'
  page.locator('[data-cable=RE]').click();page.locator('#acquire').click();assert 'Reference lead is open' in page.locator('#status').inner_text();assert page.locator('#json').is_disabled()
  page.locator('#example').click();page.locator('select[data-role=RE]').select_option('WE');page.locator('#acquire').click();assert 'Lead map does not match' in page.locator('#status').inner_text()
  page.locator('#example').click();page.locator('#lift').click();page.locator('#acquire').click();assert 'Lower the cartridge' in page.locator('#status').inner_text()
  page.locator('#example').click();page.locator('select[name=model]').select_option('parallel-rc');page.locator('#acquire').click();assert page.locator('[data-meter=mag]').inner_text()!='100 Ω'
  page.locator('#point').fill('30');page.locator('#plot-mode').click();assert 'Nyquist convention' in page.locator('#plot-caption').inner_text()
  page.locator('#example').click()
  if os.getenv('CELL_SHOTS'):
   for view in ('bench','ports','sense'):
    page.locator('button[data-view='+view+']').click()
    if view=='ports':page.locator('#lift').click()
    page.wait_for_timeout(180)
    page.locator('#fixture').screenshot(path='public/equipment/09-12/'+view+'.png')
    if view=='ports':page.locator('#lift').click()
  page.locator('#reset-view').click();page.set_viewport_size({'width':390,'height':850});page.wait_for_timeout(200)
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth +2')
  page.locator('#acquire').click();assert page.locator('[data-meter=sol]').inner_text()=='100 Ω'
  print('PASS GLB, 100→50 Ω, 100 µA, open and swapped reference, lifted cartridge, RC+Nyquist, 390px viewport, actual JSON/CSV export',err)
  assert not err
finally:
 if proc: proc.terminate();proc.wait()
